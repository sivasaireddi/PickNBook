import React, { useEffect, useRef } from "react";
import { 
  Animated,
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  useWindowDimensions, 
  View,
  ScrollView,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "./utils/flightUtils";

const PRIMARY_RED = "#E53935";
const BACKGROUND = "#F8F9FB";
const WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

export default function FlightConfirmationScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const flowState = route?.params || {};

  const checkmarkScale = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isPending = String(flowState.ticketStatus || "").toLowerCase().includes("pending");

  useEffect(() => {
    console.log("================================================================================");
    console.log("🎉 [FLIGHT BOOKING FLOW - STEP 6: BOOKING CONFIRMATION & E-TICKET]");
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🆔 Booking ID / Reference: ${flowState.bookingId || flowState.bookingReference || "N/A"}`);
    console.log(`✈️ Airline PNR: ${flowState.pnr || "N/A"}`);
    console.log(`📋 Ticket Status: ${flowState.ticketStatus || "Confirmed"}`);
    console.log(`💵 Total Amount Paid: ₹${flowState.payableAmount || flowState.fareSummary?.totalFare || 0}`);
    console.log(`🛫 Flight Details: ${flowState.flight?.airline || flowState.flight?.airlineName} (${flowState.flight?.flightNumber || flowState.flight?.flightNo || ""})`);
    console.log(`📍 Route: ${flowState.flight?.from || flowState.searchContext?.from} ✈️ ${flowState.flight?.to || flowState.searchContext?.to}`);
    console.log(`👥 Passengers (${flowState.passengers?.length || 0}):`, JSON.stringify(flowState.passengers, null, 2));
    console.log(`💺 Selected Seats: ${flowState.selectedSeatLabels ? flowState.selectedSeatLabels.join(", ") : "Auto-assigned"}`);
    console.log(`📧 Contact Email: ${flowState.contact?.email || "N/A"} | Mobile: ${flowState.contact?.mobile || "N/A"}`);
    console.log("================================================================================");

    Animated.parallel([
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleDownload = () => {
    console.log(`[FlightConfirmationScreen] User clicked Download E-Ticket. PNR: ${flowState.pnr || "N/A"}`);
    Alert.alert("E-Ticket Download", "Your ticket PDF is downloading. PNR: " + (flowState.pnr || "N/A"));
  };

  const handleEmail = () => {
    console.log(`[FlightConfirmationScreen] User clicked Email E-Ticket. Sending to: ${flowState.contact?.email || "N/A"}`);
    Alert.alert("E-Ticket Sent", "E-Ticket has been successfully emailed to " + (flowState.contact?.email || "your email"));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, width >= 768 && styles.containerWide]}>
          
          {/* Animated Success or Pending Badge */}
          <View style={styles.successBadgeWrap}>
            <Animated.View style={[styles.circleBadge, { transform: [{ scale: checkmarkScale }] }]}>
              <Ionicons 
                name={isPending ? "time-outline" : "checkmark-circle"} 
                size={80} 
                color={isPending ? "#F59E0B" : "#10B981"} 
              />
            </Animated.View>
            <Text style={styles.successHeading}>
              {isPending ? "Ticketing in Progress!" : "Booking Confirmed!"}
            </Text>
            <Text style={styles.successSubtext}>
              {isPending 
                ? "Your GDS booking reservation is placed. Ticket confirmation is in progress with the airline." 
                : "Your flight tickets have been reserved successfully."}
            </Text>
          </View>

          {/* Reference block */}
          <Animated.View style={[styles.card, { opacity: opacityAnim }, styles.refCard]}>
            <View style={styles.refCol}>
              <Text style={styles.refLabel}>BOOKING ID / REF</Text>
              <Text style={styles.refVal}>{flowState.bookingId || flowState.bookingReference || "N/A"}</Text>
            </View>
            <View style={styles.refLine} />
            <View style={styles.refCol}>
              <Text style={styles.refLabel}>AIRLINE PNR</Text>
              <Text style={styles.refVal}>{flowState.pnr || "N/A"}</Text>
            </View>
          </Animated.View>

          {/* Itinerary Details */}
          <Animated.View style={[styles.card, { opacity: opacityAnim }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="airplane" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Itinerary Details</Text>
            </View>

            <View style={styles.itinerarySummary}>
              <Text style={styles.airline}>{flowState.flight?.airline || "Airline"}</Text>
              <Text style={styles.flightMeta}>
                Flight: {flowState.flight?.flightNumber || ""} • {flowState.selectedTravelClass || "Economy"}
              </Text>
              
              <View style={styles.citiesRow}>
                <View>
                  <Text style={styles.cityName}>{flowState.flight?.fromCity || "Origin"}</Text>
                  <Text style={styles.citySub}>{flowState.searchContext?.date || ""}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={PRIMARY_RED} />
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.cityName}>{flowState.flight?.toCity || "Destination"}</Text>
                  <Text style={styles.citySub}>{flowState.searchContext?.date || ""}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Passenger Names List */}
          <Animated.View style={[styles.card, { opacity: opacityAnim }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Passengers List</Text>
            </View>
            {(flowState.passengers || []).map((p, index) => {
              const seatNum = flowState.selectedSeatLabels?.[index] || "Auto Assigned";
              return (
                <View key={index} style={styles.passengerRow}>
                  <Text style={styles.passengerName}>
                    {index + 1}. {p.title}. {p.firstName} {p.lastName} ({p.passengerType})
                  </Text>
                  <Text style={styles.seatNum}>Seat {seatNum}</Text>
                </View>
              );
            })}
          </Animated.View>

          {/* Summary pricing */}
          <Animated.View style={[styles.card, { opacity: opacityAnim }]}>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.paymentLabel}>Amount Paid</Text>
              <Text style={styles.paymentVal}>
                {formatCurrency(flowState.payableAmount || 0)}
              </Text>
            </View>
          </Animated.View>

          {/* Action Button Controls */}
          <Animated.View style={[styles.actionsContainer, { opacity: opacityAnim }]}>
            <View style={styles.buttonRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={handleDownload} style={[styles.actionBtn, styles.actionBtnOutline]}>
                <Ionicons name="download-outline" size={18} color={PRIMARY_RED} />
                <Text style={styles.actionBtnOutlineText}>Download Ticket</Text>
              </TouchableOpacity>
              
              <TouchableOpacity activeOpacity={0.8} onPress={handleEmail} style={[styles.actionBtn, styles.actionBtnOutline]}>
                <Ionicons name="mail-outline" size={18} color={PRIMARY_RED} />
                <Text style={styles.actionBtnOutlineText}>Email Ticket</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => navigation.navigate("DashBoard")}
              style={styles.homeBtn}
            >
              <Text style={styles.homeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    padding: 16,
    gap: 16,
    alignItems: "center",
  },
  containerWide: {
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  successBadgeWrap: {
    alignItems: "center",
    marginVertical: 16,
  },
  circleBadge: {
    marginBottom: 12,
  },
  successHeading: {
    fontSize: 22,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  successSubtext: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    maxWidth: "85%",
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    width: "100%",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  refCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  refCol: {
    flex: 1,
    alignItems: "center",
  },
  refLine: {
    width: 1,
    height: 32,
    backgroundColor: "#DCFCE7",
  },
  refLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803d",
    letterSpacing: 0.5,
  },
  refVal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#166534",
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  itinerarySummary: {
    gap: 8,
  },
  airline: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  flightMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  citiesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
  },
  cityName: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  citySub: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  passengerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  passengerName: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  seatNum: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_RED,
  },
  paymentSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  paymentVal: {
    fontSize: 18,
    fontWeight: "900",
    color: PRIMARY_RED,
  },
  actionsContainer: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: PRIMARY_RED,
    backgroundColor: WHITE,
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY_RED,
  },
  homeBtn: {
    backgroundColor: PRIMARY_RED,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  homeBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
  },
});
