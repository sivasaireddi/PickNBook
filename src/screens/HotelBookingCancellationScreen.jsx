import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { cancelHotelBooking, getHotelBookingById, getHotelCancellationQuote } from "../services/hotelService";
import { pickBookingValue } from "../utils/busBookingPresentation";
import { formatHotelDateTime, formatHotelMoney, hasHotelValue, normalizeHotelBooking } from "../utils/hotelBookingPresentation";

const BRAND = "#D7192D";
const NAVY = "#101828";
const MUTED = "#667085";
const BORDER = "#E8E1E2";
const BACKGROUND = "#F8F6F6";
const SURFACE = "#FFFFFF";
const REASONS = ["Plan changed", "Found another hotel", "Travel dates changed", "Booked by mistake", "Other"];

const unwrapQuote = (response) => response?.data?.quote ?? response?.data ?? response?.quote ?? response ?? {};
const quoteValue = (source, keys, fallback = null) => pickBookingValue(source, keys, fallback);
const quoteNumber = (source, keys) => {
  const candidate = quoteValue(source, keys, null);
  return candidate === null || candidate === "" || !Number.isFinite(Number(candidate)) ? null : Number(candidate);
};
const getPolicySlabs = (quote) => {
  const policy = quoteValue(quote, ["cancellationPolicy", "CancellationPolicy"], null);
  const slabs = quoteValue(quote, ["policySlabs", "PolicySlabs", "windows", "Windows", "cancellationWindows", "CancellationWindows"], quoteValue(policy, ["policySlabs", "PolicySlabs", "windows", "Windows"], []));
  return Array.isArray(slabs) ? slabs : [];
};
const safeError = (error) => {
  const message = error?.response?.data?.message || error?.response?.data?.title || error?.message;
  if (/not found/i.test(message || "")) return "This Hotel booking is no longer available.";
  if (/already.*cancel/i.test(message || "")) return "This Hotel booking has already been cancelled.";
  if (/not.*cancell|window|deadline/i.test(message || "")) return "This booking is outside the permitted cancellation window.";
  return message || "Unable to complete the request. Please try again.";
};

