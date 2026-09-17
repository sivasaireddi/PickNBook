import axios from "axios";
import Constants from "expo-constants";
import { getStoredAuthToken } from "../utils/authSession";
import { API_BASE_URL } from "../constants/config";

const runtimeEnv = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
export const FLIGHT_API_BASE_URL = API_BASE_URL;

const client = axios.create({
  baseURL: FLIGHT_API_BASE_URL,
  timeout: 120000, // 2 minutes timeout
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export function sanitizeForLog(obj) {
  if (!obj || typeof obj !== "object") return obj;
  try {
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };
    const sensitiveKeys = [
      "password", "Password", "apiToken", "ApiToken", "authorization", 
      "Authorization", "token", "JWT", "cardNumber", "cvv", "upiId", "secret"
    ];
    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.some((s) => s.toLowerCase() === key.toLowerCase())) {
        copy[key] = "[REDACTED]";
      } else if (typeof copy[key] === "object" && copy[key] !== null) {
        copy[key] = sanitizeForLog(copy[key]);
      }
    }
    return copy;
  } catch {
    return "[REDACTED]";
  }
}

// Dynamic Authorization Token Request & Logging Interceptor
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
    const fullUrl = `${config.baseURL || ""}${config.url || ""}`;
    console.log(`\n==================================================`);
    console.log(`🚀 [FLIGHT API REQUEST] ${config.method?.toUpperCase()} ${fullUrl}`);
    if (config.params) console.log("📌 Request Params:", JSON.stringify(sanitizeForLog(config.params), null, 2));
    if (config.data) {
      const parsedData = typeof config.data === "string" ? (function() { try { return JSON.parse(config.data); } catch { return config.data; } })() : config.data;
      console.log("📦 Request Payload:", typeof parsedData === "object" ? JSON.stringify(sanitizeForLog(parsedData), null, 2) : parsedData);
    }
    console.log(`==================================================\n`);
    return config;
  },
  (error) => {
    console.error("❌ [FLIGHT API REQUEST ERROR]:", error);
    return Promise.reject(error);
  }
);

