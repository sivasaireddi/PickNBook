import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getHotelBookingById } from "../services/hotelService";
import { pickBookingValue } from "../utils/busBookingPresentation";
import {
  formatHotelDate,
  formatHotelDateTime,
  formatHotelGuestSummary,
  formatHotelMoney,
  formatHotelStayRange,
  hasHotelValue,
  normalizeHotelBooking,
  normalizeHotelStatusToken,
} from "../utils/hotelBookingPresentation";

const BRAND = "#D7192D";
const NAVY = "#101828";
const MUTED = "#667085";
const BORDER = "#E8E1E2";
const BACKGROUND = "#F8F6F6";
const SURFACE = "#FFFFFF";

const readable = (value) => String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const safeReason = (value) => {
  const reason = String(value || "").trim();
  if (!reason || reason.startsWith("{") || reason.startsWith("[") || /(StackTrace|GatewayError|FailureReason)/i.test(reason)) return "";
  return reason;
};

const getPolicySlabs = (policy) => {
  if (Array.isArray(policy)) return policy;
  if (!policy || typeof policy !== "object") return [];
  const slabs = pickBookingValue(policy, ["policySlabs", "PolicySlabs", "windows", "Windows", "cancellationWindows", "CancellationWindows"], []);
  return Array.isArray(slabs) ? slabs : [];
};