export default function HotelBookingCancellationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const booking = useMemo(() => normalizeHotelBooking(route?.params?.booking || {}), [route?.params?.booking]);
  const bookingId = route?.params?.bookingId ?? booking.id;
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState("");
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const quoteRequestRef = useRef(0);

  const loadQuote = useCallback(async () => {
    const requestId = ++quoteRequestRef.current;
    if (!bookingId) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError("The internal Hotel booking reference is missing. Cancellation cannot continue safely.");
      return;
    }
    setQuoteLoading(true);
    setQuoteError("");
    try {
      const response = await getHotelCancellationQuote(bookingId);
      if (requestId === quoteRequestRef.current) setQuote(unwrapQuote(response));
    } catch (error) {
      if (requestId === quoteRequestRef.current) {
        setQuote(null);
        setQuoteError(safeError(error));
      }
    } finally {
      if (requestId === quoteRequestRef.current) setQuoteLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { loadQuote(); }, [loadQuote]);

  const totalPaid = quoteNumber(quote, ["totalPaid", "TotalPaid", "totalPriceInr", "TotalPriceInr", "totalCustomerPaid", "TotalCustomerPaid"]);
  const supplierCharge = quoteNumber(quote, ["supplierCancellationCharge", "SupplierCancellationCharge", "supplierCancellationChargeInr", "SupplierCancellationChargeInr", "operatorCancellationCharge", "OperatorCancellationCharge"]);
  const serviceCharge = quoteNumber(quote, ["serviceCharge", "ServiceCharge", "serviceChargeInr", "ServiceChargeInr"]);
  const totalCharge = quoteNumber(quote, ["cancellationChargeInr", "CancellationChargeInr", "cancellationCharge", "CancellationCharge", "totalCancellationCharge", "TotalCancellationCharge", "estimatedCancellationCharge", "EstimatedCancellationCharge"]);
  const refundAmount = quoteNumber(quote, ["customerRefundAmount", "CustomerRefundAmount", "refundAmount", "RefundAmount", "estimatedRefundAmount", "EstimatedRefundAmount"]);
  const canCancelField = quoteValue(quote, ["canCancel", "CanCancel"], null);
  const canCancel = Boolean(quote) && canCancelField !== false;
  const cannotCancelReason = String(quoteValue(quote, ["cannotCancelReason", "CannotCancelReason", "message", "Message"], "") || "").trim();
  const slabs = getPolicySlabs(quote);
  const effectiveReason = selectedReason === "Other" ? otherReason.trim() : selectedReason;
  const canSubmit = canCancel && Boolean(bookingId) && effectiveReason.length > 0 && !quoteLoading && !submitting;

  const submitCancellation = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await cancelHotelBooking({
        bookingId,
        reason: effectiveReason,
        refundPreference: "ORIGINAL_PAYMENT_METHOD",
      });
      let refreshedBooking = null;
      try {
        refreshedBooking = await getHotelBookingById(bookingId);
      } catch {
        // The destination details screen performs another authoritative fetch.
      }
      Alert.alert(
        "Hotel booking cancelled",
        "The booking was cancelled by the server. Refund progress is available in Hotel booking details.",
        [{ text: "View details", onPress: () => {
          const params = { bookingId, booking: refreshedBooking || route?.params?.booking, refreshedAt: Date.now() };
          if (typeof navigation.popTo === "function") navigation.popTo("HotelBookingDetails", params);
          else navigation.replace("HotelBookingDetails", params);
        } }]
      );
    } catch (error) {
      Alert.alert("Cancellation not completed", safeError(error));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const requestConfirmation = () => {
    if (!canSubmit) return;
    const lines = [
      booking.hotelName || "Hotel booking",
      booking.bookingReference ? `Reference: ${booking.bookingReference}` : "",
      hasHotelValue(totalCharge) ? `Cancellation deduction: ${formatHotelMoney(totalCharge)}` : "",
      hasHotelValue(refundAmount) ? `Refund amount: ${formatHotelMoney(refundAmount)}` : "",
      "Refund destination: Original payment method",
      "",
      "This action cancels the full booking and cannot be undone.",
    ].filter((line) => line !== "");
    Alert.alert("Cancel this Hotel booking?", lines.join("\n"), [
      { text: "Keep booking", style: "cancel" },
      { text: "Confirm cancellation", style: "destructive", onPress: submitCancellation },
    ]);
  };

  return <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
    <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={navigation.goBack} accessibilityLabel="Back"><Ionicons name="arrow-back" size={24} color={NAVY} /></TouchableOpacity>
      <View style={styles.headerCopy}><Text style={styles.headerTitle}>Cancel Hotel booking</Text><Text style={styles.headerSubtitle}>REVIEW BEFORE CONFIRMING</Text></View>
      <View style={styles.headerSpacer} />
    </View>

    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 116 + Math.max(insets.bottom, 12) }]} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryHotel}>{booking.hotelName || "Hotel reservation"}</Text>
        {!!booking.address && <Text style={styles.summaryAddress}>{booking.address}</Text>}
        <View style={styles.summaryMeta}><Meta icon="ticket-outline" text={booking.bookingReference} /><Meta icon="calendar-outline" text={[formatHotelDateTime(booking.checkIn), formatHotelDateTime(booking.checkOut)].filter(Boolean).join(" → ")} /></View>
      </View>

      <Section title="Full booking cancellation" icon="information-circle-outline">
        <Text style={styles.fullBookingText}>All rooms and guests in this Hotel booking will be cancelled together. Partial Hotel cancellation is not supported.</Text>
      </Section>

      <Section title="Cancellation summary" icon="shield-checkmark-outline" dark>
        {quoteLoading ? <View style={styles.loadingRow}><ActivityIndicator color="#FFFFFF" /><Text style={styles.darkLoadingText}>Loading current backend quote…</Text></View> : quoteError ? <View><Text style={styles.darkErrorText}>{quoteError}</Text><TouchableOpacity style={styles.darkRetryButton} onPress={loadQuote}><Text style={styles.darkRetryText}>Retry quote</Text></TouchableOpacity></View> : <>
          <View style={[styles.eligibility, canCancel ? styles.eligible : styles.ineligible]}><Ionicons name={canCancel ? "checkmark-circle" : "information-circle"} size={18} color={canCancel ? "#027A48" : "#B42318"} /><Text style={[styles.eligibilityText, { color: canCancel ? "#027A48" : "#B42318" }]}>{canCancel ? "Eligible for full booking cancellation" : cannotCancelReason || "Cancellation unavailable"}</Text></View>
          <MoneyRow label="Total paid" amount={totalPaid} dark />
          <MoneyRow label="Supplier cancellation charge" amount={supplierCharge} dark deduction />
          <MoneyRow label="Service charge" amount={serviceCharge} dark deduction />
          <MoneyRow label="Total cancellation deduction" amount={totalCharge} dark strong />
          {hasHotelValue(refundAmount) && <View style={styles.refundRow}><Text style={styles.refundLabel}>REFUND AMOUNT</Text><Text style={styles.refundValue}>{formatHotelMoney(refundAmount)}</Text></View>}
          <Text style={styles.authorityNote}>All amounts are displayed exactly from the current backend cancellation quote.</Text>
        </>}
      </Section>

      {slabs.length > 0 && <Section title="Cancellation policy" icon="time-outline"><PolicyRows slabs={slabs} /></Section>}

      <Section title="Reason for cancellation" icon="chatbox-ellipses-outline">
        <View style={styles.reasonGrid}>{REASONS.map((reason) => {
          const selected = selectedReason === reason;
          return <TouchableOpacity key={reason} style={[styles.reasonChip, selected && styles.reasonChipSelected]} onPress={() => setSelectedReason(reason)} activeOpacity={0.8}><Text style={[styles.reasonChipText, selected && styles.reasonChipTextSelected]}>{reason}</Text></TouchableOpacity>;
        })}</View>
        {selectedReason === "Other" && <TextInput style={styles.reasonInput} value={otherReason} onChangeText={setOtherReason} placeholder="Enter cancellation reason" placeholderTextColor="#98A2B3" maxLength={250} multiline />}
      </Section>

      <Section title="Refund destination" icon="return-down-back-outline">
        <View style={styles.destination}><View style={styles.radioSelected}><View style={styles.radioDot} /></View><View style={styles.destinationCopy}><Text style={styles.destinationTitle}>Original payment method</Text><Text style={styles.destinationText}>The backend will return any eligible refund to the original payment source.</Text></View></View>
      </Section>

      <View style={styles.warning}><Ionicons name="warning-outline" size={20} color="#B42318" /><Text style={styles.warningText}>Review the backend quote carefully. Full Hotel cancellation cannot be undone.</Text></View>
    </ScrollView>

    <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View><Text style={styles.footerLabel}>YOU GET BACK</Text><Text style={styles.footerAmount}>{hasHotelValue(refundAmount) ? formatHotelMoney(refundAmount) : "—"}</Text></View>
      <TouchableOpacity style={[styles.confirmButton, !canSubmit && styles.confirmDisabled]} onPress={requestConfirmation} disabled={!canSubmit} activeOpacity={0.85}>{submitting ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.confirmText}>Confirm cancellation</Text><Ionicons name="arrow-forward" size={20} color="#FFF" /></>}</TouchableOpacity>
    </View>
  </SafeAreaView>;
}

