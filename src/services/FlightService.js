import axios from "axios";
import Constants from "expo-constants";
import { getStoredAuthToken } from "../utils/authSession";

const runtimeEnv = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
export const FLIGHT_API_BASE_URL =
  process.env.EXPO_PUBLIC_FLIGHT_API_BASE_URL ||
  runtimeEnv.FLIGHT_API_BASE_URL ||
  "https://paycheck-baton-overfull.ngrok-free.dev";

const client = axios.create({
  baseURL: FLIGHT_API_BASE_URL,
  timeout: 120000, // 2 minutes timeout
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Dynamic Authorization Token Request Interceptor
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await getStoredAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("[FlightService] Failed to fetch session token for interceptor:", e.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function getCityCode(val) {
  const clean = String(val || "").trim().toUpperCase();
  if (!clean) return "DEL";
  if (clean.length === 3) return clean;
  const map = {
    DELHI: "DEL",
    MUMBAI: "BOM",
    BENGALURU: "BLR",
    BANGALORE: "BLR",
    CHENNAI: "MAA",
    HYDERABAD: "HYD",
    KOLKATA: "CCU",
    PUNE: "PNQ",
    AHMEDABAD: "AMD",
    JAIPUR: "JAI",
    KOCHI: "COK",
    GOA: "GOI",
    VIJAYAWADA: "VGA",
    VISAKHAPATNAM: "VTZ",
  };
  return map[clean] || clean.slice(0, 3);
}

function mapFlightResults(data, fromCode, toCode, searchParams = {}) {
  let rawItems = [];
  const resObj = data?.Response || data?.data?.Response || data;

  if (Array.isArray(resObj?.Results?.[0])) {
    rawItems = resObj.Results[0];
  } else if (Array.isArray(resObj?.results?.[0])) {
    rawItems = resObj.results[0];
  } else if (Array.isArray(resObj?.Results)) {
    rawItems = resObj.Results;
  } else if (Array.isArray(resObj?.results)) {
    rawItems = resObj.results;
  } else if (Array.isArray(resObj)) {
    rawItems = resObj;
  }

  const traceId = String(resObj?.TraceId || resObj?.traceId || data?.TraceId || data?.traceId || "");

  return rawItems.map((item, idx) => {
    const segment = item?.Segments?.[0]?.[0] || item?.Segments?.[0] || item?.segment || {};
    const fareData = item?.FareDataMultiple?.[0] || item?.fareData || {};
    const fareSegment = fareData?.FareSegments?.[0] || {};
    const fareObj = fareData?.Fare || item?.Fare || {};

    const airlineName =
      segment?.Airline?.AirlineName ||
      fareSegment?.AirlineName ||
      item?.airlineName ||
      item?.airline ||
      "Airline";

    const airlineCode =
      segment?.Airline?.AirlineCode ||
      fareSegment?.AirlineCode ||
      item?.airlineCode ||
      "";

    const flightNumber =
      segment?.Airline?.FlightNumber ||
      fareSegment?.FlightNumber ||
      item?.flightNumber ||
      item?.flightNo ||
      "";

    const fromCity =
      segment?.Origin?.CityName ||
      fareSegment?.FromCity ||
      segment?.Origin?.AirportCode ||
      fromCode ||
      "";

    const toCity =
      segment?.Destination?.CityName ||
      fareSegment?.ToCity ||
      segment?.Destination?.AirportCode ||
      toCode ||
      "";

    const depTime = segment?.DepTime || item?.departureTimeIst || item?.departureTime || "";
    const arrTime = segment?.ArrTime || item?.arrivalTimeIst || item?.arrivalTime || "";
    const duration = segment?.Duration || item?.duration || 60;

    const offeredFare = Number(
      fareData?.OfferedFare ||
      fareObj?.OfferedFare ||
      item?.OfferedFare ||
      item?.offeredFare ||
      item?.displayFare ||
      0
    );

    const baseFare = Number(fareObj?.BaseFare || item?.baseFare || offeredFare);
    const tax = Number(fareObj?.Tax || item?.tax || 0);

    const resultIndex = fareData?.ResultIndex || item?.ResultIndex || item?.resultIndex || String(idx + 1);
    const srdvIndex = fareData?.SrdvIndex || item?.SrdvIndex || "2";
    const srdvType = fareData?.SrdvType || item?.SrdvType || "MixAPI";

    const isLCC = Boolean(
      fareData?.IsLCC !== undefined 
        ? fareData.IsLCC 
        : item?.IsLCC !== undefined 
          ? item.IsLCC 
          : item?.isLCC !== undefined 
            ? item.isLCC 
            : ["6E", "SG", "I5", "QP", "G8"].includes(airlineCode.toUpperCase())
    );

    return {
      ...item,
      id: String(item?.Id || item?.id || resultIndex || `flight-${idx + 1}`),
      resultIndex,
      srdvIndex,
      srdvType,
      traceId,
      airline: airlineName,
      airlineName,
      airlineCode,
      flightNumber,
      flightNo: flightNumber,
      departureTime: depTime,
      departureTimeIst: depTime,
      arrivalTime: arrTime,
      arrivalTimeIst: arrTime,
      duration,
      displayFare: offeredFare,
      fare: offeredFare,
      offeredFare,
      baseFare,
      tax,
      from: fromCode,
      fromCity,
      to: toCode,
      toCity,
      isLCC,
      isRefundable: Boolean(fareData?.IsRefundable ?? item?.IsRefundable),
      selectedTravelClass: fareSegment?.CabinClassName || searchParams.travelClass || "Economy",
      selectedTravelClassAvailableSeats: Number(fareSegment?.NoOfSeatAvailable || item?.seats || 9),
      seats: Number(fareSegment?.NoOfSeatAvailable || item?.seats || 9),
    };
  });
}

function toCabinClassCode(cabinClassStr) {
  const text = String(cabinClassStr || "").trim().toLowerCase();
  if (text.includes("premium") && text.includes("economy")) return 3;
  if (text.includes("economy")) return 2;
  if (text.includes("premium") && text.includes("business")) return 5;
  if (text.includes("business")) return 4;
  if (text.includes("first")) return 6;
  return 1; // 1 = All
}

// 1. Search Flights: POST /api/flight/srdv/Search
export async function searchFlights(searchParams) {
  const fromCode = getCityCode(searchParams.from);
  const toCode = getCityCode(searchParams.to);
  const journeyDate = searchParams.date || new Date().toISOString().slice(0, 10);
  const tripTypeStr = String(searchParams.tripType || "").toLowerCase();
  
  let journeyType = 1;
  if (tripTypeStr === "roundtrip" || tripTypeStr === "twoway" || searchParams.journeyType === 2) {
    journeyType = 2;
  } else if (tripTypeStr === "multicity" || searchParams.journeyType === 3) {
    journeyType = 3;
  }

  const cabinClassCode = toCabinClassCode(searchParams.travelClass);

  let segments = [];

  if (journeyType === 3 && Array.isArray(searchParams.segments) && searchParams.segments.length > 0) {
    segments = searchParams.segments.map((seg) => {
      const segFrom = getCityCode(seg.origin || seg.from);
      const segTo = getCityCode(seg.destination || seg.to);
      const segDate = seg.date || seg.departureDate || journeyDate;
      return {
        Origin: segFrom,
        Destination: segTo,
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: `${segDate}T00:00:00`,
        PreferredArrivalTime: `${segDate}T00:00:00`,
      };
    });
  } else {
    segments = [
      {
        Origin: fromCode,
        Destination: toCode,
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: `${journeyDate}T00:00:00`,
        PreferredArrivalTime: `${journeyDate}T00:00:00`,
      },
    ];

    if (journeyType === 2 && searchParams.returnDate) {
      segments.push({
        Origin: toCode,
        Destination: fromCode,
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: `${searchParams.returnDate}T00:00:00`,
        PreferredArrivalTime: `${searchParams.returnDate}T00:00:00`,
      });
    }
  }

  const payload = {
    EndUserIp: searchParams.endUserIp || "192.168.1.1",
    ClientId: "180170",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    AdultCount: Number(searchParams.adults !== undefined ? searchParams.adults : 1),
    ChildCount: Number(searchParams.children !== undefined ? searchParams.children : 0),
    InfantCount: Number(searchParams.infants !== undefined ? searchParams.infants : 0),
    JourneyType: journeyType,
    // CRITICAL: For multi-city bookings (JourneyType 3), DO NOT send DirectFlight tag
    ...(journeyType !== 3 ? { DirectFlight: Boolean(searchParams.directFlight ?? false) } : {}),
    Segments: segments,
  };

  console.log("[FlightService] searchFlights requesting /api/flight/srdv/Search:", JSON.stringify(payload, null, 2));
  try {
    const response = await client.post("/api/flight/srdv/Search", payload);
    console.log("[FlightService] searchFlights response status:", response?.status);
    console.log("[FlightService] searchFlights raw data snippet:", JSON.stringify(response?.data).slice(0, 400));

    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }

    return mapFlightResults(response.data, fromCode, toCode, searchParams);
  } catch (error) {
    const errData = error?.response?.data;
    const msg = errData?.Error?.ErrorMessage || errData?.message || errData?.title || error?.message;
    console.error("[FlightService] searchFlights failed:", msg);
    throw new Error(msg);
  }
}

// 2. Fare Quote: POST /api/flight/srdv/FareQuote
export async function getFlightFareQuote(params = {}) {
  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180170",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ...(params.couponCode || params.CouponCode ? { CouponCode: String(params.couponCode || params.CouponCode) } : {}),
  };

  console.log("[FlightService] getFlightFareQuote requesting /api/flight/srdv/FareQuote:", payload);
  try {
    const response = await client.post("/api/flight/srdv/FareQuote", payload);
    console.log("[FlightService] FareQuote response status:", response?.status);
    console.log("[FlightService] FareQuote raw response snippet:", JSON.stringify(response?.data).slice(0, 400));
    
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }

    return response.data;
  } catch (error) {
    console.error("[FlightService] FareQuote API request failed:", error?.message);
    throw error;
  }
}