export default function HotelBookingDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const routeBooking = route?.params?.booking;
  const routeBookingId = route?.params?.bookingId ?? normalizeHotelBooking(routeBooking).id;
  const [rawBooking, setRawBooking] = useState(routeBooking || null);
  const [loading, setLoading] = useState(Boolean(routeBookingId));
  const [error, setError] = useState("");
  const [lifecycleExpanded, setLifecycleExpanded] = useState(false);
  const booking = useMemo(() => normalizeHotelBooking(rawBooking || routeBooking || {}), [rawBooking, routeBooking]);

  const loadBooking = useCallback(async () => {
    if (!routeBookingId) {
      setLoading(false);
      setError("The internal Hotel booking reference is missing. Details cannot be refreshed safely.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await getHotelBookingById(routeBookingId);
      setRawBooking(response);
    } catch (loadError) {
      setError(loadError?.message || "Unable to load this Hotel booking.");
    } finally {
      setLoading(false);
    }
  }, [routeBookingId]);

  useEffect(() => { loadBooking(); }, [loadBooking, route?.params?.refreshedAt]);

  const status = booking.statusPresentation;
  const stayRange = formatHotelStayRange(booking);
  const guestSummary = formatHotelGuestSummary(booking);
  const cancellationReason = safeReason(booking.cancellationReason);
  const policy = booking.cancellationPolicy;
  const policySlabs = getPolicySlabs(policy);
  const policyDescription = String(pickBookingValue(policy, ["description", "Description", "summary", "Summary", "cannotCancelReason", "CannotCancelReason"], "") || "").trim();
  const freeCancellationUntil = pickBookingValue(policy, ["freeCancellationUntil", "FreeCancellationUntil", "lastCancellationDate", "LastCancellationDate"], null);
  const postCancellation = booking.listStatus === "Cancelled";

  const bookingRows = [
    ["Booking reference", booking.bookingReference],
    ["Booking ID", hasHotelValue(booking.id) ? String(booking.id) : ""],
    ["Confirmation number", booking.confirmationNo],
    ["Provider booking ID", booking.providerBookingId],
    ["Booked on", formatHotelDateTime(booking.bookedAt)],
  ].filter(([, value]) => hasHotelValue(value));

  const stayRows = [
    ["Hotel", booking.hotelName],
    ["Check-in", formatHotelDate(booking.checkIn)],
    ["Check-out", formatHotelDate(booking.checkOut)],
    ["Nights", hasHotelValue(booking.nights) ? String(booking.nights) : ""],
    ["Rooms", hasHotelValue(booking.roomCount) ? String(booking.roomCount) : ""],
    ["Room type", booking.roomType],
    ["Rate / meal plan", booking.ratePlan],
    ["Adults", hasHotelValue(booking.adultCount) ? String(booking.adultCount) : ""],
    ["Children", Number(booking.childCount) > 0 ? String(booking.childCount) : ""],
  ].filter(([, value]) => hasHotelValue(value));

  const paymentRows = [
    ["Payment method", booking.paymentMethod],
    ["Payment reference", booking.paymentReference],
    ["Payment status", booking.paymentStatus ? readable(booking.paymentStatus) : ""],
  ].filter(([, value]) => hasHotelValue(value));

  const openCancellation = () => {
    if (!booking.id) {
      Alert.alert("Cancellation unavailable", "The internal Hotel booking reference is missing. Please contact support.");
      return;
    }
    navigation.navigate("HotelBookingCancellation", { bookingId: booking.id, booking: booking.raw });
  };

  if (!rawBooking && loading) {
    return <SafeAreaView style={styles.centerPage}><ActivityIndicator size="large" color={BRAND} /><Text style={styles.loadingText}>Loading Hotel booking…</Text></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
    <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={navigation.goBack} accessibilityLabel="Back to bookings"><Ionicons name="arrow-back" size={24} color={NAVY} /></TouchableOpacity>
      <View style={styles.headerCopy}><Text style={styles.headerTitle}>Hotel booking</Text><Text style={[styles.headerSubtitle, { color: status.color }]}>{status.label}</Text></View>
      <View style={styles.headerSpacer} />
    </View>

    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 28 }]} showsVerticalScrollIndicator={false}>
      {loading && <View style={styles.refreshing}><ActivityIndicator size="small" color={BRAND} /><Text style={styles.refreshingText}>Refreshing booking details…</Text></View>}
      {!!error && <View style={styles.errorCard}><Ionicons name="cloud-offline-outline" size={20} color="#B42318" /><View style={styles.errorCopy}><Text style={styles.errorTitle}>Latest details unavailable</Text><Text style={styles.errorText}>{error}</Text></View><TouchableOpacity style={styles.retryButton} onPress={loadBooking}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>}

      <View style={styles.ticketHero}>
        <View style={styles.heroTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: status.tint }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
          {!!booking.bookingReference && <Text style={styles.heroReference} numberOfLines={1}>{booking.bookingReference}</Text>}
        </View>
        <Text style={styles.heroHotel} numberOfLines={2}>{booking.hotelName || "Hotel reservation"}</Text>
        {!!booking.address && <Text style={styles.heroAddress} numberOfLines={2}>{booking.address}</Text>}
        {(booking.checkIn || booking.checkOut) && <View style={styles.heroDateRow}>
          <DateEnd label="CHECK-IN" value={formatHotelDate(booking.checkIn)} />
          <View style={styles.heroConnector}><View style={styles.heroLine} /><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /><View style={styles.heroLine} /></View>
          <DateEnd label="CHECK-OUT" value={formatHotelDate(booking.checkOut)} align="right" />
        </View>}
        {(hasHotelValue(booking.nights) || guestSummary) && <View style={styles.heroMeta}><Ionicons name="moon-outline" size={16} color="#FBCED3" /><Text style={styles.heroMetaText}>{[hasHotelValue(booking.nights) ? `${booking.nights} ${Number(booking.nights) === 1 ? "night" : "nights"}` : "", guestSummary].filter(Boolean).join(" · ")}</Text></View>}
      </View>

      {booking.listStatus === "Pending" && <Notice tone="warning" title="Confirmation pending" text="Your payment or supplier confirmation is still being reconciled. This booking is not being shown as confirmed yet." />}
      {booking.listStatus === "Failed" && booking.supplierFulfillmentFailed && booking.paymentReceived && <Notice tone="error" title="Hotel Booking Could Not Be Confirmed" text="Your payment was received, but the hotel could not confirm the reservation. A refund has been initiated when shown by the backend below." />}
      {booking.listStatus === "Failed" && !(booking.supplierFulfillmentFailed && booking.paymentReceived) && <Notice tone="error" title={booking.paymentFailed ? "Payment Not Completed" : "Hotel Booking Could Not Be Confirmed"} text={booking.paymentFailed ? "The payment was not completed, so this reservation is not confirmed." : "The reservation could not be confirmed. Refund progress is shown below only when supplied by the backend."} />}

      {bookingRows.length > 0 && <Section title="Booking details" icon="ticket-outline">{bookingRows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</Section>}
      {stayRows.length > 0 && <Section title="Stay details" icon="bed-outline">{stayRows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</Section>}

      {(booking.guestName || booking.guestPhone || booking.guestEmail || booking.guests.length > 0) && <Section title="Lead guest" icon="person-outline">
        <InfoRow label="Name" value={booking.guestName} />
        <InfoRow label="Phone" value={booking.guestPhone} />
        <InfoRow label="Email" value={booking.guestEmail} />
        {booking.guests.length > 1 && <View style={styles.guestSummary}><Ionicons name="people-outline" size={17} color={MUTED} /><Text style={styles.guestSummaryText}>{booking.guests.length} guests are attached to this reservation.</Text></View>}
      </Section>}

      {(hasHotelValue(booking.totalPaid) || paymentRows.length > 0) && <Section title="Payment summary" icon="wallet-outline">
        {hasHotelValue(booking.totalPaid) && <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL PAID</Text><Text style={styles.totalValue}>{formatHotelMoney(booking.totalPaid)}</Text></View>}
        {paymentRows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}
      </Section>}

      {postCancellation && <Section title="Cancellation & refund" icon="return-down-back-outline">
        <InfoRow label="Status" value="Cancelled" />
        <InfoRow label="Reason" value={cancellationReason} />
        <InfoRow label="Cancelled on" value={formatHotelDateTime(booking.cancelledAt)} />
        {hasHotelValue(booking.totalPaid) && <MoneyRow label="Total paid" value={booking.totalPaid} />}
        {hasHotelValue(booking.cancellationCharge) && <MoneyRow label="Cancellation deductions" value={booking.cancellationCharge} />}
        {hasHotelValue(booking.refundAmount) && <MoneyRow label="Refund amount" value={booking.refundAmount} emphasis />}
        {!!booking.refundPresentation && <View style={[styles.refundStatus, { backgroundColor: booking.refundPresentation.tint }]}><Ionicons name={booking.refundPresentation.completed ? "checkmark-circle" : "time-outline"} size={18} color={booking.refundPresentation.color} /><Text style={[styles.refundStatusText, { color: booking.refundPresentation.color }]}>{booking.refundPresentation.label}</Text></View>}
        <InfoRow label="Refund reference" value={booking.refundReference} />
        <InfoRow label="Refund completed on" value={formatHotelDateTime(booking.refundCompletedAt)} />
        <Text style={styles.authorityNote}>Historical cancellation and refund values are shown from the booking details returned by the backend.</Text>
      </Section>}

      {booking.listStatus === "Failed" && (hasHotelValue(booking.refundAmount) || booking.refundPresentation || booking.refundReference) && <Section title="Refund status" icon="return-down-back-outline">
        {hasHotelValue(booking.refundAmount) && <MoneyRow label="Refund amount" value={booking.refundAmount} emphasis />}
        {!!booking.refundPresentation && <View style={[styles.refundStatus, { backgroundColor: booking.refundPresentation.tint }]}><Ionicons name={booking.refundPresentation.completed ? "checkmark-circle" : "time-outline"} size={18} color={booking.refundPresentation.color} /><Text style={[styles.refundStatusText, { color: booking.refundPresentation.color }]}>{booking.refundPresentation.label}</Text></View>}
        <InfoRow label="Refund reference" value={booking.refundReference} />
        <InfoRow label="Refund completed on" value={formatHotelDateTime(booking.refundCompletedAt)} />
      </Section>}

      {!postCancellation && booking.listStatus === "Upcoming" && (policy || booking.canCancel) && <Section title="Cancellation policy" icon="shield-checkmark-outline">
        {!!policyDescription && <Text style={styles.policyDescription}>{policyDescription}</Text>}
        {!!freeCancellationUntil && <InfoRow label="Free cancellation until" value={formatHotelDateTime(freeCancellationUntil)} />}
        {policySlabs.length > 0 && <PolicyRows slabs={policySlabs} />}
        {booking.canCancel && <TouchableOpacity style={styles.cancelButton} onPress={openCancellation} activeOpacity={0.85}><Ionicons name="close-circle-outline" size={19} color="#FFFFFF" /><Text style={styles.cancelButtonText}>Cancel booking</Text></TouchableOpacity>}
        {!booking.canCancel && <Text style={styles.unavailableText}>Cancellation is not currently available for this booking.</Text>}
      </Section>}

      {booking.lifecycle.length > 0 && <View style={styles.section}>
        <TouchableOpacity style={[styles.sectionHeader, lifecycleExpanded ? null : styles.collapsedHeader]} onPress={() => setLifecycleExpanded((current) => !current)} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded: lifecycleExpanded }}>
          <View style={styles.sectionIcon}><Ionicons name="git-branch-outline" size={19} color={BRAND} /></View>
          <View style={styles.sectionHeadingCopy}><Text style={styles.sectionTitle}>Booking lifecycle</Text><Text style={styles.sectionSubtitle}>{booking.lifecycle.length} backend updates</Text></View>
          <Ionicons name={lifecycleExpanded ? "chevron-up" : "chevron-down"} size={22} color={MUTED} />
        </TouchableOpacity>
        {lifecycleExpanded && booking.lifecycle.map((stage, index) => <LifecycleRow key={`${stage.key}-${index}`} stage={stage} last={index === booking.lifecycle.length - 1} />)}
      </View>}
    </ScrollView>
  </SafeAreaView>;
}