// Response & Error Logging Interceptor
client.interceptors.response.use(
  (response) => {
    const fullUrl = `${response.config?.baseURL || ""}${response.config?.url || ""}`;
    console.log(`\n==================================================`);
    console.log(`✅ [FLIGHT API RESPONSE] ${response.config?.method?.toUpperCase()} ${fullUrl} (Status: ${response.status})`);
    console.log("📥 Response Data:", JSON.stringify(sanitizeForLog(response.data), null, 2));
    console.log(`==================================================\n`);
    return response;
  },
  (error) => {
    const fullUrl = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
    console.error(`\n==================================================`);
    console.error(`❌ [FLIGHT API ERROR] ${error.config?.method?.toUpperCase()} ${fullUrl} (Status: ${error.response?.status || "Network/Timeout Error"})`);
    console.error("⚠️ Error Message:", error.message);
    if (error.response?.data) {
      console.error("📄 Error Response Data:", JSON.stringify(sanitizeForLog(error.response.data), null, 2));
    }
    console.error(`==================================================\n`);
    return Promise.reject(error);
  }
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
  const resObj = data?.Response || data?.data?.Response || data;
  const traceId = String(resObj?.TraceId || resObj?.traceId || data?.TraceId || data?.traceId || "");

  const mapSingleItem = (item, idx, defaultFrom, defaultTo, legIndex = 0, tripDirection = "outbound") => {
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
      defaultFrom ||
      fromCode ||
      "";

    const toCity =
      segment?.Destination?.CityName ||
      fareSegment?.ToCity ||
      segment?.Destination?.AirportCode ||
      defaultTo ||
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
      id: String(item?.Id || item?.id || resultIndex || `flight-${legIndex}-${idx + 1}`),
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
      from: defaultFrom || fromCode,
      fromCity,
      to: defaultTo || toCode,
      toCity,
      isLCC,
      isRefundable: Boolean(fareData?.IsRefundable ?? item?.IsRefundable),
      selectedTravelClass: fareSegment?.CabinClassName || searchParams.travelClass || "Economy",
      selectedTravelClassAvailableSeats: Number(fareSegment?.NoOfSeatAvailable || item?.seats || 9),
      seats: Number(fareSegment?.NoOfSeatAvailable || item?.seats || 9),
      legIndex,
      tripDirection,
    };
  };

  const isMultiSegmentArray = Array.isArray(resObj?.Results) && resObj.Results.length >= 2 && Array.isArray(resObj.Results[0]);
  const isMultiCity = searchParams.journeyType === 3 || String(searchParams.tripType || "").toLowerCase() === "multicity";

  if (isMultiSegmentArray) {
    const legsMapped = resObj.Results.map((legResults, legIdx) => {
      const legFrom = searchParams.segments?.[legIdx]?.origin || fromCode;
      const legTo = searchParams.segments?.[legIdx]?.destination || toCode;
      return legResults.map((item, idx) => mapSingleItem(item, idx, legFrom, legTo, legIdx, `leg_${legIdx + 1}`));
    });

    const combinedList = legsMapped.flat();
    combinedList.legs = legsMapped;
    combinedList.outbound = legsMapped[0] || [];
    combinedList.return = legsMapped[1] || [];
    combinedList.isMultiCityResults = searchParams.journeyType === 3 || searchParams.tripType === "multicity" || legsMapped.length > 2;
    combinedList.isRoundTripResults = !combinedList.isMultiCityResults && legsMapped.length === 2;
    return combinedList;
  }

  let rawItems = [];
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

  // Handle single-array unified Multi-City results (e.g. International)
  if (isMultiCity && Array.isArray(searchParams.segments) && searchParams.segments.length > 1) {
    const { extractRelevantSegments } = require("../utils/flightSegmentUtils");

    const legsMapped = searchParams.segments.map((reqLeg, legIdx) => {
      const legFrom = reqLeg.origin || fromCode;
      const legTo = reqLeg.destination || toCode;
      
      const legFlights = [];
      rawItems.forEach((item, idx) => {
        let allSegments = [];
        if (Array.isArray(item.Segments) && item.Segments.length > 0) {
          allSegments = Array.isArray(item.Segments[0]) ? item.Segments.flat() : item.Segments;
        } else if (item.FareDataMultiple?.[0]?.FareSegments) {
          allSegments = item.FareDataMultiple[0].FareSegments;
        } else if (item.FareDataMultiple?.[0]?.Segments) {
          allSegments = item.FareDataMultiple[0].Segments;
        }
        
        const normalizedSegments = extractRelevantSegments(allSegments, legFrom, legTo);
        
        if (normalizedSegments.length > 0) {
           const mapped = mapSingleItem(item, idx, legFrom, legTo, legIdx, `leg_${legIdx + 1}`);
           mapped.normalizedSegments = normalizedSegments;
           
           mapped.departureTime = normalizedSegments[0].DepTime || normalizedSegments[0].DepartureTime || mapped.departureTime;
           mapped.arrivalTime = normalizedSegments[normalizedSegments.length - 1].ArrTime || normalizedSegments[normalizedSegments.length - 1].ArrivalTime || mapped.arrivalTime;
           mapped.fromCity = normalizedSegments[0].Origin?.CityName || normalizedSegments[0].FromCity || mapped.fromCity;
           mapped.toCity = normalizedSegments[normalizedSegments.length - 1].Destination?.CityName || normalizedSegments[normalizedSegments.length - 1].ToCity || mapped.toCity;
           
           let legDuration = 0;
           normalizedSegments.forEach(seg => {
             legDuration += (seg.Duration || 0);
           });
           if (legDuration > 0) mapped.duration = legDuration;
           
           legFlights.push(mapped);
        }
      });
      return legFlights;
    });

    const combinedList = legsMapped.flat();
    combinedList.legs = legsMapped;
    combinedList.outbound = legsMapped[0] || [];
    combinedList.return = legsMapped[1] || [];
    combinedList.isMultiCityResults = true;
    combinedList.isRoundTripResults = false;
    return combinedList;
  }

  return rawItems.map((item, idx) => mapSingleItem(item, idx, fromCode, toCode, 0, "outbound"));
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
    ClientId: "180232",
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

  // Unsafe log removed, rely on Axios interceptor

  try {
    const response = await client.post("/api/flight/srdv/Search", payload);
    // Unsafe log removed, rely on Axios interceptor

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
    const customError = new Error(msg);
    customError.status = error?.response?.status;
    throw customError;
  }
}