export function getFareQuote(params) {
  return getFlightFareQuote(params);
}

export async function getFlightFareRule(params = {}) {
  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180170",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    ApiToken: "PickNB@486#170$",
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
  };

  console.log("[FlightService] getFlightFareRule requesting /api/flight/srdv/FareRule:", JSON.stringify(payload, null, 2));
  try {
    const response = await client.post("/api/flight/srdv/FareRule", payload);
    console.log("[FlightService] getFlightFareRule response status:", response?.status);
    console.log("\n==========================================");
    console.log("📋 [FLIGHT SERVICE - FARE RULE RESPONSE DATA]:");
    console.log(JSON.stringify(response?.data, null, 2));
    console.log("==========================================\n");

    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }
    return response.data;
  } catch (error) {
    const errData = error?.response?.data;
    const msg = errData?.Error?.ErrorMessage || errData?.message || errData?.title || error?.message;
    console.error("[FlightService] FareRule API request failed:", msg);
    throw new Error(msg);
  }
}

export function getFareRule(params) {
  return getFlightFareRule(params);
}

// 4. SSR (Extra Baggage / Meals): POST /api/flight/srdv/SSR
export async function getFlightSSR(params = {}) {
  const payload = {
    EndUserIp: "127.0.0.1",
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
  };

  console.log("[FlightService] getFlightSSR requesting /api/flight/srdv/SSR payload:", JSON.stringify(payload, null, 2));
  try {
    const response = await client.post("/api/flight/srdv/SSR", payload);
    console.log("[FlightService] getFlightSSR response status:", response?.status);
    console.log("[FlightService] getFlightSSR raw response data:", JSON.stringify(response?.data, null, 2));

    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }
    return response.data;
  } catch (error) {
    const errData = error?.response?.data;
    const msg = errData?.Error?.ErrorMessage || errData?.message || errData?.title || error?.message;
    console.error("[FlightService] getFlightSSR request failed:", msg, errData ? JSON.stringify(errData) : "");
    throw new Error(msg);
  }
}

