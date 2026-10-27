import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../../../components/AppHeader";
import { requireAuthToken } from "../../../utils/authSession";
import { getMyBusBookings } from "../../../services/busService";
import { getMyHotelBookings, cancelHotelBooking } from "../../../services/hotelService";
import { AUTH_API_BASE_URL } from "../../../services/authService";
import { readConfirmedFlightBookingsLocally } from "./flights/services/flightBookingFlowStore";
import { formatBookingCurrency, formatBookingDate, formatBookingTime, getBusStatusPresentation, normalizeBusBooking } from "../../../utils/busBookingPresentation";

const BRAND = "#D7192D";
const NAVY = "#111827";
const MUTED = "#667085";
const SURFACE = "#FFFFFF";
const BACKGROUND = "#F8F6F6";
const BORDER = "#E8E1E2";

const CATEGORIES = [
  { key: "bus", label: "Buses", icon: "bus-outline" },
  { key: "hotel", label: "Hotels", icon: "bed-outline" },
  { key: "flight", label: "Flights", icon: "airplane-outline" },
];
const BASE_TABS = [{ key: "Upcoming", label: "Upcoming" }, { key: "Past", label: "Past" }, { key: "Cancelled", label: "Cancelled" }];
const BUS_TABS = [...BASE_TABS, { key: "PaymentFailed", label: "Payment failed" }];
const emptyGroups = () => ({ Upcoming: [], Past: [], Cancelled: [], PaymentFailed: [] });
const asText = (value) => value === undefined || value === null ? "" : String(value).trim();

const legacyMoney = (value) => {
  if (typeof value === "string" && value.includes("₹")) return value;
  return Number.isFinite(Number(value)) ? formatBookingCurrency(value) : asText(value);
};

const groupBusBookings = (records) => {
  const groups = emptyGroups();
  (Array.isArray(records) ? records : []).forEach((record) => {
    const booking = normalizeBusBooking(record);
    groups[booking.status]?.push(booking);
  });
  return groups;
};

const groupHotelBookings = (records) => {
  const groups = emptyGroups();
  (Array.isArray(records) ? records : []).forEach((item) => {
    const cancelled = asText(item.status).toLowerCase() === "cancelled";
    const booking = {
      id: String(item.bookingId || item.providerBookingId || ""),
      providerBookingId: item.providerBookingId ? Number(item.providerBookingId) : null,
      traceId: asText(item.traceId), pnr: asText(item.bookingReference),
      hotelName: asText(item.hotelName), address: asText(item.address || item.city),
      checkInDate: asText(item.checkInDate || item.dates), checkOutDate: asText(item.checkOutDate),
      guestName: asText(item.guestName), totalAmount: legacyMoney(item.amount ?? item.totalPrice),
      status: cancelled ? "Cancelled" : "Upcoming", canCancel: !cancelled,
      type: "hotel", rawBooking: item,
    };
    groups[booking.status].push(booking);
  });
  return groups;
};

const groupFlightBookings = (records) => {
  const groups = emptyGroups();
  (Array.isArray(records) ? records : []).forEach((item) => {
    const cancelled = asText(item.status || item.ticketStatus).toLowerCase() === "cancelled";
    const booking = {
      id: String(item.id || item.bookingId || item.pnr || ""),
      pnr: asText(item.pnr || item.bookingReference || item.bookingId),
      from: asText(item.from || item.fromCity || item.origin), to: asText(item.to || item.toCity || item.destination),
      agencyName: asText(item.agencyName || item.airline), date: asText(item.date || item.departureDate),
      departTime: asText(item.departTime || item.departureTime), arriveTime: asText(item.arriveTime || item.arrivalTime),
      totalAmount: legacyMoney(item.totalAmount ?? item.totalPrice ?? item.payableAmount),
      status: cancelled ? "Cancelled" : "Upcoming", type: "flight", rawBooking: item,
    };
    groups[booking.status].push(booking);
  });
  return groups;
};