function Section({ title, icon, children, dark }) { return <View style={[styles.section, dark && styles.darkSection]}><View style={styles.sectionHeader}><View style={[styles.sectionIcon, dark && styles.darkSectionIcon]}><Ionicons name={icon} size={19} color={dark ? "#FFFFFF" : BRAND} /></View><Text style={[styles.sectionTitle, dark && styles.darkSectionTitle]}>{title}</Text></View>{children}</View>; }
function Meta({ icon, text }) { return !text ? null : <View style={styles.meta}><Ionicons name={icon} size={14} color="#7A2630" /><Text style={styles.metaText} numberOfLines={2}>{text}</Text></View>; }
function MoneyRow({ label, amount, strong, dark, deduction }) { if (!hasHotelValue(amount)) return null; return <View style={[styles.moneyRow, strong && styles.strongMoneyRow, dark && styles.darkMoneyRow, dark && strong && styles.darkStrongMoneyRow]}><Text style={[styles.moneyLabel, strong && styles.strongMoneyText, dark && styles.darkMoneyLabel, dark && strong && styles.darkStrongMoneyText]}>{label}</Text><Text style={[styles.moneyValue, strong && styles.strongMoneyText, dark && styles.darkMoneyValue, dark && strong && styles.darkStrongMoneyText]}>{deduction ? "− " : ""}{formatHotelMoney(amount)}</Text></View>; }