// 5. Seat Map: POST /api/flight/srdv/SeatMap
export async function getFlightSeatMap(params = {}) {
  const payload = {
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
  };

  console.log("[FlightService] getFlightSeatMap requesting /api/flight/srdv/SeatMap:", payload);
  try {
    const response = await client.post("/api/flight/srdv/SeatMap", payload);
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }
    return response.data;
  } catch (error) {
    console.error("[FlightService] SeatMap API request failed:", error?.message);
    throw error;
  }
}

// 6. Ticket LCC: POST /api/flight/srdv/TicketLCC (auth required)
export async function ticketLCC(params = {}) {
  const innerPayload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180170",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ...(params.couponCode || params.CouponCode ? { CouponCode: String(params.couponCode || params.CouponCode) } : {}),
    Passengers: (params.passengers || params.Passengers || []).map((p) => {
      const nat = String(p.Nationality || "IN");
      const natCode = nat.toLowerCase().includes("india") ? "IN" : nat.slice(0, 2).toUpperCase();
      const cnt = String(p.CountryCode || "IN");
      const countryCode = cnt.toLowerCase().includes("india") ? "IN" : cnt.slice(0, 2).toUpperCase();
      return {
        ...p,
        Gender: String(p.Gender !== undefined ? p.Gender : "1"),
        Nationality: natCode,
        CountryCode: countryCode,
      };
    }),
  };

  const payload = {
    ...innerPayload,
    request: innerPayload,
    Request: innerPayload,
  };

  console.log("[FlightService] ticketLCC requesting /api/flight/srdv/TicketLCC:", JSON.stringify(payload, null, 2));
  try {
    const response = await client.post("/api/flight/srdv/TicketLCC", payload);
    console.log("[FlightService] TicketLCC response:", JSON.stringify(response?.data));
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }
    return response.data;
  } catch (error) {
    const errData = error?.response?.data;
    const msg = errData?.Error?.ErrorMessage || errData?.message || errData?.title || error?.message;
    console.error("[FlightService] TicketLCC request failed:", msg, errData ? JSON.stringify(errData) : "");
    throw new Error(msg);
  }
}