export default function BookingsScreen() {
  const navigation = useNavigation();
  const [category, setCategory] = useState("bus");
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [bookings, setBookings] = useState({ bus: emptyGroups(), hotel: emptyGroups(), flight: emptyGroups() });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [legacyDetails, setLegacyDetails] = useState(null);
  const [hotelCancelVisible, setHotelCancelVisible] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [hotelCancelReason, setHotelCancelReason] = useState("User requested cancellation");
  const [cancellingHotel, setCancellingHotel] = useState(false);
  const loadedCategories = useRef(new Set());

  const loadCategory = useCallback(async (target, force = false) => {
    if (!force && loadedCategories.current.has(target)) return;
    force ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const token = await requireAuthToken(null);
      if (!token) throw new Error("Please sign in to view your bookings.");
      let grouped;
      if (target === "bus") grouped = groupBusBookings(await getMyBusBookings(token));
      else if (target === "hotel") grouped = groupHotelBookings(await getMyHotelBookings());
      else {
        const localList = await readConfirmedFlightBookingsLocally();
        let apiList = [];
        try {
          const response = await fetch(`${AUTH_API_BASE_URL}/api/FlightBookings/bookings`, { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) apiList = data;
          }
        } catch { /* local confirmed flight bookings remain available */ }
        grouped = groupFlightBookings([...localList, ...apiList]);
      }
      setBookings((current) => ({ ...current, [target]: grouped }));
      loadedCategories.current.add(target);
    } catch (loadError) {
      setError(loadError?.message || "Could not load bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCategory(category); }, [category, loadCategory]);

  const statusTabs = category === "bus" ? BUS_TABS : BASE_TABS;
  const currentList = bookings[category]?.[activeTab] || [];
  const changeCategory = useCallback((next) => { setCategory(next); setActiveTab("Upcoming"); setError(""); }, []);
  const openBooking = useCallback((item) => {
    if (category === "bus") return navigation.navigate("BusBookingDetails", { booking: item.raw });
    if (item.type === "hotel" && item.canCancel) { setSelectedHotel(item); setHotelCancelVisible(true); return; }
    setLegacyDetails(item);
  }, [category, navigation]);
  const searchCategory = useCallback(() => navigation.navigate(category === "bus" ? "BusScreen" : category === "hotel" ? "Hotels" : "FlightScreen"), [category, navigation]);

  const confirmHotelCancellation = useCallback(async () => {
    if (!selectedHotel) return;
    try {
      setCancellingHotel(true);
      await cancelHotelBooking({ providerBookingId: Number(selectedHotel.providerBookingId), traceId: selectedHotel.traceId, remarks: hotelCancelReason });
      setHotelCancelVisible(false);
      loadedCategories.current.delete("hotel");
      await loadCategory("hotel", true);
      Alert.alert("Success", "Hotel cancelled successfully.");
    } catch (cancelError) { Alert.alert("Cancellation Failed", cancelError?.message || "Could not cancel."); }
    finally { setCancellingHotel(false); }
  }, [hotelCancelReason, loadCategory, selectedHotel]);

  const header = useMemo(() => (
    <>
      <View style={styles.serviceSelector}>
        {CATEGORIES.map((item) => {
          const active = category === item.key;
          return <TouchableOpacity key={item.key} style={[styles.serviceTab, active && styles.serviceTabActive]} onPress={() => changeCategory(item.key)} activeOpacity={0.8}>
            <Ionicons name={item.icon} size={19} color={active ? "#FFF" : MUTED} />
            <Text style={[styles.serviceLabel, active && styles.serviceLabelActive]}>{item.label}</Text>
          </TouchableOpacity>;
        })}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {statusTabs.map((tab) => {
          const active = activeTab === tab.key;
          const count = bookings[category]?.[tab.key]?.length || 0;
          return <TouchableOpacity key={tab.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setActiveTab(tab.key)} activeOpacity={0.8}>
            <Text style={[styles.filterText, active && styles.filterTextActive]}>{tab.label}</Text>
            {count > 0 && <View style={[styles.filterCount, active && styles.filterCountActive]}><Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text></View>}
          </TouchableOpacity>;
        })}
      </ScrollView>
    </>
  ), [activeTab, bookings, category, changeCategory, statusTabs]);

  const empty = useMemo(() => {
    if (loading) return <ActivityIndicator style={styles.loader} size="large" color={BRAND} />;
    if (error) return <EmptyState icon="cloud-offline-outline" title="Couldn’t load bookings" text={error} action="Retry" onAction={() => loadCategory(category, true)} />;
    const copy = {
      Upcoming: ["No upcoming trips", "Your confirmed journeys will appear here."],
      Past: ["No completed trips", "Journeys you have completed will appear here."],
      Cancelled: ["No cancelled trips", "Cancelled bookings and refund details will appear here."],
      PaymentFailed: ["No unsuccessful bookings", "Payment-failed bookings will appear here."],
    }[activeTab];
    return <EmptyState title={copy[0]} text={copy[1]} action={activeTab === "Upcoming" ? "Plan a trip" : ""} onAction={searchCategory} />;
  }, [activeTab, category, error, loadCategory, loading, searchCategory]);

  const renderItem = useCallback(({ item }) => category === "bus"
    ? <BusBookingCard booking={item} onPress={() => openBooking(item)} />
    : <LegacyBookingCard booking={item} onPress={() => openBooking(item)} />,
  [category, openBooking]);

  return <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
    <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
    <AppHeader title="Bookings" />
    <FlatList
      data={currentList}
      keyExtractor={(item, index) => item.key || item.id || item.pnr || `${category}-${index}`}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ItemSeparatorComponent={() => <View style={styles.cardGap} />}
      contentContainerStyle={[styles.listContent, currentList.length === 0 && styles.listContentEmpty]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCategory(category, true)} colors={[BRAND]} tintColor={BRAND} />}
    />
    <LegacyDetailsModal booking={legacyDetails} onClose={() => setLegacyDetails(null)} />
    <Modal transparent animationType="fade" visible={hotelCancelVisible} onRequestClose={() => setHotelCancelVisible(false)}>
      <View style={styles.modalOverlay}><View style={styles.modalCard}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Cancel Hotel Booking</Text><TouchableOpacity onPress={() => setHotelCancelVisible(false)}><Ionicons name="close" size={24} color={MUTED} /></TouchableOpacity></View>
        <Text style={styles.modalNotice}>Cancelling any room cancels the entire booking.</Text>
        <TextInput style={styles.reasonInput} value={hotelCancelReason} onChangeText={setHotelCancelReason} placeholder="Reason for cancellation" />
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setHotelCancelVisible(false)}><Text style={styles.secondaryButtonText}>Keep reservation</Text></TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={confirmHotelCancellation} disabled={cancellingHotel}>{cancellingHotel ? <ActivityIndicator color="#FFF" /> : <Text style={styles.dangerButtonText}>Confirm cancel</Text>}</TouchableOpacity>
        </View>
      </View></View>
    </Modal>
  </SafeAreaView>;
}

const BusBookingCard = memo(({ booking, onPress }) => {
  const status = getBusStatusPresentation(booking.status);
  const seatText = booking.seatNumbers.length
    ? `${booking.seatNumbers.length === 1 ? "Seat" : "Seats"} ${booking.seatNumbers.join(", ")}`
    : booking.seatCount
      ? `${booking.seatCount} ${booking.seatCount === 1 ? "seat" : "seats"}`
      : "";
  const total = formatBookingCurrency(booking.totalPaid);
  return <TouchableOpacity style={styles.busCard} onPress={onPress} activeOpacity={0.88} accessibilityRole="button">
    <View style={styles.cardTopRow}>
      <View style={[styles.statusBadge, { backgroundColor: status.tint }]}><Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text></View>
      {!!booking.pnr && <Text style={styles.pnrText}>PNR {booking.pnr}</Text>}
    </View>
    <Text style={styles.routeTitle} numberOfLines={2}>{booking.from || "Not available"} <Text style={styles.routeArrow}>→</Text> {booking.to || "Not available"}</Text>
    {!!booking.operator && <Text style={styles.operatorText} numberOfLines={1}>{booking.operator}</Text>}
    <View style={styles.journeyRow}>
      <JourneyEnd time={formatBookingTime(booking.departureAt)} city={booking.from} date={formatBookingDate(booking.departureAt, "short")} />
      <View style={styles.journeyConnector}><View style={styles.connectorDot} /><View style={styles.connectorLine} /><Ionicons name="arrow-forward" size={17} color={BRAND} /></View>
      <JourneyEnd align="right" time={formatBookingTime(booking.arrivalAt)} city={booking.to} date={formatBookingDate(booking.arrivalAt, "short")} />
    </View>
    <View style={styles.cardDivider} />
    <View style={styles.cardFooter}>
      <View style={styles.metadataRow}>{!!seatText && <Metadata icon="bed-outline" text={seatText} />}{!!total && <Metadata icon="wallet-outline" text={`${total} paid`} />}</View>
      <View style={styles.detailsAction}><Text style={styles.detailsActionText}>View details</Text><Ionicons name="chevron-forward" size={17} color={BRAND} /></View>
    </View>
  </TouchableOpacity>;
});

function JourneyEnd({ time, city, date, align = "left" }) {
  return <View style={[styles.journeyEnd, align === "right" && styles.journeyEndRight]}>
    {!!time && <Text style={styles.journeyTime}>{time}</Text>}
    {!!city && <Text style={[styles.journeyCity, align === "right" && styles.textRight]} numberOfLines={1}>{city}</Text>}
    {!!date && <Text style={styles.journeyDate}>{date}</Text>}
  </View>;
}

function Metadata({ icon, text }) { return <View style={styles.metadataItem}><Ionicons name={icon} size={15} color={MUTED} /><Text style={styles.metadataText} numberOfLines={1}>{text}</Text></View>; }

const LegacyBookingCard = memo(({ booking, onPress }) => <TouchableOpacity style={styles.legacyCard} onPress={onPress} activeOpacity={0.88}>
  <View style={styles.cardTopRow}><View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{booking.status.toUpperCase()}</Text></View>{!!booking.pnr && <Text style={styles.pnrText}>{booking.pnr}</Text>}</View>
  <Text style={styles.routeTitle} numberOfLines={2}>{booking.type === "hotel" ? booking.hotelName : `${booking.from} → ${booking.to}`}</Text>
  <Text style={styles.operatorText} numberOfLines={2}>{booking.type === "hotel" ? booking.address : booking.agencyName}</Text>
  <View style={styles.cardDivider} />
  <View style={styles.cardFooter}><Text style={styles.legacyMeta} numberOfLines={1}>{booking.type === "hotel" ? `${booking.checkInDate}${booking.checkOutDate ? ` – ${booking.checkOutDate}` : ""}` : `${booking.departTime}${booking.date ? `, ${booking.date}` : ""}`}</Text><View style={styles.detailsAction}><Text style={styles.detailsActionText}>View details</Text><Ionicons name="chevron-forward" size={17} color={BRAND} /></View></View>
</TouchableOpacity>);

function EmptyState({ icon = "ticket-outline", title, text, action, onAction }) {
  return <View style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={BRAND} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text>{!!action && <TouchableOpacity style={styles.primarySmallButton} onPress={onAction}><Text style={styles.primarySmallButtonText}>{action}</Text></TouchableOpacity>}</View>;
}

function LegacyDetailsModal({ booking, onClose }) {
  return <Modal transparent animationType="slide" visible={Boolean(booking)} onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.modalCard}>
    <View style={styles.modalHeader}><Text style={styles.modalTitle}>Booking Details</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={MUTED} /></TouchableOpacity></View>
    {!!booking && <><InfoLine label="Reference" value={booking.pnr} /><InfoLine label={booking.type === "hotel" ? "Hotel" : "Route"} value={booking.type === "hotel" ? booking.hotelName : `${booking.from} → ${booking.to}`} /><InfoLine label="Total paid" value={booking.totalAmount} /></>}
    <TouchableOpacity style={styles.primaryWideButton} onPress={onClose}><Text style={styles.primaryWideButtonText}>Close</Text></TouchableOpacity>
  </View></View></Modal>;
}

