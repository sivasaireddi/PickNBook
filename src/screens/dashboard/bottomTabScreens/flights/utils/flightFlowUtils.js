export const FLIGHT_QUOTE_MAX_AGE_MS = 12 * 60 * 1000;

export function toOpaqueId(value) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") return "";
  return normalized;
}

export const asOpaqueTraceId = toOpaqueId;

export function selectedFlightIdentity(flight = {}) {
  const raw = flight.rawItem || flight;
  const tier = flight.selectedFare || raw.selectedFare || {};
  const parentFlightTraceId = toOpaqueId(flight.parentFlightTraceId) || toOpaqueId(flight.traceId) || toOpaqueId(flight.TraceId) || toOpaqueId(raw.traceId) || toOpaqueId(raw.TraceId);
  const fareTierTraceId = toOpaqueId(flight.fareTierTraceId) || toOpaqueId(tier.TraceId) || toOpaqueId(tier.traceId);
  const parentResultIndex = toOpaqueId(flight.parentResultIndex) || toOpaqueId(flight.resultIndex) || toOpaqueId(flight.ResultIndex) || toOpaqueId(raw.resultIndex) || toOpaqueId(raw.ResultIndex);
  const fareTierResultIndex = toOpaqueId(flight.fareTierResultIndex) || toOpaqueId(tier.ResultIndex) || toOpaqueId(tier.resultIndex);
  const traceId = fareTierTraceId || parentFlightTraceId;
  const resultIndex = fareTierResultIndex || parentResultIndex;
  return {
    parentFlightTraceId,
    fareTierTraceId,
    traceId,
    resolvedTraceId: traceId,
    traceIdSource: fareTierTraceId ? "fareTier" : parentFlightTraceId ? "parentFlight" : "missing",
    parentResultIndex,
    fareTierResultIndex,
    resultIndex,
    resolvedResultIndex: resultIndex,
    resultIndexSource: fareTierResultIndex ? "fareTier" : parentResultIndex ? "parentFlight" : "missing",
    srdvType: String(tier.SrdvType ?? flight.srdvType ?? raw.SrdvType ?? "MixAPI"),
    srdvIndex: String(tier.SrdvIndex ?? flight.srdvIndex ?? raw.SrdvIndex ?? "2"),
    source: tier.Source ?? flight.source ?? raw.Source ?? null,
    isLCC: Boolean(tier.IsLCC ?? flight.isLCC ?? raw.IsLCC),
  };
}

export function allSelectionsShareTraceId(flights = []) {
  const ids = flights.filter(Boolean).map((flight) => selectedFlightIdentity(flight).traceId);
  return ids.length > 0 && ids.every(Boolean) && new Set(ids).size === 1;
}

export function compactFlightForFlow(flight = {}, overrides = {}) {
  const raw = flight.rawItem || flight;
  const identity = selectedFlightIdentity(flight);
  return {
    traceId: identity.traceId,
    resultIndex: identity.resultIndex,
    srdvType: identity.srdvType,
    srdvIndex: identity.srdvIndex,
    source: identity.source,
    isLCC: identity.isLCC,
    selectedFare: flight.selectedFare || raw.selectedFare || null,
    selectedFareType: flight.selectedFareType || raw.selectedFareType || null,
    selectedFareSegment: flight.selectedFareSegment || null,
    airlineName: flight.airlineName || raw.airlineName || raw.AirlineName || "",
    airlineCode: flight.airlineCode || raw.airlineCode || raw.AirlineCode || "",
    flightNumber: flight.flightNumber || raw.flightNumber || raw.FlightNumber || "",
    from: flight.from || flight.originCode || raw.from || "",
    to: flight.to || flight.destinationCode || raw.to || "",
    fromCity: flight.fromCity || flight.originCity || raw.fromCity || "",
    toCity: flight.toCity || flight.destinationCity || raw.toCity || "",
    originCode: flight.originCode || raw.originCode || flight.from || "",
    destinationCode: flight.destinationCode || raw.destinationCode || flight.to || "",
    departureTime: flight.departureTime || raw.departureTime || "",
    arrivalTime: flight.arrivalTime || raw.arrivalTime || "",
    duration: flight.duration || raw.duration || 0,
    isRefundable: Boolean(flight.isRefundable ?? raw.IsRefundable),
    SeatSelectAllowed: flight.SeatSelectAllowed ?? raw.SeatSelectAllowed,
    Segments: raw.Segments || flight.Segments || [],
    displayFare: Number(flight.displayFare || flight.price || raw.displayFare || 0),
    offeredFare: Number(flight.offeredFare || raw.offeredFare || 0),
    baseFare: Number(flight.baseFare || raw.baseFare || 0),
    tax: Number(flight.tax || raw.tax || 0),
    ...overrides,
  };
}

