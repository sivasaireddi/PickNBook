import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  TextInput,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { requireAuthToken } from "../../../utils/authSession";
import {
  getMyHotelBookings,
  cancelHotelBooking,
} from "../../../services/hotelService";
import {
  getMyBusBookings,
  cancelBusBooking,
} from "../../../services/busService";
import { AUTH_API_BASE_URL } from "../../../services/authService";
import { useNavigation } from "@react-navigation/native";
import { readConfirmedFlightBookingsLocally } from "./flights/services/flightBookingFlowStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORIES = [
  {
    key: "bus",
    label: "Buses",
    icon: "bus-outline",
    accent: "#D97706",
    tint: "rgba(217, 119, 6, 0.10)",
  },
  {
    key: "hotel",
    label: "Hotels",
    icon: "bed-outline",
    accent: "#7C3AED",
    tint: "rgba(124, 58, 237, 0.10)",
  },
  {
    key: "flight",
    label: "Flights",
    icon: "airplane-outline",
    accent: "#0284C7",
    tint: "rgba(2, 132, 199, 0.10)",
  },
];

const STATUS_TABS = [
  { key: "Upcoming", label: "Upcoming" },
  { key: "Past", label: "Past" },
  { key: "Cancelled", label: "Cancelled" },
];

const STATUS_CONFIG = {
  Upcoming: { color: "#059669", tint: "rgba(5, 150, 105, 0.10)", label: "CONFIRMED" },
  Booked: { color: "#059669", tint: "rgba(5, 150, 105, 0.10)", label: "CONFIRMED" },
  Confirmed: { color: "#059669", tint: "rgba(5, 150, 105, 0.10)", label: "CONFIRMED" },
  Past: { color: "#64748B", tint: "rgba(100, 116, 139, 0.10)", label: "COMPLETED" },
  Completed: { color: "#64748B", tint: "rgba(100, 116, 139, 0.10)", label: "COMPLETED" },
  Cancelled: { color: "#DC2626", tint: "rgba(220, 38, 38, 0.10)", label: "CANCELLED" },
};

const CITY_NAME_MAP = {
  "19402": "Hyderabad",
  "8875": "Vijayawada",
  "1001": "Bangalore",
  "1002": "Chennai",
  "1003": "Visakhapatnam",
  "1004": "Tirupati",
};

const cleanCityName = (val, fallback) => {
  if (!val) return fallback;
  const str = String(val).trim();
  if (CITY_NAME_MAP[str]) return CITY_NAME_MAP[str];
  if (/^\d+$/.test(str)) return fallback;
  return str;
};

const cleanAgencyName = (val, fallback) => {
  if (!val) return fallback;
  const str = String(val).trim();
  if (str === "bogds1" || /^\d+$/.test(str)) return fallback;
  return str;
};

const createEmptyBookings = () => ({
  Upcoming: [],
  Past: [],
  Cancelled: [],
});

const DEFAULT_BUS_BOOKINGS = {
  Upcoming: [
    {
      id: "demo-bus-1",
      pnr: "PNR123456",
      from: "Hyderabad",
      to: "Vijayawada",
      agencyName: "Jagan Travels",
      date: "25 Jul 2025",
      departTime: "08:30 AM",
      arriveTime: "02:45 PM",
      duration: "6h 15m",
      seats: "Seat 15",
      totalAmount: "₹1,200",
      busType: "A/C Seater / 2+2",
      status: "Upcoming",
      canCancel: true,
      isBus: true,
    },
    {
      id: "demo-bus-2",
      pnr: "PNR123455",
      from: "Bangalore",
      to: "Chennai",
      agencyName: "SRS Travels",
      date: "22 Jul 2025",
      departTime: "07:00 PM",
      arriveTime: "06:00 AM",
      duration: "11h 00m",
      seats: "Seat 12",
      totalAmount: "₹850",
      busType: "A/C Sleeper / 2+1",
      status: "Upcoming",
      canCancel: true,
      isBus: true,
    },
  ],
  Past: [
    {
      id: "demo-bus-3",
      pnr: "PNR8BXRD25C",
      from: "Hyderabad",
      to: "Vijayawada",
      agencyName: "Jagan Travels",
      date: "23 Jul 2024",
      departTime: "12:30 PM",
      arriveTime: "06:45 PM",
      duration: "6h 15m",
      seats: "Seat 01",
      totalAmount: "₹311.85",
      busType: "A/C Seater / 2+2",
      status: "Past",
      canCancel: false,
      isBus: true,
    },
  ],
  Cancelled: [],
};

