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

  useEffect(() => {
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
    Alert.alert("E-Ticket Download", "Your ticket PDF is downloading. PNR: " + (flowState.pnr || "N/A"));
  };

  const handleEmail = () => {
    Alert.alert("E-Ticket Sent", "E-Ticket has been successfully emailed to " + (flowState.contact?.email || "your email"));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, width >= 768 && styles.containerWide]}>
          
          {/* Animated Success Badge */}
          <View style={styles.successBadgeWrap}>
            <Animated.View style={[styles.circleBadge, { transform: [{ scale: checkmarkScale }] }]}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </Animated.View>
            <Text style={styles.successHeading}>Booking Confirmed!</Text>
            <Text style={styles.successSubtext}>Your flight tickets have been reserved successfully.</Text>
          </View>

          {/* Reference block */}
          <Animated.View style={[styles.card, { opacity: opacityAnim }, styles.refCard]}>
            <View style={styles.refCol}>
              <Text style={styles.refLabel}>BOOKING REF</Text>
              <Text style={styles.refVal}>{flowState.bookingReference || "FL-87290192"}</Text>
            </View>
            <View style={styles.refLine} />
            <View style={styles.refCol}>
              <Text style={styles.refLabel}>AIRLINE PNR</Text>
              <Text style={styles.refVal}>{flowState.pnr || "PNR-W8R90D"}</Text>
            </View>
          </Animated.View>

          {/* Itinerary Details */}
          <Animated.View style={[styles.card, { opacity: opacityAnim }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="airplane" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Itinerary Details</Text>
            </View>

            <View style={styles.itinerarySummary}>
              <Text style={styles.airline}>{flowState.flight?.airline || "Air India"}</Text>
              <Text style={styles.flightMeta}>
                Flight: {flowState.flight?.flightNumber || "AI-802"} • {flowState.selectedTravelClass || "Economy"}
              </Text>
              
              <View style={styles.citiesRow}>
                <View>
                  <Text style={styles.cityName}>{flowState.flight?.fromCity || "Delhi"}</Text>
                  <Text style={styles.citySub}>{flowState.searchContext?.date || "15 Jul 2026"}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={PRIMARY_RED} />
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.cityName}>{flowState.flight?.toCity || "Mumbai"}</Text>
                  <Text style={styles.citySub}>{flowState.searchContext?.date || "15 Jul 2026"}</Text>
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
                {formatCurrency(flowState.payableAmount || 5208)}
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
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  itinerarySummary: {
    paddingTop: 4,
    gap: 4,
  },
  airline: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  flightMeta: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  citiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cityName: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  citySub: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginTop: 2,
  },
  passengerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  passengerName: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  seatNum: {
    fontSize: 12,
    fontWeight: "900",
    color: PRIMARY_RED,
  },
  paymentSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  paymentVal: {
    fontSize: 16,
    fontWeight: "950",
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
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionBtnOutline: {
    borderWidth: 1.2,
    borderColor: PRIMARY_RED,
    backgroundColor: WHITE,
  },
  actionBtnOutlineText: {
    color: PRIMARY_RED,
    fontSize: 13,
    fontWeight: "800",
  },
  homeBtn: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_RED,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  homeBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },
});