function Section({ title, icon, children }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionIcon}><Ionicons name={icon} size={19} color={BRAND} /></View><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>;
}
function DateEnd({ label, value, align = "left" }) { return <View style={[styles.dateEnd, align === "right" && styles.dateEndRight]}><Text style={styles.dateLabel}>{label}</Text><Text style={[styles.dateValue, align === "right" && styles.textRight]}>{value || "Not available"}</Text></View>; }
function InfoRow({ label, value }) { if (!hasHotelValue(value)) return null; const stacked = String(value).length > 28; return <View style={[styles.infoRow, stacked && styles.infoRowStacked]}><Text style={styles.infoLabel}>{label}</Text><Text style={[styles.infoValue, stacked && styles.infoValueStacked]}>{String(value)}</Text></View>; }
function MoneyRow({ label, value, emphasis }) { if (!hasHotelValue(value)) return null; return <View style={[styles.infoRow, emphasis && styles.emphasisRow]}><Text style={[styles.infoLabel, emphasis && styles.emphasisLabel]}>{label}</Text><Text style={[styles.infoValue, emphasis && styles.emphasisValue]}>{formatHotelMoney(value)}</Text></View>; }
function Notice({ tone, title, text }) { const error = tone === "error"; return <View style={[styles.notice, error ? styles.errorNotice : styles.warningNotice]}><Ionicons name={error ? "alert-circle-outline" : "time-outline"} size={22} color={error ? "#B42318" : "#B54708"} /><View style={styles.noticeCopy}><Text style={[styles.noticeTitle, { color: error ? "#B42318" : "#B54708" }]}>{title}</Text><Text style={styles.noticeText}>{text}</Text></View></View>; }