// 7. Hold GDS: POST /api/flight/srdv/HoldGDS (auth required)
export async function holdGDS(params = {}) {
  const innerPayload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180170",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ...(params.couponCode || params.CouponCode ? { CouponCode: String(params.couponCode || params.CouponCode) } : {}),
    Passengers: (params.passengers || params.Passengers || []).map((p) => {
      const nat = String(p.Nationality || "IN");
      const natCode = nat.toLowerCase().includes("india") ? "IN" : nat.slice(0, 2).toUpperCase();
      const cnt = String(p.CountryCode || "IN");
      const countryCode = cnt.toLowerCase().includes("india") ? "IN" : cnt.slice(0, 2).toUpperCase();
      return {
        ...p,
        Gender: String(p.Gender !== undefined ? p.Gender : "1"),
        Nationality: natCode,
        CountryCode: countryCode,
      };
    }),
  };

  const payload = {
    ...innerPayload,
    request: innerPayload,
    Request: innerPayload,
  };

  console.log("[FlightService] holdGDS requesting /api/flight/srdv/HoldGDS:", JSON.stringify(payload, null, 2));
  try {
    const response = await client.post("/api/flight/srdv/HoldGDS", payload);
    console.log("[FlightService] HoldGDS response:", JSON.stringify(response?.data));
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }
    return response.data;
  } catch (error) {
    const errData = error?.response?.data;
    const msg = errData?.Error?.ErrorMessage || errData?.message || errData?.title || error?.message;
    console.error("[FlightService] HoldGDS request failed:", msg, errData ? JSON.stringify(errData) : "");
    throw new Error(msg);
  }
}

// 8. Ticket GDS: POST /api/flight/srdv/TicketGDS (auth required)
export async function ticketGDS(params = {}) {
  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180170",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
    PNR: String(params.pnr || params.PNR || ""),
    BookingId: params.bookingId || params.BookingId || "",
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
  };

  console.log("[FlightService] ticketGDS requesting /api/flight/srdv/TicketGDS:", payload);
  try {
    const response = await client.post("/api/flight/srdv/TicketGDS", payload);
    console.log("[FlightService] TicketGDS response:", response?.data);
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }
    return response.data;
  } catch (error) {
    const errData = error?.response?.data;
    const msg = errData?.Error?.ErrorMessage || errData?.message || errData?.title || error?.message;
    console.error("[FlightService] TicketGDS request failed:", msg);
    throw new Error(msg);
  }
}

// 9. Get Cancellation Charges: POST /api/flight/srdv/GetCancellationCharges (auth required)
export async function getCancellationCharges(params = {}) {
  const payload = {
    EndUserIp: "127.0.0.1",
    RequestType: Number(params.requestType || params.RequestType || 1),
    TraceId: String(params.traceId || params.TraceId || ""),
    BookingId: String(params.bookingId || params.BookingId || ""),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
  };

  console.log("[FlightService] getCancellationCharges requesting /api/flight/srdv/GetCancellationCharges:", payload);
  try {
    const response = await client.post("/api/flight/srdv/GetCancellationCharges", payload);
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }
    return response.data;
  } catch (error) {
    const errData = error?.response?.data;
    const msg = errData?.Error?.ErrorMessage || errData?.message || errData?.title || error?.message;
    console.error("[FlightService] GetCancellationCharges failed:", msg);
    throw new Error(msg);
  }
}

