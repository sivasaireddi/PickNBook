import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getStoredAuthToken } from "../../../../utils/authSession";
import { getFlightFareQuote } from "./services/flightBookingService";
import { writeFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { extractAuthoritativeFare, isFlightQuoteExpired, safeFlightLog, selectedFlightIdentity } from "./utils/flightFlowUtils";

const RED = "#E53935";
const INK = "#172033";
const MUTED = "#667085";
const BG = "#F7F8FB";
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SummaryRow({ label, value, total }) {
  return <View style={styles.row}><Text style={[styles.rowLabel, total && styles.totalLabel]}>{label}</Text><Text style={[styles.rowValue, total && styles.totalValue]}>{value}</Text></View>;
}

export default function FlightReviewScreen({ route, navigation }) {
  const [flowState, setFlowState] = useState(route?.params || {});
  const [loading, setLoading] = useState(false);
  const identity = useMemo(() => selectedFlightIdentity(flowState.flight || flowState), [flowState]);
  const fare = flowState.fareSummary || {};
  const passengers = Array.isArray(flowState.passengers) ? flowState.passengers : [];
  const seats = Array.isArray(flowState.selectedSeatLabels) ? flowState.selectedSeatLabels.filter(Boolean) : [];
  const ssr = flowState.ssrDetails || {};
  const routeLabel = [flowState.flight?.from || flowState.flight?.originCode, flowState.flight?.to || flowState.flight?.destinationCode].filter(Boolean).join(" → ");
  const seatSummaryForPassenger = (passengerIndex) => {
    if (flowState.legSeatObjectsMap) {
      const labels = Object.keys(flowState.legSeatObjectsMap).sort().map((legIndex) => flowState.legSeatObjectsMap[legIndex]?.[passengerIndex]?.label).filter(Boolean);
      if (labels.length) return labels.map((label, index) => `Leg ${index + 1}: ${label}`).join(" · ");
    }
    return seats[passengerIndex] ? `Seat ${seats[passengerIndex]}` : "No seat selected";
  };
  const ssrLabel = (item) => item?.Description || item?.Weight || item?.Code || "Selected";
  const ssrSummary = (...items) => Array.from(new Set(items.filter(Boolean).map(ssrLabel))).join(" · ");

  const continueToCheckout = useCallback(async () => {
    if (flowState.isInternational) {
      Alert.alert("International Checkout unavailable", "International search and review are available, but Checkout is blocked until the backend transmits passenger nationality during ticketing.");
      return;
    }
    if (!identity.traceId || !identity.resultIndex || passengers.length === 0) {
      Alert.alert("Review incomplete", "Flight session or traveler details are missing. Please return and review your selection.");
      return;
    }
    let next = flowState;
    setLoading(true);
    try {
      if (isFlightQuoteExpired(flowState.quoteTimestamp)) {
        safeFlightLog("[Flight][FareQuote][Request]", { ...identity, reason: "12-minute review window expired" });
        const response = await getFlightFareQuote({
          traceId: identity.traceId,
          resultIndex: identity.resultIndex,
          srdvType: identity.srdvType,
          srdvIndex: identity.srdvIndex,
          isLCC: identity.isLCC,
        });
        const refreshed = extractAuthoritativeFare(response, fare.baseFare + fare.tax);
        const extras = Number(fare.seatSurcharge || 0) + Number(fare.ssrSurcharge || 0);
        const refreshedTotal = refreshed.total + extras;
        const changed = Number(fare.totalFare || 0) !== refreshedTotal;
        next = {
          ...flowState,
          fareQuote: response?.Results || response,
          quoteTimestamp: Date.now(),
          fareSummary: { ...fare, baseFare: refreshed.baseFare, tax: refreshed.tax, totalFare: refreshedTotal },
          payableAmount: refreshedTotal,
        };
        setFlowState(next);
        await writeFlightBookingFlowState(next);
        safeFlightLog("[Flight][FareQuote][Response]", { ...identity, ...refreshed, total: refreshedTotal, quotedAt: next.quoteTimestamp, changed });
        if (changed) {
          Alert.alert("Fare updated", `The airline's latest total is ${money(refreshedTotal)}. Review the updated amount, then tap Continue again.`);
          return;
        }
      }
      const token = await getStoredAuthToken();
      if (!token) {
        await writeFlightBookingFlowState(next);
        navigation.navigate("Login", { returnTo: "FlightCheckoutScreen", returnParams: next });
        return;
      }
      safeFlightLog("[Flight][Review][State]", { ...identity, total: next.fareSummary?.totalFare, destinationRoute: "FlightCheckoutScreen" });
      navigation.navigate("FlightCheckoutScreen", next);
    } catch (error) {
      Alert.alert("Fare refresh failed", error?.message || "Unable to refresh the airline fare. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [fare, flowState, identity, navigation, passengers.length]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={26} color={INK} /></TouchableOpacity>
        <View><Text style={styles.title}>Flight Review & Confirmation</Text><Text style={styles.subtitle}>Final summary before Checkout</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}><Ionicons name="airplane" size={20} color={RED} /><Text style={styles.cardTitle}>Itinerary Summary</Text></View>
          <Text style={styles.route}>{routeLabel || "Selected flight"}</Text>
          <Text style={styles.muted}>{flowState.flight?.airlineName || flowState.flight?.airline || "Airline details unavailable"} {flowState.flight?.flightNumber || ""}</Text>
          <Text style={styles.muted}>{flowState.searchContext?.date || "Date unavailable"} · {flowState.searchContext?.travelClass || "Cabin unavailable"}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardHeader}><Ionicons name="people" size={20} color={RED} /><Text style={styles.cardTitle}>Travelers & Seats</Text></View>
          {passengers.map((passenger, index) => <SummaryRow key={index} label={`${passenger.title || ""} ${passenger.firstName || "Traveler"} ${passenger.lastName || ""}`.trim()} value={seatSummaryForPassenger(index)} />)}
          {(ssr.meal || ssr.outboundMeal || ssr.returnMeal) && <SummaryRow label="Meal" value={ssrSummary(ssr.meal, ssr.outboundMeal, ssr.returnMeal)} />}
          {(ssr.baggage || ssr.outboundBaggage || ssr.returnBaggage) && <SummaryRow label="Extra baggage" value={ssrSummary(ssr.baggage, ssr.outboundBaggage, ssr.returnBaggage)} />}
        </View>
        <View style={styles.card}>
          <View style={styles.cardHeader}><Ionicons name="receipt" size={20} color={RED} /><Text style={styles.cardTitle}>Fare Details</Text></View>
          <SummaryRow label="Base fare" value={money(fare.baseFare)} />
          <SummaryRow label="Taxes & fees" value={money(fare.tax)} />
          {Number(fare.seatSurcharge) > 0 && <SummaryRow label="Seat selection" value={money(fare.seatSurcharge)} />}
          {Number(fare.ssrSurcharge) > 0 && <SummaryRow label="Meals & baggage" value={money(fare.ssrSurcharge)} />}
          <View style={styles.divider} />
          <SummaryRow label="Total amount" value={money(fare.totalFare || flowState.payableAmount)} total />
        </View>
        <TouchableOpacity onPress={continueToCheckout} disabled={loading} style={[styles.cta, loading && styles.disabled]}>
          {loading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.ctaText}>Continue to Checkout</Text><Ionicons name="arrow-forward" size={23} color="#FFF" /></>}
        </TouchableOpacity>
        <Text style={styles.note}>No payment order is created on Review.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG }, header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E6E9EF" }, back: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF2F2", alignItems: "center", justifyContent: "center" }, title: { color: INK, fontWeight: "900", fontSize: 20 }, subtitle: { color: MUTED, marginTop: 3 },
  content: { padding: 18, gap: 14, paddingBottom: 36 }, card: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E1E5EB", borderRadius: 18, padding: 18, gap: 13 }, cardHeader: { flexDirection: "row", alignItems: "center", gap: 9 }, cardTitle: { color: INK, fontSize: 18, fontWeight: "900" }, route: { color: INK, fontSize: 22, fontWeight: "900" }, muted: { color: MUTED },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }, rowLabel: { flex: 1, color: MUTED }, rowValue: { flex: 1, color: INK, fontWeight: "700", textAlign: "right" }, divider: { height: 1, backgroundColor: "#E5E7EB" }, totalLabel: { color: INK, fontWeight: "900", fontSize: 17 }, totalValue: { color: RED, fontWeight: "900", fontSize: 20 },
  cta: { height: 58, borderRadius: 16, backgroundColor: RED, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 }, ctaText: { color: "#FFF", fontWeight: "900", fontSize: 17 }, disabled: { opacity: 0.65 }, note: { color: MUTED, textAlign: "center", fontSize: 12 },
});
