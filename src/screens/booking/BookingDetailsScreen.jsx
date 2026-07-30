import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Sample booking object for integration, testing, and fallback shape reference.
export const SAMPLE_BOOKING_DATA = {
  bookingId: "PNR-20260617-4812",
  bookingDateTime: "2026-06-17T09:35:00.000Z",
  passenger: {
    name: "Aman Kumar",
    age: 29,
    gender: "Male",
    mobileNumber: "9876543210",
  },
  journey: {
    busName: "Volvo AC Sleeper",
    from: "Delhi",
    to: "Jaipur",
    travelDate: "2026-06-18",
    departureTime: "08:30 PM",
    arrivalTime: "02:15 AM",
  },
  seats: {
    selectedSeatNumbers: ["S1", "S2"],
    totalSeats: 2,
  },
  payment: {
    ticketFare: 1800,
    taxes: 180,
    totalAmountPaid: 1980,
    paymentStatus: "Success",
  },
};

const formatCurrency = (value = 0) =>
  `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatDate = (value) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
};

const normalizeBookingData = (route) => {
  const bookingDetails =
    route?.params?.bookingDetails ||
    route?.params?.bookingData ||
    null;

  if (!bookingDetails || typeof bookingDetails !== "object") {
    return null;
  }

  return {
    bookingId: bookingDetails.bookingId || bookingDetails.pnrNumber || "--",
    bookingDateTime:
      bookingDetails.bookingDateTime || bookingDetails.createdAt || "--",
    passenger: bookingDetails.passenger || {},
    journey: bookingDetails.journey || {},
    seats: bookingDetails.seats || {},
    payment: bookingDetails.payment || {},
  };
};

const InfoCard = ({ title, icon, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardIcon}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || "--"}</Text>
  </View>
);

const BookingDetailsScreen = ({ route, navigation }) => {
  // Only render booking content when valid booking data exists.
  const booking = useMemo(() => normalizeBookingData(route), [route]);

  const passenger = booking?.passenger || {};
  const journey = booking?.journey || {};
  const seats = booking?.seats || {};
  const payment = booking?.payment || {};
  const selectedSeats = Array.isArray(seats.selectedSeatNumbers)
    ? seats.selectedSeatNumbers
    : [];
  const hasValidBooking = Boolean(booking && booking.bookingId !== "--");

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#7F1D1D", "#DC2626", "#F97316"]}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.statusText}>
              {hasValidBooking ? "Payment Successful" : "Booking Data Missing"}
            </Text>
          </View>

          <Text style={styles.bookingId}>
            {hasValidBooking ? booking.bookingId : "--"}
          </Text>
        </View>

        <Text style={styles.heroTitle}>Booking Details</Text>
        <Text style={styles.heroSubtitle}>
          {hasValidBooking
            ? "Your booking has been confirmed. Keep this screen for reference."
            : "We could not read booking details from the payment flow."}
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {!hasValidBooking ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color="#DC2626"
            />
            <Text style={styles.emptyTitle}>Booking information unavailable</Text>
            <Text style={styles.emptyText}>
              Please return to Home and complete the booking again. The screen
              safely handles missing navigation params.
            </Text>
          </View>
        ) : (
          <>
            <InfoCard
              title="Passenger Details"
              icon={<Ionicons name="person-outline" size={20} color="#DC2626" />}
            >
              <Row label="Passenger Name" value={passenger.name} />
              <Row label="Age" value={String(passenger.age ?? "--")} />
              <Row label="Gender" value={passenger.gender} />
              <Row label="Mobile Number" value={passenger.mobileNumber} />
            </InfoCard>

            <InfoCard
              title="Journey Details"
              icon={<Ionicons name="bus-outline" size={20} color="#DC2626" />}
            >
              <Row label="Bus Name" value={journey.busName} />
              <Row
                label="Route"
                value={`${journey.from || "--"} -> ${journey.to || "--"}`}
              />
              <Row label="Travel Date" value={formatDate(journey.travelDate)} />
              <Row label="Departure Time" value={journey.departureTime} />
              <Row label="Arrival Time" value={journey.arrivalTime} />
            </InfoCard>

            <InfoCard
              title="Seat Details"
              icon={<Ionicons name="albums-outline" size={20} color="#DC2626" />}
            >
              <Row
                label="Selected Seat Numbers"
                value={selectedSeats.join(", ")}
              />
              <Row
                label="Total Seats"
                value={String(seats.totalSeats ?? selectedSeats.length ?? 0)}
              />
            </InfoCard>

            <InfoCard
              title="Payment Details"
              icon={<Ionicons name="card-outline" size={20} color="#DC2626" />}
            >
              <Row label="Ticket Fare" value={formatCurrency(payment.ticketFare)} />
              <Row label="Taxes" value={formatCurrency(payment.taxes)} />
              <Row
                label="Total Amount Paid"
                value={formatCurrency(payment.totalAmountPaid)}
              />
              <Row label="Payment Status" value={payment.paymentStatus || "Success"} />
            </InfoCard>

            <InfoCard
              title="Booking Information"
              icon={<Ionicons name="receipt-outline" size={20} color="#DC2626" />}
            >
              <Row label="Booking ID / PNR Number" value={booking.bookingId} />
              <Row
                label="Booking Date & Time"
                value={formatDateTime(booking.bookingDateTime)}
              />
            </InfoCard>

            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => navigation.navigate("DashBoard")}
              activeOpacity={0.9}
            >
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default BookingDetailsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  hero: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bookingId: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  heroTitle: {
    marginTop: 18,
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#FEE2E2",
    lineHeight: 20,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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
    borderRadius: 12,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  label: {
    flex: 1,
    color: "#64748B",
    fontSize: 13,
  },
  value: {
    flex: 1,
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  homeButton: {
    backgroundColor: "#DC2626",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#DC2626",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  homeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyText: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});
