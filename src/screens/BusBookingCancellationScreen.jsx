import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { requireAuthToken } from "../utils/authSession";
import { getBusCancellationQuote, submitBusCancellation } from "../services/busService";
import { formatBookingCurrency, formatBookingDateTime, formatBusCancellationChargeRule, formatBusCancellationWindow, normalizeBusBooking, pickBookingValue } from "../utils/busBookingPresentation";

const BRAND = "#D7192D";
const NAVY = "#101828";
const MUTED = "#667085";
const BORDER = "#E8E1E2";
const BACKGROUND = "#F8F6F6";
const SURFACE = "#FFFFFF";

const value = (source, keys, fallback = null) => pickBookingValue(source, keys, fallback);
const numberValue = (source, keys) => {
  const candidate = value(source, keys, null);
  return candidate === null || candidate === "" || !Number.isFinite(Number(candidate)) ? null : Number(candidate);
};
const responseMessage = (error) => {
  const payload = error?.response?.data;
  const message = typeof payload === "string" ? payload : payload?.message || payload?.title || error?.message;
  if (/depart/i.test(message || "")) return "The cancellation window has expired because this bus has departed.";
  if (/already cancelled/i.test(message || "")) return "The selected passenger or booking is already cancelled.";
  if (/not found/i.test(message || "")) return "This booking is no longer available.";
  return message || "Unable to complete the request. Please try again.";
};