function LifecycleRow({ stage, last }) {
  const statusToken = normalizeHotelStatusToken(stage.status);
  const completed = ["completed", "success", "done"].includes(statusToken);
  const failed = statusToken.includes("fail");
  const color = completed ? "#027A48" : failed ? "#B42318" : "#B54708";
  const icon = completed ? "checkmark" : failed ? "close" : "time";
  const title = stage.title || readable(stage.key);
  return <View style={styles.timelineRow}><View style={styles.timelineRail}><View style={[styles.timelineDot, { backgroundColor: color }]}><Ionicons name={icon} size={14} color="#FFFFFF" /></View>{!last && <View style={styles.timelineLine} />}</View><View style={styles.timelineCopy}><View style={styles.timelineTitleRow}><Text style={styles.timelineTitle}>{title}</Text>{!!stage.status && <Text style={[styles.timelineStatus, { color }]}>{readable(stage.status).toUpperCase()}</Text>}</View>{!!stage.timestamp && <Text style={styles.timelineTime}>{formatHotelDateTime(stage.timestamp)}</Text>}{!!stage.summary && <Text style={styles.timelineText}>{stage.summary}</Text>}</View></View>;
}

function PolicyRows({ slabs }) {
  return slabs.map((slab, index) => {
    const active = Boolean(pickBookingValue(slab, ["isActive", "IsActive", "active", "Active"], false));
    const label = String(pickBookingValue(slab, ["label", "Label", "description", "Description", "window", "Window"], "Cancellation window") || "Cancellation window");
    const from = pickBookingValue(slab, ["from", "From", "fromDate", "FromDate", "startAt", "StartAt"], null);
    const to = pickBookingValue(slab, ["to", "To", "toDate", "ToDate", "endAt", "EndAt"], null);
    const charge = pickBookingValue(slab, ["cancellationFee", "CancellationFee", "cancellationCharge", "CancellationCharge", "estimatedDeduction", "EstimatedDeduction"], null);
    const refund = pickBookingValue(slab, ["refundAmount", "RefundAmount", "estimatedRefund", "EstimatedRefund", "refundReturn", "RefundReturn"], null);
    return <View key={`${label}-${index}`} style={[styles.policyRow, active && styles.activePolicyRow]}><View style={styles.policyCopy}><View style={styles.policyTitleRow}><Text style={styles.policyTitle}>{label}</Text>{active && <Text style={styles.activeLabel}>CURRENT</Text>}</View>{(from || to) && <Text style={styles.policyWindow}>{[formatHotelDateTime(from), formatHotelDateTime(to)].filter(Boolean).join(" → ")}</Text>}</View><View style={styles.policyAmounts}>{hasHotelValue(charge) && <Text style={styles.policyCharge}>{formatHotelMoney(charge)} fee</Text>}{hasHotelValue(refund) && <Text style={styles.policyRefund}>{formatHotelMoney(refund)} refund</Text>}</View></View>;
  });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SURFACE }, centerPage: { flex: 1, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center" }, loadingText: { color: MUTED, fontSize: 13, marginTop: 12 },
  header: { height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#EEE9EA", backgroundColor: SURFACE }, backButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER }, headerCopy: { flex: 1, alignItems: "center" }, headerTitle: { color: NAVY, fontSize: 17, fontWeight: "800" }, headerSubtitle: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, marginTop: 2 }, headerSpacer: { width: 44 },
  scroll: { flex: 1, backgroundColor: BACKGROUND }, content: { padding: 16, gap: 14 }, refreshing: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, refreshingText: { color: MUTED, fontSize: 11 },
  errorCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FEF3F2", borderRadius: 14, padding: 13 }, errorCopy: { flex: 1 }, errorTitle: { color: "#B42318", fontSize: 12, fontWeight: "800" }, errorText: { color: "#912018", fontSize: 11, lineHeight: 16, marginTop: 3 }, retryButton: { borderWidth: 1, borderColor: "#E98B96", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }, retryText: { color: BRAND, fontSize: 11, fontWeight: "800" },
  ticketHero: { backgroundColor: "#9E1021", borderRadius: 24, padding: 18, overflow: "hidden", shadowColor: "#6F0B17", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 }, heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, statusBadge: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 }, statusText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.7 }, heroReference: { color: "#FBCED3", fontSize: 11, fontWeight: "800", flexShrink: 1, textAlign: "right" }, heroHotel: { color: "#FFFFFF", fontSize: 22, lineHeight: 28, fontWeight: "800", marginTop: 17 }, heroAddress: { color: "#F7C4CA", fontSize: 12, lineHeight: 17, marginTop: 4 }, heroDateRow: { flexDirection: "row", alignItems: "center", marginTop: 19 }, dateEnd: { flex: 1, minWidth: 0 }, dateEndRight: { alignItems: "flex-end" }, dateLabel: { color: "#F7C4CA", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 }, dateValue: { color: "#FFFFFF", fontSize: 14, lineHeight: 19, fontWeight: "800", marginTop: 4 }, textRight: { textAlign: "right" }, heroConnector: { width: 76, flexDirection: "row", alignItems: "center", gap: 5, marginHorizontal: 6 }, heroLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.38)" }, heroMeta: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 17, paddingTop: 13, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }, heroMetaText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", flex: 1 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 15, padding: 14 }, warningNotice: { backgroundColor: "#FFFAEB" }, errorNotice: { backgroundColor: "#FEF3F2" }, noticeCopy: { flex: 1 }, noticeTitle: { fontSize: 13, fontWeight: "900" }, noticeText: { color: "#475467", fontSize: 11, lineHeight: 17, marginTop: 4 },
  section: { backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 }, sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }, collapsedHeader: { marginBottom: 0 }, sectionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#FDECEF", alignItems: "center", justifyContent: "center" }, sectionHeadingCopy: { flex: 1 }, sectionTitle: { color: NAVY, fontSize: 17, fontWeight: "800", flex: 1 }, sectionSubtitle: { color: MUTED, fontSize: 10, marginTop: 2 },
  infoRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderTopWidth: 1, borderTopColor: "#F0EBEC", paddingVertical: 10 }, infoRowStacked: { flexDirection: "column", alignItems: "flex-start", gap: 4 }, infoLabel: { color: MUTED, fontSize: 12, lineHeight: 17, fontWeight: "600", flex: 1 }, infoValue: { color: NAVY, fontSize: 13, lineHeight: 18, fontWeight: "700", flex: 1.25, textAlign: "right" }, infoValueStacked: { flex: 0, width: "100%", textAlign: "left" }, totalRow: { backgroundColor: "#FFF3F4", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }, totalLabel: { color: "#8C1725", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }, totalValue: { color: BRAND, fontSize: 22, fontWeight: "900" }, emphasisRow: { marginTop: 5, backgroundColor: "#F0FDF4", borderRadius: 11, borderTopWidth: 0, paddingHorizontal: 11 }, emphasisLabel: { color: "#067647", fontWeight: "800" }, emphasisValue: { color: "#067647", fontSize: 15, fontWeight: "900" },
  guestSummary: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: "#F0EBEC", paddingTop: 11 }, guestSummaryText: { color: MUTED, fontSize: 11, flex: 1 }, refundStatus: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, padding: 11, marginTop: 8 }, refundStatusText: { fontSize: 12, fontWeight: "900" }, authorityNote: { color: "#98A2B3", fontSize: 10, lineHeight: 15, marginTop: 11 },
  policyDescription: { color: "#475467", fontSize: 12, lineHeight: 18, marginBottom: 7 }, policyRow: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#F0EBEC", paddingVertical: 11 }, activePolicyRow: { backgroundColor: "#ECFDF3", borderRadius: 9, paddingHorizontal: 9 }, policyCopy: { flex: 1, minWidth: 0 }, policyTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }, policyTitle: { color: NAVY, fontSize: 11, lineHeight: 16, fontWeight: "800", flexShrink: 1 }, activeLabel: { color: "#027A48", backgroundColor: "#D1FADF", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, fontSize: 8, fontWeight: "900" }, policyWindow: { color: MUTED, fontSize: 9, lineHeight: 14, marginTop: 4 }, policyAmounts: { alignItems: "flex-end", maxWidth: 112 }, policyCharge: { color: "#B54708", fontSize: 10, fontWeight: "800", textAlign: "right" }, policyRefund: { color: "#027A48", fontSize: 10, fontWeight: "800", marginTop: 4, textAlign: "right" }, cancelButton: { minHeight: 50, borderRadius: 14, backgroundColor: BRAND, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 13 }, cancelButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" }, unavailableText: { color: MUTED, fontSize: 12, fontStyle: "italic", paddingVertical: 7 },
  timelineRow: { flexDirection: "row", minHeight: 66 }, timelineRail: { width: 30, alignItems: "center" }, timelineDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" }, timelineLine: { flex: 1, width: 2, backgroundColor: "#F2C7CC" }, timelineCopy: { flex: 1, paddingLeft: 8, paddingBottom: 16 }, timelineTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 }, timelineTitle: { color: NAVY, fontSize: 14, lineHeight: 19, fontWeight: "800", flex: 1 }, timelineStatus: { fontSize: 8, fontWeight: "900", marginTop: 3 }, timelineTime: { color: "#98A2B3", fontSize: 10, marginTop: 3 }, timelineText: { color: MUTED, fontSize: 11, lineHeight: 16, marginTop: 4 },
});
