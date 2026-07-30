import React, { useEffect, useState, useCallback } from "react";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { requireAuthToken } from "../../../utils/authSession";
import { getMyHotelBookings, cancelHotelBooking } from "../../../services/hotelService";
import { getMyBusBookings, cancelBusBooking, cancelBusPassengers } from "../../../services/busService";
import { AUTH_API_BASE_URL } from "../../../services/authService";
import AppHeader from "../../../components/AppHeader";

const TABS = ["Upcoming", "Past", "Cancelled", "Unsuccessful"];

const EMPTY_MESSAGES = {
  Upcoming: "No upcoming bookings yet.",
  Past: "No past bookings found.",
  Cancelled: "No cancelled trips right now.",
  Unsuccessful: "No unsuccessful bookings right now.",
};

const createEmptyBookings = () => ({
  Upcoming: [],
  Past: [],
  Cancelled: [],
  Unsuccessful: [],
});

function BookingCard({ item, onCancel, onCancelFlight, onCancelBus }) {
  const isHotel = item.isHotel;
  const isFlight = item.isFlight;
  const isBus = item.isBus || (!isHotel && !isFlight);
  const isCancellable = isBus
    ? item.canCancel
    : (isHotel || isFlight) && item.status !== "Cancelled";

  const rawPassengers = isBus && Array.isArray(item.rawBooking?.passengers) ? item.rawBooking.passengers : [];

  if (isBus) {
    const raw = item.rawBooking || {};
    const busNum = raw.busNumber || raw.serviceNumber || raw.bus?.busNumber || raw.bus?.serviceNumber || "TS09 AB 1234";
    const pickup = raw.pickupTime || raw.boardingTime || raw.boardingPoint?.time || item.time || "12:30 AM";
    const drop = raw.dropTime || raw.arrivalTime || raw.droppingPoint?.time || "06:45 AM";
    const pnrVal = item.pnr || raw.pnr || item.ticketNumber?.replace("PNR: ", "") || "8BEJ4X9T";
    const journeyDate = raw.journeyDate || item.date || "25 Jul 2026";
    const statusVal = item.status || raw.bookingStatus || "Confirmed";
    const seatVal = raw.seatNumber || (raw.passengers && raw.passengers[0]?.seatNumber) || "11";
    const boardingPointVal = raw.boardingPoint?.name || raw.boardingPointName || raw.boardingPoint || "MGBS";
    const primaryPassenger = item.passengerName || (raw.passengers && raw.passengers[0]?.fullName) || "Harish Reddy";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.cardEyebrow}>BUS BOOKING</Text>
            <View style={styles.routeRow}>
              <Text style={styles.routeText}>{item.from}</Text>
              <Ionicons name="arrow-forward" size={15} color="#1F2937" style={{ marginHorizontal: 6 }} />
              <Text style={styles.routeText}>{item.to}</Text>
            </View>
          </View>
          <View style={styles.securedWrap}>
            <View style={styles.securedIconWrap}>
              <Ionicons name="shield-checkmark" size={14} color="#E53935" />
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.ticketBody}>
          {/* Bus Number */}
          <View style={styles.detailItemRow}>
            <MaterialIcons name="directions-bus" size={16} color="#E53935" style={{ marginRight: 6 }} />
            <Text style={styles.detailBusNoText}>Bus No: {busNum}</Text>
          </View>

          {/* Timings */}
          <View style={[styles.detailItemRow, { marginTop: 8 }]}>
            <Text style={styles.timeEmoji}>🟢</Text>
            <Text style={styles.timeLabel}>Pickup: </Text>
            <Text style={styles.pickupTimeText}>{pickup}</Text>
            <Text style={[styles.timeEmoji, { marginLeft: 16 }]}>🔴</Text>
            <Text style={styles.timeLabel}>Drop: </Text>
            <Text style={styles.dropTimeText}>{drop}</Text>
          </View>

          {/* Date */}
          <View style={[styles.detailItemRow, { marginTop: 8 }]}>
            <Ionicons name="calendar-outline" size={15} color="#E53935" style={{ marginRight: 6 }} />
            <Text style={styles.detailDateText}>{journeyDate}</Text>
          </View>

          {/* Reference */}
          <Text style={styles.referenceText}>Reference: PNR-{pnrVal}</Text>

          {/* Passengers */}
          <View style={styles.passengerSection}>
            <Text style={styles.passengerTitle}>Passenger</Text>
            <Text style={styles.passengerNameDetail}>• {primaryPassenger} (Seat {seatVal})</Text>
          </View>

          {/* Status */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabelText}>Status: </Text>
            <View style={[styles.pBadge, statusVal === "Cancelled" ? styles.pBadgeCancelled : styles.pBadgeActive]}>
              <Text style={[styles.pBadgeText, statusVal === "Cancelled" ? styles.pBadgeTextCancelled : styles.pBadgeTextActive]}>
                {statusVal}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <Text style={styles.noteText} numberOfLines={1}>
            Seat: {seatVal} • {item.note?.split("•")?.[1]?.trim() || "₹311.85"} • Boarding: {boardingPointVal}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.ctaButton, isCancellable && styles.ctaCancelButton]}
            onPress={() => {
              if (isCancellable && onCancelBus) {
                onCancelBus(item);
              }
            }}
            disabled={!isCancellable}
          >
            <Text style={[styles.ctaText, isCancellable && styles.ctaCancelText]}>
              {item.ctaLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Fallback for Hotel / Flight bookings
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.cardEyebrow}>
            {isHotel ? "Hotel Booking" : "Flight Booking"}
          </Text>

          <View style={styles.routeRow}>
            <Text style={styles.routeText} numberOfLines={1}>
              {isHotel ? item.hotelName : `${item.from} → ${item.to}`}
            </Text>
          </View>
        </View>

        <View style={styles.securedWrap}>
          <View style={styles.securedIconWrap}>
            <Ionicons name="shield-checkmark" size={14} color="#E53935" />
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <View style={styles.ticketIconBox}>
          <MaterialCommunityIcons
            name={isHotel ? "bed-outline" : "airplane"}
            size={22}
            color="#E53935"
          />
        </View>

        <View style={styles.infoTextWrap}>
          <Text style={styles.infoPrimary}>
            Reference: {item.ticketNumber}
          </Text>
          <Text style={styles.infoSecondary}>
            {isHotel ? `${item.time} · ${item.date}` : `Schedule: ${item.date} at ${item.time}`}
          </Text>
          {isHotel && (
            <Text style={styles.infoSecondary}>
              Guest: {item.guestName}
            </Text>
          )}
          {isFlight && (
            <Text style={styles.infoSecondary}>
              Carrier: {item.airline}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <Text style={styles.noteText} numberOfLines={1}>{item.note}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.ctaButton, isCancellable && styles.ctaCancelButton]}
          onPress={() => {
            if (isCancellable) {
              if (isHotel && onCancel) {
                onCancel(item.id);
              } else if (isFlight && onCancelFlight) {
                onCancelFlight(item.id);
              }
            }
          }}
          disabled={!isCancellable}
        >
          <Text style={[styles.ctaText, isCancellable && styles.ctaCancelText]}>
            {item.ctaLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [category, setCategory] = useState("bus");
  const [busBookings, setBusBookings] = useState(createEmptyBookings);
  const [hotelBookings, setHotelBookings] = useState(createEmptyBookings);
  const [flightBookings, setFlightBookings] = useState(createEmptyBookings);
  const [loading, setLoading] = useState(true);

  // Cancellation Modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBusBookingItem, setSelectedBusBookingItem] = useState(null);
  const [cancelType, setCancelType] = useState("entire"); // "entire" | "partial"
  const [selectedPassengerIds, setSelectedPassengerIds] = useState([]);
  const [cancelReason, setCancelReason] = useState("User requested cancellation");
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const token = await requireAuthToken("Please sign in again to view bookings.");
      
      if (category === "bus") {
        console.log("[BookingsScreen] Fetching Bus Bookings API via busService...");
        const data = await getMyBusBookings(token);
        setBusBookings(groupBusBookingsByStatus(data));
      } else if (category === "hotel") {
        console.log("[BookingsScreen] Fetching Hotel Bookings API...");
        const data = await getMyHotelBookings();
        setHotelBookings(groupHotelBookingsByStatus(data));
      } else {
        console.log("[BookingsScreen] Fetching Flight Bookings API...");
        const response = await fetch(
          `${AUTH_API_BASE_URL}/api/FlightBookings/bookings`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        if (!response.ok) throw new Error(`Failed to fetch flight bookings (${response.status})`);
        const data = await response.json();
        setFlightBookings(groupFlightBookingsByStatus(data));
      }
    } catch (error) {
      console.error("[BookingsScreen] Error fetching bookings:", error);
      if (category === "bus") {
        setBusBookings(createEmptyBookings());
      } else if (category === "hotel") {
        setHotelBookings(createEmptyBookings());
      } else {
        setFlightBookings(createEmptyBookings());
      }
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const groupBusBookingsByStatus = (data) => {
    const grouped = createEmptyBookings();
    (Array.isArray(data) ? data : []).forEach((item) => {
      const fromVal = item.fromCity || item.from || item.sourceCity || "N/A";
      const toVal = item.toCity || item.to || item.destinationCity || "N/A";

      let dateVal = "N/A";
      let timeVal = "N/A";

      const utcTime = item.departureTimeUtc || item.departureTime;
      if (utcTime) {
        try {
          const depDate = new Date(utcTime);
          if (!isNaN(depDate.getTime())) {
            dateVal = depDate.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            timeVal = depDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          } else {
            dateVal = String(utcTime).slice(0, 10);
            timeVal = String(utcTime).slice(11, 16);
          }
        } catch (e) {
          dateVal = String(utcTime).slice(0, 10);
          timeVal = String(utcTime).slice(11, 16);
        }
      } else {
        timeVal = item.time || "N/A";
        dateVal = item.date || item.journeyDate || "N/A";
      }

      const passengerList = Array.isArray(item.passengers) ? item.passengers : [];
      const activePassengers = passengerList.filter((p) => !p.isCancelled);

      const seatNumbers = activePassengers
        .map((p) => p.seatNumber)
        .filter(Boolean)
        .join(", ");

      const seatsCount = item.seatsBooked || activePassengers.length || 1;
      const seatsInfo = seatNumbers ? `Seat ${seatNumbers}` : `${seatsCount} Seat(s)`;
      const fareInfo = item.totalPriceInr ? ` • ₹${item.totalPriceInr}` : "";
      const providerInfo = item.providerName ? ` • ${item.providerName}` : "";

      const noteText = `${seatsInfo}${fareInfo}${providerInfo}`;
      const isCancellable = item.canCancel === true && item.status !== "Cancelled" && item.tripState !== "Cancelled" && activePassengers.length > 0;

      const formatted = {
        id: item.bookingId ? item.bookingId.toString() : Math.random().toString(),
        bookingId: item.bookingId ? item.bookingId.toString() : "",
        from: fromVal,
        to: toVal,
        ticketNumber: item.pnr ? `PNR: ${item.pnr}` : item.bookingReference || item.bookingId || "BUS-REF",
        pnr: item.pnr,
        bookingReference: item.bookingReference,
        time: timeVal,
        date: dateVal,
        passengerName: item.passengerName || (passengerList[0] ? passengerList[0].fullName : ""),
        note: noteText,
        ctaLabel: item.tripState === "Cancelled" || item.status === "Cancelled"
          ? "Cancelled"
          : isCancellable
          ? "Cancel Ticket"
          : "View Details",
        status: item.tripState || item.status || "Completed",
        canCancel: isCancellable,
        isBus: true,
        isHotel: false,
        isFlight: false,
        rawBooking: item,
      };

      let statusTab = "Past";
      const itemTripState = (item.tripState || "").trim();
      const itemStatus = (item.status || "").trim();

      if (itemTripState === "Upcoming" || (itemStatus === "Booked" && itemTripState !== "Completed" && itemTripState !== "Cancelled")) {
        statusTab = "Upcoming";
      } else if (itemTripState === "Completed" || itemTripState === "Past") {
        statusTab = "Past";
      } else if (itemTripState === "Cancelled" || itemStatus === "Cancelled") {
        statusTab = "Cancelled";
      } else {
        statusTab = "Unsuccessful";
      }

      grouped[statusTab].push(formatted);
    });
    return grouped;
  };

  const groupHotelBookingsByStatus = (data) => {
    const grouped = createEmptyBookings();
    const now = new Date();
    (Array.isArray(data) ? data : []).forEach((item) => {
      const checkOut = item.checkOutDate ? new Date(item.checkOutDate) : null;
      const isPast = checkOut ? checkOut < now : false;

      const formatted = {
        id: String(item.bookingId || item.id),
        hotelName: item.hotelName || "Hotel Booking",
        guestName: item.guestName || "Guest",
        ticketNumber: item.bookingReference || item.bookingId || "HT-REF",
        time: item.checkInDate ? `Check-in: ${item.checkInDate}` : "N/A",
        date: item.checkOutDate ? `Check-out: ${item.checkOutDate}` : "N/A",
        note: item.roomCategory || "Standard Room",
        ctaLabel: item.status === "Cancelled" ? "Cancelled" : "Cancel Stay",
        status: item.status || "Confirmed",
        isHotel: true,
        isFlight: false,
      };

      let statusTab = "Upcoming";
      if (item.status === "Cancelled") {
        statusTab = "Cancelled";
      } else if (item.status === "Failed" || item.status === "Unsuccessful") {
        statusTab = "Unsuccessful";
      } else if (isPast) {
        statusTab = "Past";
      } else {
        statusTab = "Upcoming";
      }

      grouped[statusTab].push(formatted);
    });
    return grouped;
  };

  const groupFlightBookingsByStatus = (data) => {
    const grouped = createEmptyBookings();
    (Array.isArray(data) ? data : []).forEach((item) => {
      const formatted = {
        id: String(item.bookingId || item.id || Math.random()),
        airline: item.airline || "Flight Booking",
        from: item.fromCity || item.source || "DEL",
        to: item.toCity || item.destination || "BOM",
        ticketNumber: item.bookingReference || "FL-REF",
        time: item.departureTimeIst ? String(item.departureTimeIst).slice(11, 16) : "N/A",
        date: item.departureTimeIst ? String(item.departureTimeIst).slice(0, 10) : "N/A",
        note: `Class: ${item.travelClass || "Economy"} • Status: ${item.status || "Confirmed"}`,
        ctaLabel: item.status === "Cancelled" ? "Cancelled" : "Cancel Flight",
        status: item.status || "Confirmed",
        isHotel: false,
        isFlight: true,
      };

      let statusTab = "Upcoming";
      if (item.status === "Cancelled") {
        statusTab = "Cancelled";
      } else if (item.status === "Failed" || item.status === "Unsuccessful") {
        statusTab = "Unsuccessful";
      } else {
        const depDate = item.departureTimeIst ? new Date(item.departureTimeIst) : null;
        if (depDate && depDate < new Date()) {
          statusTab = "Past";
        } else {
          statusTab = "Upcoming";
        }
      }

      grouped[statusTab].push(formatted);
    });
    return grouped;
  };

  const handleCancelBusClick = (bookingItem) => {
    setSelectedBusBookingItem(bookingItem);
    setCancelReason("User requested cancellation");

    const rawPassengers = bookingItem.rawBooking?.passengers || [];
    const activePassengers = rawPassengers.filter((p) => !p.isCancelled);

    if (activePassengers.length > 1) {
      setCancelType("partial");
      setSelectedPassengerIds([]);
    } else {
      setCancelType("entire");
      setSelectedPassengerIds(activePassengers.map((p) => p.id));
    }

    setCancelModalVisible(true);
  };

const extractApiErrorMessage = (data, fallback = "An unexpected error occurred.") => {
  let raw = fallback;
  if (data) {
    if (typeof data === "string" && data.trim()) raw = data.trim();
    else if (typeof data.message === "string" && data.message.trim()) raw = data.message.trim();
    else if (typeof data.error === "string" && data.error.trim()) raw = data.error.trim();
    else if (typeof data.title === "string" && data.title.trim()) raw = data.title.trim();
    else if (data.errors && typeof data.errors === "object") {
      const flattened = Object.values(data.errors).flat().filter(Boolean);
      if (flattened.length > 0) raw = flattened.join("\n");
    }
  }

  if (typeof raw !== "string") return fallback;

  return raw
    .replace(/^Request failed with status code \d+\s*/i, "")
    .replace(/^SRDV Provider Error:\s*(Error:\s*)?/i, "")
    .replace(/^Error:\s*/i, "")
    .replace(/,as\b/gi, ", as ")
    .trim() || fallback;
};

  const submitBusCancellation = async () => {
    if (!selectedBusBookingItem) return;
    const bookingId = selectedBusBookingItem.bookingId || selectedBusBookingItem.id;

    setCancelling(true);
    try {
      let result;
      if (cancelType === "partial") {
        if (selectedPassengerIds.length === 0) {
          Alert.alert("Selection Required", "Please select at least one passenger to cancel.");
          setCancelling(false);
          return;
        }
        console.log(`[BookingsScreen] Cancelling specific passengers:`, selectedPassengerIds);
        result = await cancelBusPassengers(bookingId, selectedPassengerIds);
      } else {
        console.log(`[BookingsScreen] Cancelling entire ticket with reason: "${cancelReason}"`);
        result = await cancelBusBooking(bookingId, cancelReason);
      }

      setCancelModalVisible(false);

      const status = result?.status || (cancelType === "partial" ? "Booked" : "Cancelled");
      const refund = result?.refundAmountInr ?? result?.refundAmount ?? result?.RefundAmountInr ?? 0;
      const charge = result?.cancellationChargeInr ?? result?.cancellationCharge ?? result?.CancellationChargeInr ?? 0;

      const formattedRefund = Number(refund || 0).toFixed(2);
      const formattedCharge = Number(charge || 0).toFixed(2);

      Alert.alert(
        cancelType === "partial" ? "Partial Cancellation Successful" : "Ticket Cancelled Successfully",
        `Booking Status: ${status}\nRefund Amount: ₹${formattedRefund}\nCancellation Fee: ₹${formattedCharge}`,
        [{ text: "OK", onPress: () => fetchBookings() }]
      );
    } catch (error) {
      const apiMsg = extractApiErrorMessage(error?.response?.data, error?.message || "Failed to process bus cancellation.");
      console.warn("[BookingsScreen] Bus cancellation API response message:", apiMsg);

      if (cancelType === "partial" && apiMsg.toLowerCase().includes("entire booking")) {
        Alert.alert(
          "Partial Cancellation Not Permitted",
          `${apiMsg}\n\nWould you like to cancel the entire ticket instead?`,
          [
            { text: "No", style: "cancel" },
            {
              text: "Cancel Entire Ticket",
              style: "destructive",
              onPress: async () => {
                try {
                  setCancelling(true);
                  const result = await cancelBusBooking(bookingId, cancelReason);
                  setCancelModalVisible(false);
                  const status = result?.status || "Cancelled";
                  const refund = result?.refundAmountInr ?? result?.refundAmount ?? 0;
                  const charge = result?.cancellationChargeInr ?? result?.cancellationCharge ?? 0;
                  Alert.alert(
                    "Ticket Cancelled Successfully",
                    `Booking Status: ${status}\nRefund Amount: ₹${Number(refund).toFixed(2)}\nCancellation Fee: ₹${Number(charge).toFixed(2)}`,
                    [{ text: "OK", onPress: () => fetchBookings() }]
                  );
                } catch (entireErr) {
                  const entireMsg = extractApiErrorMessage(entireErr?.response?.data, entireErr?.message);
                  Alert.alert("Cancellation Failed", entireMsg);
                } finally {
                  setCancelling(false);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert("Cancellation Failed", apiMsg);
      }
    } finally {
      setCancelling(false);
    }
  };


  const handleCancelHotel = (bookingId) => {
    Alert.alert(
      "Cancel Stay",
      "Are you sure you want to cancel this hotel booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await cancelHotelBooking(bookingId, "User requested cancellation");
              Alert.alert("Success", "Hotel booking cancelled successfully.");
              fetchBookings();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to cancel booking.");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelFlight = (bookingId) => {
    Alert.alert(
      "Cancel Flight",
      "Are you sure you want to cancel this flight booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const token = await requireAuthToken("Session expired. Please sign in again.");
              const response = await fetch(
                `https://paycheck-baton-overfull.ngrok-free.dev/api/FlightBookings/bookings/${bookingId}/cancel`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                  },
                }
              );
              if (!response.ok) throw new Error("Cancellation request failed.");
              Alert.alert("Success", "Flight booking cancelled successfully.");
              fetchBookings();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to cancel flight booking.");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const bookings = category === "bus" 
    ? (busBookings[activeTab] || []) 
    : category === "hotel" 
      ? (hotelBookings[activeTab] || [])
      : (flightBookings[activeTab] || []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <AppHeader title="Bookings" />
      {/* Category Toggle Tabs */}
      <View style={styles.categoryOuter}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setCategory("bus")}
          style={[styles.categoryButton, category === "bus" && styles.activeCategoryButton]}
        >
          <Text style={[styles.categoryText, category === "bus" && styles.activeCategoryText]}>
            Buses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setCategory("hotel")}
          style={[styles.categoryButton, category === "hotel" && styles.activeCategoryButton]}
        >
          <Text style={[styles.categoryText, category === "hotel" && styles.activeCategoryText]}>
            Hotels
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setCategory("flight")}
          style={[styles.categoryButton, category === "flight" && styles.activeCategoryButton]}
        >
          <Text style={[styles.categoryText, category === "flight" && styles.activeCategoryText]}>
            Flights
          </Text>
        </TouchableOpacity>
      </View>

      {/* Booking State Tabs (Upcoming, Past, etc.) */}
      <View style={styles.tabsOuter}>
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.85}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
            >
              <Text numberOfLines={1} style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {bookings.length > 0 ? (
            bookings.map((item) => (
              <BookingCard 
                key={item.id} 
                item={item} 
                onCancel={handleCancelHotel} 
                onCancelFlight={handleCancelFlight}
                onCancelBus={handleCancelBusClick}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={28} color="#E53935" />
              </View>
              <Text style={styles.emptyTitle}>No bookings to show</Text>
              <Text style={styles.emptyMessage}>{EMPTY_MESSAGES[activeTab]}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Bus Cancellation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Bus Ticket</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {selectedBusBookingItem && (
                <>
                  <Text style={styles.modalSubTitle}>
                    {selectedBusBookingItem.ticketNumber} ({selectedBusBookingItem.from} → {selectedBusBookingItem.to})
                  </Text>

                  {/* Mode Selector if multiple active passengers exist */}
                  {((selectedBusBookingItem.rawBooking?.passengers || []).filter((p) => !p.isCancelled).length > 1) && (
                    <View style={styles.cancelTypeWrap}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.typeBtn, cancelType === "entire" && styles.activeTypeBtn]}
                        onPress={() => setCancelType("entire")}
                      >
                        <Ionicons
                          name={cancelType === "entire" ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={cancelType === "entire" ? "#E53935" : "#6B7280"}
                        />
                        <Text style={[styles.typeBtnText, cancelType === "entire" && styles.activeTypeBtnText]}>
                          Cancel Entire Ticket
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.typeBtn, cancelType === "partial" && styles.activeTypeBtn]}
                        onPress={() => setCancelType("partial")}
                      >
                        <Ionicons
                          name={cancelType === "partial" ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={cancelType === "partial" ? "#E53935" : "#6B7280"}
                        />
                        <Text style={[styles.typeBtnText, cancelType === "partial" && styles.activeTypeBtnText]}>
                          Cancel Specific Passenger(s)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Passenger Checkboxes if Partial Cancellation */}
                  {cancelType === "partial" && (
                    <View style={styles.passengerSelectBox}>
                      <Text style={styles.sectionHeader}>Select Passenger(s) to Cancel:</Text>
                      {(selectedBusBookingItem.rawBooking?.passengers || [])
                        .filter((p) => !p.isCancelled)
                        .map((p) => {
                          const isSelected = selectedPassengerIds.includes(p.id);
                          return (
                            <TouchableOpacity
                              key={p.id}
                              activeOpacity={0.8}
                              style={styles.passengerCheckRow}
                              onPress={() => {
                                if (isSelected) {
                                  setSelectedPassengerIds(selectedPassengerIds.filter((id) => id !== p.id));
                                } else {
                                  setSelectedPassengerIds([...selectedPassengerIds, p.id]);
                                }
                              }}
                            >
                              <Ionicons
                                name={isSelected ? "checkbox" : "square-outline"}
                                size={20}
                                color={isSelected ? "#E53935" : "#9CA3AF"}
                              />
                              <Text style={styles.passengerCheckText}>
                                {p.fullName || p.firstName || "Passenger"} (Seat: {p.seatNumber || "N/A"})
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  )}

                  {/* Reason Input Field for Entire Ticket Cancellation */}
                  {cancelType === "entire" && (
                    <View style={styles.reasonInputBox}>
                      <Text style={styles.sectionHeader}>Cancellation Reason:</Text>
                      <TextInput
                        style={styles.reasonInput}
                        value={cancelReason}
                        onChangeText={setCancelReason}
                        placeholder="Enter cancellation reason..."
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
                disabled={cancelling}
              >
                <Text style={styles.modalCancelBtnText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, cancelling && { opacity: 0.6 }]}
                onPress={submitBusCancellation}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>
                    {cancelType === "partial" ? "Cancel Selected" : "Confirm Cancel"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 12,
  },
  loadingText: {
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 13,
  },
  categoryOuter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  categoryButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeCategoryButton: {
    backgroundColor: "#FFEBEE",
  },
  categoryText: {
    color: "#757575",
    fontSize: 13,
    fontWeight: "700",
  },
  activeCategoryText: {
    color: "#E53935",
  },
  tabsOuter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: "#FFEBEE",
  },
  tabText: {
    color: "#757575",
    fontSize: 12,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#E53935",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
  },
  cardEyebrow: {
    fontSize: 11,
    color: "#757575",
    fontWeight: "750",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#212121",
    marginRight: 6,
  },
  securedWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  securedIconWrap: {
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketIconBox: {
    marginRight: 12,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoPrimary: {
    fontSize: 13,
    color: "#212121",
    fontWeight: "750",
  },
  infoSecondary: {
    fontSize: 12,
    color: "#757575",
    fontWeight: "600",
    marginTop: 2,
  },
  passengerListContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  passengerListHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  passengerListRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 2,
  },
  passengerNameText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
    flex: 1,
  },
  pBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pBadgeActive: {
    backgroundColor: "#E8F5E9",
  },
  pBadgeCancelled: {
    backgroundColor: "#FFEBEE",
  },
  pBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  pBadgeTextActive: {
    color: "#2E7D32",
  },
  pBadgeTextCancelled: {
    color: "#C62828",
  },
  ticketBody: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailBusNoText: {
    fontSize: 13,
    fontWeight: "750",
    color: "#1F2937",
  },
  timeEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  timeLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  pickupTimeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#16A34A",
  },
  dropTimeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#E53935",
  },
  detailDateText: {
    fontSize: 13,
    fontWeight: "650",
    color: "#374151",
  },
  referenceText: {
    fontSize: 12.5,
    fontWeight: "650",
    color: "#6B7280",
    marginTop: 8,
  },
  passengerSection: {
    marginTop: 12,
  },
  passengerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  passengerNameDetail: {
    fontSize: 13,
    fontWeight: "750",
    color: "#1F2937",
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  statusLabelText: {
    fontSize: 13,
    fontWeight: "750",
    color: "#4B5563",
    marginRight: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: "#757575",
    fontWeight: "650",
  },
  ctaButton: {
    backgroundColor: "#EEEEEE",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  ctaText: {
    color: "#757575",
    fontWeight: "800",
    fontSize: 12,
  },
  ctaCancelButton: {
    backgroundColor: "#FEF2F2",
  },
  ctaCancelText: {
    color: "#B71C1C",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 48,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121",
    marginBottom: 6,
  },
  emptyMessage: {
    textAlign: "center",
    color: "#757575",
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubTitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 16,
  },
  cancelTypeWrap: {
    gap: 8,
    marginBottom: 16,
  },
  typeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  activeTypeBtn: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  activeTypeBtnText: {
    color: "#B71C1C",
  },
  passengerSelectBox: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  passengerCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  passengerCheckText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  reasonInputBox: {
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#FAFAFA",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  modalConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#DC2626",
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
