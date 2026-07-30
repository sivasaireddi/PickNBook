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
import { Ionicons } from "@expo/vector-icons";

const formatCurrency = (value = 0) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

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
  const {
    hotel = {},
    selectedOffer = {},
    bookingResult = {},
    searchContext = {},
    appliedCoupon = "",
    couponDiscount = 0,
  } = route?.params || {};

  const booking = useMemo(() => {
    const result = bookingResult || {};
    const offer = selectedOffer || {};
    const h = hotel || {};

    return {
      bookingId: result.bookingId || result.id || `HT-${Date.now()}`,
      bookingReference: result.bookingReference || result.reference || result.bookingId || `REF-${Date.now().toString().slice(-6)}`,
      hotelName: result.hotelName || h.name || "Hotel Stay",
      guestName: result.guestName || "Guest",
      checkIn: result.checkInDate || result.checkIn || offer.checkInDate || searchContext.checkInDate || "N/A",
      checkOut: result.checkOutDate || result.checkOut || offer.checkOutDate || searchContext.checkOutDate || "N/A",
      roomCategory: result.roomCategory || offer.roomCategory || "Standard Room",
      status: result.status || "Confirmed",
      providerBookingId: result.providerBookingId || result.bookingReference || result.bookingId || "N/A",
    };
  }, [bookingResult, selectedOffer, hotel, searchContext]);

  const pricing = useMemo(() => {
    const base = Number(selectedOffer?.price || 0);
    const gst = Math.round(base * 0.12);
    const fee = 150;
    const discount = Number(couponDiscount) || 0;
    const total = Math.max(0, base + gst + fee - discount);
    return { base, gst, fee, discount, total };
  }, [selectedOffer, couponDiscount]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#B71C1C", "#E53935"]}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.statusText}>{booking.status}</Text>
          </View>
          <Text style={styles.bookingId}>ID: {booking.bookingId}</Text>
        </View>

        <Text style={styles.heroTitle}>Booking Confirmed!</Text>
        <Text style={styles.heroSubtitle}>
          Your hotel booking is confirmed. Below are the details of your stay.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hotel Details */}
        <InfoCard
          title="Hotel Information"
          icon={<Ionicons name="business-outline" size={20} color="#E53935" />}
        >
          <Row label="Hotel Name" value={booking.hotelName} />
          <Row label="Room Category" value={booking.roomCategory} />
          <Row label="Check-in Date" value={booking.checkIn} />
          <Row label="Check-out Date" value={booking.checkOut} />
        </InfoCard>

        {/* Guest Details */}
        <InfoCard
          title="Guest Details"
          icon={<Ionicons name="person-outline" size={20} color="#E53935" />}
        >
          <Row label="Primary Guest" value={booking.guestName} />
        </InfoCard>

        {/* Booking Details */}
        <InfoCard
          title="Reference & Codes"
          icon={<Ionicons name="receipt-outline" size={20} color="#E53935" />}
        >
          <Row label="Booking Reference" value={booking.bookingReference} />
          <Row label="Provider Booking ID" value={booking.providerBookingId} />
          {appliedCoupon ? <Row label="Applied Coupon" value={appliedCoupon} /> : null}
        </InfoCard>

        {/* Pricing Details */}
        <InfoCard
          title="Payment Details"
          icon={<Ionicons name="card-outline" size={20} color="#E53935" />}
        >
          <Row label="Room Charges" value={formatCurrency(pricing.base)} />
          <Row label="GST (12%)" value={formatCurrency(pricing.gst)} />
          <Row label="Convenience Fee" value={formatCurrency(pricing.fee)} />
          {pricing.discount > 0 ? (
            <Row label="Coupon Discount" value={`-${formatCurrency(pricing.discount)}`} />
          ) : null}
          <View style={styles.divider} />
          <Row label="Grand Total Paid" value={formatCurrency(pricing.total)} />
        </InfoCard>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.bookingsButton}
            onPress={() => navigation.navigate("DashBoard", { screen: "Bookings" })}
            activeOpacity={0.85}
          >
            <Text style={styles.bookingsButtonText}>View My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate("DashBoard", { screen: "Hotels" })}
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
    backgroundColor: "#FFFFFF",
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
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
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
    color: "#FFFFFF",
    fontWeight: "750",
    fontSize: 12,
  },
  heroTitle: {
    marginTop: 16,
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "950",
  },
  heroSubtitle: {
    marginTop: 6,
    color: "#FFEBEE",
    lineHeight: 18,
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
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
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "850",
    color: "#212121",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  label: {
    flex: 1.2,
    color: "#757575",
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    flex: 1.8,
    color: "#212121",
    fontSize: 13,
    fontWeight: "750",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 10,
  },
  actionsContainer: {
    marginTop: 8,
    gap: 12,
  },
  bookingsButton: {
    backgroundColor: "#E53935",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E53935",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  bookingsButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  homeButton: {
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E53935",
  },
  homeButtonText: {
    color: "#E53935",
    fontSize: 15,
    fontWeight: "800",
  },
});
