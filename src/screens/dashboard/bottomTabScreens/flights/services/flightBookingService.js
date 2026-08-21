import { 
  searchFlights as baseSearchFlights, 
  getPlaces as baseGetPlaces,
  getHotRoutes as baseGetHotRoutes,
  getFeaturedOffers as baseGetFeaturedOffers,
  getFlightSeatMap as baseGetFlightSeatMap,
  getFlightFareRule as baseGetFlightFareRule,
  getFareRule as baseGetFareRule,
  getFlightFareQuote as baseGetFlightFareQuote,
  getFareQuote as baseGetFareQuote,
  getFlightSSR as baseGetFlightSSR,
  ticketLCC as baseTicketLCC,
  holdGDS as baseHoldGDS,
  ticketGDS as baseTicketGDS,
  getCancellationCharges as baseGetCancellationCharges,
  sendCancelRequest as baseSendCancelRequest,
  getCancelStatus as baseGetCancelStatus,
  getCalendarFare as baseGetCalendarFare,
  saveFlightBooking as baseSaveFlightBooking,
  getUserFlightBookings as baseGetUserFlightBookings,
  getFlightBookingDetails as baseGetFlightBookingDetails,
} from "../../../../../services/FlightService";

export async function searchFlights(params) {
  return await baseSearchFlights(params);
}

export async function getPlaces() {
  return await baseGetPlaces();
}

export async function getHotRoutes() {
  return await baseGetHotRoutes();
}

export async function getFeaturedOffers() {
  return await baseGetFeaturedOffers();
}

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

export async function getFlightSSR(params) {
  return await baseGetFlightSSR(params);
}

export async function getFlightSeatMap(params) {
  return await baseGetFlightSeatMap(params);
}

export async function ticketLCC(params) {
  return await baseTicketLCC(params);
}

export async function holdGDS(params) {
  return await baseHoldGDS(params);
}

export async function ticketGDS(params) {
  return await baseTicketGDS(params);
}

export async function getCancellationCharges(params) {
  return await baseGetCancellationCharges(params);
}

export async function sendCancelRequest(params) {
  return await baseSendCancelRequest(params);
}

export async function getCancelStatus(params) {
  return await baseGetCancelStatus(params);
}

export async function getCalendarFare(params) {
  return await baseGetCalendarFare(params);
}

export async function saveFlightBooking(payload) {
  return await baseSaveFlightBooking(payload);
}

export async function getUserFlightBookings() {
  return await baseGetUserFlightBookings();
}

export async function getFlightBookingDetails(bookingId) {
  return await baseGetFlightBookingDetails(bookingId);
}

