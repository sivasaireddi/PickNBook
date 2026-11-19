import * as SecureStore from "expo-secure-store";

const KEY = "flight_payment_recovery_v1";

export async function readFlightPaymentRecovery() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function writeFlightPaymentRecovery(value) {
  if (!value || typeof value !== "object") return null;
  const current = (await readFlightPaymentRecovery()) || {};
  const next = {
    paymentReference: String(value.paymentReference ?? current.paymentReference ?? ""),
    cashfreeOrderId: String(value.cashfreeOrderId ?? current.cashfreeOrderId ?? ""),
    idempotencyKey: String(value.idempotencyKey ?? current.idempotencyKey ?? "").slice(0, 45),
    traceId: String(value.traceId ?? current.traceId ?? ""),
    resultIndex: String(value.resultIndex ?? current.resultIndex ?? ""),
    paymentStatus: String(value.paymentStatus ?? current.paymentStatus ?? "Pending"),
    fulfillmentStatus: String(value.fulfillmentStatus ?? current.fulfillmentStatus ?? ""),
    attemptFingerprint: String(value.attemptFingerprint ?? current.attemptFingerprint ?? ""),
    updatedAt: Number(value.updatedAt || Date.now()),
  };
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  return next;
}

export async function clearFlightPaymentRecovery() {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // A storage cleanup failure must not downgrade a server-confirmed terminal state.
  }
}

export function isRecoverableFlightPayment(value) {
  if (!value?.cashfreeOrderId) return false;
  const payment = String(value.paymentStatus || "").toLowerCase();
  return !["failed", "cancelled", "canceled", "expired"].includes(payment);
}
