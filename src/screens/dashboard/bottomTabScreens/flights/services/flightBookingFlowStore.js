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
  return readRaw();
}

export async function writeFlightBookingFlowState(partialState) {
  if (!partialState || typeof partialState !== "object") return null;
  const current = (await readRaw()) || {};
  const next = { ...current, ...partialState };
  try {
    // Sanitize flight object to fit under SecureStore 2048-byte limit
    const cleanState = {
      ...next,
      flight: next.flight ? {
        id: next.flight.id,
        airline: next.flight.airline || next.flight.airlineName,
        flightNumber: next.flight.flightNumber || next.flight.flightNo,
        departureTime: next.flight.departureTime || next.flight.departureTimeIst,
        arrivalTime: next.flight.arrivalTime || next.flight.arrivalTimeIst,
        fare: next.flight.fare || next.flight.displayFare,
        from: next.flight.from || next.flight.fromCity,
        to: next.flight.to || next.flight.toCity,
        traceId: next.flight.traceId,
        resultIndex: next.flight.resultIndex,
        srdvIndex: next.flight.srdvIndex,
        selectedTravelClass: next.flight.selectedTravelClass,
      } : undefined,
    };
    await SecureStore.setItemAsync(KEY, JSON.stringify(cleanState));
  } catch (err) {
    console.warn("[flightBookingFlowStore] Storage warning:", err?.message);
  }
  return next;
}

export async function clearFlightBookingFlowState() {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {}
}
