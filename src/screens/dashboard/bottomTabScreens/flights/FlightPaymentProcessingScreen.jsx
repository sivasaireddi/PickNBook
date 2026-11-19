import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getMyFlightBookings, verifyFlightPayment } from "../../../../services/cashfreeService";
import { clearFlightPaymentRecovery, writeFlightPaymentRecovery } from "./services/flightPaymentRecoveryStore";
import { safeFlightLog } from "./utils/flightFlowUtils";

const RED = "#E53935", BG = "#F8F9FB", INK = "#1F2937", MUTED = "#667085";
const MAX_ATTEMPTS = 24;
const lower = (value) => String(value || "").trim().toLowerCase();
const bookingValue = (booking, keys) => {
  for (const source of [booking, booking?.payment, booking?.paymentBreakdown, booking?.PaymentBreakdown]) {
    for (const key of keys) if (source?.[key] != null) return String(source[key]);
  }
  return "";
};

function matchingBooking(bookings, verification, cashfreeOrderId, paymentReference) {
  const needles = new Set([cashfreeOrderId, paymentReference, verification?.cashfreeOrderId, verification?.paymentReference].filter(Boolean).map(String));
  return (Array.isArray(bookings) ? bookings : []).find((booking) => [
    bookingValue(booking, ["cashfreeOrderId", "CashfreeOrderId"]),
    bookingValue(booking, ["paymentReference", "PaymentReference"]),
    bookingValue(booking, ["paymentId", "PaymentId", "cashfreePaymentId", "CashfreePaymentId"]),
  ].some((value) => value && needles.has(value))) || null;
}

