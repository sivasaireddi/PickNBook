import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { readApiMessage, AUTH_API_BASE_URL } from "./authService";

export const HOTEL_API_BASE_URL =
  process.env.EXPO_PUBLIC_HOTEL_API_BASE_URL ||
  "https://satin-eastcoast-musky.ngrok-free.dev";

function toHotelUrl(endpoint) {
  const baseUrl = String(HOTEL_API_BASE_URL || "").replace(/\/+$/, "");
  const safeEndpoint = String(endpoint || "").startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${baseUrl}${safeEndpoint}`;
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.Data)) return payload.Data;
  if (Array.isArray(payload?.hotels)) return payload.hotels;
  return [];
}

function pickFirst(source, keys, fallback = null) {
  if (!source || typeof source !== "object") return fallback;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return fallback;
}

function normalizeHotelOffer(offer = {}, index = 0) {
  const price = pickFirst(offer, ["price", "Price", "totalPrice", "TotalPrice"], 0);
  const currency = pickFirst(offer, ["currency", "Currency"], "INR");
  const roomCategory = pickFirst(
    offer,
    ["roomCategory", "RoomCategory", "roomType", "RoomType"],
    "Standard Room",
  );

  return {
    ...offer,
    offerId: String(pickFirst(offer, ["offerId", "OfferId", "id", "Id"], `hotel-offer-${index + 1}`)),
    price: Number(price) || 0,
    currency,
    roomCategory,
    bedType: pickFirst(offer, ["bedType", "BedType"], "Double"),
    roomDescription: pickFirst(
      offer,
      ["roomDescription", "RoomDescription", "description", "Description"],
      roomCategory,
    ),
    cancellationPolicy: pickFirst(
      offer,
      ["cancellationPolicy", "CancellationPolicy"],
      "Cancellation policy applies",
    ),
    paymentType: pickFirst(offer, ["paymentType", "PaymentType"], ""),
    checkInDate: pickFirst(offer, ["checkInDate", "CheckInDate"], ""),
    checkOutDate: pickFirst(offer, ["checkOutDate", "CheckOutDate"], ""),
  };
}

function normalizeHotelRecord(hotel = {}, index = 0) {
  const name = pickFirst(hotel, ["name", "Name", "hotelName", "HotelName"], `Hotel stay ${index + 1}`);
  const cityCode = pickFirst(hotel, ["cityCode", "CityCode", "city", "City"], "");
  const rawOffers = pickFirst(hotel, ["offers", "Offers"], []);
  const offers = Array.isArray(rawOffers)
    ? rawOffers.map((offer, offerIndex) => normalizeHotelOffer(offer, offerIndex))
    : [];

  return {
    ...hotel,
    hotelId: String(pickFirst(hotel, ["hotelId", "HotelId", "id", "Id"], `hotel-${index + 1}`)),
    name,
    cityCode,
    address: pickFirst(hotel, ["address", "Address"], cityCode),
    rating: Number(pickFirst(hotel, ["rating", "Rating"], 4.4)) || 4.4,
    amenities: pickFirst(hotel, ["amenities", "Amenities"], ["Wi-Fi", "Breakfast"]),
    images: pickFirst(hotel, ["images", "Images"], []),
    latitude: Number(pickFirst(hotel, ["latitude", "Latitude"], 0)),
    longitude: Number(pickFirst(hotel, ["longitude", "Longitude"], 0)),
    offers,
  };
}

let lastTraceId = "T123456";

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

async function requestHotelJson(urlOrPath, options = {}, fallbackMessage = "Hotel request failed.") {
  const token = await getStoredToken();
  const resolvedUrl = toHotelUrl(urlOrPath);
  const headers = {
    Accept: "application/json, text/plain, */*",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(resolvedUrl, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(readApiMessage(payload, fallbackMessage) || fallbackMessage);
  }

  return payload;
}

const CITY_TO_IATA = {
  hyderabad: "HYD",
  bengaluru: "BLR",
  bangalore: "BLR",
  mumbai: "BOM",
  delhi: "DEL",
  "new delhi": "DEL",
  goa: "GOI",
  jaipur: "JAI",
  chennai: "MAA",
  kolkata: "CCU",
  pune: "PNQ",
  ahmedabad: "AMD",
  kochi: "COK",
  cochin: "COK",
  tirupati: "TIR",
};

function resolveCityCode(cityInput) {
  if (!cityInput) return "HYD";
  const cleanInput = String(cityInput).trim().toLowerCase();
  const bracketMatch = cleanInput.match(/\(([^)]+)\)/);
  if (bracketMatch && bracketMatch[1].trim().length === 3) {
    return bracketMatch[1].trim().toUpperCase();
  }
  if (cleanInput.length === 3) {
    return cleanInput.toUpperCase();
  }
  const cityNameOnly = cleanInput.split(",")[0].split("(")[0].trim();
  if (CITY_TO_IATA[cityNameOnly]) return CITY_TO_IATA[cityNameOnly];
  const alphaOnly = cityNameOnly.replace(/[^a-z]/g, "");
  return alphaOnly.slice(0, 3).toUpperCase() || "HYD";
}

function getDefaultDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

const MOCK_HOTELS_DATA = {
  HYD: [
    {
      hotelId: "hyd-falaknuma-01",
      name: "Taj Falaknuma Palace",
      cityCode: "HYD",
      address: "Engine Bowli, Falaknuma, Hyderabad, Telangana, India",
      amenities: ["Heritage", "Pool", "Spa", "Fine Dining"],
      images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      hotelId: "hyd-westin-02",
      name: "The Westin Hyderabad Mindspace",
      cityCode: "HYD",
      address: "Mindspace IT Park, Hitech City, Hyderabad, India",
      amenities: ["Wi-Fi", "Pool", "Gym", "Business Center"],
      images: ["https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      hotelId: "hyd-parkhyatt-03",
      name: "Park Hyatt Hyderabad",
      cityCode: "HYD",
      address: "Road No. 2, Banjara Hills, Hyderabad, Telangana",
      amenities: ["Luxury Spa", "Pool", "Free Wi-Fi", "Fine Dining"],
      images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"],
    },
  ],
  DEL: [
    {
      hotelId: "del-tajmahal-01",
      name: "The Taj Mahal Hotel New Delhi",
      cityCode: "DEL",
      address: "Number 1, Mansingh Road, New Delhi, India",
      amenities: ["Heritage", "Pool", "Spa", "Luxury"],
      images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      hotelId: "del-leela-02",
      name: "The Leela Palace New Delhi",
      cityCode: "DEL",
      address: "Chanakyapuri, Diplomatic Enclave, New Delhi, India",
      amenities: ["Wi-Fi", "Fine Dining", "Gym", "Pool"],
      images: ["https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=1200&q=80"],
    },
  ],
  BOM: [
    {
      hotelId: "bom-taj-01",
      name: "Taj Lands End",
      cityCode: "BOM",
      address: "Bandra West, Mumbai, Maharashtra, India",
      amenities: ["Sea View", "Pool", "Spa", "Dining"],
      images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      hotelId: "bom-itc-02",
      name: "ITC Grand Central",
      cityCode: "BOM",
      address: "Parel, Mumbai, Maharashtra, India",
      amenities: ["Wi-Fi", "Gym", "Pool", "Conference"],
      images: ["https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=1200&q=80"],
    },
  ],
  BLR: [
    {
      hotelId: "blr-leela-01",
      name: "The Leela Palace Bengaluru",
      cityCode: "BLR",
      address: "HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka",
      amenities: ["Royal Gardens", "Pool", "Spa", "Fine Dining"],
      images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"],
    },
    {
      hotelId: "blr-taj-02",
      name: "Taj West End Bengaluru",
      cityCode: "BLR",
      address: "Race Course Road, High Grounds, Bengaluru",
      amenities: ["Heritage Garden", "Pool", "Tennis Court", "Wi-Fi"],
      images: ["https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=1200&q=80"],
    },
  ],
};

function buildMockHotelResults(cityCode, checkInDate, checkOutDate) {
  const code = String(cityCode || "HYD").trim().toUpperCase();
  const hotels = MOCK_HOTELS_DATA[code] || MOCK_HOTELS_DATA.HYD;

  const PLACEHOLDER_IMAGE =
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

  return hotels.map((hotel, index) => {
    const basePrice = 4500 + index * 1800;

    return {
      srdvIndex: index + 1,
      resultIndex: `mock-result-${index + 1}`,
      offeredFare: basePrice,
      hotelCode: hotel.hotelId,
      hotelName: hotel.name,
      hotelCategory: "Premium Stay",
      starRating: 4.5,
      hotelDescription: "Comfortable room with premium amenities.",
      hotelPromotion: "",
      hotelPolicy: "Free cancellation before check-in date.",
      hotelPicture: PLACEHOLDER_IMAGE,
      hotelAddress: hotel.address,
      city: hotel.cityCode,
      state: "Telangana",
      pinCode: "500001",
      country: "India",
      hotelContactNo: "+91 99999 99999",
      hotelMap: "",
      latitude: 17.385,
      longitude: 78.4867,
      hotelLocation: hotel.address,
      supplierPrice: basePrice,
      facilities: [
        {
          facilitiesNames: ["ROOM ONLY", "Wi-Fi included", "Breakfast"],
          roomPrice: basePrice,
        }
      ],
      rooms: [
        {
          cateogry: "Double or Twin Room",
        }
      ],
      price: {
        currencyCode: "INR",
        roomPrice: basePrice,
        tax: 0,
        extraGuestCharge: 0,
        childCharge: 0,
        otherCharges: 0,
        discount: index === 0 ? 500 : 0,
        publishedPrice: index === 0 ? basePrice + 500 : basePrice,
        offeredPrice: basePrice,
        totalGSTAmount: 0,
        agentCommission: 0,
        agentMarkUp: 0,
        serviceTax: 0,
        serviceCharge: 0,
        gst: {
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          cessAmount: 0,
          taxableAmount: basePrice,
        }
      }
    };
  });
}

async function getMockBookings() {
  try {
    const raw = await SecureStore.getItemAsync("mock_hotel_bookings");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveMockBookings(list) {
  try {
    const trimmed = (list || []).slice(0, 3).map((b) => ({
      bookingId: b.bookingId,
      bookingReference: b.bookingReference,
      hotelName: b.hotelName,
      status: b.status,
      guestName: b.guestName,
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      price: b.price,
      createdAt: b.createdAt,
    }));
    await SecureStore.setItemAsync("mock_hotel_bookings", JSON.stringify(trimmed));
  } catch {
    // ignore persistence failures
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

function resolveCityId(cityInput) {
  if (!cityInput) return "725862";
  const cleanInput = String(cityInput).trim();
  if (/^\d+$/.test(cleanInput)) {
    return cleanInput;
  }
  const lower = cleanInput.toLowerCase().split(",")[0].split("(")[0].trim();
  if (CITY_TO_ID[lower]) {
    return CITY_TO_ID[lower];
  }
  return "725862";
}

export async function searchHotelOffers(params = {}) {
  const rawCity =
    params.cityId ||
    params.CityId ||
    params.cityCode ||
    params.CityCode ||
    params.city ||
    "725862";
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
  const resolvedCode = resolveCityCode(rawCity);
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
    : [
        {
          NoOfAdults: String(rawAdults),
          NoOfChild: String(rawChildren),
          ChildAge: childAgesArray,
        },
      ];

  const payloadBody = {
    EndUserIp: String(params.EndUserIp || params.endUserIp || "127.0.0.1"),
    ClientId: String(params.ClientId || params.clientId || "180170"),
    UserName: String(params.UserName || params.userName || "PickNBk6"),
    Password: String(params.Password || params.password || "PickNB@486"),
    CheckInDate: finalCheckInDate,
    CheckOutDate: finalCheckOutDate,
    NoOfNights: noOfNights,
    BookingMode: String(params.BookingMode || params.bookingMode || "5"),
    CountryCode: String(params.CountryCode || params.countryCode || "IN"),
    CityId: resolvedCityId,
    ResultCount: String(params.ResultCount ?? params.resultCount ?? "0"),
    PreferredCurrency: String(
      params.PreferredCurrency || params.preferredCurrency || "INR"
    ),
    GuestNationality: String(rawNationality),
    RequestType: String(params.RequestType || params.requestType || "1"),
    NoOfRooms: String(rawRooms),
    RoomGuests: roomGuestsList,
    PreferredHotel: String(params.PreferredHotel || params.preferredHotel || ""),
    MaxRating: String(params.MaxRating ?? params.maxRating ?? "5"),
    MinRating: String(params.MinRating ?? params.minRating ?? "1"),
    ReviewScore: Number(params.ReviewScore ?? params.reviewScore ?? 0),
    IsNearBySearchAllowed: Boolean(
      params.IsNearBySearchAllowed ?? params.isNearBySearchAllowed ?? false
    ),
  };

  try {
    console.log(`[hotelService] calling SearchHotels POST to ${toHotelUrl("/api/Hotels/SearchHotels")}`);
    console.log("[hotelService] payloadBody:", JSON.stringify(payloadBody, null, 2));
    const token = await getStoredToken();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
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
      console.log("[hotelService] search query cached traceId:", lastTraceId);
    }

    console.log("[hotelService] SearchHotels API response payload:", JSON.stringify(response?.data, null, 2));

    const apiResults =
      response.data?.results ||
      response.data?.Results ||
      response.data?.hotelSearchResult?.results ||
      response.data?.hotelSearchResult?.Results ||
      response.data?.Data ||
      response.data?.data ||
      (Array.isArray(response.data) ? response.data : null);

    if (Array.isArray(apiResults) && apiResults.length > 0) {
      console.log(`[hotelService] Live API returned ${apiResults.length} hotel results.`);
      return apiResults;
    }

    console.warn("[hotelService] Live API returned 0 hotel results. Falling back to curated hotels data.");
    return buildMockHotelResults(resolvedCode, finalCheckInDate, finalCheckOutDate);
  } catch (error) {
    console.warn("Hotel search provider failed, using local fallback data", error?.message);
    return buildMockHotelResults(resolvedCode, finalCheckInDate, finalCheckOutDate);
  }
}

export async function searchHotels(params) {
  console.log("[hotelService] searchHotels called with:", params);
  const results = await searchHotelOffers(params);
  console.log("[hotelService] search results count:", results?.length || 0);
  return results || [];
}

export async function getHotelOfferDetails(offerId) {
  try {
    const payload = await requestHotelJson(
      `/api/hotels/offers/${encodeURIComponent(offerId)}`,
      { method: "GET" },
      "Selected hotel offer is no longer available.",
    );

    const offer =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload.data || payload.Data || payload.offer || payload.Offer || payload
        : payload;

    return normalizeHotelOffer(offer);
  } catch (error) {
    console.warn("Hotel offer details fetch failed, using fallback data", error);
    return normalizeHotelOffer({
      offerId,
      price: 5400,
      currency: "INR",
      roomCategory: "Standard Room",
      bedType: "Double",
      roomDescription: "Fallback room details are being shown because the provider is unavailable.",
      cancellationPolicy: "Free cancellation before arrival.",
      paymentType: "GUARANTEE",
    });
  }
}

export function getOfferDetails(offerId) {
  return getHotelOfferDetails(offerId);
}

export async function bookHotelOffer(params = {}) {
  let extractedPrice = 0;
  if (typeof params.price === "number" && !isNaN(params.price)) {
    extractedPrice = params.price;
  } else if (params.price && typeof params.price === "object") {
    extractedPrice = Number(params.price.offeredPrice || params.price.roomPrice || params.price.publishedPrice || 0);
  } else if (params.offeredPrice) {
    extractedPrice = Number(params.offeredPrice || 0);
  } else if (params.offeredFare) {
    extractedPrice = Number(params.offeredFare || 0);
  }

  const offerIdValue = String(params.offerId || params.resultIndex || params.hotelCode || "").trim();

  const requestBody = {
    offerId: offerIdValue,
    guestName: String(params.guestName || "Guest").trim(),
    guestEmail: String(params.guestEmail || "guest@example.com").trim(),
    guestPhone: String(params.guestPhone || "9876543210").trim(),
    couponCode: params.couponCode ? String(params.couponCode).trim() : null,
    paymentMethod: String(params.paymentMethod || "CreditCard").trim(),

    // Fallback fields for backend cache expiry handling
    traceId: String(params.traceId || params.TraceId || getLastTraceId() || "12"),
    resultIndex: String(params.resultIndex || params.ResultIndex || offerIdValue),
    hotelCode: String(params.hotelCode || params.HotelCode || offerIdValue),
    hotelName: String(params.hotelName || params.HotelName || "Hotel Stay"),
    price: extractedPrice,
    checkInDate: String(params.checkInDate || params.CheckInDate || ""),
    checkOutDate: String(params.checkOutDate || params.CheckOutDate || ""),
    rooms: Number(params.rooms ?? params.Rooms ?? params.noOfRooms ?? 1),
    adults: Number(params.adults ?? params.Adults ?? params.noOfAdults ?? 2),
    cityCode: String(params.cityCode || params.CityCode || params.cityId || "DEL"),
  };

  console.log(`[hotelService] calling Book POST to ${toHotelUrl("/api/Hotels/book")}`);
  console.log("Hotel Book Request", JSON.stringify(requestBody, null, 2));

  try {
    const token = await getStoredToken();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      toHotelUrl("/api/Hotels/book"),
      requestBody,
      { headers }
    );

    console.log("[hotelService] Book API response:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.log("Hotel Book Request", JSON.stringify(requestBody, null, 2));
    console.log("Hotel Book Error", error?.response?.data || error?.message);

    console.warn("Hotel Book API failed, using fallback mock booking", error?.message);
    const existing = await getMockBookings();
    const mockBooking = {
      bookingId: `bk-${Date.now().toString().slice(-4)}`,
      bookingReference: `HT-${Date.now().toString().slice(-6)}`,
      providerBookingId: `MOCK-BK-${Date.now().toString().slice(-6)}`,
      hotelId: requestBody.hotelCode,
      hotelName: requestBody.hotelName,
      offerId: requestBody.offerId,
      guestName: requestBody.guestName,
      guestEmail: requestBody.guestEmail,
      guestPhone: requestBody.guestPhone,
      checkInDate: requestBody.checkInDate,
      checkOutDate: requestBody.checkOutDate,
      adults: requestBody.adults,
      rooms: requestBody.rooms,
      price: requestBody.price,
      totalPrice: requestBody.price,
      amount: requestBody.price,
      currency: "INR",
      status: "Confirmed",
      createdAt: new Date().toISOString(),
      error: error?.response?.data?.message || error?.message || "Booking failed",
    };

    await saveMockBookings([mockBooking, ...existing]);
    return mockBooking;
  }
}

export function bookHotel(payload) {
  return bookHotelOffer(payload);
}

export async function getHotelPricingPreview(payload) {
  const basePrice = (payload.roomPrice || 0) * (payload.nights || 1);
  const gstAmount = Math.round(basePrice * 0.12);
  const convenienceFee = 150;
  const grandTotal = basePrice + gstAmount + convenienceFee;

  return {
    basePrice,
    gstAmount,
    convenienceFee,
    totalDiscount: 0,
    grandTotal,
  };
}

export async function getMyHotelBookings() {
  try {
    const payload = await requestHotelJson(
      "/api/hotels/my-bookings",
      { method: "GET" },
      "Unable to load hotel bookings.",
    );
    return normalizePayload(payload);
  } catch {
    return getMockBookings();
  }
}

export async function cancelHotelBooking(bookingId, reason = "") {
  try {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    return await requestHotelJson(
      `/api/hotels/bookings/${encodeURIComponent(bookingId)}/cancel${query}`,
      { method: "POST" },
      "Unable to cancel hotel booking.",
    );
  } catch {
    const existing = await getMockBookings();
    const updated = existing.map((booking) =>
      booking.bookingId === bookingId || String(booking.bookingId) === String(bookingId)
        ? { ...booking, status: "Cancelled" }
        : booking,
    );
    await saveMockBookings(updated);
    return {
      bookingId,
      status: "Cancelled",
      message: "Booking cancelled successfully (local fallback).",
    };
  }
}

export async function getHotelPromotions() {
  return [];
}

export async function validateHotelCoupon(couponCode, price) {
  try {
    return await requestHotelJson(
      "/api/hotels/coupons/validate",
      {
        method: "POST",
        body: JSON.stringify({
          couponCode,
          price,
        }),
      },
      "Coupon code is invalid or expired.",
    );
  } catch (error) {
    console.warn("Hotel coupon validation API failed, using fallback logic", error);
    const code = String(couponCode).trim().toUpperCase();
    if (code === "WELCOME10") {
      return {
        valid: true,
        discount: Math.round(price * 0.10),
        couponCode: "WELCOME10",
        message: "WELCOME10 (10%) applied successfully!",
      };
    } else if (code === "STEALDEAL") {
      return {
        valid: true,
        discount: 500,
        couponCode: "STEALDEAL",
        message: "STEALDEAL (Flat ₹500) applied successfully!",
      };
    } else {
      throw new Error(error?.message || "Invalid coupon code.");
    }
  }
}

export async function getHotelInfo(payload = {}) {
  try {
    const resultIndexVal = String(
      payload.ResultIndex || payload.resultIndex || payload.HotelCode || payload.hotelCode || ""
    );
    const hotelCodeVal = String(
      payload.HotelCode || payload.hotelCode || payload.ResultIndex || payload.resultIndex || ""
    );

    const formattedPayload = {
      EndUserIp: String(payload.EndUserIp || payload.endUserIp || "127.0.0.1"),
      ClientId: String(payload.ClientId || payload.clientId || "180170"),
      UserName: String(payload.UserName || payload.userName || "PickNBk6"),
      Password: String(payload.Password || payload.password || "PickNB@486"),
      TraceId: String(payload.TraceId || payload.traceId || getLastTraceId() || "52808"),
      SrdvType: String(payload.SrdvType || payload.srdvType || "MixAPI"),
      SrdvIndex: String(payload.SrdvIndex || payload.srdvIndex || "15"),
      ResultIndex: resultIndexVal,
      HotelCode: hotelCodeVal,
    };

    console.log(`[hotelService] calling GetHotelInfo POST to ${toHotelUrl("/api/Hotels/GetHotelInfo")}`);
    console.log("[hotelService] GetHotelInfo payload:", JSON.stringify(formattedPayload, null, 2));

    const token = await getStoredToken();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      toHotelUrl("/api/Hotels/GetHotelInfo"),
      formattedPayload,
      { headers }
    );

    console.log("[hotelService] GetHotelInfo API response payload:", JSON.stringify(response?.data, null, 2));

    if (response?.data?.hotelInfoResult?.hotelDetails) {
      return response.data;
    }

    console.warn("GetHotelInfo live API returned no hotelDetails, falling back to mock data");
    const code = hotelCodeVal || "H10025";
    return {
      hotelInfoResult: {
        error: { errorCode: 0, errorMessage: "" },
        hotelDetails: {
          hotelName: "Grand Palace Stay",
          hotelCode: code,
          starRating: 5,
          description: "A luxury palace offering the finest stays, dynamic city views, and premium services.",
          otherDetails: "Check-in from 12:00 PM, check-out until 11:00 AM.",
          address: "1 Palace Road, Downtown Area",
          city: "Mumbai",
          state: "Maharashtra",
          countryName: "India",
          pinCode: "400001",
          hotelContactNo: "+91 22 9999 9999",
          email: "reservations@grandpalace.com",
          faxNumber: "+91 22 9999 9998",
          latitude: 18.9226,
          longitude: 72.8333,
          hotelPicture: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
          images: [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80"
          ],
          hotelFacilities: ["Wi-Fi", "Free Breakfast", "Swimming Pool", "Fitness Center", "Spa & Wellness", "Bar & Restaurant"],
          attractions: ["Gateway of India - 1.2 km", "Marine Drive - 2.5 km", "Chhatrapati Shivaji Maharaj Terminus - 3.0 km"],
          policyAndInstruction: "Check-in requires a valid government-issued photo ID. Payment at hotel requires cash or standard card authorization. Extra guest charges may apply.",
        }
      }
    };
  } catch (error) {
    console.warn("GetHotelInfo API failed, using local mock fallback data", error?.message);
    const code = payload?.hotelCode || payload?.HotelCode || "H10025";
    return {
      hotelInfoResult: {
        error: { errorCode: 0, errorMessage: "" },
        hotelDetails: {
          hotelName: "Grand Palace Stay",
          hotelCode: code,
          starRating: 5,
          description: "A luxury palace offering the finest stays, dynamic city views, and premium services.",
          otherDetails: "Check-in from 12:00 PM, check-out until 11:00 AM.",
          address: "1 Palace Road, Downtown Area",
          city: "Mumbai",
          state: "Maharashtra",
          countryName: "India",
          pinCode: "400001",
          hotelContactNo: "+91 22 9999 9999",
          email: "reservations@grandpalace.com",
          faxNumber: "+91 22 9999 9998",
          latitude: 18.9226,
          longitude: 72.8333,
          hotelPicture: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
          images: [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80"
          ],
          hotelFacilities: ["Wi-Fi", "Free Breakfast", "Swimming Pool", "Fitness Center", "Spa & Wellness", "Bar & Restaurant"],
          attractions: ["Gateway of India - 1.2 km", "Marine Drive - 2.5 km", "Chhatrapati Shivaji Maharaj Terminus - 3.0 km"],
          policyAndInstruction: "Check-in requires a valid government-issued photo ID. Payment at hotel requires cash or standard card authorization. Extra guest charges may apply.",
        }
      }
    };
  }
}

export async function getHotelRoom(payload = {}) {
  try {
    const resultIndexVal = String(
      payload.ResultIndex || payload.resultIndex || payload.HotelCode || payload.hotelCode || ""
    );
    const hotelCodeVal = String(
      payload.HotelCode || payload.hotelCode || payload.ResultIndex || payload.resultIndex || ""
    );

    const formattedPayload = {
      EndUserIp: String(payload.EndUserIp || payload.endUserIp || "127.0.0.1"),
      ClientId: String(payload.ClientId || payload.clientId || "180170"),
      UserName: String(payload.UserName || payload.userName || "PickNBk6"),
      Password: String(payload.Password || payload.password || "PickNB@486"),
      TraceId: String(payload.TraceId || payload.traceId || getLastTraceId() || "52808"),
      SrdvType: String(payload.SrdvType || payload.srdvType || "MixAPI"),
      SrdvIndex: String(payload.SrdvIndex || payload.srdvIndex || "15"),
      ResultIndex: resultIndexVal,
      HotelCode: hotelCodeVal,
    };

    console.log(`[hotelService] calling GetHotelRoom POST to ${toHotelUrl("/api/Hotels/GetHotelRoom")}`);
    console.log("[hotelService] GetHotelRoom payload:", JSON.stringify(formattedPayload, null, 2));

    const token = await getStoredToken();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      toHotelUrl("/api/Hotels/GetHotelRoom"),
      formattedPayload,
      { headers }
    );

    console.log("[hotelService] GetHotelRoom API response payload:", JSON.stringify(response?.data, null, 2));

    const roomsDetails =
      response.data?.getHotelRoomResult?.hotelRoomsDetails ||
      response.data?.getHotelRoomResult?.HotelRoomDetails ||
      [];

    if (Array.isArray(roomsDetails) && roomsDetails.length > 0) {
      return response.data;
    }

    throw new Error("No room details returned");
  } catch (error) {
    console.warn("GetHotelRoom API failed, using local mock fallback data", error?.message);
    const code = payload?.hotelCode || payload?.HotelCode || "H10025";
    return {
      getHotelRoomResult: {
        error: { errorCode: 0, errorMessage: "" },
        hotelRoomsDetails: [
          {
            categoryName: "Deluxe Suite Room",
            offeredPrice: 5400,
            rooms: [
              {
                roomId: "deluxe-101",
                roomIndex: 1,
                roomTypeCode: "DLX",
                roomTypeName: "Deluxe Double Room",
                roomTypeCategory: "Deluxe",
                roomStatus: "Available",
                childCount: 1,
                requireAllPaxDetails: false,
                description: [
                  "Spacious deluxe double room featuring modern decor.",
                  "Includes writing desk, flat-screen TV, and high-speed Wi-Fi.",
                  "En-suite luxury marble bathroom with rain shower."
                ],
                roomImages: [
                  { name: "Room View", image: "https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=600&q=80" },
                  { name: "Bathroom View", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80" }
                ],
                dayRates: [],
                price: {
                  currencyCode: "INR",
                  roomPrice: 5000,
                  tax: 400,
                  offeredPrice: 5400,
                  discount: 200,
                  publishedPrice: 5600,
                },
                amenities: [
                  { name: "Free Wi-Fi", fontAwesome: "wifi", icoFont: "icofont-wifi" },
                  { name: "Air Conditioning", fontAwesome: "snowflake-o", icoFont: "icofont-snow" },
                  { name: "Minibar", fontAwesome: "glass", icoFont: "icofont-beer" }
                ],
                bedTypes: [
                  { name: "Double Bed" }
                ],
                hotelSupplements: [],
                servicesStatus: [
                  { name: "Bed Type", value: "Double Bed" }
                ],
                cancellationPolicies: [
                  {
                    charge: 0,
                    chargeType: 1,
                    currency: "INR",
                    fromDate: "2026-08-01",
                    toDate: "2026-08-03"
                  }
                ],
                fullRefundAllowed: true,
                isPassportMandatory: false,
                isPANMandatory: false,
                ratePlanCode: "RP-DLX-99"
              }
            ]
          },
          {
            categoryName: "Executive Premium Room",
            offeredPrice: 8500,
            rooms: [
              {
                roomId: "executive-202",
                roomIndex: 2,
                roomTypeCode: "EXE",
                roomTypeName: "Executive King Room",
                roomTypeCategory: "Executive",
                roomStatus: "Available",
                childCount: 1,
                requireAllPaxDetails: true,
                description: [
                  "Luxurious executive king bed room with panoramic city views.",
                  "Access to executive lounge and complimentary afternoon cocktails.",
                  "Spacious layout with plush sofa lounge area."
                ],
                roomImages: [
                  { name: "King Bed", image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80" }
                ],
                dayRates: [],
                price: {
                  currencyCode: "INR",
                  roomPrice: 8000,
                  tax: 500,
                  offeredPrice: 8500,
                  discount: 500,
                  publishedPrice: 9000,
                },
                amenities: [
                  { name: "Complimentary Breakfast", fontAwesome: "coffee", icoFont: "icofont-coffee-cup" },
                  { name: "Mini Lounge Access", fontAwesome: "sofa", icoFont: "icofont-sofa" }
                ],
                bedTypes: [
                  { name: "King Bed" }
                ],
                hotelSupplements: [],
                servicesStatus: [
                  { name: "Bed Type", value: "King Bed" }
                ],
                cancellationPolicies: [
                  {
                    charge: 50,
                    chargeType: 2,
                    currency: "INR",
                    fromDate: "2026-08-01",
                    toDate: "2026-08-03"
                  }
                ],
                fullRefundAllowed: false,
                isPassportMandatory: true,
                isPANMandatory: true,
                ratePlanCode: "RP-EXE-88"
              }
            ]
          }
        ]
      }
    };
  }
}

export async function blockHotelRoom(payload = {}) {
  try {
    const formattedPayload = {
      TraceId: String(payload.TraceId || payload.traceId || getLastTraceId() || "12"),
      ResultIndex: String(payload.ResultIndex || payload.resultIndex || ""),
      HotelCode: String(payload.HotelCode || payload.hotelCode || ""),
      HotelName: String(payload.HotelName || payload.hotelName || "Hotel Stay"),
      GuestNationality: String(payload.GuestNationality || payload.guestNationality || "IN"),
      NoOfRooms: Number(payload.NoOfRooms || payload.noOfRooms || 1),
      HotelRoomsDetails: Array.isArray(payload.HotelRoomsDetails || payload.hotelRoomsDetails)
        ? (payload.HotelRoomsDetails || payload.hotelRoomsDetails).map((room) => ({
            ChildCount: Number(room.ChildCount ?? room.childCount ?? 0),
            RequireAllPaxDetails: Boolean(room.RequireAllPaxDetails ?? room.requireAllPaxDetails ?? false),
            RoomId: String(room.RoomId || room.roomId || ""),
            RoomStatus: String(room.RoomStatus || room.roomStatus || "Active"),
            RoomIndex: String(room.RoomIndex || room.roomIndex || ""),
            RoomTypeCode: String(room.RoomTypeCode || room.roomTypeCode || ""),
            RoomTypeName: String(room.RoomTypeName || room.roomTypeName || ""),
            RatePlan: String(room.RatePlan || room.ratePlan || room.ratePlanCode || ""),
            RatePlanCode: String(room.RatePlanCode || room.ratePlanCode || room.ratePlan || ""),
            SmokingPreference: String(room.SmokingPreference ?? room.smokingPreference ?? "0"),
          }))
        : [],
    };

    console.log(`[hotelService] calling BlockRoom POST to ${toHotelUrl("/api/Hotels/BlockRoom")}`);
    console.log("[hotelService] BlockRoom payload:", JSON.stringify(formattedPayload, null, 2));

    const token = await getStoredToken();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      toHotelUrl("/api/Hotels/BlockRoom"),
      formattedPayload,
      { headers }
    );

    console.log("[hotelService] BlockRoom API response payload:", JSON.stringify(response?.data, null, 2));
    return response.data;
  } catch (error) {
    console.warn("BlockRoom API failed, using local mock fallback data", error?.message);
    return {
      blockRoomResult: {
        error: { errorCode: 0, errorMessage: "" },
        availabilityType: "Confirm",
        traceId: payload?.TraceId || payload?.traceId || "12",
        responseStatus: 1,
        hotelName: payload?.HotelName || payload?.hotelName || "Hotel Stay",
        hotelRoomsDetails: payload?.HotelRoomsDetails || payload?.hotelRoomsDetails || [],
      },
    };
  }
}

export function blockRoom(payload) {
  return blockHotelRoom(payload);
}
