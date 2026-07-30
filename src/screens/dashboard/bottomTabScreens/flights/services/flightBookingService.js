import { 
  searchFlights as baseSearchFlights, 
  getPlaces as baseGetPlaces,
  getHotRoutes as baseGetHotRoutes,
  getFeaturedOffers as baseGetFeaturedOffers,
  bookFlight as baseBookFlight,
  getFlightSeatMap as baseGetFlightSeatMap,
  cancelFlightBooking as baseCancelFlightBooking,
  getFlightFareRule as baseGetFlightFareRule,
  getFareRule as baseGetFareRule,
  getFlightFareQuote as baseGetFlightFareQuote,
  getFareQuote as baseGetFareQuote
} from "../../../../../services/FlightService";

export async function getFlightFareRule(params) {
  return await baseGetFlightFareRule(params);
}

export async function getFareRule(params) {
  return await baseGetFareRule(params);
}

export async function getFlightFareQuote(params) {
  return await baseGetFlightFareQuote(params);
}

export async function getFareQuote(params) {
  return await baseGetFareQuote(params);
}

export async function searchFlights(params) {
  const response = await baseSearchFlights(params);
  console.log("[FlightBookingService] searchFlights response", response);
  return response;
}

export async function getPlaces() {
  const response = await baseGetPlaces();
  return response;
}

export async function getHotRoutes() {
  return await baseGetHotRoutes();
}

export async function getFeaturedOffers() {
  return await baseGetFeaturedOffers();
}

export async function bookFlight(flightId, payload) {
  return await baseBookFlight(flightId, payload);
}

export async function getFlightSeatMap(flightId) {
  return await baseGetFlightSeatMap(flightId);
}

export async function cancelFlightBooking(bookingId, passengersList = []) {
  return await baseCancelFlightBooking(bookingId, passengersList);
}

export async function getFlightPricingPreview(payload) {
  const response = {
    baseFare: payload.baseFare || 5208,
    tax: Math.round((payload.baseFare || 5208) * 0.05),
    convenienceFee: 150,
    discount: payload.discount || 0,
    promotionDiscount: payload.discount || 0,
    couponDiscount: 0,
    ...payload,
  };
  console.log("[FlightBookingService] getFlightPricingPreview response", response);
  return response;
}

export async function getFlightPromotions() {
  const response = [
    { code: "FLYDOM", discount: 150, title: "Domestic Flights Sale" },
    { code: "NOFEES", discount: 150, title: "Zero Convenience Fee" }
  ];
  console.log("[FlightBookingService] getFlightPromotions response", response);
  return response;
}