export default function BusBookingCancellationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const booking = useMemo(() => normalizeBusBooking(route?.params?.booking), [route?.params?.booking]);
  const activePassengers = useMemo(() => booking.passengers.filter((passenger) => !passenger.isCancelled && Number(passenger.id) > 0), [booking.passengers]);
  const activePassengerIds = useMemo(() => activePassengers.map((passenger) => Number(passenger.id)), [activePassengers]);
  const [selectedIds, setSelectedIds] = useState(activePassengerIds);
  const [quote, setQuote] = useState(null);
  const [quotedSelectionKey, setQuotedSelectionKey] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState("");
  const [reason, setReason] = useState("Plan changed");
  const [refundPreference, setRefundPreference] = useState("ORIGINAL_PAYMENT_METHOD");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const quoteRequestRef = useRef(0);
  const selectionKey = selectedIds.map(Number).sort((a, b) => a - b).join(",");

  useEffect(() => {
    let active = true;
    const requestId = ++quoteRequestRef.current;
    if (!booking.id || selectedIds.length === 0) {
      setQuote(null);
      setQuotedSelectionKey("");
      setQuoteLoading(false);
      setQuoteError(selectedIds.length === 0 ? "Select at least one passenger to see the cancellation quote." : "A valid booking is required.");
      return () => { active = false; };
    }

    setQuoteLoading(true);
    setQuoteError("");
    setQuotedSelectionKey("");
    (async () => {
      try {
        const token = await requireAuthToken(null);
        const result = await getBusCancellationQuote(booking.id, selectedIds, token);
        if (active && requestId === quoteRequestRef.current) {
          setQuote(result?.data || result);
          setQuotedSelectionKey(selectionKey);
        }
      } catch (error) {
        if (active && requestId === quoteRequestRef.current) {
          setQuote(null);
          setQuoteError(responseMessage(error));
        }
      } finally {
        if (active && requestId === quoteRequestRef.current) setQuoteLoading(false);
      }
    })();
    return () => { active = false; };
  }, [booking.id, selectedIds, selectionKey]);

  const breakdown = value(quote, ["breakdown", "Breakdown"], {}) || {};
  const slabs = value(quote, ["policySlabs", "PolicySlabs"], []) || [];
  const canCancel = Boolean(value(quote, ["canCancel", "CanCancel"], false));
  const cannotCancelReason = String(value(quote, ["cannotCancelReason", "CannotCancelReason"], "") || "");
  const ticketPaid = numberValue(quote, ["totalCustomerPaid", "TotalCustomerPaid"]);
  const operatorCharge = numberValue(breakdown, ["supplierCancellationCharge", "SupplierCancellationCharge"]);
  const serviceCharge = numberValue(breakdown, ["serviceCharge", "ServiceCharge"]);
  const convenienceCharge = numberValue(breakdown, ["nonRefundableConvenienceFee", "NonRefundableConvenienceFee"]);
  const couponForfeited = numberValue(breakdown, ["couponForfeited", "CouponForfeited"]);
  const totalCharge = numberValue(quote, ["estimatedCancellationCharge", "EstimatedCancellationCharge"]);
  const refundAmount = numberValue(quote, ["estimatedRefundAmount", "EstimatedRefundAmount"]);
  const fullCancellation = activePassengerIds.length > 0 && activePassengerIds.every((id) => selectedIds.includes(id));
  const effectiveRefundPreference = fullCancellation ? refundPreference : "ORIGINAL_PAYMENT_METHOD";
  const refundDestination = effectiveRefundPreference === "WALLET" ? "Pick&Book Wallet" : "Original payment method";
  const canSubmit = canCancel && selectedIds.length > 0 && quotedSelectionKey === selectionKey && reason.trim().length > 0 && !quoteLoading && !submitting;

  const togglePassenger = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const submitConfirmedCancellation = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const token = await requireAuthToken(null);
      const result = await submitBusCancellation({
        bookingId: booking.id,
        passengerIds: selectedIds,
        activePassengerIds,
        reason: reason.trim(),
        refundPreference: effectiveRefundPreference,
      }, token);
      const updatedRaw = result?.result || result?.Result || result?.data || result;
      const updated = normalizeBusBooking(updatedRaw);
      Alert.alert(
        updated.status === "Cancelled" ? "Booking cancelled" : "Cancellation updated",
        updated.status === "Cancelled"
          ? "The booking was cancelled by the server. Refund progress is available in booking details."
          : "The selected passengers were updated by the server.",
        [{ text: "View details", onPress: () => {
          const params = { booking: updatedRaw, refreshedAt: Date.now() };
          if (typeof navigation.popTo === "function") navigation.popTo("BusBookingDetails", params);
          else navigation.replace("BusBookingDetails", params);
        } }]
      );
    } catch (error) {
      Alert.alert("Cancellation not completed", responseMessage(error));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const requestConfirmation = () => {
    if (!canSubmit) return;
    const seats = activePassengers.filter((passenger) => selectedIds.includes(Number(passenger.id))).map((passenger) => passenger.seatNumber).filter(Boolean).join(", ");
    Alert.alert(
      "Cancel this booking?",
      `PNR ${booking.pnr || "Not available"}\nSeat${seats.includes(",") ? "s" : ""}: ${seats || "Not available"}\nCancellation charge: ${formatBookingCurrency(totalCharge)}\nExpected refund: ${formatBookingCurrency(refundAmount)}\nRefund to: ${refundDestination}\n\nThis action cannot be undone.`,
      [{ text: "Keep booking", style: "cancel" }, { text: "Confirm cancellation", style: "destructive", onPress: submitConfirmedCancellation }]
    );
  };

  return <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
    <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={navigation.goBack} accessibilityLabel="Back"><Ionicons name="arrow-back" size={24} color={NAVY} /></TouchableOpacity>
      <View style={styles.headerCopy}><Text style={styles.headerTitle}>Cancel bus booking</Text><Text style={styles.headerSubtitle}>REVIEW BEFORE CONFIRMING</Text></View>
      <View style={styles.headerSpacer} />
    </View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 24 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryRoute}>{booking.from} <Text style={styles.brandText}>→</Text> {booking.to}</Text>
        {!!booking.operator && <Text style={styles.summaryOperator}>{booking.operator}</Text>}
        {!!booking.bookingReference && <Text style={styles.summaryReference}>{booking.bookingReference}</Text>}
        <View style={styles.summaryMeta}><Meta icon="ticket-outline" text={booking.pnr ? `PNR ${booking.pnr}` : booking.bookingReference} /><Meta icon="calendar-outline" text={formatBookingDateTime(booking.departureAt)} /></View>
      </View>

      <Section title="Passengers & seats" icon="people-outline">
        {activePassengers.length === 0 ? <Text style={styles.errorText}>No active passengers are available for cancellation.</Text> : activePassengers.map((passenger) => {
          const selected = selectedIds.includes(Number(passenger.id));
          return <TouchableOpacity key={String(passenger.id)} style={[styles.passengerRow, selected && styles.passengerSelected]} onPress={() => togglePassenger(Number(passenger.id))} activeOpacity={0.8}>
            <View style={[styles.check, selected && styles.checkSelected]}>{selected && <Ionicons name="checkmark" size={16} color="#FFF" />}</View>
            <View style={styles.passengerCopy}><Text style={styles.passengerName}>{passenger.fullName || "Passenger"}</Text><Text style={styles.passengerMeta}>{[passenger.gender, passenger.age ? `${passenger.age} yrs` : ""].filter(Boolean).join(" • ")}</Text></View>
            <View style={styles.seatPill}><Text style={styles.seatLabel}>SEAT</Text><Text style={styles.seatValue}>{passenger.seatNumber || "–"}</Text></View>
          </TouchableOpacity>;
        })}
      </Section>

      <Section title="Cancellation & refund quote" icon="shield-checkmark-outline">
        {quoteLoading ? <View style={styles.loadingRow}><ActivityIndicator color={BRAND} /><Text style={styles.loadingText}>Loading current quote…</Text></View> : quoteError ? <View><Text style={styles.errorText}>{quoteError}</Text><TouchableOpacity style={styles.retryButton} onPress={() => setSelectedIds((current) => [...current])}><Text style={styles.retryText}>Retry quote</Text></TouchableOpacity></View> : <>
          <View style={[styles.eligibility, canCancel ? styles.eligible : styles.ineligible]}><Ionicons name={canCancel ? "checkmark-circle" : "information-circle"} size={18} color={canCancel ? "#027A48" : "#B42318"} /><Text style={[styles.eligibilityText, { color: canCancel ? "#027A48" : "#B42318" }]}>{canCancel ? "Refundable under the current policy" : cannotCancelReason || "Cancellation unavailable"}</Text></View>
          <MoneyRow label="Ticket paid" amount={ticketPaid} />
          <MoneyRow label="Operator cancellation charge" amount={operatorCharge} />
          <MoneyRow label="Service charge" amount={serviceCharge} />
          {Number(convenienceCharge) > 0 && <MoneyRow label="Non-refundable convenience fee" amount={convenienceCharge} />}
          {Number(couponForfeited) > 0 && <MoneyRow label="Coupon amount forfeited" amount={couponForfeited} />}
          <MoneyRow label="Total cancellation charge" amount={totalCharge} strong />
          <View style={styles.refundRow}><Text style={styles.refundLabel}>ESTIMATED REFUND</Text><Text style={styles.refundValue}>{formatBookingCurrency(refundAmount)}</Text></View>
          {!!booking.departureAt && <Text style={styles.policyNote}>Departure: {formatBookingDateTime(booking.departureAt)}</Text>}
        </>}
      </Section>

      {slabs.length > 0 && <Section title="Cancellation policy" icon="time-outline">
        {slabs.map((slab, index) => {
          const active = Boolean(value(slab, ["isActive", "IsActive"], false));
          const windowText = formatBusCancellationWindow(slabs, index);
          const chargeRule = formatBusCancellationChargeRule(slab);
          return <View key={`${value(slab, ["hoursBeforeDeparture", "HoursBeforeDeparture"], "policy")}-${index}`} style={[styles.policyRow, active && styles.activePolicyRow]}>
            <View style={styles.policyCopy}><View style={styles.policyTitleRow}><Text style={styles.policyTitle}>{windowText}</Text>{active && <Text style={styles.activeLabel}>CURRENT</Text>}</View>{!!chargeRule && <Text style={styles.policyDate}>{chargeRule}</Text>}</View>
            <View style={styles.policyAmounts}><Text style={styles.policyCharge}>{formatBookingCurrency(value(slab, ["estimatedDeduction", "EstimatedDeduction"], null))} fee</Text><Text style={styles.policyRefund}>{formatBookingCurrency(value(slab, ["estimatedRefund", "EstimatedRefund"], null))} refund</Text></View>
          </View>;
        })}
      </Section>}

      <Section title="Reason for cancellation" icon="chatbox-ellipses-outline"><TextInput style={styles.reasonInput} value={reason} onChangeText={setReason} placeholder="Enter cancellation reason" placeholderTextColor="#98A2B3" maxLength={250} /></Section>

      <Section title="Refund destination" icon="return-down-back-outline">
        <Text style={styles.sectionHint}>{fullCancellation ? "Choose where the backend should return the eligible refund." : "Partial cancellation refunds use the original payment method."}</Text>
        <RefundChoice label="Original payment method" selected={refundPreference === "ORIGINAL_PAYMENT_METHOD"} onPress={() => setRefundPreference("ORIGINAL_PAYMENT_METHOD")} />
        {fullCancellation && <RefundChoice label="Pick&Book Wallet" selected={refundPreference === "WALLET"} onPress={() => setRefundPreference("WALLET")} />}
      </Section>

      <View style={styles.warning}><Ionicons name="warning-outline" size={20} color="#B42318" /><Text style={styles.warningText}>Review the selected passengers and refund quote carefully. Cancellation cannot be undone.</Text></View>
      <TouchableOpacity style={[styles.confirmButton, !canSubmit && styles.confirmDisabled]} onPress={requestConfirmation} disabled={!canSubmit} activeOpacity={0.85}>{submitting ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.confirmText}>Confirm cancellation</Text><Ionicons name="arrow-forward" size={20} color="#FFF" /></>}</TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}

