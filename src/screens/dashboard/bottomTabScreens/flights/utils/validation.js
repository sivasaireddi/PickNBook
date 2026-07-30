import { TRAVEL_CLASSES } from "../constants/travelClasses";

export function validateFlightSearch(values) {
  const errors = {};

  if (!values.from) errors.from = "Select a departure city.";
  if (!values.to) errors.to = "Select an arrival city.";
  if (values.from && values.to && values.from.trim().toLowerCase() === values.to.trim().toLowerCase()) {
    errors.to = "From and To cannot be the same.";
  }
  if (!values.date) errors.date = "Select a departure date.";
  if (values.tripType === "RoundTrip" && !values.returnDate) errors.returnDate = "Select a return date.";
  if (values.tripType === "RoundTrip" && values.returnDate && values.date && new Date(values.returnDate) < new Date(values.date)) {
    errors.returnDate = "Return date must be on or after departure date.";
  }
  if (Number(values.adults || 0) < 1) errors.adults = "At least 1 adult is required.";
  if (!TRAVEL_CLASSES.includes(values.travelClass)) errors.travelClass = "Select a valid cabin class.";

  return errors;
}
