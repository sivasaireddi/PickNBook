import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  formatBookingCurrency,
  formatBookingDate,
  formatBookingDateTime,
  formatBookingTime,
  formatBusCancellationWindow,
  getBusStatusPresentation,
  isBusCancellationEligible,
  normalizeBusBooking,
  pickBookingValue,
} from "../utils/busBookingPresentation";

const BRAND = "#D7192D";
const NAVY = "#101828";
const MUTED = "#667085";
const BORDER = "#E8E1E2";
const BACKGROUND = "#F8F6F6";
const SURFACE = "#FFFFFF";

const hasValue = (value) => value !== undefined && value !== null && value !== "";
const readableStatus = (value) => String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function BusBookingDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [cancellationExpanded, setCancellationExpanded] = useState(false);
  const booking = useMemo(() => normalizeBusBooking(route?.params?.booking), [route?.params?.booking]);
  const status = getBusStatusPresentation(booking.status);
  const policy = booking.cancellationPolicy || {};
  const breakdown = pickBookingValue(policy, ["breakdown", "Breakdown"], {}) || {};
  const audit = booking.cancellationAudit || {};

  const policyCanCancel = Boolean(pickBookingValue(policy, ["canCancel", "CanCancel"], booking.canCancel));
  const policySlabs = pickBookingValue(policy, ["policySlabs", "PolicySlabs"], []) || [];
  const activePolicyIndex = policySlabs.findIndex((slab) => Boolean(pickBookingValue(slab, ["isActive", "IsActive"], false)));
  const policyDescription = activePolicyIndex >= 0
    ? formatBusCancellationWindow(policySlabs, activePolicyIndex)
    : String(pickBookingValue(policy, ["cannotCancelReason", "CannotCancelReason"], "") || "");
  const policyPaid = pickBookingValue(policy, ["totalCustomerPaid", "TotalCustomerPaid"], booking.totalPaid);
  const operatorCharge = pickBookingValue(breakdown, ["supplierCancellationCharge", "SupplierCancellationCharge"], null);
  const serviceCharge = pickBookingValue(breakdown, ["serviceCharge", "ServiceCharge"], null);
  const retainedConvenienceFee = pickBookingValue(breakdown, ["nonRefundableConvenienceFee", "NonRefundableConvenienceFee"], null);
  const quotedTotalCharge = pickBookingValue(policy, ["estimatedCancellationCharge", "EstimatedCancellationCharge"], null);
  const estimatedRefund = pickBookingValue(policy, ["estimatedRefundAmount", "EstimatedRefundAmount"], null);

  const cancelledCharge = pickBookingValue(audit, ["cancellationCharges", "CancellationCharges"], booking.cancellationCharge);
  const cancelledOperatorCharge = pickBookingValue(audit, ["supplierCancellationCharge", "SupplierCancellationCharge"], null);
  const cancelledServiceCharge = pickBookingValue(audit, ["serviceCharge", "ServiceCharge", "serviceChargeRetained", "ServiceChargeRetained"], null);
  const cancelledConvenienceFee = pickBookingValue(audit, ["convenienceFee", "ConvenienceFee", "feeRetained", "FeeRetained"], null);
  const cancelledRefund = pickBookingValue(audit, ["customerRefundAmount", "CustomerRefundAmount"], booking.refundAmount);
  const refundStatus = String(pickBookingValue(audit, ["refundStatus", "RefundStatus"], booking.refundStatus) || "");
  const cancelledAt = pickBookingValue(audit, ["cancelledAt", "CancelledAt"], booking.cancelledAt);
  const cancellationReason = String(pickBookingValue(audit, ["cancellationReason", "CancellationReason"], booking.cancellationReason) || "");
  const cancellable = isBusCancellationEligible(booking) && policyCanCancel;

  const timeline = useMemo(() => {
    if (booking.status === "PaymentFailed") return [{ icon: "close", title: "Payment unsuccessful", text: "This booking was not confirmed." }];
    if (booking.status === "CancellationPending") return [{ icon: "time", title: "Cancellation pending", text: "The supplier cancellation is still being confirmed. No completed refund is being claimed yet." }];
    if (booking.status === "ManualReviewRequired") return [{ icon: "time", title: "Manual review required", text: "The cancellation outcome is being reconciled. No completed cancellation or refund is being claimed yet." }];
    if (booking.status === "PartiallyCancelled") return [{ icon: "information", title: "Partially cancelled", text: "Cancelled passengers are marked below. Remaining active passengers are still booked for travel." }];
    if (booking.status === "Cancelled") {
      const entries = [{ icon: "close", title: "Booking cancelled", text: cancelledAt ? formatBookingDateTime(cancelledAt) : "" }];
      if (refundStatus) entries.push({ icon: "return-down-back", title: `Refund ${readableStatus(refundStatus)}`, text: hasValue(cancelledRefund) ? formatBookingCurrency(cancelledRefund) : "" });
      return entries;
    }
    if (booking.status === "Past") return [
      { icon: "checkmark", title: "Booking confirmed", text: booking.bookedAt ? formatBookingDateTime(booking.bookedAt) : "" },
      { icon: "flag", title: "Journey completed", text: booking.arrivalAt ? formatBookingDateTime(booking.arrivalAt) : "" },
    ];
    return [{ icon: "checkmark", title: "Booking confirmed", text: booking.bookedAt ? formatBookingDateTime(booking.bookedAt) : "Your ticket is active for travel." }];
  }, [booking, cancelledAt, cancelledRefund, refundStatus]);

  const discountRows = hasValue(booking.discount) && Number(booking.discount) !== 0
    ? [["Discount", booking.discount, true]]
    : [["Coupon discount", booking.couponDiscount, true], ["Automatic discount", booking.autoDiscount, true]];
  const fareRows = [
    ["Base fare", booking.baseFare],
    ["GST", booking.gstAmount],
    ["Convenience fee", booking.convenienceFee],
    ...discountRows,
    ["Wallet used", booking.walletUsed],
    ["Gateway paid", booking.gatewayPaid],
  ].filter(([, value]) => hasValue(value) && Number(value) !== 0);

  const identifiers = [
    ["PNR", booking.pnr],
    ["Booking reference", booking.bookingReference],
    ["Booked on", formatBookingDateTime(booking.bookedAt)],
    ["Bus operator", booking.operator],
    ["Bus type", booking.busType && booking.busType !== "Not Applicable" ? booking.busType : ""],
    ["Service / trip number", booking.tripNumber],
  ].filter(([, value]) => value);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navigation.goBack} accessibilityLabel="Back to bookings">
          <Ionicons name="arrow-back" size={24} color={NAVY} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Bus booking</Text>
          <Text style={styles.headerSubtitle}>{status.label}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 26 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ticketHero}>
          <View style={styles.heroTopRow}>
            <View style={[styles.statusBadge, { backgroundColor: status.tint }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
            {!!booking.pnr && <Text style={styles.heroPnr}>PNR {booking.pnr}</Text>}
          </View>
          {!!booking.operator && <Text style={styles.heroOperator} numberOfLines={2}>{booking.operator}</Text>}
          <View style={styles.heroRouteRow}>
            <RouteEnd city={booking.from} time={formatBookingTime(booking.departureAt)} date={formatBookingDate(booking.departureAt, "weekday")} />
            <View style={styles.heroConnector}><View style={styles.heroLine} /><View style={styles.heroArrow}><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></View><View style={styles.heroLine} /></View>
            <RouteEnd align="right" city={booking.to} time={formatBookingTime(booking.arrivalAt)} date={formatBookingDate(booking.arrivalAt, "weekday")} />
          </View>
          {booking.seatNumbers.length > 0 && <View style={styles.heroSeatRow}><Ionicons name="bed-outline" size={17} color="#FBCED3" /><Text style={styles.heroSeatText}>Seat {booking.seatNumbers.join(", ")}</Text></View>}
        </View>

        {(booking.boardingName || booking.boardingAt || booking.droppingName || booking.droppingAt) && <Section title="Boarding & dropping" icon="location-outline">
          <View style={styles.pointGrid}>
            <Point label="BOARDING" name={booking.boardingName} time={formatBookingTime(booking.boardingAt)} address={booking.boardingAddress} />
            <View style={styles.pointDivider} />
            <Point label="DROPPING" name={booking.droppingName} time={formatBookingTime(booking.droppingAt)} address={booking.droppingAddress} />
          </View>
        </Section>}

        {identifiers.length > 0 && <Section title="Booking information" icon="ticket-outline">
          {identifiers.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}
        </Section>}

        {(booking.passengers.length > 0 || booking.passengerName) && <Section title="Passengers & seats" icon="people-outline">
          {booking.passengers.length > 0 ? booking.passengers.map((passenger, index) => (
            <PassengerRow key={String(passenger.id ?? index)} passenger={passenger} index={index} />
          )) : <PassengerRow passenger={{ fullName: booking.passengerName, seatNumber: booking.seatNumbers.join(", ") }} index={0} />}
        </Section>}

        {hasValue(booking.totalPaid) && <Section title="Fare & payment" icon="wallet-outline">
          <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL PAID</Text><Text style={styles.totalValue}>{formatBookingCurrency(booking.totalPaid)}</Text></View>
          {fareRows.map(([label, value, negative]) => <MoneyRow key={label} label={label} value={value} negative={negative} />)}
          {!!booking.paymentMethod && <InfoRow label="Payment method" value={booking.paymentMethod} />}
        </Section>}

        <Section title="Booking status" icon="git-branch-outline">
          {timeline.map((item, index) => <TimelineRow key={`${item.title}-${index}`} item={item} last={index === timeline.length - 1} />)}
        </Section>

        {["Upcoming", "PartiallyCancelled"].includes(booking.status) && (booking.cancellationPolicy || policyCanCancel) && <CollapsibleSection title="Cancellation & refund" icon="shield-checkmark-outline" expanded={cancellationExpanded} onToggle={() => setCancellationExpanded((current) => !current)}>
          <View style={styles.eligibilityRow}>
            <Ionicons name={policyCanCancel ? "checkmark-circle-outline" : "information-circle-outline"} size={18} color={policyCanCancel ? NAVY : "#B42318"} />
            <Text style={[styles.eligibilityText, !policyCanCancel && styles.ineligibleText]}>{policyCanCancel ? "Eligible for cancellation" : "Cancellation unavailable"}</Text>
          </View>
          {!!policyDescription && <Text style={styles.policyDescription}>{policyDescription}</Text>}
          {hasValue(policyPaid) && <MoneyRow label="Ticket paid" value={policyPaid} />}
          {hasValue(operatorCharge) && <MoneyRow label="Operator cancellation charge" value={operatorCharge} />}
          {hasValue(serviceCharge) && <MoneyRow label="Service charge" value={serviceCharge} />}
          {Number(retainedConvenienceFee) > 0 && <MoneyRow label="Non-refundable convenience fee" value={retainedConvenienceFee} />}
          {hasValue(quotedTotalCharge) && <MoneyRow label="Total cancellation charge" value={quotedTotalCharge} />}
          {hasValue(estimatedRefund) && <MoneyRow label="Estimated refund" value={estimatedRefund} />}
          {cancellable && <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate("BusBookingCancellation", { booking: booking.raw })} activeOpacity={0.85}><Ionicons name="close-circle-outline" size={19} color="#FFFFFF" /><Text style={styles.cancelButtonText}>Cancel booking</Text></TouchableOpacity>}
          <Text style={styles.readOnlyNote}>Cancellation values shown here come from the booking’s current backend quote.</Text>
        </CollapsibleSection>}

        {booking.status === "Cancelled" && <Section title="Cancellation & refund" icon="return-down-back-outline">
          {!!cancelledAt && <InfoRow label="Cancelled on" value={formatBookingDateTime(cancelledAt)} />}
          {!!cancellationReason && <InfoRow label="Reason" value={cancellationReason} />}
          {hasValue(booking.totalPaid) && <MoneyRow label="Original amount paid" value={booking.totalPaid} />}
          {hasValue(cancelledOperatorCharge) && <MoneyRow label="Operator cancellation charge" value={cancelledOperatorCharge} />}
          {hasValue(cancelledServiceCharge) && <MoneyRow label="Service charge" value={cancelledServiceCharge} />}
          {Number(cancelledConvenienceFee) > 0 && <MoneyRow label="Non-refundable convenience fee" value={cancelledConvenienceFee} />}
          {hasValue(cancelledCharge) && <MoneyRow label="Total cancellation charge" value={cancelledCharge} />}
          {hasValue(cancelledRefund) ? <MoneyRow label="Refund amount" value={cancelledRefund} emphasis /> : <Text style={styles.unavailableText}>Refund information unavailable</Text>}
          {!!refundStatus && <InfoRow label="Refund status" value={readableStatus(refundStatus)} />}
          {!!booking.refundPreference && <InfoRow label="Refund method" value={readableStatus(booking.refundPreference)} />}
          {!!booking.refundReference && <InfoRow label="Refund reference" value={booking.refundReference} />}
          {!!booking.refundCompletedAt && <InfoRow label="Refund completed" value={formatBookingDateTime(booking.refundCompletedAt)} />}
        </Section>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, icon, children }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionIcon}><Ionicons name={icon} size={19} color={BRAND} /></View><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>;
}

