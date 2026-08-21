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
      pnr: next.pnr || "",
      bookingId: next.bookingId || "",
      ticketStatus: next.ticketStatus || "Confirmed",
      isLCC: Boolean(next.isLCC),
      payableAmount: Number(next.payableAmount || next.fareSummary?.totalFare || 0),
      contact: next.contact ? { email: next.contact.email, mobile: next.contact.mobile } : undefined,
      passengers: Array.isArray(next.passengers)
        ? next.passengers.map((p) => ({
            title: p.title,
            firstName: p.firstName,
            lastName: p.lastName,
            gender: p.gender,
            passengerType: p.passengerType,
          }))
        : [],
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
    console.log(`[flightBookingFlowStore] 💾 Saved confirmed flight booking (${pnrStr}) to SecureStore. Total items: ${updated.length}`);
  } catch (err) {
    console.warn("[flightBookingFlowStore] Local booking save warning:", err?.message);
  }
}
