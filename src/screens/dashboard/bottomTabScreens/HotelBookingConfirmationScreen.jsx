import React, { useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useHotelBooking } from "../../../context/HotelBookingContext";

const formatCurrency = (value = 0) => {
  const num = Number(value || 0);
  return `₹ ${num.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

function InfoCard({ title, icon, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>{icon}</View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "--"}</Text>
    </View>
  );
}

export default function HotelBookingConfirmationScreen({ route, navigation }) {
  const { clearSession } = useHotelBooking();
  const { bookingResult = {} } = route?.params || {};

  // Clear booking session state on mount to prevent trace ID reuse
  useEffect(() => {
    return () => {
      clearSession();
    };
  }, []);

  const confirmationNo = String(bookingResult.confirmationNo || bookingResult.bookingId || "N/A");
  const bookingRefNo = String(bookingResult.bookingRefNo || bookingResult.bookingReference || confirmationNo);
  const status = String(bookingResult.status || "Confirmed");
  const hotelName = String(bookingResult.hotelName || "Hotel Reservation");
  const guestName = String(bookingResult.guestName || "Guest");
  const checkIn = String(bookingResult.checkInDate || "N/A");
  const checkOut = String(bookingResult.checkOutDate || "N/A");
  const totalPaidAmount = Number(
    bookingResult.fareBreakdown?.totalPaid ??
      bookingResult.fareBreakdown?.totalPaidAmount ??
      bookingResult.fareBreakdown?.totalPrice ??
      bookingResult.fareBreakdown?.baseFare ??
      0
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.statusText}>{status}</Text>
          </View>
          <Text style={styles.bookingId}>Ref: {bookingRefNo}</Text>
        </View>

        <Text style={styles.heroTitle}>Booking Confirmed!</Text>
        <Text style={styles.heroSubtitle}>
          Your hotel room reservation has been officially confirmed by supplier.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hotel Details */}
        <InfoCard
          title="Hotel Information"
          icon={<Ionicons name="business-outline" size={20} color="#EF4444" />}
        >
          <Row label="Hotel Name" value={hotelName} />
          <Row label="Check-in Date" value={checkIn} />
          <Row label="Check-out Date" value={checkOut} />
        </InfoCard>

        {/* Guest Details */}
        <InfoCard
          title="Guest Details"
          icon={<Ionicons name="person-outline" size={20} color="#EF4444" />}
        >
          <Row label="Lead Guest" value={guestName} />
        </InfoCard>

        {/* Booking Reference Codes */}
        <InfoCard
          title="Authoritative References"
          icon={<Ionicons name="receipt-outline" size={20} color="#EF4444" />}
        >
          <Row label="Confirmation No" value={confirmationNo} />
          <Row label="Booking Ref No" value={bookingRefNo} />
          <Row label="Booking Status" value={status} />
        </InfoCard>

        {/* Payment Summary */}
        <InfoCard
          title="Payment Details"
          icon={<Ionicons name="card-outline" size={20} color="#EF4444" />}
        >
          <Row label="Total Paid Amount" value={formatCurrency(totalPaidAmount)} />
        </InfoCard>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.bookingsButton}
            onPress={() => {
              clearSession();
              navigation.navigate("DashBoard", { screen: "Bookings" });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.bookingsButtonText}>View My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => {
              clearSession();
              navigation.navigate("DashBoard", { screen: "Hotels" });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.homeButtonText}>Back to Hotels Search</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  hero: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  bookingId: {
    color: "#94A3B8",
    fontWeight: "750",
    fontSize: 12,
  },
  heroTitle: {
    marginTop: 16,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 6,
    color: "#94A3B8",
    lineHeight: 18,
    fontSize: 13,
    fontWeight: "500",
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  label: {
    flex: 1,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    flex: 1.5,
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "750",
    textAlign: "right",
  },
  actionsContainer: {
    marginTop: 8,
    gap: 10,
  },
  bookingsButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingsButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  homeButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  homeButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
});
