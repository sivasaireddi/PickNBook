import axios from "axios";
import Constants from "expo-constants";
import { AUTH_API_BASE_URL } from "./authService";
import { getStoredAuthToken } from "../utils/authSession";

const runtimeEnv = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
export const FLIGHT_API_BASE_URL =
  process.env.EXPO_PUBLIC_FLIGHT_API_BASE_URL ||
  runtimeEnv.FLIGHT_API_BASE_URL ||
  "https://humiliate-eatery-humvee.ngrok-free.dev";

const client = axios.create({
  baseURL: FLIGHT_API_BASE_URL,
  timeout: 120000, // 2 minutes timeout to prevent ECONNABORTED for slow responses
  headers: {
    Accept: "application/json",
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

const cityNameMap = {
  DEL: "Delhi",
  BOM: "Mumbai",
  BLR: "Bengaluru",
  MAA: "Chennai",
  HYD: "Hyderabad",
  CCU: "Kolkata",
  PNQ: "Pune",
  AMD: "Ahmedabad",
  JAI: "Jaipur",
  COK: "Kochi",
};

function toCityCode(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (text.length === 3) {
    return text.toUpperCase();
  }
  const entry = Object.entries(cityNameMap).find(
    ([code, name]) => name.toLowerCase() === text
  );
  if (entry) {
    return entry[0].toUpperCase();
  }
  const fallbackMap = {
    hyderabad: "HYD",
    mumbai: "BOM",
    delhi: "DEL",
    bengaluru: "BLR",
    chennai: "MAA",
    kolkata: "CCU",
    pune: "PNQ",
    ahmedabad: "AMD",
    jaipur: "JAI",
    kochi: "COK",
  };
  return (fallbackMap[text] || text.slice(0, 3)).toUpperCase();
}

function toCabinClassCode(cabinClassStr) {
  const text = String(cabinClassStr || "").trim().toLowerCase();
  if (text.includes("economy")) {
    if (text.includes("premium")) return 2;
    return 1;
  }
  if (text.includes("business")) {
    if (text.includes("premium")) return 3;
    return 3;
  }
  if (text.includes("first")) {
    return 4;
  }
  return 1;
}

function mapFlightResults(data, fromCode, toCode, searchParams = {}) {
  let rawItems = [];
  if (Array.isArray(data?.Results?.[0])) {
    rawItems = data.Results[0];
  } else if (Array.isArray(data?.results?.[0])) {
    rawItems = data.results[0];
  } else if (Array.isArray(data?.Results)) {
    rawItems = data.Results;
  } else if (Array.isArray(data)) {
    rawItems = data;
  }

  const traceId = String(data?.TraceId || data?.traceId || "");

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
      1589
    );

    const baseFare = Number(fareObj?.BaseFare || offeredFare * 0.85);
    const tax = Number(fareObj?.Tax || offeredFare - baseFare);

    const resultIndex = fareData?.ResultIndex || item?.ResultIndex || item?.resultIndex || "";
    const srdvIndex = fareData?.SrdvIndex || item?.SrdvIndex || "2";

    return {
      ...item,
      id: String(item?.Id || item?.id || resultIndex || `flight-${idx + 1}`),
      resultIndex,
      srdvIndex,
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
      isLCC: Boolean(fareData?.IsLCC),
      isRefundable: Boolean(fareData?.IsRefundable),
      selectedTravelClass: fareSegment?.CabinClassName || searchParams.travelClass || "Economy",
      selectedTravelClassAvailableSeats: Number(fareSegment?.NoOfSeatAvailable || 9),
      seats: Number(fareSegment?.NoOfSeatAvailable || 9),
    };
  });
}

