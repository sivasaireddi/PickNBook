import * as SecureStore from "expo-secure-store";

const KEY = "flight_booking_flow_state_v1";

async function readRaw() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function readFlightBookingFlowState() {
  const data = await readRaw();
  if (data) {
    console.log("[flightBookingFlowStore] 📖 Read stored state keys:", Object.keys(data));
  } else {
    console.log("[flightBookingFlowStore] 📖 Read stored state: (empty)");
  }
  return data;
}

export async function writeFlightBookingFlowState(partialState) {
  if (!partialState || typeof partialState !== "object") return null;
  const current = (await readRaw()) || {};
  const next = { ...current, ...partialState };
  try {
    // Ultra-compact state serialization to strictly stay under SecureStore's 2048-byte limit
    const compactState = {
      traceId: String(next.traceId || next.flight?.traceId || ""),
      resultIndex: String(next.resultIndex || next.flight?.resultIndex || ""),
      srdvType: String(next.srdvType || next.flight?.srdvType || "MixAPI"),
      srdvIndex: String(next.srdvIndex || next.flight?.srdvIndex || "2"),
      source: next.source ?? next.flight?.source ?? null,
      selectedFareType: next.flight?.selectedFareType || next.selectedFareType || null,
      pnr: next.pnr || "",
      bookingId: next.bookingId || "",
      ticketStatus: next.ticketStatus || "Confirmed",
      isLCC: Boolean(next.isLCC),
      payableAmount: Number(next.payableAmount || next.fareSummary?.totalFare || 0),
      journeyType: Number(next.journeyType || next.searchContext?.journeyType || 1),
      isInternational: Boolean(next.isInternational),
      quoteTimestamp: next.quoteTimestamp || null,
      fareSummary: next.fareSummary ? {
        baseFare: Number(next.fareSummary.baseFare || 0),
        tax: Number(next.fareSummary.tax || 0),
        seatSurcharge: Number(next.fareSummary.seatSurcharge || 0),
        ssrSurcharge: Number(next.fareSummary.ssrSurcharge || 0),
        totalFare: Number(next.fareSummary.totalFare || 0),
      } : undefined,
      searchContext: next.searchContext ? {
        journeyType: next.searchContext.journeyType,
        tripType: next.searchContext.tripType,
        adults: next.searchContext.adults,
        children: next.searchContext.children,
        infants: next.searchContext.infants,
        travelClass: next.searchContext.travelClass,
        date: next.searchContext.date,
        returnDate: next.searchContext.returnDate,
        from: next.searchContext.from,
        to: next.searchContext.to,
      } : undefined,
      selectedSeatLabels: Array.isArray(next.selectedSeatLabels) ? next.selectedSeatLabels.slice(0, 12) : [],
    };

    const jsonStr = JSON.stringify(compactState);
    await SecureStore.setItemAsync(KEY, jsonStr);
    console.log("[flightBookingFlowStore] 💾 Written compact state to SecureStore:", Object.keys(compactState));
  } catch (err) {
    console.warn("[flightBookingFlowStore] Storage warning:", err?.message);
  }
  return next;
}


export async function clearFlightBookingFlowState() {
  try {
    await SecureStore.deleteItemAsync(KEY);
    console.log("[flightBookingFlowStore] 🧹 Cleared stored flight booking flow state from SecureStore");
  } catch (err) {
    console.warn("[flightBookingFlowStore] Storage clear warning:", err?.message);
  }
}

const CONFIRMED_BOOKINGS_KEY = "confirmed_flight_bookings_list_v1";

export async function readConfirmedFlightBookingsLocally() {
  try {
    const raw = await SecureStore.getItemAsync(CONFIRMED_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("[flightBookingFlowStore] Reading local bookings warning:", err?.message);
    return [];
  }
}

export async function saveConfirmedFlightBookingLocally(bookingRecord) {
  if (!bookingRecord || typeof bookingRecord !== "object") return;
  try {
    const existing = await readConfirmedFlightBookingsLocally();
    const pnrStr = String(bookingRecord.pnr || bookingRecord.bookingId || `FLT-${Date.now()}`);
    // Avoid duplicates
    const filtered = existing.filter((item) => String(item.pnr || item.bookingId || item.id) !== pnrStr);
    const updated = [bookingRecord, ...filtered].slice(0, 30);
    await SecureStore.setItemAsync(CONFIRMED_BOOKINGS_KEY, JSON.stringify(updated));
    console.log("[flightBookingFlowStore] Saved confirmed flight booking to SecureStore.");
  } catch (err) {
    console.warn("[flightBookingFlowStore] Local booking save warning:", err?.message);
  }
}
