/**
 * Traveler Selection Helper
 *
 * Reusable module for booking integration.
 * Prepares saved traveler data for use in Passenger Details screens
 * without modifying any existing booking UI.
 */

import { getTravelers } from "../services/travelerService";

/**
 * Converts a normalized traveler object into the shape
 * expected by Passenger Details forms (bus, flight, hotel).
 *
 * @param {Object} traveler - Normalized traveler from travelerService
 * @returns {Object} Booking-ready traveler data
 */
export function formatTravelerForBooking(traveler) {
  if (!traveler) return null;

  return {
    id: traveler.id,
    title: traveler.title || "Mr",
    firstName: traveler.firstName || "",
    lastName: traveler.lastName || "",
    fullName: traveler.fullName || `${traveler.firstName} ${traveler.lastName}`.trim(),
    gender: traveler.gender || "Male",
    age: traveler.age || 25,
    email: traveler.email || "",
    phoneNumber: traveler.phoneNo || traveler.phoneNumber || "",
    passportNo: traveler.passportNo || null,
    country: traveler.country || "",
    type: traveler.type || "Adult",
  };
}

/**
 * Fetches saved travelers from the API, optionally filtered by type.
 *
 * @param {string} [type] - Optional: "Adult", "Child", or "Infant"
 * @returns {Promise<Array>} Array of booking-ready traveler objects
 */
export async function getTravelersForSelection(type) {
  try {
    const filters = type ? { type } : {};
    const travelers = await getTravelers(filters);
    return travelers.map(formatTravelerForBooking).filter(Boolean);
  } catch (error) {
    console.warn("[TravelerSelectionHelper] Failed to fetch travelers:", error?.message);
    return [];
  }
}
