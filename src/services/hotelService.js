import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";

export const HOTEL_API_BASE_URL = API_BASE_URL;

const DEFAULT_END_USER_IP = process.env.EXPO_PUBLIC_HOTEL_END_USER_IP || "192.168.1.1";

function toHotelUrl(endpoint) {
  const baseUrl = String(HOTEL_API_BASE_URL || "").replace(/\/+$/, "");
  const safeEndpoint = String(endpoint || "").startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${baseUrl}${safeEndpoint}`;
}

let lastTraceId = null;

function normalizeTraceId(value) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const numeric = Number(raw);
  if (!Number.isSafeInteger(numeric)) {
    throw new Error("The hotel search session identifier is invalid. Please search again.");
  }
  return numeric;
}

function toHotelFlowError(error, fallbackMessage) {
  const data = error?.response?.data;
  const wrapped = new Error(
    data?.message || data?.errorMessage || data?.title ||
    (typeof data === "string" ? data : null) || error?.message || fallbackMessage
  );
  wrapped.status = error?.response?.status;
  wrapped.errorCode = data?.errorCode || data?.ErrorCode || "";
  wrapped.isTraceExpired = wrapped.status === 410 || wrapped.errorCode === "TRACE_ID_EXPIRED";
  return wrapped;
}

// Centralized hotel-flow logging. Sensitive credentials and guest contact data
// are redacted before anything is sent to the Metro/Expo console.
function hotelFlowLog(step, data) {
  try {
    const redacted = JSON.parse(JSON.stringify(data ?? {}));
    const sensitiveKeys = new Set([
      "Password", "password", "Authorization", "authorization", "token",
      "GuestEmail", "guestEmail", "Email", "email", "GuestPhone", "guestPhone",
      "Phoneno", "phone", "PAN", "pan", "PassportNo", "passport",
    ]);
    const redact = (value) => {
      if (!value || typeof value !== "object") return value;
      Object.keys(value).forEach((key) => {
        if (sensitiveKeys.has(key)) value[key] = "[REDACTED]";
        else if (value[key] && typeof value[key] === "object") redact(value[key]);
      });
      return value;
    };
    console.log(`[HotelFlow] ${step}:`, JSON.stringify(redact(redacted), null, 2));
  } catch (err) {
    console.log(`[HotelFlow] ${step}:`, data);
  }
}

function hotelFlowError(step, error) {
  hotelFlowLog(`${step} ERROR`, {
    message: error?.message,
    status: error?.response?.status,
    response: error?.response?.data,
  });
}

export function getLastTraceId() {
  return lastTraceId;
}

async function getStoredToken() {
  try {
    return (await SecureStore.getItemAsync("token")) || "";
  } catch {
    return "";
  }
}

const CITY_TO_ID = {
  del: "725862",
  "new delhi": "725862",
  delhi: "725862",
  bom: "130443",
  mumbai: "130443",
  hyd: "118488",
  hyderabad: "118488",
  blr: "111124",
  bengaluru: "111124",
  bangalore: "111124",
  maa: "115201",
  chennai: "115201",
  ccu: "123604",
  kolkata: "123604",
  goi: "116545",
  goa: "116545",
  jai: "118835",
  jaipur: "118835",
};

export function resolveCityId(cityInput) {
  if (!cityInput) return "";
  const cleanInput = String(cityInput).trim();
  if (/^\d+$/.test(cleanInput)) {
    return cleanInput;
  }
  const lower = cleanInput.toLowerCase().split(",")[0].split("(")[0].trim();
  if (CITY_TO_ID[lower]) {
    return CITY_TO_ID[lower];
  }
  return "";
}

function getDefaultDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

/**
 * Search cities for autocomplete via GET /api/Places?query={cityName}&tripType=hotel
 */
export async function searchCities(query = "") {
  hotelFlowLog("CITY SEARCH REQUEST", { query });
  try {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];

    const response = await axios.get(toHotelUrl("/api/Places"), {
      params: { query: trimmed, tripType: "hotel", field: "all", limit: 20 },
    });

    hotelFlowLog("CITY SEARCH RESPONSE", response.data);

    return response.data || [];
  } catch (error) {
    hotelFlowError("CITY SEARCH", error);
    console.error("[hotelService] searchCities error:", error?.message, error?.response?.data);
    return [];
  }
}


/**
 * Step 1: Search Hotels Ã¢â‚¬â€ POST /api/Hotels/SearchHotels
 */
export async function searchHotelOffers(params = {}) {
  hotelFlowLog("SEARCH START", params);
  const rawCity =
    params.cityId ||
    params.CityId ||
    params.cityCode ||
    params.CityCode ||
    params.city ||
    "";

  const rawCheckIn =
    params.checkInDate || params.CheckInDate || params.checkIn;
  const rawCheckOut =
    params.checkOutDate || params.CheckOutDate || params.checkOut;
  const rawAdults =
    params.adults ?? params.Adults ?? params.noOfAdults ?? 2;
  const rawRooms = params.rooms ?? params.Rooms ?? params.noOfRooms ?? 1;
  const rawChildren =
    params.children ?? params.Children ?? params.noOfChild ?? 0;
  const rawChildAges =
    params.childAges || params.ChildAges || params.childAge || [];
  const rawNationality =
    params.guestNationality || params.GuestNationality || "IN";

  const resolvedCityId = resolveCityId(rawCity);
  if (!resolvedCityId) {
    throw new Error("Destination city is required.");
  }
  const finalCheckInDate =
    typeof rawCheckIn === "string" && rawCheckIn.trim()
      ? rawCheckIn.trim()
      : getDefaultDateString(0);
  const finalCheckOutDate =
    typeof rawCheckOut === "string" && rawCheckOut.trim()
      ? rawCheckOut.trim()
      : getDefaultDateString(1);

  const checkInMs = new Date(finalCheckInDate).getTime();
  const checkOutMs = new Date(finalCheckOutDate).getTime();
  const calculatedNights = Math.max(
    1,
    Math.round((checkOutMs - checkInMs) / (1000 * 60 * 60 * 24))
  );
  const noOfNights = String(
    params.NoOfNights || params.noOfNights || calculatedNights
  );

  const childAgesArray = Array.isArray(rawChildAges)
    ? rawChildAges.map(Number)
    : [];

  const roomGuestsList = Array.isArray(params.RoomGuests || params.roomGuests)
    ? (params.RoomGuests || params.roomGuests)
    : Array.from({ length: Math.max(1, Number(rawRooms) || 1) }, () => ({
      NoOfAdults: String(rawAdults),
      NoOfChild: String(rawChildren),
      ChildAge: childAgesArray,
    }));

  const payloadBody = {
    EndUserIp: String(params.EndUserIp || params.endUserIp || DEFAULT_END_USER_IP),
    CheckInDate: finalCheckInDate,
    CheckOutDate: finalCheckOutDate,
    NoOfNights: noOfNights,
    BookingMode: String(params.BookingMode || params.bookingMode || "5"),
    CountryCode: String(params.CountryCode || params.countryCode || "IN"),
    CityId: resolvedCityId,
    ResultCount: String(params.ResultCount ?? params.resultCount ?? "500"),
    PreferredCurrency: String(
      params.PreferredCurrency || params.preferredCurrency || "INR"
    ),
    GuestNationality: String(rawNationality),
    NoOfRooms: String(rawRooms),
    RoomGuests: roomGuestsList,
    PreferredHotel: String(params.PreferredHotel || params.preferredHotel || ""),
    MaxRating: String(params.MaxRating ?? params.maxRating ?? "5"),
    MinRating: String(params.MinRating ?? params.minRating ?? "1"),
    ReviewScore: Number(params.ReviewScore ?? params.reviewScore ?? 0),
    IsNearBySearchAllowed: Boolean(
      params.IsNearBySearchAllowed ?? params.isNearBySearchAllowed ?? true
    ),
  };


  const token = await getStoredToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await axios.post(
    toHotelUrl("/api/Hotels/SearchHotels"),
    payloadBody,
    { headers }
  );

  hotelFlowLog("SEARCH RESPONSE", response.data);

  const rawResponseTraceId = response.data?.traceId ?? response.data?.TraceId ??
    response.data?.hotelSearchResult?.traceId ?? response.data?.hotelSearchResult?.TraceId;
  if (rawResponseTraceId !== undefined && rawResponseTraceId !== null) {
    lastTraceId = normalizeTraceId(rawResponseTraceId);
  }


  const apiResults =
    response.data?.results ||
    response.data?.Results ||
    response.data?.hotelSearchResult?.results ||
    response.data?.hotelSearchResult?.Results ||
    response.data?.Data ||
    response.data?.data ||
    (Array.isArray(response.data) ? response.data : null);

  const responseTraceId = normalizeTraceId(rawResponseTraceId ?? lastTraceId);
  const srdvType = String(response.data?.srdvType ?? response.data?.SrdvType ?? "MixAPI");
  const srdvIndex = String(response.data?.srdvIndex ?? response.data?.SrdvIndex ?? "15");

  if (Array.isArray(apiResults) && apiResults.length > 0) {
    hotelFlowLog("SEARCH NORMALIZED", { count: apiResults.length, traceId: responseTraceId, srdvType });
    return {
      traceId: responseTraceId,
      srdvType,
      srdvIndex,
      hotels: apiResults.map((hotel) => ({
        ...hotel,
        traceId: normalizeTraceId(hotel.traceId ?? responseTraceId),
        srdvType: String(hotel.srdvType || srdvType),
        srdvIndex: String(hotel.srdvIndex ?? hotel.SrdvIndex ?? srdvIndex),
        resultIndex: String(hotel.resultIndex ?? hotel.ResultIndex ?? ""),
        hotelCode: String(hotel.hotelCode ?? hotel.HotelCode ?? ""),
      })),
    };
  }

  // If search returns 0 results or error structure
  if (response.data?.error?.errorMessage) {
    const rawMsg = String(response.data.error.errorMessage);
    if (response.data.error.errorCode === 100 || rawMsg.includes("Result not found")) {
      throw new Error("No hotel rooms available for the selected dates/city. Please try selecting future dates (e.g. tomorrow or later).");
    }
    throw new Error(rawMsg);
  }

  return {
    traceId: responseTraceId,
    srdvType,
    srdvIndex,
    hotels: [],
  };
}

export async function searchHotels(params) {
  const result = await searchHotelOffers(params);
  return result?.hotels || [];
}

/**
 * Step 2: Get Hotel Info - GET /api/Hotels/GetHotelInfo
 */
export async function getHotelInfo(payload = {}) {
  hotelFlowLog("HOTEL INFO REQUEST", payload);
  const resultIndexVal = String(
    payload.ResultIndex ?? payload.resultIndex ?? ""
  );
  const hotelCodeVal = String(
    payload.HotelCode ?? payload.hotelCode ?? ""
  );

  const formattedPayload = {
    traceId: normalizeTraceId(payload.TraceId ?? payload.traceId ?? lastTraceId),
    resultIndex: resultIndexVal,
    hotelCode: hotelCodeVal,
  };
  if (formattedPayload.traceId === null || !resultIndexVal || !hotelCodeVal) {
    throw new Error("Hotel session details are incomplete. Please search again.");
  }


  const token = await getStoredToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.get(toHotelUrl("/api/Hotels/GetHotelInfo"), {
      headers,
      params: formattedPayload,
    });

    hotelFlowLog("HOTEL INFO RESPONSE", response.data);


    if (response?.data?.hotelInfoResult?.error?.errorCode && response.data.hotelInfoResult.error.errorCode !== 0) {
      throw new Error(response.data.hotelInfoResult.error.errorMessage || "Trace ID or hotel details not found");
    }

    return response.data;
  } catch (err) {
    hotelFlowError("HOTEL INFO", err);
    throw toHotelFlowError(err, "Unable to load hotel information.");
  }
}

/**
 * Step 3: Get Hotel Rooms - GET /api/Hotels/rooms
 */
export async function getHotelRoom(payload = {}) {
  hotelFlowLog("ROOMS REQUEST", payload);
  const resultIndexVal = String(
    payload.ResultIndex ?? payload.resultIndex ?? ""
  );
  const formattedPayload = {
    traceId: normalizeTraceId(payload.TraceId ?? payload.traceId ?? lastTraceId),
    resultIndex: resultIndexVal,
  };
  if (formattedPayload.traceId === null || !resultIndexVal) {
    throw new Error("Hotel room session details are incomplete. Please search again.");
  }


  const token = await getStoredToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.get(toHotelUrl("/api/Hotels/rooms"), {
      headers,
      params: formattedPayload,
    });

    hotelFlowLog("ROOMS RESPONSE", response.data);


    if (response?.data?.getHotelRoomResult?.error?.errorCode && response.data.getHotelRoomResult.error.errorCode !== 0) {
      throw new Error(response.data.getHotelRoomResult.error.errorMessage || "Trace ID or room details not found");
    }

    return response.data;
  } catch (err) {
    hotelFlowError("ROOMS", err);
    throw toHotelFlowError(err, "Unable to load hotel rooms.");
  }
}

/**
 * Step 4: Block Room Ã¢â‚¬â€ POST /api/Hotels/BlockRoom
 */
export async function blockHotelRoom(payload = {}) {
  hotelFlowLog("BLOCK ROOM REQUEST", payload);
  const resultIndexVal = String(
    payload.ResultIndex ?? payload.resultIndex ?? ""
  );
  const hotelCodeVal = String(
    payload.HotelCode ?? payload.hotelCode ?? ""
  );

  const rawRoomList = Array.isArray(payload.HotelRoomsDetails || payload.hotelRoomsDetails)
    ? payload.HotelRoomsDetails || payload.hotelRoomsDetails
    : [];

  const formattedRooms = rawRoomList.map((room) => ({
    RoomIndex: String(room.RoomIndex ?? room.roomIndex ?? ""),
    RoomTypeCode: String(room.RoomTypeCode ?? room.roomTypeCode ?? ""),
    OptionId: String(room.OptionId ?? room.optionId ?? ""),
  }));

  const formattedPayload = {
    TraceId: normalizeTraceId(payload.TraceId ?? payload.traceId ?? lastTraceId),
    ResultIndex: resultIndexVal,
    HotelCode: hotelCodeVal,
    HotelName: String(payload.HotelName || payload.hotelName || "Hotel Stay"),
    GuestNationality: String(payload.GuestNationality || payload.guestNationality || "IN"),
    NoOfRooms: Number(payload.NoOfRooms || payload.noOfRooms || 1),
    HotelRoomsDetails: formattedRooms,
  };
  if (
    formattedPayload.TraceId === null || !formattedPayload.ResultIndex || !formattedPayload.HotelCode ||
    formattedRooms.length === 0 ||
    formattedRooms.some((room) => !room.RoomIndex || !room.RoomTypeCode || !room.OptionId)
  ) {
    throw new Error("The selected room rate is incomplete. Please select the room again.");
  }


  const token = await getStoredToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.post(
      toHotelUrl("/api/Hotels/BlockRoom"),
      formattedPayload,
      { headers }
    );

    hotelFlowLog("BLOCK ROOM RESPONSE", response.data);


    if (response?.data?.blockRoomResult?.error?.errorCode && response.data.blockRoomResult.error.errorCode !== 0) {
      throw new Error(response.data.blockRoomResult.error.errorMessage || "BlockRoom API returned an error");
    }

    return response.data;
  } catch (err) {
    hotelFlowError("BLOCK ROOM", err);
    throw toHotelFlowError(err, "Room availability verification failed.");
  }
}

export function blockRoom(payload) {
  return blockHotelRoom(payload);
}

/**
 * Step 5: Pricing Preview Ã¢â‚¬â€ POST /api/Hotels/pricing-preview
 */
export async function getHotelPricingPreview(payload = {}) {
  hotelFlowLog("PRICING PREVIEW REQUEST", payload);
  const formattedPayload = {
    HotelCode: String(payload.HotelCode || payload.hotelCode || ""),
    B2CBasePrice: Number(payload.B2CBasePrice ?? payload.b2CBasePrice ?? payload.basePrice ?? 0),
    SrdvGstAmount: Number(payload.SrdvGstAmount ?? payload.srdvGstAmount ?? 0),
    CouponCode: String(payload.CouponCode || payload.couponCode || "").trim(),
  };


  try {
    const token = await getStoredToken();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      toHotelUrl("/api/Hotels/pricing-preview"),
      formattedPayload,
      { headers }
    );

    hotelFlowLog("PRICING PREVIEW RESPONSE", response.data);

    return response.data;
  } catch (error) {
    hotelFlowError("PRICING PREVIEW", error);
    throw toHotelFlowError(error, "Unable to verify the current hotel price.");
  }
}

/**
 * Direct provider booking is intentionally disabled. Cashfree fulfillment is backend-owned.
 */
export async function bookHotelOffer(params = {}) {
  void params;
  throw new Error("Hotel fulfillment is handled automatically after verified payment.");
}

export function bookHotel(payload) {
  return bookHotelOffer(payload);
}

/**
 * Step 7: Cancel Room Ã¢â‚¬â€ POST /api/Hotels/CancelRoom
 */
export function normalizeHotelBookingId(value) {
  const normalized = String(value ?? "").trim().replace(/^bk-/i, "");
  if (!/^\d+$/.test(normalized)) throw new Error("A valid internal Hotel booking ID is required.");
  return normalized;
}

export async function cancelHotelBooking(payload = {}) {
  hotelFlowLog("CANCEL BOOKING REQUEST", payload);
  const bookingId = normalizeHotelBookingId(payload.bookingId ?? payload.BookingId);
  const preference = String(payload.refundPreference || "ORIGINAL_PAYMENT_METHOD").trim().toUpperCase();
  if (!["ORIGINAL_PAYMENT_METHOD", "WALLET"].includes(preference)) {
    throw new Error("A valid Hotel refund destination is required.");
  }
  const formattedPayload = {
    reason: String(payload.reason || payload.remarks || payload.Remarks || "Cancelled by user").trim().slice(0, 2000) || "Cancelled by user",
    refundPreference: preference,
  };


  const token = await getStoredToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.post(
      toHotelUrl(`/api/Hotels/bookings/${encodeURIComponent(bookingId)}/cancel`),
      formattedPayload,
      { headers }
    );

    hotelFlowLog("CANCEL ROOM RESPONSE", response.data);


    return response.data;
  } catch (err) {
    hotelFlowError("CANCEL BOOKING", err);
    throw toHotelFlowError(err, "Unable to cancel this hotel booking.");
  }
}

export async function getHotelCancellationQuote(bookingId) {
  const cleanId = normalizeHotelBookingId(bookingId);
  const token = await getStoredToken();
  try {
    const response = await axios.get(
      toHotelUrl(`/api/Hotels/bookings/${encodeURIComponent(cleanId)}/cancellation-quote`),
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return response.data;
  } catch (error) {
    throw toHotelFlowError(error, "Unable to load the hotel cancellation quote.");
  }
}

export async function getHotelBookingById(bookingId) {
  const cleanId = normalizeHotelBookingId(bookingId);
  const token = await getStoredToken();
  try {
    const response = await axios.get(
      toHotelUrl(`/api/Hotels/bookings/${encodeURIComponent(cleanId)}`),
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return response.data;
  } catch (error) {
    throw toHotelFlowError(error, "Unable to load the confirmed hotel booking.");
  }
}

export async function getMyHotelBookings() {
  hotelFlowLog("MY BOOKINGS START", {});
  const token = await getStoredToken();
  const headers = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.get(toHotelUrl("/api/Hotels/my-bookings"), { headers });
    hotelFlowLog("MY BOOKINGS RESPONSE", response.data);
    return response.data || [];
  } catch (err) {
    hotelFlowError("MY BOOKINGS PRIMARY", err);
    try {
      const fallbackRes = await axios.get(toHotelUrl("/api/Hotels/bookings"), { headers });
      hotelFlowLog("MY BOOKINGS FALLBACK RESPONSE", fallbackRes.data);
      return fallbackRes.data || [];
    } catch (fallbackErr) {
      hotelFlowError("MY BOOKINGS FALLBACK", fallbackErr);
      return [];
    }
  }
}

export async function fetchHotelCoupons() {
  hotelFlowLog("COUPONS START", {});
  try {
    const response = await axios.get(toHotelUrl("/api/Hotels/coupons"), {
      headers: {
        Accept: "application/json",
      }
    });
    hotelFlowLog("COUPONS RESPONSE", response.data);
    return response.data || [];
  } catch (err) {
    hotelFlowError("COUPONS", err);
    return [];
  }
}

export async function validateHotelCoupon(payload = {}) {
  hotelFlowLog("COUPON VALIDATION REQUEST", payload);
  const token = await getStoredToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.post(toHotelUrl("/api/Hotels/coupons/validate"), payload, { headers });
    hotelFlowLog("COUPON VALIDATION RESPONSE", response.data);
    return response.data || {};
  } catch (err) {
    hotelFlowError("COUPON VALIDATION", err);
    if (err.response?.data) {
      const serverMsg = err.response.data?.message || err.response.data?.title || (typeof err.response.data === "string" ? err.response.data : null);
      throw new Error(serverMsg || "Failed to validate coupon");
    }
    throw err;
  }
}

export default {
  searchHotelOffers,
  searchHotels,
  getHotelInfo,
  getHotelRoom,
  blockHotelRoom,
  blockRoom,
  getHotelPricingPreview,
  bookHotelOffer,
  bookHotel,
  cancelHotelBooking,
  getHotelCancellationQuote,
  getHotelBookingById,
  getMyHotelBookings,
  resolveCityId,
  getLastTraceId,
  fetchHotelCoupons,
  validateHotelCoupon,
};