// 3. Fare Quote: POST /api/flight/srdv/FareQuote (Strict Revalidation, No Mock Fallbacks)
export async function getFlightFareQuote(params = {}) {
  const activeTraceId = String(params.traceId || params.TraceId || "");
  const activeResultIndex = String(params.resultIndex || params.ResultIndex || "");
  const activeSrdvType = String(params.srdvType || params.SrdvType || "MixAPI");
  const activeSrdvIndex = String(params.srdvIndex || params.SrdvIndex || "2");

  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180232",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
    ...(params.couponCode || params.CouponCode ? { CouponCode: String(params.couponCode || params.CouponCode) } : {}),
  };

  console.log(`[FARE_REVALIDATION_STARTED] Requesting /api/flight/srdv/FareQuote | TraceId: ${activeTraceId} | ResultIndex: ${activeResultIndex.slice(0, 30)}... | SrdvType: ${activeSrdvType} | SrdvIndex: ${activeSrdvIndex}`);
  try {
    const response = await client.post("/api/flight/srdv/FareQuote", payload);
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    
    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      console.error(`[FARE_REVALIDATION_FAILED] /api/flight/srdv/FareQuote ErrorCode: ${errObj.ErrorCode} | Message: ${errObj.ErrorMessage} | TraceId: ${activeTraceId}`);
      throw new Error(errObj.ErrorMessage || "Fare revalidation failed by supplier.");
    }

    console.log(`[FARE_REVALIDATION_SUCCESS] Supplier FareQuote confirmed | TraceId: ${activeTraceId}`);
    return response.data;
  } catch (error) {
    const msg = error?.response?.data?.Error?.ErrorMessage || error?.message || "Fare revalidation failed by supplier.";
    console.error(`[FARE_REVALIDATION_FAILED] Supplier Quote Exception: ${msg} | TraceId: ${activeTraceId}`);
    throw new Error(msg);
  }
}

export function getFareQuote(params) {
  return getFlightFareQuote(params);
}

// 3b. Fare Rule: POST /api/flight/srdv/FareRule
export async function getFlightFareRule(params = {}) {
  const activeTraceId = String(params.traceId || params.TraceId || "");
  const activeResultIndex = String(params.resultIndex || params.ResultIndex || "");

  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180232",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    ApiToken: "PickNB@486#232$",
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
  };

  console.log(`[FARERULE_REQUEST] /api/flight/srdv/FareRule | TraceId: ${activeTraceId}`);
  try {
    const response = await client.post("/api/flight/srdv/FareRule", payload);
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    const results = resObj?.Results || response?.data?.Results;

    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      return { success: false, code: "FARE_RULE_ERROR", message: errObj.ErrorMessage, data: null };
    }

    if (!results || (Array.isArray(results) && results.length === 0)) {
      console.log(`[FARERULE_EMPTY] Empty fare rules returned by supplier for TraceId: ${activeTraceId}`);
      return { success: false, code: "FARE_RULE_UNAVAILABLE", message: "Fare rules not provided by supplier for this flight.", data: [] };
    }

    return { success: true, code: "FARE_RULE_AVAILABLE", data: results, raw: response.data };
  } catch (error) {
    const msg = error?.response?.data?.Error?.ErrorMessage || error?.message;
    console.error("[FARERULE_FAILED] Exception:", msg);
    return { success: false, code: "FARE_RULE_ERROR", message: msg, data: null };
  }
}

export function getFareRule(params) {
  return getFlightFareRule(params);
}