export async function searchFlights(searchParams) {
  let fromCode = "";
  let toCode = "";
  let journeyDate = "";
  let payload = {};

  try {
    fromCode = toCityCode(searchParams.from || "DEL");
    toCode = toCityCode(searchParams.to || "BOM");
    journeyDate = searchParams.date || "2026-10-15";

    const isRoundTrip = String(searchParams.tripType).toLowerCase() === "roundtrip";
    const cabinClassCode = toCabinClassCode(searchParams.travelClass);

    const segments = [
      {
        Origin: fromCode,
        Destination: toCode,
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: `${journeyDate}T00:00:00`,
        PreferredArrivalTime: `${journeyDate}T00:00:00`,
      },
    ];

    if (isRoundTrip && searchParams.returnDate) {
      segments.push({
        Origin: toCode,
        Destination: fromCode,
        FlightCabinClass: cabinClassCode,
        PreferredDepartureTime: `${searchParams.returnDate}T00:00:00`,
        PreferredArrivalTime: `${searchParams.returnDate}T00:00:00`,
      });
    }

    payload = {
      EndUserIp: "127.0.0.1",
      ClientId: "180170",
      UserName: "PickNBk6",
      Password: "PickNB@486",
      ApiToken: "PickNB@486#170$",
      AdultCount: Number(searchParams.adults !== undefined ? searchParams.adults : 1),
      ChildCount: Number(searchParams.children !== undefined ? searchParams.children : 0),
      InfantCount: Number(searchParams.infants !== undefined ? searchParams.infants : 0),
      JourneyType: isRoundTrip ? 2 : 1,
      DirectFlight: false,
      OneStopFlight: false,
      PreferredAirlines: null,
      Segments: segments,
    };

    console.log("[FlightService] searchFlights calling API via Axios", {
      baseURL: FLIGHT_API_BASE_URL,
      url: `${FLIGHT_API_BASE_URL}/api/FlightBookings/Search`,
      payload,
    });

    const response = await client.post("/api/FlightBookings/Search", payload);
    console.log("[FlightService] searchFlights response status:", response?.status);
    console.log("[FlightService] searchFlights result data:", JSON.stringify(response?.data, null, 2));

    return mapFlightResults(response.data, fromCode, toCode, searchParams);
  } catch (error) {
    console.log("--- AXIOS ERROR DIAGNOSTICS ---");
    console.log("MESSAGE:", error?.message);
    console.log("CODE:", error?.code);
    console.log("CONFIG:", JSON.stringify(error?.config));
    console.log("REQUEST:", error?.request ? "[Request Present]" : "[No Request]");
    console.log("RESPONSE:", error?.response ? JSON.stringify(error.response.data) : "[No Response]");
    console.log("--------------------------------");

    console.log("[FlightService] Attempting fallback request using native fetch...");
    try {
      const token = await getStoredAuthToken();
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const fetchUrl = `${FLIGHT_API_BASE_URL}/api/FlightBookings/Search`;
      console.log("[FlightService] Fetch fallback URL:", fetchUrl);
      const fetchResponse = await fetch(fetchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!fetchResponse.ok) {
        throw new Error(`Fetch fallback failed with status ${fetchResponse.status}`);
      }

      const json = await fetchResponse.json();
      console.log("[FlightService] Fetch fallback succeeded!");
      return mapFlightResults(json, fromCode, toCode, searchParams);
    } catch (fetchError) {
      console.error("[FlightService] Fetch fallback also failed:", fetchError?.message);
      throw error;
    }
  }
}

export async function getPlaces() {
  console.log("========== [API REQUEST] getPlaces ==========");
  console.log("URL: /api/places");
  console.log("Params: { tripType: 'flight' }");
  try {
    const response = await client.get("/api/places", {
      params: { tripType: "flight" },
    });
    console.log("========== [API RESPONSE] getPlaces ==========");
    console.log("Status:", response?.status);
    console.log("Data count:", response?.data?.length);
    return response.data;
  } catch (error) {
    console.error("========== [API ERROR] getPlaces ==========");
    console.error(error.message);
    throw error;
  }
}