function InfoLine({ label, value }) { return !value ? null : <View style={styles.infoLine}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 36 },
  listContentEmpty: { flexGrow: 1 },
  serviceSelector: { flexDirection: "row", backgroundColor: "#F0EAEB", borderRadius: 16, padding: 4, marginBottom: 16 },
  serviceTab: { flex: 1, minHeight: 44, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  serviceTabActive: { backgroundColor: BRAND, shadowColor: BRAND, shadowOpacity: 0.18, shadowRadius: 7, elevation: 2 },
  serviceLabel: { color: MUTED, fontWeight: "700", fontSize: 14 }, serviceLabelActive: { color: "#FFF" },
  filterRow: { gap: 8, paddingBottom: 18, paddingRight: 6 },
  filterChip: { minHeight: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", gap: 7 },
  filterChipActive: { borderColor: BRAND, backgroundColor: "#FFF4F5" }, filterText: { color: MUTED, fontSize: 13, fontWeight: "700" }, filterTextActive: { color: BRAND },
  filterCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: "#F1F3F5", alignItems: "center", justifyContent: "center" }, filterCountActive: { backgroundColor: BRAND },
  filterCountText: { color: MUTED, fontSize: 11, fontWeight: "800" }, filterCountTextActive: { color: "#FFF" }, cardGap: { height: 13 },
  busCard: { backgroundColor: SURFACE, borderRadius: 22, borderWidth: 1, borderColor: BORDER, padding: 17, shadowColor: "#44151B", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  legacyCard: { backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 17 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }, statusBadge: { backgroundColor: "#FDECEF", borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  statusBadgeText: { color: BRAND, fontSize: 10, lineHeight: 12, fontWeight: "900", letterSpacing: 0.7 }, pnrText: { flexShrink: 1, color: MUTED, fontSize: 12, fontWeight: "700", textAlign: "right" },
  routeTitle: { color: NAVY, fontSize: 20, lineHeight: 26, fontWeight: "800", letterSpacing: -0.35, marginTop: 14 }, routeArrow: { color: BRAND }, operatorText: { color: MUTED, fontSize: 13, lineHeight: 19, marginTop: 3, fontWeight: "600" },
  journeyRow: { flexDirection: "row", alignItems: "center", marginTop: 18 }, journeyEnd: { flex: 1, minWidth: 0 }, journeyEndRight: { alignItems: "flex-end" }, journeyTime: { color: NAVY, fontSize: 16, fontWeight: "800" },
  journeyCity: { color: "#344054", fontSize: 12, fontWeight: "700", marginTop: 3, maxWidth: "100%" }, journeyDate: { color: "#98A2B3", fontSize: 11, fontWeight: "600", marginTop: 2 }, textRight: { textAlign: "right" },
  journeyConnector: { flexDirection: "row", alignItems: "center", width: 78, marginHorizontal: 8 }, connectorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#F3B9C0" }, connectorLine: { flex: 1, height: 1, backgroundColor: "#E8B5BB", marginLeft: 3 },
  cardDivider: { height: 1, backgroundColor: "#EEE9EA", marginVertical: 15 }, cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, metadataRow: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metadataItem: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "100%" }, metadataText: { color: "#475467", fontSize: 12, fontWeight: "700", flexShrink: 1 }, detailsAction: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 40 }, detailsActionText: { color: BRAND, fontSize: 12, fontWeight: "800" }, legacyMeta: { flex: 1, color: MUTED, fontSize: 12, fontWeight: "600" },
  loader: { marginTop: 70 }, emptyCard: { marginTop: 42, alignItems: "center", paddingHorizontal: 26 }, emptyIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#FDECEF", alignItems: "center", justifyContent: "center", marginBottom: 15 },
  emptyTitle: { color: NAVY, fontSize: 18, fontWeight: "800", textAlign: "center" }, emptyText: { color: MUTED, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 }, primarySmallButton: { backgroundColor: BRAND, borderRadius: 12, minHeight: 42, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", marginTop: 18 }, primarySmallButtonText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.48)", alignItems: "center", justifyContent: "center", padding: 20 }, modalCard: { width: "100%", maxWidth: 430, backgroundColor: SURFACE, borderRadius: 22, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }, modalTitle: { color: NAVY, fontSize: 20, fontWeight: "800" }, modalNotice: { color: "#B42318", fontSize: 13, lineHeight: 19, backgroundColor: "#FEF3F2", padding: 12, borderRadius: 12, marginBottom: 14 }, reasonInput: { minHeight: 48, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 12, paddingHorizontal: 13, color: NAVY },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 }, secondaryButton: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: "#D0D5DD", alignItems: "center", justifyContent: "center" }, secondaryButtonText: { color: "#344054", fontSize: 13, fontWeight: "800" }, dangerButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: "#B42318", alignItems: "center", justifyContent: "center" }, dangerButtonText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  infoLine: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F0EAEB" }, infoLabel: { color: MUTED, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 }, infoValue: { color: NAVY, fontSize: 15, fontWeight: "700", marginTop: 4 }, primaryWideButton: { minHeight: 48, backgroundColor: BRAND, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 18 }, primaryWideButtonText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});