const DEFAULT_HOTEL_BOOKINGS = {
  Upcoming: [
    {
      id: "demo-hotel-1",
      pnr: "HT-20260731153022-123",
      providerBookingId: 78491823,
      traceId: "53626",
      hotelName: "Hotel Urban Lion - Delhi Airport",
      address: "Asset No 1 Gate No 5, Delhi",
      checkInDate: "01 Aug 2026",
      checkOutDate: "05 Aug 2026",
      roomsText: "1 Room (4 Nights)",
      guestName: "Gurushankar M P",
      totalAmount: "₹8,004.80",
      status: "Booked",
      canCancel: true,
      isHotel: true,
    },
  ],
  Past: [],
  Cancelled: [],
};

export default function BookingsScreen() {
  const navigation = useNavigation();
  const [category, setCategory] = useState("bus");
  const [activeTab, setActiveTab] = useState("Upcoming");

  const [busBookings, setBusBookings] = useState(DEFAULT_BUS_BOOKINGS);
  const [hotelBookings, setHotelBookings] = useState(DEFAULT_HOTEL_BOOKINGS);
  const [flightBookings, setFlightBookings] = useState(createEmptyBookings());

  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState({});
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBusBookingItem, setSelectedBusBookingItem] = useState(null);
  const [cancelReason, setCancelReason] = useState("User requested cancellation");
  const [cancelling, setCancelling] = useState(false);

  const [hotelCancelModalVisible, setHotelCancelModalVisible] = useState(false);
  const [selectedHotelBookingItem, setSelectedHotelBookingItem] = useState(null);
  const [hotelCancelReason, setHotelCancelReason] = useState("User requested cancellation");
  const [cancellingHotel, setCancellingHotel] = useState(false);

  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetIdx = CATEGORIES.findIndex((c) => c.key === category);
    Animated.timing(tabAnim, {
      toValue: targetIdx >= 0 ? targetIdx : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [category]);

  const activeCategoryConfig = CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];

  const fetchBookings = useCallback(async () => {
    try {
      const token = await requireAuthToken(null);
      if (!token) return;

      if (category === "bus") {
        const data = await getMyBusBookings(token);
        if (Array.isArray(data)) setBusBookings(groupBusBookingsByStatus(data));
      } else if (category === "hotel") {
        const data = await getMyHotelBookings();
        if (Array.isArray(data)) setHotelBookings(groupHotelBookingsByStatus(data));
      } else {
        const localList = await readConfirmedFlightBookingsLocally();
        let apiList = [];
        try {
          const response = await fetch(`${AUTH_API_BASE_URL}/api/FlightBookings/bookings`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) apiList = data;
          }
        } catch (netErr) {
          console.log("[BookingsScreen] Flight API notice:", netErr?.message);
        }

        const combined = [...localList, ...apiList];
        setFlightBookings(groupFlightBookingsByStatus(combined));
      }
    } catch (error) {
      console.log("[BookingsScreen] Fetch notice:", error.message);
    }
  }, [category]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const groupBusBookingsByStatus = (data) => {
    const grouped = createEmptyBookings();
    (Array.isArray(data) ? data : []).forEach((item, index) => {
      const fromVal = cleanCityName(item.from, "Hyderabad");
      const toVal = cleanCityName(item.to, "Vijayawada");
      const agencyVal = cleanAgencyName(item.operatorName, "Jagan Travels");
      const statusRaw = (item.tripState || item.status || "Upcoming").trim();
      const isCompleted = statusRaw.toLowerCase() === "completed" || statusRaw.toLowerCase() === "past";
      const isCancelled = statusRaw.toLowerCase() === "cancelled";

      const formatted = {
        id: item.bookingId ? item.bookingId.toString() : `bus-${index}`,
        pnr: item.pnr ? (item.pnr.startsWith("PNR") ? item.pnr : `PNR${item.pnr}`) : `PNR123${456 + index}`,
        from: fromVal,
        to: toVal,
        agencyName: agencyVal,
        date: "25 Jul 2025",
        departTime: "08:30 AM",
        arriveTime: item.dropTime || "06:45 AM",
        duration: "6h 15m",
        seats: `Seat ${String(item.seatsBooked || 1).padStart(2, "0")}`,
        totalAmount: item.totalPriceInr ? `₹${item.totalPriceInr}` : "₹1,200",
        busType: item.busType || "A/C Seater / 2+2",
        status: isCancelled ? "Cancelled" : isCompleted ? "Past" : "Upcoming",
        canCancel: !isCompleted && !isCancelled,
        isBus: true,
        rawBooking: item,
      };

      let statusTab = isCancelled ? "Cancelled" : isCompleted ? "Past" : "Upcoming";
      grouped[statusTab].push(formatted);
    });
    return grouped;
  };

  const groupHotelBookingsByStatus = (data) => {
    const grouped = createEmptyBookings();
    (Array.isArray(data) ? data : []).forEach((item, index) => {
      const isCancelled = String(item.status || "").toLowerCase() === "cancelled";
      const providerId = item.providerBookingId || item.bookingId || index;
      const formatted = {
        id: String(item.bookingId || index),
        providerBookingId: Number(providerId),
        traceId: String(item.traceId || ""),
        pnr: item.bookingReference || `HTL${990000 + index}`,
        hotelName: item.hotelName || "Hotel Stay",
        address: item.address || item.city || "City Center",
        checkInDate: item.checkInDate || item.dates || "Check-in",
        checkOutDate: item.checkOutDate || "Check-out",
        roomsText: item.dates ? `${item.dates}` : "1 Room",
        guestName: item.guestName || "Guest User",
        totalAmount: item.amount ? `₹${item.amount}` : (item.totalPrice ? `₹${item.totalPrice}` : "₹0"),
        status: isCancelled ? "Cancelled" : "Booked",
        canCancel: !isCancelled,
        isHotel: true,
        rawBooking: item,
      };

      let statusTab = isCancelled ? "Cancelled" : "Upcoming";
      grouped[statusTab].push(formatted);
    });
    return grouped;
  };

  const groupFlightBookingsByStatus = (data) => {
    const grouped = createEmptyBookings();
    (Array.isArray(data) ? data : []).forEach((item, index) => {
      const isCancelled = String(item.status || item.ticketStatus || "").toLowerCase() === "cancelled";
      const fromVal = item.from || item.fromCity || item.origin || "";
      const toVal = item.to || item.toCity || item.destination || "";
      const pnrVal = item.pnr || item.bookingReference || item.bookingId || "";
      const airlineVal = item.agencyName || (item.airline ? `${item.airline}${item.flightNumber ? ` • ${item.flightNumber}` : ""}` : "");
      const dateVal = item.date || item.departureDate || "";
      const departVal = item.departTime || item.departureTime || "";
      const arriveVal = item.arriveTime || item.arrivalTime || "";
      const seatsVal = item.seats || (item.seatNumber ? `Seat ${item.seatNumber}` : "Seat Auto-assigned");
      const amountVal = item.totalAmount || (item.totalPrice ? `₹${item.totalPrice.toLocaleString("en-IN")}` : (item.payableAmount ? `₹${Number(item.payableAmount).toLocaleString("en-IN")}` : ""));

      const formatted = {
        id: String(item.id || item.bookingId || item.pnr || index),
        pnr: pnrVal,
        from: fromVal,
        to: toVal,
        agencyName: airlineVal,
        date: dateVal,
        departTime: departVal,
        arriveTime: arriveVal,
        duration: item.duration || "",
        seats: seatsVal,
        totalAmount: amountVal,
        busType: item.travelClass || item.busType || "Economy",
        status: isCancelled ? "Cancelled" : "Upcoming",
        canCancel: !isCancelled,
        isFlight: true,
        rawBooking: item,
      };

      let statusTab = isCancelled ? "Cancelled" : "Upcoming";
      grouped[statusTab].push(formatted);
    });
    return grouped;
  };

  const currentBookings = category === "bus" ? busBookings : category === "hotel" ? hotelBookings : flightBookings;
  const currentList = currentBookings[activeTab] || [];

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmCancelBus = async () => {
    if (!selectedBusBookingItem) {
      setCancelModalVisible(false);
      return;
    }
    try {
      setCancelling(true);
      await cancelBusBooking({ pnr: selectedBusBookingItem.pnr });
      Alert.alert("Success", "Bus booking cancelled successfully.");
      setCancelModalVisible(false);
      fetchBookings();
    } catch (err) {
      Alert.alert("Cancellation Failed", err?.message || "Could not cancel.");
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenHotelCancellationModal = (bookingItem) => {
    setSelectedHotelBookingItem(bookingItem);
    setHotelCancelModalVisible(true);
  };

  const handleConfirmCancelHotel = async () => {
    if (!selectedHotelBookingItem) return;
    try {
      setCancellingHotel(true);
      await cancelHotelBooking({
        providerBookingId: Number(selectedHotelBookingItem.providerBookingId),
        traceId: String(selectedHotelBookingItem.traceId),
        remarks: hotelCancelReason,
      });
      setHotelCancelModalVisible(false);
      Alert.alert("Success", "Hotel cancelled successfully.");
      fetchBookings();
    } catch (err) {
      Alert.alert("Cancellation Failed", err?.message || "Could not cancel.");
    } finally {
      setCancellingHotel(false);
    }
  };

  const handleSearchNavigate = () => {
    if (category === "bus") {
      navigation.navigate("BusScreen");
    } else if (category === "hotel") {
      navigation.navigate("Hotels");
    } else if (category === "flight") {
      navigation.navigate("FlightScreen");
    } else {
      navigation.navigate("DashBoard");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBox}>
          <Text style={styles.pageTitle}>My bookings</Text>
          <Text style={styles.pageSubtitle}>
            Every trip, stay and flight — in one place
          </Text>
        </View>

        <View style={styles.segmentedContainer}>
          <Animated.View
            style={[
              styles.segmentedIndicator,
              {
                backgroundColor: activeCategoryConfig.tint,
                borderColor: activeCategoryConfig.accent,
                left: tabAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: ["2%", "35.3%", "68.6%"],
                }),
              },
            ]}
          />
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={styles.segmentedTab}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon}
                  size={18}
                  color={isActive ? cat.accent : "#6B7280"}
                />
                <Text
                  style={[
                    styles.segmentedLabel,
                    isActive && { color: cat.accent, fontWeight: "700" },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.statusPillsRow}>
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.statusFilterPill,
                  isActive
                    ? {
                        backgroundColor: activeCategoryConfig.tint,
                        borderColor: activeCategoryConfig.accent,
                        borderWidth: 1.5,
                      }
                    : styles.statusFilterPillInactive,
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    isActive
                      ? { color: activeCategoryConfig.accent, fontWeight: "700" }
                      : styles.statusFilterTextInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={activeCategoryConfig.accent} />
          </View>
        ) : currentList.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={[styles.emptyIconCircle, { backgroundColor: activeCategoryConfig.tint }]}>
              <Ionicons
                name={activeCategoryConfig.icon}
                size={32}
                color={activeCategoryConfig.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>
              No {activeTab.toLowerCase()} {category} bookings yet.
            </Text>
            <Text style={styles.emptySub}>
              Your bookings will appear here once confirmed.
            </Text>
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: activeCategoryConfig.accent }]}
              onPress={handleSearchNavigate}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyActionBtnText}>
                Search {activeCategoryConfig.label}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {currentList.map((item) => (
              <BoardingPassCard
                key={item.id}
                item={item}
                categoryConfig={activeCategoryConfig}
                isFav={Boolean(favorites[item.id])}
                onToggleFav={() => toggleFavorite(item.id)}
                onViewDetails={() => {
                  if (item.isHotel && item.canCancel) {
                    handleOpenHotelCancellationModal(item);
                  } else if (item.isBus && item.canCancel) {
                    setSelectedBusBookingItem(item);
                    setCancelModalVisible(true);
                  } else {
                    setSelectedBookingDetails(item);
                  }
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={Boolean(selectedBookingDetails)}
        onRequestClose={() => setSelectedBookingDetails(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setSelectedBookingDetails(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedBookingDetails && (
              <ScrollView style={{ maxHeight: 380 }}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Booking Ref / PNR</Text>
                  <Text style={styles.modalInfoVal}>{selectedBookingDetails.pnr}</Text>
                </View>
                {selectedBookingDetails.isHotel ? (
                  <>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Hotel Name</Text>
                      <Text style={styles.modalInfoVal}>{selectedBookingDetails.hotelName}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Address</Text>
                      <Text style={styles.modalInfoVal}>{selectedBookingDetails.address}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Dates</Text>
                      <Text style={styles.modalInfoVal}>{selectedBookingDetails.checkInDate} - {selectedBookingDetails.checkOutDate}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Lead Guest</Text>
                      <Text style={styles.modalInfoVal}>{selectedBookingDetails.guestName}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Route</Text>
                      <Text style={styles.modalInfoVal}>{selectedBookingDetails.from} ➔ {selectedBookingDetails.to}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Operator</Text>
                      <Text style={styles.modalInfoVal}>{selectedBookingDetails.agencyName}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Departure</Text>
                      <Text style={styles.modalInfoVal}>{selectedBookingDetails.date} ({selectedBookingDetails.departTime})</Text>
                    </View>
                  </>
                )}
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Total Amount Paid</Text>
                  <Text style={[styles.modalInfoVal, { color: activeCategoryConfig.accent, fontWeight: "800" }]}>
                    {selectedBookingDetails.totalAmount}
                  </Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedBookingDetails(null)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Ticket</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubTitle}>Reason for cancellation</Text>
            <View style={styles.reasonInputBox}>
              <TextInput
                style={styles.reasonInput}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Enter reason..."
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCancelModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleConfirmCancelBus}
                disabled={cancelling}
              >
                {cancelling ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalConfirmBtnText}>Confirm Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={hotelCancelModalVisible}
        onRequestClose={() => setHotelCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Hotel Booking</Text>
              <TouchableOpacity onPress={() => setHotelCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.warningNoticeBox}>
              <Ionicons name="warning-outline" size={22} color="#DC2626" />
              <Text style={styles.warningNoticeText}>
                Cancelling any room cancels the entire booking.
              </Text>
            </View>

            <View style={styles.reasonInputBox}>
              <Text style={styles.sectionHeader}>Remarks / Cancellation Reason</Text>
              <TextInput
                style={styles.reasonInput}
                value={hotelCancelReason}
                onChangeText={setHotelCancelReason}
                placeholder="Reason for cancellation..."
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setHotelCancelModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Keep Reservation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleConfirmCancelHotel}
                disabled={cancellingHotel}
              >
                {cancellingHotel ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalConfirmBtnText}>Confirm Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function BoardingPassCard({ item, categoryConfig, isFav, onToggleFav, onViewDetails }) {
  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.Upcoming;

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.leftEdgeStripe, { backgroundColor: categoryConfig.accent }]} />
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.categoryIconChip, { backgroundColor: categoryConfig.tint }]}>
            <Ionicons name={categoryConfig.icon} size={14} color={categoryConfig.accent} />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.tint }]}>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.monoPnrText}>{item.pnr}</Text>
          <TouchableOpacity onPress={onToggleFav} style={styles.heartBtn}>
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#DC2626" : "#9CA3AF"} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.routeSection}>
        {item.isHotel ? (
          <>
            <Text style={styles.primaryTitleText} numberOfLines={1}>{item.hotelName}</Text>
            <View style={styles.subInfoRow}>
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text style={styles.subInfoText} numberOfLines={1}>{item.address}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.primaryTitleText} numberOfLines={1}>{item.from} → {item.to}</Text>
            <Text style={styles.subInfoText} numberOfLines={1}>{item.agencyName}</Text>
          </>
        )}
      </View>

      <View style={styles.tearLineContainer}>
        <View style={styles.dashedTearLine} />
        <View style={styles.leftCutoutNotch} />
        <View style={styles.rightCutoutNotch} />
      </View>

      <View style={styles.detailGrid}>
        {item.isHotel ? (
          <>
            <GridColumn label="CHECK-IN" value={item.checkInDate} />
            <GridColumn label="CHECK-OUT" value={item.checkOutDate} />
            <GridColumn label="ROOMS" value={item.roomsText || "1 Room"} />
            <GridColumn label="GUEST" value={item.guestName || "Guest User"} />
          </>
        ) : (
          <>
            <GridColumn label="DEPART" value={`${item.departTime}, ${item.date}`} />
            <GridColumn label="ARRIVE" value={item.arriveTime || "N/A"} />
            <GridColumn label="DURATION" value={item.duration || "N/A"} />
            <GridColumn label="SEAT(S)" value={item.seats || "1 Seat"} />
          </>
        )}
      </View>

      <View style={styles.cardFooterRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>TOTAL PAID</Text>
          <Text style={styles.priceAmount}>{item.totalAmount}</Text>
        </View>
        <TouchableOpacity style={[styles.viewDetailsPill, { backgroundColor: categoryConfig.tint }]} onPress={onViewDetails}>
          <Text style={[styles.viewDetailsText, { color: categoryConfig.accent }]}>View details →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function GridColumn({ label, value }) {
  return (
    <View style={styles.gridCol}>
      <Text style={styles.gridLabel}>{label}</Text>
      <Text style={styles.gridValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 12,
  },
  headerBox: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },

  // Segmented Control Tabs
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "#EAECF2",
    marginBottom: 14,
    position: "relative",
    height: 48,
    alignItems: "center",
  },
  segmentedIndicator: {
    position: "absolute",
    width: "30%",
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    top: 4,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    zIndex: 1,
  },
  segmentedLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 6,
  },

  // Status Filter Pills
  statusPillsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statusFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusFilterPillInactive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAECF2",
  },
  statusFilterText: {
    fontSize: 13,
  },
  statusFilterTextInactive: {
    color: "#6B7280",
    fontWeight: "500",
  },

  loaderContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },

  // Boarding Pass Ticket Card
  cardsList: {
    gap: 12,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EAECF2",
    padding: 16,
    paddingLeft: 20,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
  },
  leftEdgeStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },

  // Header Row inside Card
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryIconChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monoPnrText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  heartBtn: {
    padding: 2,
  },

  // Route & Title Section
  routeSection: {
    marginBottom: 4,
  },
  primaryTitleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  subInfoText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  // Dashed Boarding Pass Tear Line
  tearLineContainer: {
    position: "relative",
    marginVertical: 12,
    justifyContent: "center",
  },
  dashedTearLine: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderStyle: "dashed",
    width: "100%",
  },
  leftCutoutNotch: {
    position: "absolute",
    left: -28,
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F6F7FB",
  },
  rightCutoutNotch: {
    position: "absolute",
    right: -24,
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F6F7FB",
  },

  // Detail Grid (2x2 Grid)
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
    marginBottom: 12,
  },
  gridCol: {
    width: "50%",
    paddingRight: 6,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },

  // Card Footer Row
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  priceContainer: {
    justifyContent: "center",
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  viewDetailsPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Empty State Container
  emptyStateCard: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubTitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalInfoLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  modalInfoVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  modalCloseBtn: {
    marginTop: 16,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  warningNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "600",
  },
  reasonInputBox: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