function Section({ title, icon, children }) { return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionIcon}><Ionicons name={icon} size={19} color={BRAND} /></View><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>; }
function Meta({ icon, text }) { return !text ? null : <View style={styles.meta}><Ionicons name={icon} size={14} color="#7A2630" /><Text style={styles.metaText} numberOfLines={2}>{text}</Text></View>; }
function MoneyRow({ label, amount, strong }) { return amount === null || amount === undefined ? null : <View style={[styles.moneyRow, strong && styles.strongMoneyRow]}><Text style={[styles.moneyLabel, strong && styles.strongMoneyText]}>{label}</Text><Text style={[styles.moneyValue, strong && styles.strongMoneyText]}>{formatBookingCurrency(amount)}</Text></View>; }
function RefundChoice({ label, selected, onPress }) { return <TouchableOpacity style={[styles.refundChoice, selected && styles.refundChoiceSelected]} onPress={onPress}><View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View><Text style={styles.refundChoiceText}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SURFACE }, header: { height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#EEE9EA", backgroundColor: SURFACE }, backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center" }, headerTitle: { color: NAVY, fontSize: 17, fontWeight: "800" }, headerSubtitle: { color: BRAND, fontSize: 9, fontWeight: "900", letterSpacing: 0.7, marginTop: 2 }, headerSpacer: { width: 44 }, content: { padding: 16, gap: 14, backgroundColor: BACKGROUND },
  summaryCard: { backgroundColor: "#FFF1F2", borderRadius: 20, borderWidth: 1, borderColor: "#F4CDD2", padding: 17 }, summaryRoute: { color: NAVY, fontSize: 20, lineHeight: 26, fontWeight: "900" }, brandText: { color: BRAND }, summaryOperator: { color: MUTED, fontSize: 13, fontWeight: "700", marginTop: 4 }, summaryReference: { color: "#7A2630", fontSize: 10, fontWeight: "800", marginTop: 6 }, summaryMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }, meta: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 130 }, metaText: { color: "#7A2630", fontSize: 11, lineHeight: 15, fontWeight: "700", flex: 1 },
  section: { backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 }, sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }, sectionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#FDECEF", alignItems: "center", justifyContent: "center" }, sectionTitle: { color: NAVY, fontSize: 16, fontWeight: "800", flex: 1 }, sectionHint: { color: MUTED, fontSize: 11, lineHeight: 17, marginBottom: 10 },
  passengerRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 11, marginTop: 8 }, passengerSelected: { borderColor: "#E98B96", backgroundColor: "#FFF5F6" }, check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: "#B8C0CC", alignItems: "center", justifyContent: "center" }, checkSelected: { backgroundColor: BRAND, borderColor: BRAND }, passengerCopy: { flex: 1, minWidth: 0 }, passengerName: { color: NAVY, fontSize: 14, fontWeight: "800" }, passengerMeta: { color: MUTED, fontSize: 11, marginTop: 3 }, seatPill: { minWidth: 48, borderRadius: 11, backgroundColor: "#F4F6F8", paddingHorizontal: 9, paddingVertical: 6, alignItems: "center" }, seatLabel: { color: MUTED, fontSize: 8, fontWeight: "900" }, seatValue: { color: NAVY, fontSize: 13, fontWeight: "900" },
  loadingRow: { minHeight: 80, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, loadingText: { color: MUTED, fontSize: 12 }, errorText: { color: "#B42318", fontSize: 12, lineHeight: 18 }, retryButton: { alignSelf: "flex-start", marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: "#E98B96", paddingHorizontal: 13, paddingVertical: 9 }, retryText: { color: BRAND, fontSize: 12, fontWeight: "800" }, eligibility: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, padding: 11, marginBottom: 8 }, eligible: { backgroundColor: "#ECFDF3" }, ineligible: { backgroundColor: "#FEF3F2" }, eligibilityText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "800" }, moneyRow: { minHeight: 42, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 15, borderTopWidth: 1, borderTopColor: "#F0EBEC", paddingVertical: 9 }, moneyLabel: { color: MUTED, fontSize: 12, flex: 1 }, moneyValue: { color: NAVY, fontSize: 13, fontWeight: "800" }, strongMoneyRow: { backgroundColor: "#FFF5F6", borderRadius: 10, borderTopWidth: 0, paddingHorizontal: 10, marginTop: 4 }, strongMoneyText: { color: "#8C1725", fontWeight: "900" }, refundRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#ECFDF3", borderRadius: 13, padding: 13, marginTop: 8 }, refundLabel: { color: "#067647", fontSize: 10, fontWeight: "900", letterSpacing: 0.7 }, refundValue: { color: "#067647", fontSize: 19, fontWeight: "900" }, policyNote: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: 10 },
  policyRow: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#F0EBEC", paddingVertical: 11 }, activePolicyRow: { backgroundColor: "#ECFDF3", borderRadius: 9, paddingHorizontal: 9 }, policyCopy: { flex: 1, minWidth: 0 }, policyTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }, policyTitle: { color: NAVY, fontSize: 11, lineHeight: 16, fontWeight: "800", flexShrink: 1 }, activeLabel: { color: "#027A48", backgroundColor: "#D1FADF", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, fontSize: 8, fontWeight: "900" }, policyDate: { color: MUTED, fontSize: 9, marginTop: 3 }, policyAmounts: { alignItems: "flex-end", maxWidth: 115 }, policyCharge: { color: "#B54708", fontSize: 10, fontWeight: "800", textAlign: "right" }, policyRefund: { color: "#027A48", fontSize: 10, fontWeight: "800", marginTop: 4, textAlign: "right" },
  reasonInput: { minHeight: 52, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, color: NAVY, fontSize: 14 }, refundChoice: { minHeight: 50, borderWidth: 1, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }, refundChoiceSelected: { borderColor: "#E98B96", backgroundColor: "#FFF5F6" }, radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: "#B8C0CC", alignItems: "center", justifyContent: "center" }, radioSelected: { borderColor: BRAND }, radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND }, refundChoiceText: { color: NAVY, fontSize: 13, fontWeight: "700" }, warning: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#FEF3F2", borderRadius: 14, padding: 13 }, warningText: { color: "#912018", fontSize: 11, lineHeight: 17, flex: 1 }, confirmButton: { minHeight: 56, borderRadius: 16, backgroundColor: BRAND, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, shadowColor: BRAND, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3 }, confirmDisabled: { opacity: 0.45 }, confirmText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
});