function PolicyRows({ slabs }) {
  return slabs.map((slab, index) => {
    const active = Boolean(quoteValue(slab, ["isActive", "IsActive", "active", "Active"], false));
    const label = String(quoteValue(slab, ["label", "Label", "description", "Description", "window", "Window"], "Cancellation window") || "Cancellation window");
    const from = quoteValue(slab, ["from", "From", "fromDate", "FromDate", "startAt", "StartAt"], null);
    const to = quoteValue(slab, ["to", "To", "toDate", "ToDate", "endAt", "EndAt"], null);
    const charge = quoteNumber(slab, ["cancellationFee", "CancellationFee", "cancellationCharge", "CancellationCharge", "estimatedDeduction", "EstimatedDeduction"]);
    const refund = quoteNumber(slab, ["refundAmount", "RefundAmount", "estimatedRefund", "EstimatedRefund", "refundReturn", "RefundReturn"]);
    return <View key={`${label}-${index}`} style={[styles.policyRow, active && styles.activePolicyRow]}><View style={styles.policyCopy}><View style={styles.policyTitleRow}><Text style={styles.policyTitle}>{label}</Text>{active && <Text style={styles.activeLabel}>CURRENT</Text>}</View>{(from || to) && <Text style={styles.policyWindow}>{[formatHotelDateTime(from), formatHotelDateTime(to)].filter(Boolean).join(" → ")}</Text>}</View><View style={styles.policyAmounts}>{hasHotelValue(charge) && <Text style={styles.policyCharge}>{formatHotelMoney(charge)} fee</Text>}{hasHotelValue(refund) && <Text style={styles.policyRefund}>{formatHotelMoney(refund)} refund</Text>}</View></View>;
  });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SURFACE }, header: { height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#EEE9EA", backgroundColor: SURFACE }, backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center" }, headerTitle: { color: NAVY, fontSize: 17, fontWeight: "800" }, headerSubtitle: { color: BRAND, fontSize: 9, fontWeight: "900", letterSpacing: 0.7, marginTop: 2 }, headerSpacer: { width: 44 }, content: { padding: 16, gap: 14, backgroundColor: BACKGROUND },
  summaryCard: { backgroundColor: "#FFF1F2", borderRadius: 20, borderWidth: 1, borderColor: "#F4CDD2", padding: 17 }, summaryHotel: { color: NAVY, fontSize: 20, lineHeight: 26, fontWeight: "900" }, summaryAddress: { color: MUTED, fontSize: 12, lineHeight: 17, marginTop: 4 }, summaryMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }, meta: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 130 }, metaText: { color: "#7A2630", fontSize: 11, lineHeight: 15, fontWeight: "700", flex: 1 },
  section: { backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 }, sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }, sectionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#FDECEF", alignItems: "center", justifyContent: "center" }, sectionTitle: { color: NAVY, fontSize: 16, fontWeight: "800", flex: 1 }, darkSection: { backgroundColor: "#21191E", borderColor: "#21191E", padding: 20 }, darkSectionIcon: { backgroundColor: "#7E1827" }, darkSectionTitle: { color: "#FFFFFF", textTransform: "uppercase", fontSize: 11, letterSpacing: 1.1 }, fullBookingText: { color: "#475467", fontSize: 12, lineHeight: 18 },
  loadingRow: { minHeight: 80, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, darkLoadingText: { color: "#E8DDE0", fontSize: 12 }, darkErrorText: { color: "#FFD7DC", fontSize: 12, lineHeight: 18 }, darkRetryButton: { alignSelf: "flex-start", marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: "#B85A68", paddingHorizontal: 13, paddingVertical: 9 }, darkRetryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" }, eligibility: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, padding: 11, marginBottom: 8 }, eligible: { backgroundColor: "#ECFDF3" }, ineligible: { backgroundColor: "#FEF3F2" }, eligibilityText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "800" },
  moneyRow: { minHeight: 42, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 15, borderTopWidth: 1, borderTopColor: "#F0EBEC", paddingVertical: 9 }, moneyLabel: { color: MUTED, fontSize: 12, flex: 1 }, moneyValue: { color: NAVY, fontSize: 13, fontWeight: "800" }, strongMoneyRow: { backgroundColor: "#FFF5F6", borderRadius: 10, borderTopWidth: 0, paddingHorizontal: 10, marginTop: 4 }, strongMoneyText: { color: "#8C1725", fontWeight: "900" }, darkMoneyRow: { borderTopColor: "rgba(255,255,255,0.10)" }, darkMoneyLabel: { color: "#D6C9CD" }, darkMoneyValue: { color: "#FFFFFF" }, darkStrongMoneyRow: { backgroundColor: "rgba(255,255,255,0.08)" }, darkStrongMoneyText: { color: "#FFFFFF" }, refundRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 13, padding: 13, marginTop: 8 }, refundLabel: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", letterSpacing: 0.7 }, refundValue: { color: "#86E9B0", fontSize: 24, fontWeight: "900" }, authorityNote: { color: "#CDBEC3", fontSize: 10, lineHeight: 16, marginTop: 12 },
  policyRow: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#F0EBEC", paddingVertical: 11 }, activePolicyRow: { backgroundColor: "#ECFDF3", borderRadius: 9, paddingHorizontal: 9 }, policyCopy: { flex: 1, minWidth: 0 }, policyTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }, policyTitle: { color: NAVY, fontSize: 11, lineHeight: 16, fontWeight: "800", flexShrink: 1 }, activeLabel: { color: "#027A48", backgroundColor: "#D1FADF", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, fontSize: 8, fontWeight: "900" }, policyWindow: { color: MUTED, fontSize: 9, lineHeight: 14, marginTop: 4 }, policyAmounts: { alignItems: "flex-end", maxWidth: 112 }, policyCharge: { color: "#B54708", fontSize: 10, fontWeight: "800" }, policyRefund: { color: "#027A48", fontSize: 10, fontWeight: "800", marginTop: 4 },
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, reasonChip: { borderWidth: 1, borderColor: BORDER, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "#FFFFFF" }, reasonChipSelected: { borderColor: BRAND, backgroundColor: "#FFF0F2" }, reasonChipText: { color: MUTED, fontSize: 11, fontWeight: "700" }, reasonChipTextSelected: { color: BRAND }, reasonInput: { minHeight: 76, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, color: NAVY, fontSize: 13, marginTop: 12, textAlignVertical: "top" }, destination: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: BRAND, backgroundColor: "#FFF0F2", borderRadius: 14, padding: 13 }, radioSelected: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: BRAND, alignItems: "center", justifyContent: "center" }, radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND }, destinationCopy: { flex: 1 }, destinationTitle: { color: NAVY, fontSize: 13, fontWeight: "800" }, destinationText: { color: MUTED, fontSize: 10, lineHeight: 15, marginTop: 3 }, warning: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#FEF3F2", borderRadius: 14, padding: 13 }, warningText: { color: "#912018", fontSize: 11, lineHeight: 17, flex: 1 },
  stickyFooter: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 88, paddingTop: 12, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#EEE4E6", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 }, footerLabel: { color: MUTED, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 }, footerAmount: { color: NAVY, fontSize: 21, fontWeight: "900", marginTop: 2 }, confirmButton: { flex: 1, maxWidth: 260, minHeight: 56, paddingHorizontal: 14, borderRadius: 16, backgroundColor: BRAND, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, shadowColor: BRAND, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3 }, confirmDisabled: { opacity: 0.45 }, confirmText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
});