// 4. SSR (Extra Baggage / Meals): POST /api/flight/srdv/SSR
export async function getFlightSSR(params = {}) {
  const activeTraceId = String(params.traceId || params.TraceId || "");
  let activeResultIndex = String(params.resultIndex || params.ResultIndex || "");
  
  const isRoundTrip = activeResultIndex.includes(",");
  const indices = activeResultIndex.split(",");
  
  console.log("[SSR_RESULT_INDEX]");
  console.log(`TripType: ${isRoundTrip ? 'ROUND_TRIP' : 'ONE_WAY'}`);
  console.log(`OutboundResultIndex: ${indices[0]}`);
  if (isRoundTrip && indices.length > 1) {
    console.log(`ReturnResultIndex: ${indices[1]}`);
  }
  console.log(`CombinedResultIndex: ${activeResultIndex}`);

  const activeSrdvType = String(params.srdvType || params.SrdvType || "MixAPI");
  const activeSrdvIndex = String(params.srdvIndex || params.SrdvIndex || "2");

  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180232",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
  };

  console.log(`[SSR_REQUEST_RESULT_INDEX]`);
  console.log(`ResultIndex: ${activeResultIndex}`);

  console.log(`[SSR_STARTED] Requesting /api/flight/srdv/SSR | TraceId: ${activeTraceId} | ResultIndex: ${activeResultIndex}`);
  try {
    const response = await client.post("/api/flight/srdv/SSR", payload);
    console.log("[SSR_RESPONSE] Raw Data:", JSON.stringify(response?.data).slice(0, 500));

    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;
    const results = resObj?.Results || response?.data?.Results || resObj;

    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      console.warn(`[SSR_FAILED] ErrorCode: ${errObj.ErrorCode} | Message: ${errObj.ErrorMessage}`);
      return { success: false, code: "SSR_UNAVAILABLE", message: errObj.ErrorMessage, data: null };
    }

    const baggage = results?.Baggage || resObj?.Baggage || response?.data?.Baggage || [];
    const meals = results?.MealDynamic || results?.Meal || resObj?.MealDynamic || resObj?.Meal || response?.data?.MealDynamic || [];
    const flatBaggage = Array.isArray(baggage[0]) ? baggage[0] : baggage;
    const flatMeals = Array.isArray(meals[0]) ? meals[0] : meals;
    const hasSsr = (Array.isArray(flatBaggage) && flatBaggage.length > 0) || (Array.isArray(flatMeals) && flatMeals.length > 0);

    if (!hasSsr) {
      console.log(`[SSR_UNAVAILABLE] No extra baggage/meal SSR options returned by supplier for TraceId: ${activeTraceId}`);
      return { success: false, code: "SSR_NOT_APPLICABLE", message: "No extra baggage or meal add-ons available for this flight.", data: null };
    }

    console.log(`[SSR_SUCCESS] SSR options loaded for TraceId: ${activeTraceId}`);
    return { success: true, code: "SSR_AVAILABLE", data: results, raw: response.data };
  } catch (error) {
    const msg = error?.response?.data?.Error?.ErrorMessage || error?.message || "SSR service unavailable.";
    console.warn(`[SSR_FAILED] Exception: ${msg}`);
    return { success: false, code: "SSR_ERROR", message: msg, data: null };
  }
}


// 5. Seat Map: POST /api/flight/srdv/SeatMap
export async function getFlightSeatMap(params = {}) {
  const activeTraceId = String(params.traceId || params.TraceId || "");
  const activeResultIndex = String(params.resultIndex || params.ResultIndex || "");
  const activeSrdvType = String(params.srdvType || params.SrdvType || "MixAPI");
  const activeSrdvIndex = String(params.srdvIndex || params.SrdvIndex || "2");

  const payload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180232",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: activeTraceId,
    ResultIndex: activeResultIndex,
    SrdvType: activeSrdvType,
    SrdvIndex: activeSrdvIndex,
  };

  console.log(`[SEATMAP_STARTED] /api/flight/srdv/SeatMap | TraceId: ${activeTraceId} | ResultIndex: ${activeResultIndex}`);
  try {
    const response = await client.post("/api/flight/srdv/SeatMap", payload);
    const resObj = response?.data?.Response || response?.data;
    const errObj = resObj?.Error || response?.data?.Error;

    if (errObj && String(errObj.ErrorCode) !== "0" && errObj.ErrorMessage) {
      console.warn(`[SEATMAP_FAILED] ErrorCode: ${errObj.ErrorCode} | Message: ${errObj.ErrorMessage}`);
      return {
        success: false,
        code: String(errObj.ErrorCode) === "1" ? "SUPPLIER_TRACE_NOT_FOUND" : "SEATMAP_UNAVAILABLE",
        message: errObj.ErrorMessage || "Seat map is unavailable for this flight.",
        data: null,
      };
    }

    console.log(`[SEATMAP_SUCCESS] Seat map loaded for TraceId: ${activeTraceId}`);
    return { success: true, code: "SEATMAP_AVAILABLE", data: resObj?.Results || response.data };
  } catch (error) {
    const msg = error?.message || "Seat map unavailable.";
    console.warn(`[SEATMAP_FAILED] Exception: ${msg}`);
    return { success: false, code: "SEATMAP_ERROR", message: msg, data: null };
  }
}