// 10. Send Cancel Request: POST /api/flight/srdv/SendChangeRequest (auth required)
export async function sendCancelRequest(params = {}) {
  const payload = {
    EndUserIp: "127.0.0.1",
    BookingId: String(params.bookingId || params.BookingId || ""),
    PNR: String(params.pnr || params.PNR || ""),
    RequestType: String(params.requestType || params.RequestType || "2"),
    CancellationType: String(params.cancellationType || params.CancellationType || "3"),
    Remarks: String(params.remarks || params.Remarks || "User requested cancellation"),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ...(params.sectors || params.Sectors ? { Sectors: params.sectors || params.Sectors } : {}),
    ...(params.ticketData || params.TicketData ? { TicketData: params.ticketData || params.TicketData } : {}),
  };

  console.log("[FlightService] sendCancelRequest requesting /api/flight/srdv/SendChangeRequest:", payload);
  try {
    const response = await client.post("/api/flight/srdv/SendChangeRequest", payload);
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }
    return response.data;
  } catch (error) {
    const errData = error?.response?.data;
    const msg = errData?.Error?.ErrorMessage || errData?.message || errData?.title || error?.message;
    console.error("[FlightService] SendChangeRequest failed:", msg);
    throw new Error(msg);
  }
}

// 11. Get Cancel Status: POST /api/flight/srdv/GetCancelStatus (auth required)
export async function getCancelStatus(params = {}) {
  const payload = {
    EndUserIp: "127.0.0.1",
    ChangeRequestId: String(params.changeRequestId || params.ChangeRequestId || ""),
  };

  console.log("[FlightService] getCancelStatus requesting /api/flight/srdv/GetCancelStatus:", payload);
  try {
    const response = await client.post("/api/flight/srdv/GetCancelStatus", payload);
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }
    return response.data;
  } catch (error) {
    const errData = error?.response?.data;
    const msg = errData?.Error?.ErrorMessage || errData?.message || errData?.title || error?.message;
    console.error("[FlightService] GetCancelStatus failed:", msg);
    throw new Error(msg);
  }
}

// Additional APIs without mock data fallbacks
export async function getPlaces() {
  console.log("[FlightService] getPlaces calling /api/places");
  const response = await client.get("/api/places", {
    params: { tripType: "flight" },
  });
  return response.data;
}

export async function getHotRoutes() {
  console.log("[FlightService] getHotRoutes calling /api/FlightBookings/hot-routes");
  const response = await client.get("/api/FlightBookings/hot-routes");
  return response.data;
}

export async function getFeaturedOffers() {
  const response = await client.get("/api/FeaturedOffers");
  return response.data;
}

// 12. Get Calendar Fare: POST /api/flight/srdv/GetCalendarFare
export async function getCalendarFare(searchParams = {}) {
  const fromCode = getCityCode(searchParams.from || searchParams.origin || "DEL");
  const toCode = getCityCode(searchParams.to || searchParams.destination || "BOM");
  const journeyDate = searchParams.date || searchParams.preferredDepartureTime || new Date().toISOString().slice(0, 10);
  const cabinClassCode = toCabinClassCode(searchParams.travelClass || searchParams.flightCabinClass);

  const payload = {
    EndUserIp: searchParams.endUserIp || "127.0.0.1",
    ClientId: "",
    UserName: "",
    Password: "",
    JourneyType: Number(searchParams.journeyType || 1),
    FareType: Number(searchParams.fareType || 1),
    Segments: [
      {
        Origin: fromCode,
        Destination: toCode,
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: `${journeyDate}T00:00:00`,
        PreferredArrivalTime: `${journeyDate}T00:00:00`,
      },
    ],
  };

  console.log("[FlightService] getCalendarFare requesting /api/flight/srdv/GetCalendarFare:", JSON.stringify(payload, null, 2));
  try {
    const response = await client.post("/api/flight/srdv/GetCalendarFare", payload);
    console.log("[FlightService] getCalendarFare response status:", response?.status);
    
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      throw new Error(errObj.ErrorMessage);
    }

    return response.data;
  } catch (error) {
    const msg = error?.response?.data?.Error?.ErrorMessage || error?.message;
    console.error("[FlightService] getCalendarFare request failed:", msg);
    throw new Error(msg);
  }
}

export default {
  searchFlights,
  getPlaces,
  getHotRoutes,
  getFeaturedOffers,
  getFlightSeatMap,
  getFlightFareRule,
  getFareRule,
  getFlightFareQuote,
  getFareQuote,
  getFlightSSR,
  ticketLCC,
  holdGDS,
  ticketGDS,
  getCancellationCharges,
  sendCancelRequest,
  getCancelStatus,
  getCalendarFare,
};