function CollapsibleSection({ title, icon, expanded, onToggle, children }) {
  return <View style={styles.section}>
    <TouchableOpacity style={[styles.sectionHeader, styles.collapsibleHeader, !expanded && styles.collapsedHeader]} onPress={onToggle} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${title}, ${expanded ? "expanded" : "collapsed"}`}>
      <View style={styles.sectionIcon}><Ionicons name={icon} size={19} color={BRAND} /></View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={22} color={MUTED} />
    </TouchableOpacity>
    {expanded ? children : null}
  </View>;
}

function RouteEnd({ city, time, date, align = "left" }) {
  return <View style={[styles.routeEnd, align === "right" && styles.routeEndRight]}><Text style={[styles.heroCity, align === "right" && styles.textRight]} numberOfLines={2}>{city || "Not available"}</Text>{!!time && <Text style={styles.heroTime}>{time}</Text>}{!!date && <Text style={styles.heroDate}>{date}</Text>}</View>;
}

function Point({ label, name, time, address }) {
  if (!name && !time && !address) return <View style={styles.point}><Text style={styles.pointLabel}>{label}</Text><Text style={styles.unavailableText}>Not available</Text></View>;
  return <View style={styles.point}><Text style={styles.pointLabel}>{label}</Text>{!!name && <Text style={styles.pointName}>{name}</Text>}{!!time && <Text style={styles.pointTime}>{time}</Text>}{!!address && <Text style={styles.pointAddress}>{address}</Text>}</View>;
}

function InfoRow({ label, value }) {
  if (!value) return null;
  const stacked = String(value).length > 24;
  return <View style={[styles.infoRow, stacked && styles.infoRowStacked]}><Text style={[styles.infoLabel, stacked && styles.infoLabelStacked]}>{label}</Text><Text style={[styles.infoValue, stacked && styles.infoValueStacked]}>{value}</Text></View>;
}

function MoneyRow({ label, value, negative = false, emphasis = false }) {
  if (!hasValue(value)) return null;
  const formatted = formatBookingCurrency(value);
  return <View style={[styles.infoRow, emphasis && styles.emphasisRow]}><Text style={[styles.infoLabel, emphasis && styles.emphasisLabel]}>{label}</Text><Text style={[styles.infoValue, emphasis && styles.emphasisValue]}>{negative && Number(value) > 0 ? "−" : ""}{formatted}</Text></View>;
}

function PassengerRow({ passenger, index }) {
  const details = [hasValue(passenger.age) && Number(passenger.age) > 0 ? `${passenger.age} yrs` : "", passenger.gender].filter(Boolean).join(" • ");
  return <View style={[styles.passengerRow, index > 0 && styles.passengerBorder]}>
    <View style={styles.passengerAvatar}><Text style={styles.passengerAvatarText}>{passenger.fullName ? passenger.fullName[0].toUpperCase() : index + 1}</Text></View>
    <View style={styles.passengerCopy}><Text style={styles.passengerName}>{passenger.fullName || "Not available"}</Text>{!!details && <Text style={styles.passengerMeta}>{details}</Text>}</View>
    {!!passenger.seatNumber && <View style={styles.seatPill}><Text style={styles.seatPillLabel}>SEAT</Text><Text style={styles.seatPillValue}>{passenger.seatNumber}</Text></View>}
    {passenger.isCancelled && <Text style={styles.cancelledPassenger}>Cancelled</Text>}
  </View>;
}

function TimelineRow({ item, last }) {
  return <View style={styles.timelineRow}><View style={styles.timelineRail}><View style={styles.timelineDot}><Ionicons name={item.icon} size={14} color="#FFFFFF" /></View>{!last && <View style={styles.timelineLine} />}</View><View style={styles.timelineCopy}><Text style={styles.timelineTitle}>{item.title}</Text>{!!item.text && <Text style={styles.timelineText}>{item.text}</Text>}</View></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SURFACE }, scroll: { flex: 1, backgroundColor: BACKGROUND }, content: { padding: 16, gap: 14 },
  header: { height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#EEE9EA", backgroundColor: SURFACE }, backButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER }, headerCopy: { flex: 1, alignItems: "center" }, headerTitle: { color: NAVY, fontSize: 17, fontWeight: "800" }, headerSubtitle: { color: BRAND, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginTop: 2 }, headerSpacer: { width: 44 },
  ticketHero: { backgroundColor: "#9E1021", borderRadius: 24, padding: 18, overflow: "hidden", shadowColor: "#6F0B17", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 }, heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, statusBadge: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 }, statusText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }, heroPnr: { color: "#FBCED3", fontSize: 11, fontWeight: "800", flexShrink: 1, textAlign: "right" }, heroOperator: { color: "#FFFFFF", fontSize: 22, lineHeight: 28, fontWeight: "800", marginTop: 17 }, heroRouteRow: { flexDirection: "row", alignItems: "center", marginTop: 18 }, routeEnd: { flex: 1, minWidth: 0 }, routeEndRight: { alignItems: "flex-end" }, heroCity: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "800" }, heroTime: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 5 }, heroDate: { color: "#F7C4CA", fontSize: 11, fontWeight: "600", marginTop: 2 }, textRight: { textAlign: "right" }, heroConnector: { width: 82, flexDirection: "row", alignItems: "center", marginHorizontal: 5 }, heroLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.38)" }, heroArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }, heroSeatRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }, heroSeatText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  section: { backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 }, sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }, collapsibleHeader: { minHeight: 44 }, collapsedHeader: { marginBottom: 0 }, sectionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#FDECEF", alignItems: "center", justifyContent: "center" }, sectionTitle: { color: NAVY, fontSize: 17, fontWeight: "800", flex: 1 },
  pointGrid: { flexDirection: "row" }, point: { flex: 1, minWidth: 0 }, pointDivider: { width: 1, backgroundColor: "#EEE9EA", marginHorizontal: 14 }, pointLabel: { color: BRAND, fontSize: 10, fontWeight: "900", letterSpacing: 1 }, pointName: { color: NAVY, fontSize: 15, lineHeight: 20, fontWeight: "800", marginTop: 7 }, pointTime: { color: "#344054", fontSize: 13, fontWeight: "700", marginTop: 4 }, pointAddress: { color: MUTED, fontSize: 11, lineHeight: 16, marginTop: 4 },
  infoRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderTopWidth: 1, borderTopColor: "#F0EBEC", paddingVertical: 10 }, infoRowStacked: { flexDirection: "column", alignItems: "flex-start", gap: 4 }, infoLabel: { color: MUTED, fontSize: 12, lineHeight: 17, fontWeight: "600", flex: 1 }, infoLabelStacked: { flex: 0 }, infoValue: { color: NAVY, fontSize: 13, lineHeight: 18, fontWeight: "700", flex: 1.25, textAlign: "right" }, infoValueStacked: { flex: 0, width: "100%", textAlign: "left" }, totalRow: { backgroundColor: "#FFF3F4", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }, totalLabel: { color: "#8C1725", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }, totalValue: { color: BRAND, fontSize: 22, fontWeight: "900" }, emphasisRow: { marginTop: 5, backgroundColor: "#F0FDF4", borderRadius: 11, borderTopWidth: 0, paddingHorizontal: 11 }, emphasisLabel: { color: "#067647", fontWeight: "800" }, emphasisValue: { color: "#067647", fontSize: 15, fontWeight: "900" },
  passengerRow: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 }, passengerBorder: { borderTopWidth: 1, borderTopColor: "#F0EBEC" }, passengerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FDECEF", alignItems: "center", justifyContent: "center" }, passengerAvatarText: { color: BRAND, fontSize: 15, fontWeight: "900" }, passengerCopy: { flex: 1, minWidth: 0 }, passengerName: { color: NAVY, fontSize: 14, fontWeight: "800" }, passengerMeta: { color: MUTED, fontSize: 11, marginTop: 3 }, seatPill: { minWidth: 47, borderRadius: 11, backgroundColor: "#F4F6F8", paddingHorizontal: 9, paddingVertical: 6, alignItems: "center" }, seatPillLabel: { color: MUTED, fontSize: 8, fontWeight: "900", letterSpacing: 0.6 }, seatPillValue: { color: NAVY, fontSize: 13, fontWeight: "900", marginTop: 1 }, cancelledPassenger: { color: "#B42318", fontSize: 10, fontWeight: "800" },
  timelineRow: { flexDirection: "row", minHeight: 58 }, timelineRail: { width: 30, alignItems: "center" }, timelineDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" }, timelineLine: { flex: 1, width: 2, backgroundColor: "#F2C7CC" }, timelineCopy: { flex: 1, paddingLeft: 8, paddingBottom: 15 }, timelineTitle: { color: NAVY, fontSize: 14, fontWeight: "800", marginTop: 3 }, timelineText: { color: MUTED, fontSize: 11, lineHeight: 16, marginTop: 4 },
  eligibilityRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }, eligibilityText: { color: NAVY, fontSize: 12, fontWeight: "800", flex: 1 }, ineligibleText: { color: "#B42318" }, policyDescription: { color: "#475467", fontSize: 12, lineHeight: 18, marginBottom: 8 }, readOnlyNote: { color: "#98A2B3", fontSize: 10, lineHeight: 15, marginTop: 10 }, unavailableText: { color: MUTED, fontSize: 12, fontStyle: "italic", paddingVertical: 8 },
  cancelButton: { minHeight: 48, borderRadius: 14, backgroundColor: BRAND, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 13, paddingHorizontal: 16 }, cancelButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