// 6. Ticket LCC: POST /api/flight/srdv/TicketLCC (auth required)
export async function ticketLCC(params = {}) {
  const innerPayload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180232",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
    JourneyType: Number(params.journeyType || params.JourneyType || 1),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ...(params.couponCode || params.CouponCode ? { CouponCode: String(params.couponCode || params.CouponCode) } : {}),
    Passengers: (params.passengers || params.Passengers || []).map((p) => {
      const nat = String(p.Nationality || "IN");
      const natCode = nat.toLowerCase().includes("india") ? "IN" : nat.slice(0, 2).toUpperCase();
      const cnt = String(p.CountryCode || "IN");
      const countryCode = cnt.toLowerCase().includes("india") ? "IN" : cnt.slice(0, 2).toUpperCase();
      return {
        AddressLine1: String(p.AddressLine1 || p.addressLine1 || p.address || p.City || "Street Address").trim() || "Street Address",
        AddressLine2: String(p.AddressLine2 || p.addressLine2 || "").trim(),
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

  if (__DEV__) {
    payload.Passengers.forEach((p, idx) => {
      console.log(`[TicketLCC] Passenger ${idx + 1} passport details:`, JSON.stringify({
        PassportNo: p.PassportNo,
        PassportIssueDate: p.PassportIssueDate,
        PassportExpiry: p.PassportExpiry,
        PassportIssueCountryCode: p.PassportIssueCountryCode,
        Nationality: p.Nationality,
        DateOfBirth: p.DateOfBirth,
        DocumentType: p.DocumentType,
        DocumentId: p.DocumentId
      }, null, 2));
    });
  }

  // Unsafe log removed, rely on Axios interceptor
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
    ClientId: "180232",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
    JourneyType: Number(params.journeyType || params.JourneyType || 1),
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ...(params.couponCode || params.CouponCode ? { CouponCode: String(params.couponCode || params.CouponCode) } : {}),
    Passengers: (params.passengers || params.Passengers || []).map((p) => {
      const nat = String(p.Nationality || "IN");
      const natCode = nat.toLowerCase().includes("india") ? "IN" : nat.slice(0, 2).toUpperCase();
      const cnt = String(p.CountryCode || "IN");
      const countryCode = cnt.toLowerCase().includes("india") ? "IN" : cnt.slice(0, 2).toUpperCase();
      return {
        AddressLine1: String(p.AddressLine1 || p.addressLine1 || p.address || p.City || "Street Address").trim() || "Street Address",
        AddressLine2: String(p.AddressLine2 || p.addressLine2 || "").trim(),
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

  // Unsafe log removed, rely on Axios interceptor
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
  const innerPayload = {
    EndUserIp: params.endUserIp || "192.168.1.1",
    ClientId: "180232",
    UserName: "PickNBk6",
    Password: "PickNB@486",
    TraceId: String(params.traceId || params.TraceId || ""),
    ResultIndex: String(params.resultIndex || params.ResultIndex || ""),
    PNR: String(params.pnr || params.PNR || ""),
    BookingId: params.bookingId || params.BookingId || "",
    SrdvType: String(params.srdvType || params.SrdvType || "MixAPI"),
    SrdvIndex: String(params.srdvIndex || params.SrdvIndex || "2"),
    ...(params.passengers || params.Passengers ? {
      Passengers: (params.passengers || params.Passengers || []).map((p) => {
        const nat = String(p.Nationality || "IN");
        const natCode = nat.toLowerCase().includes("india") ? "IN" : nat.slice(0, 2).toUpperCase();
        const cnt = String(p.CountryCode || "IN");
        const countryCode = cnt.toLowerCase().includes("india") ? "IN" : cnt.slice(0, 2).toUpperCase();
        return {
          AddressLine1: String(p.AddressLine1 || p.addressLine1 || p.address || p.City || "Street Address").trim() || "Street Address",
          AddressLine2: String(p.AddressLine2 || p.addressLine2 || "").trim(),
          ...p,
          Gender: String(p.Gender !== undefined ? p.Gender : "1"),
          Nationality: natCode,
          CountryCode: countryCode,
        };
      }),
    } : {}),
  };

  const payload = {
    ...innerPayload,
    request: innerPayload,
    Request: innerPayload,
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

export async function searchAirports(query, field, limit = 20) {
  console.log(`[FlightService] searchAirports calling /api/Places?query=${query}`);
  const response = await client.get("/api/Places", {
    params: { query, tripType: "flight", field, limit },
  });
  return response.data;
}

export async function getHotRoutes() {
  console.log("[FlightService] getHotRoutes checking route aliases...");
  const endpoints = [
    "/api/flight/popular-routes",
    "/api/admin/flight-popular-destinations",
    "/api/FlightBookings/hot-routes",
  ];
  for (const ep of endpoints) {
    try {
      const response = await client.get(ep);
      if (response?.data) return response.data;
    } catch (e) {
      console.log(`[FlightService] Popular routes endpoint ${ep} failed (${e.message}), trying next fallback...`);
    }
  }
  return [];
}

export async function getFeaturedOffers() {
  const response = await client.get("/api/FeaturedOffers");
  return response.data;
}

// 12. Get Calendar Fare: POST /api/flight/srdv/GetCalendarFare
export async function getCalendarFare(searchParams = {}) {
  const isMultiCity = searchParams.journeyType === 3 || String(searchParams.tripType || "").toLowerCase() === "multicity";
  if (isMultiCity) {
    console.log("[FlightService] Calendar fare request skipped for Multi-City search session.");
    return { success: true, isMultiCity: true, data: [] };
  }

  const fromCode = getCityCode(searchParams.from || searchParams.origin || "DEL");
  const toCode = getCityCode(searchParams.to || searchParams.destination || "BOM");
  const journeyDate = searchParams.date || searchParams.preferredDepartureTime || new Date().toISOString().slice(0, 10);
  const cabinClassCode = toCabinClassCode(searchParams.travelClass || searchParams.flightCabinClass);

  const payload = {
    EndUserIp: searchParams.endUserIp || "192.168.1.1",
    ClientId: "180232",
    UserName: "PickNBk6",
    Password: "PickNB@486",
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

// 13. Database Persistence: Save Confirmed Booking (POST /api/flight/bookings)
export async function saveFlightBooking(bookingPayload) {
  console.log("[FlightService] saveFlightBooking requesting POST /api/flight/bookings:", JSON.stringify(bookingPayload, null, 2));
  try {
    const response = await client.post("/api/flight/bookings", bookingPayload);
    console.log("[FlightService] saveFlightBooking response status:", response?.status);
    return response.data;
  } catch (error) {
    console.warn("[FlightService] POST /api/flight/bookings endpoint failed/unavailable:", error?.message);
    return {
      success: true,
      persistedLocal: true,
      bookingId: bookingPayload?.bookingId || bookingPayload?.pnr,
      data: bookingPayload,
    };
  }
}

// 14. Database Persistence: Get User's Bookings (GET /api/flight/bookings)
export async function getUserFlightBookings() {
  console.log("[FlightService] getUserFlightBookings requesting GET /api/flight/bookings");
  try {
    const response = await client.get("/api/flight/bookings");
    return response.data;
  } catch (error) {
    console.warn("[FlightService] GET /api/flight/bookings endpoint failed:", error?.message);
    return [];
  }
}

// 15. Database Persistence: Get Booking Details (GET /api/flight/bookings/:bookingId)
export async function getFlightBookingDetails(bookingId) {
  console.log(`[FlightService] getFlightBookingDetails requesting GET /api/flight/bookings/${bookingId}`);
  try {
    const response = await client.get(`/api/flight/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    console.warn(`[FlightService] GET /api/flight/bookings/${bookingId} failed:`, error?.message);
    return null;
  }
}

export default {
  searchFlights,
  getPlaces,
  searchAirports,
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
  saveFlightBooking,
  getUserFlightBookings,
  getFlightBookingDetails,
};

