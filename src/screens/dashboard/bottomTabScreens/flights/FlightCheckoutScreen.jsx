import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getFlightFareQuote } from "./services/flightBookingService";
import { writeFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { extractAuthoritativeFare, isFlightQuoteExpired, isValidAuthoritativeFare, safeFlightLog, selectedFlightIdentity, validateFlightPassenger } from "./utils/flightFlowUtils";
import { getStoredAuthToken, getStoredAuthUserId, isJwtExpired } from "../../../../utils/authSession";
import { useCashfreePayment } from "../../../../hooks/useCashfreePayment";
import { buildFlightPaymentRequest, createFlightIdempotencyKey, flightPaymentAttemptFingerprint } from "./utils/flightPaymentUtils";
import { isRecoverableFlightPayment, readFlightPaymentRecovery, writeFlightPaymentRecovery } from "./services/flightPaymentRecoveryStore";

const RED = "#E53935";
const INK = "#172033";
const MUTED = "#667085";
const BG = "#F7F8FB";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FlightCheckoutScreen({ route, navigation }) {
  const [flowState, setFlowState] = useState(route?.params || {});
  const [refreshing, setRefreshing] = useState(false);
  const [accepted, setAccepted] = useState(Boolean(route?.params?.checkoutAccepted));
  const [quoteStatus, setQuoteStatus] = useState(null);
  const [authToken, setAuthToken] = useState("");
  const [paymentMessage, setPaymentMessage] = useState(null);
  const refreshInFlightRef = useRef(false);
  const paymentInFlightRef = useRef(false);
  const paymentAttemptRef = useRef(null);
  const activeOrderRef = useRef(null);
  const identity = useMemo(() => selectedFlightIdentity(flowState.flight || flowState), [flowState]);
  const passengers = Array.isArray(flowState.passengers) ? flowState.passengers : [];
  const seats = Array.isArray(flowState.selectedSeatLabels) ? flowState.selectedSeatLabels.filter(Boolean) : [];
  const ssr = flowState.ssrDetails || {};
  const fare = flowState.fareSummary || {};
  const isInternational = Boolean(flowState.isInternational);
  const routeLabel = [
    flowState.flight?.from || flowState.flight?.originCode || flowState.searchContext?.from,
    flowState.flight?.to || flowState.flight?.destinationCode || flowState.searchContext?.to,
  ].filter(Boolean).join(" → ");
  const ssrLabel = (item) => item?.Description || item?.Weight || item?.Code || "Selected";
  const ssrSummary = (...items) => Array.from(new Set(items.filter(Boolean).map(ssrLabel))).join(" · ") || "None";
  const travelerName = (passenger, index) => [passenger?.title, passenger?.firstName, passenger?.lastName].filter(Boolean).join(" ") || `Traveler ${index + 1}`;

  const openProcessing = useCallback((cashfreeOrderId, recovery = {}) => {
    if (!cashfreeOrderId) return;
    safeFlightLog("[Flight][Booking][Navigation]", { destination: "FlightPaymentProcessingScreen", hasOrder: true });
    navigation.navigate("FlightPaymentProcessingScreen", {
      ...flowState,
      cashfreeOrderId,
      paymentReference: recovery.paymentReference || "",
      idempotencyKey: recovery.idempotencyKey || paymentAttemptRef.current?.idempotencyKey || "",
      attemptFingerprint: recovery.attemptFingerprint || paymentAttemptRef.current?.fingerprint || "",
      apiPassengers: paymentAttemptRef.current?.apiPassengers || [],
      totalFare: Number(flowState.fareSummary?.totalFare || flowState.payableAmount || 0),
    });
  }, [flowState, navigation]);

  const cashfree = useCashfreePayment(authToken, {
    delegateVerification: true,
    onOrderCreated: async (response, returnedOrderId) => {
      activeOrderRef.current = returnedOrderId;
      const attempt = paymentAttemptRef.current || {};
      const recovery = await writeFlightPaymentRecovery({
        cashfreeOrderId: returnedOrderId,
        paymentReference: response?.paymentReference || attempt.idempotencyKey,
        idempotencyKey: attempt.idempotencyKey,
        traceId: identity.traceId,
        resultIndex: identity.resultIndex,
        paymentStatus: "Pending",
        fulfillmentStatus: "",
        attemptFingerprint: attempt.fingerprint,
      });
      safeFlightLog("[Flight][Payment][CreateOrder]", { created: true, orderStatus: response?.orderStatus || "Created" });
      setPaymentMessage({ type: "info", message: "Opening secure payment…" });
      activeOrderRef.current = recovery?.cashfreeOrderId || returnedOrderId;
    },
    onOpened: (returnedOrderId) => {
      safeFlightLog("[Flight][Payment][CashfreeOpened]", { opened: true });
      openProcessing(returnedOrderId, { idempotencyKey: paymentAttemptRef.current?.idempotencyKey, attemptFingerprint: paymentAttemptRef.current?.fingerprint });
    },
    onCallback: (kind, callbackOrderId) => {
      safeFlightLog("[Flight][Payment][Callback]", { kind, orderMatches: !activeOrderRef.current || String(activeOrderRef.current) === String(callbackOrderId || activeOrderRef.current) });
    },
  });

  useEffect(() => {
    getStoredAuthToken().then((token) => setAuthToken(token || ""));
    readFlightPaymentRecovery().then((recovery) => {
      if (!isRecoverableFlightPayment(recovery)) return;
      const sameFlight = String(recovery.traceId) === String(identity.traceId) && String(recovery.resultIndex) === String(identity.resultIndex);
      if (sameFlight) openProcessing(recovery.cashfreeOrderId, recovery);
    });
  }, [identity.traceId, identity.resultIndex, openProcessing]);

  useEffect(() => {
    if (["failed", "cancelled"].includes(cashfree.status)) {
      setPaymentMessage({ type: "error", message: "Unable to start the secure payment. Please try again." });
    }
  }, [cashfree.status, cashfree.error]);

  const refreshQuote = useCallback(async () => {
    if (refreshInFlightRef.current) return null;
    if (!identity.traceId || !identity.resultIndex) {
      setQuoteStatus({ type: "error", message: "Flight session identifiers are missing. Return to Seat Selection and try again." });
      return null;
    }
    refreshInFlightRef.current = true;
    setRefreshing(true);
    try {
      safeFlightLog("[Flight][FareQuote][Request]", {
        endpoint: "/api/flight/srdv/FareQuote",
        traceId: identity.traceId,
        resultIndex: identity.resultIndex,
        srdvType: identity.srdvType,
        srdvIndex: identity.srdvIndex,
        reason: "checkout quote refresh",
      });
      const response = await getFlightFareQuote({
        traceId: identity.traceId,
        resultIndex: identity.resultIndex,
        srdvType: identity.srdvType,
        srdvIndex: identity.srdvIndex,
        offeredFare: Number(fare.totalFare || flowState.payableAmount || 0),
        baseFare: Number(fare.baseFare || 0),
        tax: Number(fare.tax || 0),
        isLCC: identity.isLCC,
      });
      const quoted = extractAuthoritativeFare(response, 0);
      if (!isValidAuthoritativeFare(quoted)) {
        const invalidFareError = new Error("The supplier returned an invalid fare.");
        invalidFareError.backendCode = "INVALID_FARE_QUOTE";
        throw invalidFareError;
      }
      const extras = Number(fare.seatSurcharge || 0) + Number(fare.ssrSurcharge || 0);
      const nextTotal = quoted.total + extras;
      const previousAirlineFare = Number(fare.baseFare || 0) + Number(fare.tax || 0);
      const changed = Math.abs(previousAirlineFare - quoted.total) > 0.009;
      const next = {
        ...flowState,
        flight: {
          ...(flowState.flight || {}),
          selectedTravelClassPriceInr: quoted.total,
          displayFare: quoted.total,
          offeredFare: quoted.total,
          baseFare: quoted.baseFare,
          tax: quoted.tax,
          selectedFare: {
            ...(flowState.flight?.selectedFare || {}),
            OfferedFare: quoted.total,
            B2CFinalFare: quoted.total,
            Fare: {
              ...(flowState.flight?.selectedFare?.Fare || {}),
              BaseFare: quoted.baseFare,
              Tax: quoted.tax,
              OfferedFare: quoted.total,
              B2CFinalFare: quoted.total,
            },
          },
        },
        fareQuote: response?.Results || response,
        quoteTimestamp: Date.now(),
        fareSummary: { ...fare, baseFare: quoted.baseFare, tax: quoted.tax, totalFare: nextTotal },
        payableAmount: nextTotal,
      };
      setFlowState(next);
      await writeFlightBookingFlowState(next);
      safeFlightLog("[Flight][FareQuote][Response]", { ...identity, ...quoted, total: nextTotal, quotedAt: next.quoteTimestamp, changed });
      setQuoteStatus(changed ? { type: "info", message: `Fare updated to ${money(quoted.total)}.` } : { type: "info", message: "Fare confirmed with the airline." });
      return { next, changed };
    } catch (error) {
      const message = error?.isNetworkError
        ? "Unable to refresh the fare. Check your connection and retry."
        : "We couldn’t refresh this fare. Please retry.";
      setQuoteStatus({ type: "error", message });
      safeFlightLog("[Flight][FareQuote][HandledError]", {
        httpStatus: error?.httpStatus || null,
        backendCode: error?.backendCode || null,
        message: String(error?.backendMessage || error?.message || message).slice(0, 240),
        resolvedTraceId: identity.traceId,
        resolvedResultIndex: identity.resultIndex,
        retryAvailable: true,
      });
      return null;
    } finally {
      refreshInFlightRef.current = false;
      setRefreshing(false);
    }
  }, [identity, fare, flowState]);

  useEffect(() => {
    if (isFlightQuoteExpired(flowState.quoteTimestamp)) refreshQuote();
  }, [flowState.quoteTimestamp, refreshQuote]);

  const handleBack = useCallback(async () => {
    await writeFlightBookingFlowState({ ...flowState, checkoutAccepted: accepted });
    if (typeof navigation.popTo === "function") {
      navigation.popTo("FlightSeatSelectionScreen", flowState);
    } else {
      navigation.navigate("FlightSeatSelectionScreen", flowState);
    }
  }, [accepted, flowState, navigation]);

  const handleReady = useCallback(async () => {
    if (isInternational) {
      setPaymentMessage({ type: "error", message: "International booking is unavailable until nationality transmission is supported." });
      return;
    }
    if (!identity.traceId || !identity.resultIndex || passengers.length === 0) {
      setPaymentMessage({ type: "error", message: "Critical flight or traveler details are missing. Return to Seat Selection." });
      return;
    }
    if (!accepted) {
      setPaymentMessage({ type: "error", message: "Please confirm the booking terms before continuing." });
      return;
    }
    if (paymentInFlightRef.current) return;
    paymentInFlightRef.current = true;
    let effectiveState = flowState;
    if (isFlightQuoteExpired(flowState.quoteTimestamp)) {
      const refreshResult = await refreshQuote();
      if (!refreshResult) {
        paymentInFlightRef.current = false;
        return;
      }
      effectiveState = refreshResult.next;
    }
    try {
      const token = authToken || await getStoredAuthToken();
      if (!token || isJwtExpired(token)) {
        setPaymentMessage({ type: "error", message: "Please sign in again before payment." });
        navigation.navigate("Login");
        return;
      }
      const customerId = await getStoredAuthUserId();
      if (!customerId) {
        setPaymentMessage({ type: "error", message: "Your login session is missing account information. Please sign in again." });
        return;
      }
      if (!Number.isFinite(Number(effectiveState.fareSummary?.totalFare)) || Number(effectiveState.fareSummary?.totalFare) <= 0) {
        throw new Error("The payable fare is invalid. Refresh the fare and retry.");
      }
      const invalidPassenger = passengers.find((passenger) => validateFlightPassenger(passenger, {
        international: false,
        departureDate: effectiveState.searchContext?.date || effectiveState.searchContext?.departureDate,
      }).length > 0);
      if (invalidPassenger) throw new Error("Traveler details are incomplete. Return to Passenger Details and review them.");
      const fingerprint = flightPaymentAttemptFingerprint(effectiveState);
      const recovery = await readFlightPaymentRecovery();
      if (isRecoverableFlightPayment(recovery)) {
        openProcessing(recovery.cashfreeOrderId, recovery);
        return;
      }
      const idempotencyKey = recovery?.attemptFingerprint === fingerprint && recovery?.idempotencyKey && !recovery?.cashfreeOrderId
        ? recovery.idempotencyKey
        : createFlightIdempotencyKey();
      const request = buildFlightPaymentRequest(effectiveState, idempotencyKey);
      paymentAttemptRef.current = { fingerprint, idempotencyKey, apiPassengers: request.apiPassengers };
      await writeFlightPaymentRecovery({ idempotencyKey, traceId: identity.traceId, resultIndex: identity.resultIndex, paymentStatus: "Creating", fulfillmentStatus: "", attemptFingerprint: fingerprint });
      setPaymentMessage({ type: "info", message: "Opening secure payment…" });
      safeFlightLog("[Flight][Payment][CreateOrder]", { started: true, amount: request.orderAmount, passengerCount: passengers.length });
      await cashfree.startPayment({ ...request, customerId, bookingType: "Flight" });
    } catch (error) {
      setPaymentMessage({ type: "error", message: "Unable to start the secure payment. Please try again." });
    } finally {
      paymentInFlightRef.current = false;
    }
  }, [accepted, authToken, cashfree, flowState, identity, isInternational, navigation, openProcessing, passengers.length, refreshQuote]);

  const Row = ({ label, value, strong }) => (
    <View style={styles.row}><Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text><Text style={[styles.rowValue, strong && styles.total]}>{value}</Text></View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.back}><Ionicons name="chevron-back" size={26} color={INK} /></TouchableOpacity>
        <View><Text style={styles.title}>Checkout</Text><Text style={styles.subtitle}>Seat Selection → Checkout</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Itinerary</Text>
          <Text style={styles.route}>{routeLabel || "Selected flight"}</Text>
          <Text style={styles.muted}>{[flowState.flight?.airlineName, flowState.flight?.flightNumber].filter(Boolean).join(" ") || "Flight details unavailable"}</Text>
          <Text style={styles.muted}>{flowState.searchContext?.date || "Departure date unavailable"} · {flowState.searchContext?.travelClass || "Cabin not provided"}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Travelers & add-ons</Text>
          <Row label="Travelers" value={`${passengers.length}`} />
          {passengers.map((passenger, index) => <Row key={`traveler-${index}`} label={`Traveler ${index + 1}`} value={travelerName(passenger, index)} />)}
          <Row label="Seats" value={seats.length ? seats.join(", ") : "Not selected"} />
          <Row label="Meals" value={ssrSummary(ssr.meal, ssr.outboundMeal, ssr.returnMeal)} />
          <Row label="Extra baggage" value={ssrSummary(ssr.baggage, ssr.outboundBaggage, ssr.returnBaggage)} />
        </View>
        <View style={styles.card}>
          <View style={styles.cardHeadingRow}><Text style={styles.cardTitle}>Fare details</Text><TouchableOpacity onPress={refreshQuote} disabled={refreshing}><Text style={styles.refresh}>{refreshing ? "Refreshing…" : "Refresh fare"}</Text></TouchableOpacity></View>
          <Row label="Base fare" value={money(fare.baseFare)} />
          <Row label="Taxes & fees" value={money(fare.tax)} />
          {Number(fare.seatSurcharge) > 0 && <Row label="Seats" value={money(fare.seatSurcharge)} />}
          {Number(fare.ssrSurcharge) > 0 && <Row label="Meals & baggage" value={money(fare.ssrSurcharge)} />}
          <View style={styles.divider} />
          <Row label="Total amount" value={money(fare.totalFare || flowState.payableAmount)} strong />
          <Text style={styles.quoteNote}>Airline fare is refreshed when the 12-minute review window expires.</Text>
        </View>
        {quoteStatus && (
          <View style={[styles.quoteStatus, quoteStatus.type === "error" ? styles.quoteError : styles.quoteInfo]} accessibilityRole="alert">
            <Ionicons name={quoteStatus.type === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} size={20} color={quoteStatus.type === "error" ? "#B91C1C" : "#047857"} />
            <Text style={[styles.quoteStatusText, quoteStatus.type === "error" && styles.quoteErrorText]}>{quoteStatus.message}</Text>
            {quoteStatus.type === "error" && <TouchableOpacity onPress={refreshQuote} disabled={refreshing}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>}
          </View>
        )}
        {isInternational && <View style={styles.warning}><Ionicons name="warning-outline" size={20} color="#9A3412" /><Text style={styles.warningText}>International Checkout is currently blocked by the verified backend nationality limitation.</Text></View>}
        {paymentMessage && <View style={[styles.quoteStatus, paymentMessage.type === "error" ? styles.quoteError : styles.quoteInfo]}><Ionicons name={paymentMessage.type === "error" ? "alert-circle-outline" : "shield-checkmark-outline"} size={20} color={paymentMessage.type === "error" ? "#B91C1C" : "#047857"} /><Text style={[styles.quoteStatusText, paymentMessage.type === "error" && styles.quoteErrorText]}>{paymentMessage.message}</Text></View>}
        <TouchableOpacity onPress={() => setAccepted((value) => !value)} style={styles.acceptRow}>
          <Ionicons name={accepted ? "checkbox" : "square-outline"} size={24} color={accepted ? RED : MUTED} />
          <Text style={styles.acceptText}>I have reviewed the itinerary, travelers, fare, and booking terms.</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleReady} disabled={refreshing || cashfree.status === "creating_order"} style={[styles.cta, (refreshing || cashfree.status === "creating_order") && styles.disabled]}>
          {refreshing || cashfree.status === "creating_order" ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="shield-checkmark" size={21} color="#FFF" /><Text style={styles.ctaText}>{cashfree.status === "awaiting_payment" ? "Check payment status" : "Continue to secure payment"}</Text><Ionicons name="arrow-forward" size={22} color="#FFF" /></>}
        </TouchableOpacity>
        <Text style={styles.stopNote}>Payment is verified by Pick&Book before airline confirmation.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG }, header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E6E9EF" },
  back: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF3F3", alignItems: "center", justifyContent: "center" }, title: { fontSize: 25, fontWeight: "900", color: INK }, subtitle: { color: MUTED, marginTop: 2 },
  content: { padding: 18, gap: 14, paddingBottom: 36 }, card: { backgroundColor: "#FFF", padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "#E1E5EB", gap: 12 }, cardTitle: { fontSize: 18, fontWeight: "800", color: INK }, cardHeadingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, refresh: { color: RED, fontWeight: "800" }, route: { fontSize: 22, fontWeight: "900", color: INK }, muted: { color: MUTED },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }, rowLabel: { flex: 1, color: MUTED, fontSize: 15 }, rowValue: { flex: 1, textAlign: "right", color: INK, fontWeight: "700" }, divider: { height: 1, backgroundColor: "#E5E7EB" }, strong: { color: INK, fontWeight: "900", fontSize: 17 }, total: { color: RED, fontSize: 20 }, quoteNote: { color: MUTED, fontSize: 12, lineHeight: 18 },
  warning: { flexDirection: "row", gap: 9, padding: 14, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, warningText: { flex: 1, color: "#9A3412", lineHeight: 20, fontWeight: "600" }, acceptRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 4 }, acceptText: { flex: 1, color: INK, lineHeight: 21 },
  quoteStatus: { flexDirection: "row", alignItems: "center", gap: 9, padding: 13, borderRadius: 14, borderWidth: 1 }, quoteInfo: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }, quoteError: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }, quoteStatusText: { flex: 1, color: "#047857", fontWeight: "600", lineHeight: 18 }, quoteErrorText: { color: "#991B1B" }, retryText: { color: RED, fontWeight: "900" },
  cta: { height: 58, borderRadius: 16, backgroundColor: RED, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, ctaText: { color: "#FFF", fontWeight: "900", fontSize: 16 }, disabled: { opacity: 0.6 }, stopNote: { color: MUTED, textAlign: "center", fontSize: 12 },
});