export async function getHotRoutes() {
  console.log("========== [API REQUEST] getHotRoutes ==========");
  console.log("URL: /api/FlightBookings/hot-routes");
  try {
    const response = await client.get("/api/FlightBookings/hot-routes");
    console.log("========== [API RESPONSE] getHotRoutes ==========");
    console.log("Status:", response?.status);
    console.log("Data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.warn("Hot routes API failed, using fallback mock routes.", error.message);
    return [
      { id: "hr-1", from: "DEL", to: "BOM", title: "Delhi to Mumbai", fare: 5208, image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&q=80" },
      { id: "hr-2", from: "BLR", to: "DEL", title: "Bengaluru to Delhi", fare: 6410, image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&q=80" },
      { id: "hr-3", from: "BOM", to: "BLR", title: "Mumbai to Bengaluru", fare: 4890, image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&q=80" }
    ];
  }
}

export async function getFeaturedOffers() {
  console.log("========== [API REQUEST] getFeaturedOffers ==========");
  console.log("URL: /api/FeaturedOffers");
  try {
    const response = await client.get("/api/FeaturedOffers");
    console.log("========== [API RESPONSE] getFeaturedOffers ==========");
    console.log("Status:", response?.status);
    console.log("Data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.warn("Featured offers API failed, using fallback offers.", error.message);
    return [
      { id: "fo-1", title: "Domestic Flights Sale", code: "FLYDOM", discount: "Flat 10% Off", desc: "Get up to ₹1,500 off on all major domestic carriers." },
      { id: "fo-2", title: "Zero Convenience Fee", code: "NOFEES", discount: "₹0 Fees", desc: "No convenience fee on payments done via UPI." },
      { id: "fo-3", title: "Vistara Special Deals", code: "VIS15", discount: "Save ₹1,000", desc: "Exclusive flat discounts on Business and First class Vistara seats." }
    ];
  }
}

export async function bookFlight(flightId, payload) {
  console.log("========== [API REQUEST] bookFlight ==========");
  console.log(`URL: /api/FlightBookings/${flightId}/book`);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  try {
    const response = await client.post(`/api/FlightBookings/${flightId}/book`, payload);
    console.log("========== [API RESPONSE] bookFlight ==========");
    console.log("Status:", response?.status);
    console.log("Data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("========== [API ERROR] bookFlight ==========");
    console.error(error.message);
    throw error;
  }
}

export async function getFlightSeatMap(flightId) {
  console.log("========== [API REQUEST] getFlightSeatMap ==========");
  console.log(`URL: /api/FlightBookings/${flightId}/seats`);
  try {
    const response = await client.get(`/api/FlightBookings/${flightId}/seats`);
    console.log("========== [API RESPONSE] getFlightSeatMap ==========");
    console.log("Status:", response?.status);
    console.log("Data count:", response?.data?.length);
    return response.data;
  } catch (error) {
    console.warn("Seat map API failed, returning mock map.", error.message);
    return null;
  }
}

export async function cancelFlightBooking(bookingId, passengersList = []) {
  const payload = passengersList.length > 0 ? { passengers: passengersList } : {};
  const url = passengersList.length > 0 
    ? `/api/FlightBookings/bookings/${bookingId}/cancel-passengers`
    : `/api/FlightBookings/bookings/${bookingId}/cancel`;

  console.log("========== [API REQUEST] cancelFlightBooking ==========");
  console.log(`URL: ${url}`);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  try {
    const response = await client.post(url, payload);
    console.log("========== [API RESPONSE] cancelFlightBooking ==========");
    console.log("Status:", response?.status);
    console.log("Data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("========== [API ERROR] cancelFlightBooking ==========");
    console.error(error.message);
    throw error;
  }
}

export async function getFlightFareRule(params = {}) {
  const payload = {
    EndUserIp: "127.0.0.1",
    ClientId: "180170",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    ApiToken: "PickNB@486#170$",
    TraceId: String(params.traceId || params.TraceId || ""),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
  };

  console.log(`[FlightService] getFlightFareRule calling POST to ${FLIGHT_API_BASE_URL}/api/FlightBookings/FareRule`);
  console.log("[FlightService] FareRule payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await client.post("/api/FlightBookings/FareRule", payload);
    console.log("[FlightService] FareRule API response status:", response?.status);
    console.log("[FlightService] FareRule API response data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.warn("[FlightService] FareRule API request failed via Axios:", error?.message);
    try {
      const token = await getStoredAuthToken();
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const fetchUrl = `${FLIGHT_API_BASE_URL}/api/FlightBookings/FareRule`;
      console.log("[FlightService] FareRule native fetch fallback URL:", fetchUrl);
      const fetchResponse = await fetch(fetchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!fetchResponse.ok) {
        throw new Error(`Fetch fallback failed with status ${fetchResponse.status}`);
      }
      const json = await fetchResponse.json();
      return json;
    } catch (fallbackError) {
      console.warn("FareRule API fallback failed, returning default rule response.", fallbackError?.message);
      return {
        Error: { ErrorCode: 0, ErrorMessage: "" },
        SrdvType: payload.SrdvType,
        ResultIndex: payload.ResultIndex,
        TraceId: payload.TraceId,
        SpecialRule: "",
        Results: [],
      };
    }
  }
}

export function getFareRule(params) {
  return getFlightFareRule(params);
}

export async function getFlightFareQuote(params = {}) {
  const payload = {
    EndUserIp: "127.0.0.1",
    ClientId: "180170",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    ApiToken: "PickNB@486#170$",
    TraceId: String(params.traceId || params.TraceId || ""),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
  };

  console.log(`[FlightService] getFlightFareQuote calling POST to ${FLIGHT_API_BASE_URL}/api/FlightBookings/FareQuote`);
  console.log("[FlightService] FareQuote payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await client.post("/api/FlightBookings/FareQuote", payload);
    console.log("[FlightService] FareQuote API response status:", response?.status);
    console.log("[FlightService] FareQuote API response data:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.warn("[FlightService] FareQuote API request failed via Axios:", error?.message);
    try {
      const token = await getStoredAuthToken();
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const fetchUrl = `${FLIGHT_API_BASE_URL}/api/FlightBookings/FareQuote`;
      console.log("[FlightService] FareQuote native fetch fallback URL:", fetchUrl);
      const fetchResponse = await fetch(fetchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!fetchResponse.ok) {
        throw new Error(`Fetch fallback failed with status ${fetchResponse.status}`);
      }
      const json = await fetchResponse.json();
      return json;
    } catch (fallbackError) {
      console.warn("FareQuote API fallback failed, returning mock quote response.", fallbackError?.message);
      return {
        Error: { ErrorCode: 0, ErrorMessage: "" },
        TraceId: payload.TraceId,
        SrdvType: payload.SrdvType,
        IsPriceChanged: false,
        Results: {
          SrdvIndex: payload.SrdvIndex,
          ResultIndex: payload.ResultIndex,
          IsLCC: true,
          IsRefundable: false,
          Fare: {
            Currency: "INR",
            BaseFare: params.price ? params.price * 0.85 : 1500,
            Tax: params.price ? params.price * 0.15 : 88.5,
            OfferedFare: params.price || 1589,
            PublishedFare: params.price || 1588.5,
          },
        },
      };
    }
  }
}

export function getFareQuote(params) {
  return getFlightFareQuote(params);
}

export default { 
  searchFlights, 
  getPlaces, 
  getHotRoutes, 
  getFeaturedOffers, 
  bookFlight, 
  getFlightSeatMap, 
  cancelFlightBooking,
  getFlightFareRule,
  getFareRule,
  getFlightFareQuote,
  getFareQuote,
};