export function extractAuthoritativeFare(response = {}, fallback = 0) {
  const result = response?.Results ?? response?.Response?.Results ?? response;
  const value = Array.isArray(result) ? result[0] || {} : result || {};
  const fare = value?.Fare || response?.Fare || {};
  const total = Number(
    value.B2CFinalFare ?? value.DisplayFare ?? fare.B2CFinalFare ?? fare.OfferedFare ?? fare.PublishedFare ?? fallback
  );
  const baseFare = Number(value.DisplayBaseFare ?? fare.BaseFare ?? total);
  const tax = Number(value.DisplayTax ?? fare.Tax ?? Math.max(0, total - baseFare));
  return {
    total: Number.isFinite(total) ? total : 0,
    baseFare: Number.isFinite(baseFare) ? baseFare : 0,
    tax: Number.isFinite(tax) ? tax : 0,
  };
}

export function isValidAuthoritativeFare(fare = {}) {
  const total = Number(fare.total);
  const baseFare = Number(fare.baseFare);
  const tax = Number(fare.tax);
  return Number.isFinite(total) && total > 0 && Number.isFinite(baseFare) && baseFare >= 0 && Number.isFinite(tax) && tax >= 0;
}

export function isFlightQuoteExpired(quotedAt, now = Date.now()) {
  const timestamp = typeof quotedAt === "number" ? quotedAt : Date.parse(quotedAt || "");
  return !Number.isFinite(timestamp) || now - timestamp >= FLIGHT_QUOTE_MAX_AGE_MS;
}

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateFlightPassenger(passenger = {}, { international = false, departureDate } = {}) {
  const invalid = [];
  const type = String(passenger.passengerType || "Adult").toLowerCase();
  if (String(passenger.firstName || "").trim().length < 2) invalid.push("firstName");
  if (String(passenger.lastName || "").trim().length < 2) invalid.push("lastName");
  if (!String(passenger.nationality || "").trim()) invalid.push("nationality");
  const dob = parseDateOnly(passenger.dob);
  const departure = parseDateOnly(departureDate) || new Date();
  if (type !== "adult" || international) {
    if (!dob || dob >= departure) invalid.push("dob");
  }
  if (dob) {
    let age = departure.getUTCFullYear() - dob.getUTCFullYear();
    const beforeBirthday = departure.getUTCMonth() < dob.getUTCMonth() ||
      (departure.getUTCMonth() === dob.getUTCMonth() && departure.getUTCDate() < dob.getUTCDate());
    if (beforeBirthday) age -= 1;
    if (type === "adult" && age < 12) invalid.push("dob");
    if (type === "child" && (age < 2 || age > 11)) invalid.push("dob");
    if (type === "infant" && (age < 0 || age >= 2)) invalid.push("dob");
  }
  if (international) {
    if (!/^[A-Z0-9]{6,9}$/i.test(String(passenger.passportNo || "").trim())) invalid.push("passportNo");
    const expiry = parseDateOnly(passenger.passportExpiry);
    const sixMonthsAfterDeparture = new Date(departure);
    sixMonthsAfterDeparture.setUTCMonth(sixMonthsAfterDeparture.getUTCMonth() + 6);
    if (!expiry || expiry < sixMonthsAfterDeparture) invalid.push("passportExpiry");
    const issueDate = parseDateOnly(passenger.passportIssueDate);
    if (!issueDate || issueDate > new Date()) invalid.push("passportIssueDate");
    if (!/^[A-Z]{2}$/i.test(String(passenger.passportIssueCountryCode || "").trim())) invalid.push("passportIssueCountryCode");
  }
  return Array.from(new Set(invalid));
}

export function safeFlightLog(tag, details = {}) {
  if (!__DEV__) return;
  const allowed = {};
  [
    "endpoint", "status", "code", "durationMs", "journeyType", "origin", "destination",
    "adults", "children", "infants", "groupCount", "flightCount", "fareTierCount",
    "traceId", "resultIndex", "srdvType", "srdvIndex", "source", "segmentCount",
    "parentFlightTraceId", "fareTierTraceId", "resolvedTraceId", "traceIdSource",
    "parentResultIndex", "fareTierResultIndex", "resolvedResultIndex", "resultIndexSource",
    "httpStatus", "backendCode", "message", "retryAvailable",
    "baseFare", "tax", "total", "quotedAt", "changed", "reason", "destinationRoute",
    "validationPassed", "invalidFields", "seatCount", "mealCount", "baggageCount",
    "started", "created", "opened", "orderStatus", "passengerCount", "paymentStatus",
    "fulfillmentStatus", "attempt", "kind", "orderMatches", "hasOrder", "confirmed",
    "hasPnr", "hasBookingId", "destination",
  ].forEach((key) => {
    if (details[key] !== undefined) allowed[key] = details[key];
  });
  console.log(tag, allowed);
}