export default function FlightPaymentProcessingScreen({ route, navigation }) {
  const params = route?.params || {};
  const cashfreeOrderId = String(params.cashfreeOrderId || "");
  const [state, setState] = useState("verifying");
  const [message, setMessage] = useState("Verifying payment…");
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true), timerRef = useRef(null), attemptsRef = useRef(0), checkingRef = useRef(false);
  const schedule = useCallback((fn, delay) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, delay);
  }, []);
  const checkStatus = useCallback(async ({ restart = false } = {}) => {
    if (!cashfreeOrderId || checkingRef.current) return;
    if (restart) attemptsRef.current = 0;
    checkingRef.current = true;
    setBusy(true);
    attemptsRef.current += 1;
    try {
      const verification = await verifyFlightPayment(cashfreeOrderId);
      if (!mountedRef.current) return;
      const payment = lower(verification.status), fulfillment = lower(verification.fulfillmentStatus);
      await writeFlightPaymentRecovery({
        cashfreeOrderId, paymentReference: verification.paymentReference || params.paymentReference,
        idempotencyKey: params.idempotencyKey, traceId: params.traceId || params.flight?.traceId,
        resultIndex: params.resultIndex || params.flight?.resultIndex, paymentStatus: verification.status,
        fulfillmentStatus: verification.fulfillmentStatus, attemptFingerprint: params.attemptFingerprint,
      });
      safeFlightLog("[Flight][Payment][Verification]", { paymentStatus: verification.status, fulfillmentStatus: verification.fulfillmentStatus || null, attempt: attemptsRef.current });
      if (payment === "failed") {
        await clearFlightPaymentRecovery();
        setState("failed"); setMessage(verification.failureReason || "The payment was not completed."); return;
      }
      if (payment !== "success") {
        setState("pending"); setMessage("Payment pending. You can safely check the status again.");
        if (attemptsRef.current < MAX_ATTEMPTS) schedule(() => checkStatus(), 5000);
        return;
      }
      if (fulfillment.startsWith("failed")) {
        setState("recovery"); setMessage("Payment succeeded, but the airline booking is being recovered or refunded.");
        safeFlightLog("[Flight][Booking][Fulfillment]", { fulfillmentStatus: verification.fulfillmentStatus });
        if (attemptsRef.current < MAX_ATTEMPTS) schedule(() => checkStatus(), 15000);
        return;
      }
      if (fulfillment !== "success") {
        setState("confirming"); setMessage("Payment successful — confirming your booking");
        safeFlightLog("[Flight][Booking][Fulfillment]", { fulfillmentStatus: verification.fulfillmentStatus || "Pending" });
        if (attemptsRef.current < MAX_ATTEMPTS) schedule(() => checkStatus(), 5000);
        return;
      }
      setState("confirming"); setMessage("Payment successful — confirming your booking");
      const bookings = await getMyFlightBookings();
      const booking = matchingBooking(bookings, verification, cashfreeOrderId, params.paymentReference || verification.paymentReference);
      const pnr = bookingValue(booking, ["pnr", "Pnr", "PNR"]);
      const bookingId = bookingValue(booking, ["bookingId", "BookingId", "id", "Id"]);
      const realBookingReference = bookingValue(booking, ["bookingReference", "BookingReference"]);
      if (!booking || !pnr || !bookingId) {
        if (attemptsRef.current < MAX_ATTEMPTS) schedule(() => checkStatus(), 5000);
        else { setState("pending"); setMessage("Booking confirmation is taking longer than expected. Check status again shortly."); }
        return;
      }
      safeFlightLog("[Flight][Booking][Fulfillment]", { fulfillmentStatus: "Success", hasPnr: true, hasBookingId: true });
      safeFlightLog("[Flight][Booking][Navigation]", { destination: "FlightConfirmationScreen", confirmed: true });
      await clearFlightPaymentRecovery();
      const confirmedPassengers = (booking?.Passengers || booking?.passengers || params.apiPassengers || params.passengers || []).map((passenger) => ({
        ...passenger,
        title: passenger.title || passenger.Title || "",
        firstName: passenger.firstName || passenger.FirstName || "",
        lastName: passenger.lastName || passenger.LastName || "",
        passengerType: passenger.passengerType || (Number(passenger.PaxType) === 2 ? "Child" : Number(passenger.PaxType) === 3 ? "Infant" : "Adult"),
      }));
      navigation.replace("FlightConfirmationScreen", {
        ...params, pnr, bookingId, bookingReference: realBookingReference, ticketStatus: "Confirmed",
        payableAmount: verification.amount || params.totalFare, paymentMethod: verification.paymentMethod || "Cashfree",
        paidAt: verification.paidAt, passengers: confirmedPassengers,
        cashfreeOrderId,
      });
    } catch {
      if (!mountedRef.current) return;
      setState("pending"); setMessage("We couldn’t check the payment status. Your order is saved; retry safely.");
      if (attemptsRef.current < MAX_ATTEMPTS) schedule(() => checkStatus(), 7000);
    } finally {
      checkingRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, [cashfreeOrderId, navigation, params, schedule]);

  useEffect(() => {
    mountedRef.current = true; checkStatus({ restart: true });
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const config = ({
    verifying: ["shield-checkmark-outline", "Verifying payment", RED], pending: ["time-outline", "Payment pending", "#D97706"],
    confirming: ["airplane-outline", "Confirming your booking", RED], failed: ["close-circle-outline", "Payment failed", "#B42318"],
    recovery: ["refresh-circle-outline", "Booking recovery/refund in progress", "#D97706"],
  })[state] || ["time-outline", "Checking status", RED];

  return <SafeAreaView style={styles.safe}><View style={styles.body}>
    <View style={styles.icon}><Ionicons name={config[0]} size={58} color={config[2]} /></View>
    <Text style={styles.title}>{config[1]}</Text><Text style={styles.message}>{message}</Text>
    {busy && <ActivityIndicator color={RED} size="large" />}
    {!busy && <TouchableOpacity style={styles.primary} onPress={() => state === "failed" ? navigation.navigate("FlightCheckoutScreen", params) : checkStatus({ restart: true })}><Text style={styles.primaryText}>{state === "pending" ? "Check status" : "Retry"}</Text></TouchableOpacity>}
    <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate("DashBoard")}><Text style={styles.secondaryText}>Return to home</Text></TouchableOpacity>
    <Text style={styles.note}>Do not create another payment while this order is pending.</Text>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG }, body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 16 },
  icon: { width: 126, height: 126, borderRadius: 63, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB", elevation: 4 },
  title: { color: INK, fontSize: 24, fontWeight: "900", textAlign: "center" }, message: { color: MUTED, fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 360 },
  primary: { backgroundColor: RED, minWidth: 220, paddingVertical: 15, paddingHorizontal: 22, borderRadius: 14, alignItems: "center", marginTop: 8 }, primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  secondary: { padding: 12 }, secondaryText: { color: INK, fontWeight: "700" }, note: { color: MUTED, fontSize: 12, textAlign: "center", marginTop: 4 },
});
