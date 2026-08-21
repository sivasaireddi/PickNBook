/**
 * Canonical Normalizer for Flight Objects across all application screens.
 * Eliminates undefined ➔ undefined route display and ensures consistent property names.
 */
export function normalizeFlightObject(flight, fallbackLegIndex = 0) {
  if (!flight) return null;

  const raw = flight.rawItem || flight;

  // Extract Origin Code & City Name
  const originCode = String(
    flight.originCode ||
    flight.fromCityCode ||
    flight.fromCode ||
    flight.from ||
    raw.Origin?.AirportCode ||
    raw.Origin?.CityCode ||
    raw.fromCity ||
    raw.from ||
    "DEL"
  ).toUpperCase();

  const originCity = String(
    flight.originCity ||
    flight.fromCityName ||
    flight.fromCity ||
    raw.Origin?.CityName ||
    raw.Origin?.AirportName ||
    raw.fromCity ||
    originCode
  );

  // Extract Destination Code & City Name
  const destinationCode = String(
    flight.destinationCode ||
    flight.toCityCode ||
    flight.toCode ||
    flight.to ||
    raw.Destination?.AirportCode ||
    raw.Destination?.CityCode ||
    raw.toCity ||
    raw.to ||
    "BOM"
  ).toUpperCase();

  const destinationCity = String(
    flight.destinationCity ||
    flight.toCityName ||
    flight.toCity ||
    raw.Destination?.CityName ||
    raw.Destination?.AirportName ||
    raw.toCity ||
    destinationCode
  );

  // Extract Airline Details
  const airlineCode = String(
    flight.airlineCode ||
    flight.airline ||
    raw.AirlineCode ||
    raw.Airline?.AirlineCode ||
    "6E"
  );

  const airlineName = String(
    flight.airlineName ||
    raw.AirlineName ||
    raw.Airline?.AirlineName ||
    airlineCode
  );

  const flightNumber = String(
    flight.flightNumber ||
    raw.FlightNumber ||
    raw.Airline?.FlightNumber ||
    ""
  );

  // Extract Result Index
  const resultIndex = String(
    flight.resultIndex ||
    flight.ResultIndex ||
    raw.resultIndex ||
    raw.ResultIndex ||
    ""
  );

  // Price & Fare
  const price = Number(
    flight.displayFare ||
    flight.price ||
    flight.fare ||
    raw.OfferedFare ||
    raw.PublishedFare ||
    raw.price ||
    0
  );

  return {
    ...raw,
    ...flight,
    legIndex: fallbackLegIndex,
    resultIndex,
    airlineCode,
    airlineName,
    flightNumber,
    originCode,
    originCity,
    destinationCode,
    destinationCity,
    fromCity: originCity,
    toCity: destinationCity,
    from: originCode,
    to: destinationCode,
    price,
    displayFare: price,
  };
}

/**
 * Normalizes Date instances to YYYY-MM-DD string for navigation serialization.
 */
export function normalizeDateString(dateVal) {
  if (!dateVal) return new Date().toISOString().slice(0, 10);
  if (typeof dateVal === "string") {
    if (dateVal.includes("T")) return dateVal.split("T")[0];
    return dateVal;
  }
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return dateVal.toISOString().slice(0, 10);
  }
  return String(dateVal);
}

/**
 * Serializes searchParams for React Navigation to eliminate non-serializable Date warnings.
 */
export function serializeSearchParamsForNavigation(searchParams = {}) {
  if (!searchParams) return {};
  const copy = { ...searchParams };

  if (copy.departureDate) copy.departureDate = normalizeDateString(copy.departureDate);
  if (copy.returnDate) copy.returnDate = normalizeDateString(copy.returnDate);
  if (copy.date) copy.date = normalizeDateString(copy.date);

  if (Array.isArray(copy.multiCitySegments)) {
    copy.multiCitySegments = copy.multiCitySegments.map((seg) => ({
      ...seg,
      date: normalizeDateString(seg.date || seg.departureDate),
      departureDate: normalizeDateString(seg.departureDate || seg.date),
    }));
  }

  return copy;
}
