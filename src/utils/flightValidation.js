/**
 * Validates flight search parameters before navigation.
 * Returns { isValid: boolean, message?: string }
 */
export function validateFlightSearch({
  origin,
  destination,
  departureDate,
  returnDate,
  tripType,
  travellers,
  multiCitySegments = [],
}) {
  const normType = String(tripType || "").toLowerCase();

  if (normType === "multicity") {
    if (!Array.isArray(multiCitySegments) || multiCitySegments.length < 2) {
      return { isValid: false, message: "Multi-city search requires at least 2 flight segments." };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastDate = today;

    for (let i = 0; i < multiCitySegments.length; i++) {
      const seg = multiCitySegments[i];
      if (!seg.origin || !seg.origin.airportCode) {
        return { isValid: false, message: `Segment ${i + 1}: Please select an origin city.` };
      }
      if (!seg.destination || !seg.destination.airportCode) {
        return { isValid: false, message: `Segment ${i + 1}: Please select a destination city.` };
      }
      if (String(seg.origin.airportCode).toUpperCase() === String(seg.destination.airportCode).toUpperCase()) {
        return { isValid: false, message: `Segment ${i + 1}: Origin and Destination cannot be the same.` };
      }
      if (!seg.date) {
        return { isValid: false, message: `Segment ${i + 1}: Please select a date.` };
      }
      const segDateObj = new Date(seg.date);
      segDateObj.setHours(0, 0, 0, 0);
      if (segDateObj < lastDate) {
        return { isValid: false, message: `Segment ${i + 1}: Date must be on or after previous segment.` };
      }
      lastDate = segDateObj;
    }
  } else {
    if (!origin || !origin.airportCode) {
      return { isValid: false, message: "Please select a departure city (FROM)." };
    }

    if (!destination || !destination.airportCode) {
      return { isValid: false, message: "Please select an arrival city (TO)." };
    }

    const originCode = String(origin.airportCode || "").toUpperCase();
    const destCode = String(destination.airportCode || "").toUpperCase();

    if (originCode === destCode) {
      return {
        isValid: false,
        message: "Origin and Destination airports cannot be the same.",
      };
    }

    if (!departureDate) {
      return { isValid: false, message: "Please select a departure date." };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const depDateObj = new Date(departureDate);
    depDateObj.setHours(0, 0, 0, 0);

    if (depDateObj < today) {
      return { isValid: false, message: "Departure date cannot be in the past." };
    }

    if (normType === "roundtrip" || normType === "roundtrip") {
      if (!returnDate) {
        return { isValid: false, message: "Please select a return date for round trip." };
      }

      const retDateObj = new Date(returnDate);
      retDateObj.setHours(0, 0, 0, 0);

      if (retDateObj < depDateObj) {
        return {
          isValid: false,
          message: "Return date must be on or after the departure date.",
        };
      }
    }
  }

  if (!travellers || Number(travellers.adults || 0) < 1) {
    return { isValid: false, message: "At least 1 adult traveller is required." };
  }

  const totalPax =
    Number(travellers.adults || 0) +
    Number(travellers.children || 0) +
    Number(travellers.infants || 0);

  if (totalPax > 9) {
    return { isValid: false, message: "Maximum 9 travellers permitted per booking." };
  }

  return { isValid: true };
}
