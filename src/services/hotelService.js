import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { readApiMessage } from "./authService";
import { API_BASE_URL } from "../constants/config";

export const HOTEL_API_BASE_URL = API_BASE_URL;

const DEFAULT_CLIENT_ID = process.env.EXPO_PUBLIC_HOTEL_CLIENT_ID || "180232";
const DEFAULT_USERNAME = process.env.EXPO_PUBLIC_HOTEL_USERNAME || "PickNBk6";
const DEFAULT_PASSWORD = process.env.EXPO_PUBLIC_HOTEL_PASSWORD || "PickNB@486";
const DEFAULT_END_USER_IP = process.env.EXPO_PUBLIC_HOTEL_END_USER_IP || "192.168.1.1";

function toHotelUrl(endpoint) {
  const baseUrl = String(HOTEL_API_BASE_URL || "").replace(/\/+$/, "");
  const safeEndpoint = String(endpoint || "").startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${baseUrl}${safeEndpoint}`;
}

let lastTraceId = "";

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
  try {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];

    const response = await axios.get(toHotelUrl("/api/Places"), {
      params: { query: trimmed, tripType: "hotel" },
    });

    return response.data || [];
  } catch (error) {
    console.error("[hotelService] searchCities error:", error?.message, error?.response?.data);
    return [];
  }
}


/**
 * Step 1: Search Hotels Ã¢â‚¬â€ POST /api/Hotels/SearchHotels
 */
export async function searchHotelOffers(params = {}) {
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
    ClientId: String(params.ClientId || params.clientId || DEFAULT_CLIENT_ID),
    UserName: String(params.UserName || params.userName || DEFAULT_USERNAME),
    Password: String(params.Password || params.password || DEFAULT_PASSWORD),
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

  if (response?.data?.traceId !== undefined && response?.data?.traceId !== null) {
    lastTraceId = String(response.data.traceId);
  }


  const apiResults =
    response.data?.results ||
    response.data?.Results ||
    response.data?.hotelSearchResult?.results ||
    response.data?.hotelSearchResult?.Results ||
    response.data?.Data ||
    response.data?.data ||
    (Array.isArray(response.data) ? response.data : null);

  const responseTraceId = response.data?.traceId ? String(response.data.traceId) : lastTraceId;
  const srdvType = String(response.data?.srdvType || "MixAPI");

  if (Array.isArray(apiResults) && apiResults.length > 0) {
    return {
      traceId: responseTraceId,
      srdvType,
      srdvIndex: "15",
      hotels: apiResults.map((hotel) => ({
        ...hotel,
        traceId: String(hotel.traceId || responseTraceId),
        srdvType: String(hotel.srdvType || srdvType),
        srdvIndex: String(hotel.srdvIndex ?? "15"),
        resultIndex: String(hotel.resultIndex ?? hotel.hotelCode ?? ""),
        hotelCode: String(hotel.hotelCode ?? hotel.resultIndex ?? ""),
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
    srdvIndex: "15",
    hotels: [],
  };
}

export async function searchHotels(params) {
  const result = await searchHotelOffers(params);
  return result?.hotels || [];
}

/**
 * Step 2: Get Hotel Info Ã¢â‚¬â€ POST /api/Hotels/GetHotelInfo
 */
export async function getHotelInfo(payload = {}) {
  const resultIndexVal = String(
    payload.ResultIndex || payload.resultIndex || payload.HotelCode || payload.hotelCode || ""
  );
  const hotelCodeVal = String(
    payload.HotelCode || payload.hotelCode || payload.ResultIndex || payload.resultIndex || ""
  );

  const formattedPayload = {
    EndUserIp: String(payload.EndUserIp || payload.endUserIp || DEFAULT_END_USER_IP),
    ClientId: String(payload.ClientId || payload.clientId || DEFAULT_CLIENT_ID),
    UserName: String(payload.UserName || payload.userName || DEFAULT_USERNAME),
    Password: String(payload.Password || payload.password || DEFAULT_PASSWORD),
    TraceId: String(payload.TraceId || payload.traceId || lastTraceId || ""),
    SrdvType: String(payload.SrdvType || payload.srdvType || "MixAPI"),
    SrdvIndex: String(payload.SrdvIndex || payload.srdvIndex || "15"),
    ResultIndex: resultIndexVal,
    HotelCode: hotelCodeVal,
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
      toHotelUrl("/api/Hotels/GetHotelInfo"),
      formattedPayload,
      { headers }
    );


    if (response?.data?.hotelInfoResult?.error?.errorCode && response.data.hotelInfoResult.error.errorCode !== 0) {
      throw new Error(response.data.hotelInfoResult.error.errorMessage || "Trace ID or hotel details not found");
    }

    return response.data;
  } catch (err) {
    if (err.response?.data) {
      const serverMsg =
        err.response.data?.hotelInfoResult?.error?.errorMessage ||
        err.response.data?.errorMessage ||
        err.response.data?.title ||
        err.response.data?.message ||
        (typeof err.response.data === "string" ? err.response.data : null);
      if (serverMsg) {
        throw new Error(serverMsg);
      }
    }
    throw err;
  }
}

/**
 * Step 3: Get Hotel Room Ã¢â‚¬â€ POST /api/Hotels/GetHotelRoom
 */
export async function getHotelRoom(payload = {}) {
  const resultIndexVal = String(
    payload.ResultIndex || payload.resultIndex || payload.HotelCode || payload.hotelCode || ""
  );
  const hotelCodeVal = String(
    payload.HotelCode || payload.hotelCode || payload.ResultIndex || payload.resultIndex || ""
  );

  const formattedPayload = {
    EndUserIp: String(payload.EndUserIp || payload.endUserIp || DEFAULT_END_USER_IP),
    ClientId: String(payload.ClientId || payload.clientId || DEFAULT_CLIENT_ID),
    UserName: String(payload.UserName || payload.userName || DEFAULT_USERNAME),
    Password: String(payload.Password || payload.password || DEFAULT_PASSWORD),
    TraceId: String(payload.TraceId || payload.traceId || lastTraceId || ""),
    SrdvType: String(payload.SrdvType || payload.srdvType || "MixAPI"),
    SrdvIndex: String(payload.SrdvIndex || payload.srdvIndex || "15"),
    ResultIndex: resultIndexVal,
    HotelCode: hotelCodeVal,
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
      toHotelUrl("/api/Hotels/GetHotelRoom"),
      formattedPayload,
      { headers }
    );


    if (response?.data?.getHotelRoomResult?.error?.errorCode && response.data.getHotelRoomResult.error.errorCode !== 0) {
      throw new Error(response.data.getHotelRoomResult.error.errorMessage || "Trace ID or room details not found");
    }

    return response.data;
  } catch (err) {
    if (err.response?.data) {
      const serverMsg =
        err.response.data?.getHotelRoomResult?.error?.errorMessage ||
        err.response.data?.errorMessage ||
        err.response.data?.title ||
        err.response.data?.message ||
        (typeof err.response.data === "string" ? err.response.data : null);
      if (serverMsg) {
        throw new Error(serverMsg);
      }
    }
    throw err;
  }
}

/**
 * Step 4: Block Room Ã¢â‚¬â€ POST /api/Hotels/BlockRoom
 */
export async function blockHotelRoom(payload = {}) {
  const resultIndexVal = String(
    payload.ResultIndex || payload.resultIndex || payload.HotelCode || payload.hotelCode || ""
  );
  const hotelCodeVal = String(
    payload.HotelCode || payload.hotelCode || payload.ResultIndex || payload.resultIndex || resultIndexVal
  );

  const rawRoomList = Array.isArray(payload.HotelRoomsDetails || payload.hotelRoomsDetails)
    ? payload.HotelRoomsDetails || payload.hotelRoomsDetails
    : [];

  const formattedRooms = rawRoomList.map((room) => {
    const offeredPriceVal = Number(room.OfferedPrice ?? room.offeredPrice ?? room.price?.offeredPrice ?? room.price ?? 0);
    const roomPriceVal = Number(room.RoomPrice ?? room.roomPrice ?? room.price?.roomPrice ?? offeredPriceVal);

    const priceObj = room.Price || room.price || {
      CurrencyCode: "INR",
      RoomPrice: roomPriceVal,
      Tax: Number(room.price?.tax || 0),
      ExtraGuestCharge: Number(room.price?.extraGuestCharge || 0),
      ChildCharge: Number(room.price?.childCharge || 0),
      OtherCharges: Number(room.price?.otherCharges || 0),
      Discount: Number(room.price?.discount || 0),
      PublishedPrice: offeredPriceVal,
      PublishedPriceRoundedOff: Math.round(offeredPriceVal),
      OfferedPrice: offeredPriceVal,
      OfferedPriceRoundedOff: Math.round(offeredPriceVal),
      AgentCommission: 0,
      AgentMarkUp: 50,
      ServiceTax: 0,
      TCS: 0,
      TDS: 0,
      ServiceCharge: 0,
      TotalGSTAmount: 0,
      GST: {
        CGSTAmount: 0,
        CGSTRate: 0,
        CessAmount: 0,
        CessRate: 0,
        IGSTAmount: 0,
        IGSTRate: 0,
        SGSTAmount: 0,
        SGSTRate: 0,
        TaxableAmount: 0,
      },
      B2CBasePrice: offeredPriceVal,
      B2CTotalPrice: offeredPriceVal,
    };

    return {
      ChildCount: Number(room.ChildCount ?? room.childCount ?? 0),
      RequireAllPaxDetails: Boolean(room.RequireAllPaxDetails ?? room.requireAllPaxDetails ?? false),
      RoomId: String(room.RoomId || room.roomId || ""),
      RoomStatus: String(room.RoomStatus || room.roomStatus || "Active"),
      RoomIndex: String(room.RoomIndex || room.roomIndex || ""),
      RoomTypeCode: String(room.RoomTypeCode || room.roomTypeCode || ""),
      RoomTypeName: String(room.RoomTypeName || room.roomTypeName || room.categoryName || "Standard Room"),
      RatePlanCode: String(room.RatePlanCode || room.ratePlanCode || room.ratePlan || ""),
      RatePlan: String(room.RatePlan || room.ratePlan || room.RatePlanCode || room.ratePlanCode || ""),
      InfoSource: String(room.InfoSource || room.infoSource || ""),
      SequenceNo: String(room.SequenceNo || room.sequenceNo || ""),
      DayRates: Array.isArray(room.DayRates || room.dayRates) ? (room.DayRates || room.dayRates) : [],
      SupplierPrice: String(room.SupplierPrice ?? room.supplierPrice ?? ""),
      Price: priceObj,
      RoomPromotion: String(room.RoomPromotion || room.roomPromotion || ""),
      Amenities: Array.isArray(room.Amenities || room.amenities)
        ? (room.Amenities || room.amenities).map(a => (typeof a === "object" ? a : { name: String(a) }))
        : [],
      SmokingPreference: String(room.SmokingPreference || room.smokingPreference || "NoPreference"),
      BedTypes: typeof room.BedTypes === "string" ? room.BedTypes : (typeof room.bedTypes === "string" ? room.bedTypes : (room.bedTypes?.[0]?.name || "Standard")),
      HotelSupplements: typeof room.HotelSupplements === "string" ? room.HotelSupplements : (typeof room.hotelSupplements === "string" ? room.hotelSupplements : ""),
      LastCancellationDate: String(room.LastCancellationDate || room.lastCancellationDate || ""),
      CancellationPolicies: Array.isArray(room.CancellationPolicies || room.cancellationPolicies)
        ? (room.CancellationPolicies || room.cancellationPolicies)
        : [],
      CancellationPolicy: String(room.CancellationPolicy || room.cancellationPolicy || ""),
      IsPassportMandatory: Boolean(room.IsPassportMandatory ?? room.isPassportMandatory ?? false),
      IsPANMandatory: Boolean(room.IsPANMandatory ?? room.isPANMandatory ?? false),
      OfferedPrice: offeredPriceVal,
    };
  });

  let clientRef = Number(payload.ClientReferenceNo || payload.clientReferenceNo || Math.floor(Date.now() / 1000));
  if (isNaN(clientRef) || clientRef > 2147483647) {
    clientRef = Math.floor(Date.now() / 1000);
  }

  const formattedPayload = {
    EndUserIp: String(payload.EndUserIp || payload.endUserIp || DEFAULT_END_USER_IP),
    ClientId: String(payload.ClientId || payload.clientId || DEFAULT_CLIENT_ID),
    UserName: String(payload.UserName || payload.userName || DEFAULT_USERNAME),
    Password: String(payload.Password || payload.password || DEFAULT_PASSWORD),
    TraceId: String(payload.TraceId || payload.traceId || lastTraceId || ""),
    SrdvType: String(payload.SrdvType || payload.srdvType || "MixAPI"),
    SrdvIndex: String(payload.SrdvIndex || payload.srdvIndex || "15"),
    ResultIndex: resultIndexVal,
    HotelCode: hotelCodeVal,
    HotelName: String(payload.HotelName || payload.hotelName || "Hotel Stay"),
    GuestNationality: String(payload.GuestNationality || payload.guestNationality || "IN"),
    NoOfRooms: Number(payload.NoOfRooms || payload.noOfRooms || 1),
    ClientReferenceNo: clientRef,
    IsVoucherBooking: Boolean(payload.IsVoucherBooking ?? payload.isVoucherBooking ?? false),
    CouponCode: String(payload.CouponCode || payload.couponCode || "").trim(),
    HotelRoomsDetails: formattedRooms,
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
      toHotelUrl("/api/Hotels/BlockRoom"),
      formattedPayload,
      { headers }
    );


    if (response?.data?.blockRoomResult?.error?.errorCode && response.data.blockRoomResult.error.errorCode !== 0) {
      throw new Error(response.data.blockRoomResult.error.errorMessage || "BlockRoom API returned an error");
    }

    return response.data;
  } catch (err) {
    if (err.response?.data) {
      const serverMsg =
        err.response.data?.blockRoomResult?.error?.errorMessage ||
        err.response.data?.errorMessage ||
        err.response.data?.title ||
        err.response.data?.message ||
        (typeof err.response.data === "string" ? err.response.data : null);
      if (serverMsg) {
        throw new Error(serverMsg);
      }
    }
    throw err;
  }
}

export function blockRoom(payload) {
  return blockHotelRoom(payload);
}

/**
 * Step 5: Pricing Preview Ã¢â‚¬â€ POST /api/Hotels/pricing-preview
 */
export async function getHotelPricingPreview(payload = {}) {
  const formattedPayload = {
    TraceId: String(payload.TraceId || payload.traceId || lastTraceId || ""),
    HotelCode: String(payload.HotelCode || payload.hotelCode || ""),
    BasePrice: Number(payload.BasePrice ?? payload.basePrice ?? 0),
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

    return response.data;
  } catch (error) {
    console.warn("Pricing preview API unreachable, executing local coupon calculations", error?.message);
    let couponDiscount = 0;
    const code = String(payload.CouponCode || "").trim().toUpperCase();
    if (code === "WELCOME10") {
      couponDiscount = Math.round(formattedPayload.BasePrice * 0.10);
    } else if (code === "STEALDEAL") {
      couponDiscount = 500;
    }
    const finalPrice = Math.max(0, formattedPayload.BasePrice - couponDiscount);
    return {
      basePrice: formattedPayload.BasePrice,
      couponDiscount,
      totalPrice: finalPrice,
      currency: "INR",
      appliedCoupon: couponDiscount > 0 ? code : null,
    };
  }
}

/**
 * Step 6: Book Room Ã¢â‚¬â€ POST /api/Hotels/BookRoom
 */
export async function bookHotelOffer(params = {}) {
  let extractedPrice = 0;
  if (typeof params.Price === "number" && !isNaN(params.Price)) {
    extractedPrice = params.Price;
  } else if (typeof params.price === "number" && !isNaN(params.price)) {
    extractedPrice = params.price;
  } else if (params.price && typeof params.price === "object") {
    extractedPrice = Number(params.price.offeredPrice || params.price.roomPrice || params.price.publishedPrice || 0);
  } else if (params.offeredPrice) {
    extractedPrice = Number(params.offeredPrice || 0);
  }

  const guestName = params.GuestName || params.guestName;
  const guestEmail = params.GuestEmail || params.guestEmail;
  const guestPhone = params.GuestPhone || params.guestPhone;

  if (!guestName || !guestEmail || !guestPhone) {
    throw new Error("Missing required guest information (Name, Email, or Phone).");
  }


  const rawRooms = Array.isArray(params.HotelRoomsDetails || params.hotelRoomsDetails)
    ? (params.HotelRoomsDetails || params.hotelRoomsDetails)
    : [];

  const roomDetailsList = rawRooms.map((rm) => ({
    ...rm,
    SupplierPrice: String(rm.SupplierPrice ?? rm.supplierPrice ?? ""),
  }));

  let clientRef = Number(params.ClientReferenceNo || params.clientReferenceNo || Math.floor(Date.now() / 1000));
  if (isNaN(clientRef) || clientRef > 2147483647) {
    clientRef = Math.floor(Date.now() / 1000);
  }

  const requestBody = {
    EndUserIp: String(params.EndUserIp || params.endUserIp || DEFAULT_END_USER_IP),
    ClientId: String(params.ClientId || params.clientId || DEFAULT_CLIENT_ID),
    UserName: String(params.UserName || params.userName || DEFAULT_USERNAME),
    Password: String(params.Password || params.password || DEFAULT_PASSWORD),
    TraceId: String(params.TraceId || params.traceId || lastTraceId || ""),
    SrdvType: String(params.SrdvType || params.srdvType || "MixAPI"),
    SrdvIndex: String(params.SrdvIndex || params.srdvIndex || "15"),
    ResultIndex: String(params.ResultIndex || params.resultIndex || params.offerId || ""),
    HotelCode: String(params.HotelCode || params.hotelCode || params.offerId || ""),
    HotelName: String(params.HotelName || params.hotelName || "Hotel Stay"),
    GuestNationality: String(params.GuestNationality || params.guestNationality || "IN"),
    NoOfRooms: Number(params.NoOfRooms || params.noOfRooms || roomDetailsList.length || 1),
    ClientReferenceNo: clientRef,
    IsVoucherBooking: Boolean(params.IsVoucherBooking ?? params.isVoucherBooking ?? true),
    GuestName: String(guestName),
    GuestEmail: String(guestEmail),
    GuestPhone: String(guestPhone),
    Price: extractedPrice,
    HotelRoomsDetails: roomDetailsList,
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
      toHotelUrl("/api/Hotels/BookRoom"),
      requestBody,
      { headers }
    );


    if (response?.data?.bookResult?.error?.errorCode && response.data.bookResult.error.errorCode !== 0) {
      throw new Error(response.data.bookResult.error.errorMessage || "BookRoom API returned an error");
    }

    return response.data;
  } catch (err) {
    if (err.response?.data) {
      const serverMsg =
        err.response.data?.bookResult?.error?.errorMessage ||
        err.response.data?.errorMessage ||
        err.response.data?.title ||
        err.response.data?.message ||
        (typeof err.response.data === "string" ? err.response.data : null);
      if (serverMsg) {
        throw new Error(serverMsg);
      }
    }
    throw err;
  }
}

export function bookHotel(payload) {
  return bookHotelOffer(payload);
}

/**
 * Step 7: Cancel Room Ã¢â‚¬â€ POST /api/Hotels/CancelRoom
 */
export async function cancelHotelBooking(payload = {}) {
  const providerBookingIdVal = Number(payload.providerBookingId || payload.bookingId || payload.BookingId || 0);
  const traceIdVal = String(payload.traceId || payload.TraceId || lastTraceId || "");

  const formattedPayload = {
    bookingId: providerBookingIdVal,
    changeRequestId: Number(payload.changeRequestId ?? 0),
    requestType: Number(payload.requestType ?? 4),
    bookingMode: Number(payload.bookingMode ?? 5),
    remarks: String(payload.remarks || payload.Remarks || "User requested cancellation"),
    srdvType: String(payload.srdvType || payload.SrdvType || "MixAPI"),
    srdvIndex: String(payload.srdvIndex || payload.SrdvIndex || "15"),
    endUserIp: String(payload.endUserIp || payload.EndUserIp || DEFAULT_END_USER_IP),
    clientId: String(payload.clientId || payload.ClientId || DEFAULT_CLIENT_ID),
    userName: String(payload.userName || payload.UserName || DEFAULT_USERNAME),
    password: String(payload.password || payload.Password || DEFAULT_PASSWORD),
    traceId: traceIdVal,
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
      toHotelUrl("/api/Hotels/CancelRoom"),
      formattedPayload,
      { headers }
    );


    const errObj = response?.data?.error || response?.data?.cancelResult?.error;
    if (errObj?.errorCode && errObj.errorCode !== 0) {
      throw new Error(errObj.errorMessage || "CancelRoom API returned an error");
    }

    return response.data;
  } catch (err) {
    if (err.response?.data) {
      const serverMsg =
        err.response.data?.error?.errorMessage ||
        err.response.data?.errorMessage ||
        err.response.data?.title ||
        err.response.data?.message;
      if (serverMsg) {
        throw new Error(serverMsg);
      }
    }
    throw err;
  }
}

export async function getMyHotelBookings() {
  const token = await getStoredToken();
  const headers = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.get(toHotelUrl("/api/Hotels/my-bookings"), { headers });
    return response.data || [];
  } catch (err) {
    try {
      const fallbackRes = await axios.get(toHotelUrl("/api/Hotels/bookings"), { headers });
      return fallbackRes.data || [];
    } catch (fallbackErr) {
      return [];
    }
  }
}

export async function fetchHotelCoupons() {
  try {
    const response = await axios.get(toHotelUrl("/api/Hotels/coupons/active"), {
      headers: {
        Accept: "application/json",
      }
    });
    return response.data || [];
  } catch (err) {
    return [];
  }
}

export async function validateHotelCoupon(payload = {}) {
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
    return response.data || {};
  } catch (err) {
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
  getMyHotelBookings,
  resolveCityId,
  getLastTraceId,
  fetchHotelCoupons,
  validateHotelCoupon,
};




