import React, { useState } from "react";
import { 
  Alert, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  useWindowDimensions, 
  View,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { clearFlightBookingFlowState, writeFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { bookFlight } from "./services/flightBookingService";
import { formatCurrency } from "./utils/flightUtils";

const PRIMARY_RED = "#E53935";
const BACKGROUND = "#F8F9FB";
const WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

export default function FlightPaymentScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const flowState = route?.params || {};
  
  const [upiId, setUpiId] = useState("");
  const [card, setCard] = useState("");
  const [loading, setLoading] = useState(false);

  const baseFare = Number(flowState.fareSummary?.baseFare || flowState.flight?.selectedTravelClassPriceInr || 5208);
  const taxes = Number(flowState.fareSummary?.tax || Math.round(baseFare * 0.05));
  const seatSurcharge = Number(flowState.fareSummary?.seatSurcharge || 0);
  const convenienceFee = 150;
  const discount = Number(flowState.flight?.savings || 0);
  const totalFare = baseFare + taxes + seatSurcharge + convenienceFee - discount;

  const handlePay = async () => {
    if (!upiId.trim() && !String(card).replace(/\D/g, "").length) {
      Alert.alert("Payment Info Required", "Please enter either a UPI ID or credit/debit card details.");
      return;
    }

    const resolveCleanTravelClass = (travelClass) => {
      if (!travelClass || typeof travelClass !== "string") return "Economy";
      const clean = travelClass.toLowerCase();
      if (clean.includes("premium economy")) return "Premium Economy";
      if (clean.includes("premium business")) return "Premium Business";
      if (clean.includes("economy")) return "Economy";
      if (clean.includes("business")) return "Business";
      if (clean.includes("first")) return "First Class";
      return travelClass;
    };

    const mapPassengersForApi = (pList, seatLabels) => {
      return (Array.isArray(pList) ? pList : []).map((p, idx) => {
        const seat = seatLabels?.[idx] || "";
        const rawDob = p.dob || "";
        let cleanDob = rawDob;
        const match = String(rawDob).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
          cleanDob = `${match[3]}-${match[2]}-${match[1]}`;
        }
        return {
          fullName: `${p.title || ""} ${p.firstName || ""} ${p.lastName || ""}`
            .replace(/\s+/g, " ")
            .trim() || `Passenger ${idx + 1}`,
          passengerType: p.passengerType || "Adult",
          gender: p.gender || "Male",
          nationality: p.nationality || "Indian",
          ...(cleanDob ? { dob: cleanDob } : {}),
          ...(seat ? { seatNumber: seat } : {}),
        };
      });
    };

    const apiPassengers = mapPassengersForApi(flowState.passengers, flowState.selectedSeatLabels);
    const bookingPayload = {
      passengerName: apiPassengers[0]?.fullName || "Passenger",
      passengerPhone: String(flowState.contact?.mobile || "").trim(),
      passengerEmail: String(flowState.contact?.email || "").trim(),
      travelClass: resolveCleanTravelClass(flowState.selectedTravelClass || flowState.flight?.selectedTravelClass || "Economy"),
      passengers: apiPassengers,
      couponCode: flowState.couponCode || null,
      selectedFeaturedOfferId: flowState.selectedFeaturedOfferId || null,
    };

    setLoading(true);
    try {
      const flightId = flowState.flight?.id || "mock-flight-id";
      console.log("[FlightPaymentScreen] Requesting booking API", { flightId, bookingPayload });
      
      const response = await bookFlight(flightId, bookingPayload);
      console.log("[FlightPaymentScreen] API Booked successfully", response);

      const nextState = {
        ...flowState,
        bookingReference: response?.bookingReference || `FL-${Date.now().toString().slice(-8)}`,
        pnr: response?.pnr || `PNR-${Math.random().toString(36).substring(3, 9).toUpperCase()}`,
        payableAmount: totalFare,
      };

      await clearFlightBookingFlowState();
      navigation.navigate("FlightConfirmationScreen", nextState);
    } catch (error) {
      console.error("Flight Booking API Error:", error);
      Alert.alert(
        "Booking API Error",
        "Could not contact server to complete booking. Would you like to confirm with mock confirmation reference?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm Offline",
            onPress: async () => {
              const nextState = {
                ...flowState,
                bookingReference: `FL-MOCK-${Date.now().toString().slice(-6)}`,
                pnr: `PNR-MOCK-${Math.random().toString(36).substring(3, 9).toUpperCase()}`,
                payableAmount: totalFare,
              };
              await clearFlightBookingFlowState();
              navigation.navigate("FlightConfirmationScreen", nextState);
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Review & Payment</Text>
          <Text style={styles.headerSubtitle}>Step 4 of 4 • Final summary & pay</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.container, width >= 768 && styles.containerWide]}>
          
          {/* Flight Summary Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="airplane" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Itinerary Summary</Text>
            </View>
            <View style={styles.flightSummaryRow}>
              <View>
                <Text style={styles.airlineName}>{flowState.flight?.airline || "Air India"}</Text>
                <Text style={styles.flightNum}>{flowState.flight?.flightNumber || "AI-802"}</Text>
              </View>
              <View style={styles.routeCol}>
                <Text style={styles.routeText}>
                  {flowState.flight?.fromCity || "Delhi"} → {flowState.flight?.toCity || "Mumbai"}
                </Text>
                <Text style={styles.routeSubText}>
                  {flowState.searchContext?.date || "15 Jul 2026"} • {flowState.selectedTravelClass || "Economy"}
                </Text>
              </View>
            </View>
          </View>

          {/* Passenger Names & Seats Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Travelers & Seats</Text>
            </View>
            {(flowState.passengers || []).map((passenger, idx) => {
              const seatNum = flowState.selectedSeatLabels?.[idx] || flowState.selectedSeats?.[idx]?.label || "Auto Assigned";
              return (
                <View key={idx} style={styles.passengerRow}>
                  <Text style={styles.passengerName}>
                    {passenger.title}. {passenger.firstName} {passenger.lastName}
                  </Text>
                  <View style={styles.seatBadge}>
                    <Text style={styles.seatBadgeText}>Seat {seatNum}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Fare Breakdown Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Fare Details</Text>
            </View>

            <View style={styles.fareSummaryRow}>
              <Text style={styles.fareLabel}>Base Fare</Text>
              <Text style={styles.fareValue}>{formatCurrency(baseFare)}</Text>
            </View>

            <View style={styles.fareSummaryRow}>
              <Text style={styles.fareLabel}>Taxes & Airport Fees</Text>
              <Text style={styles.fareValue}>{formatCurrency(taxes)}</Text>
            </View>

            {seatSurcharge > 0 && (
              <View style={styles.fareSummaryRow}>
                <Text style={styles.fareLabel}>Seat Surcharges</Text>
                <Text style={styles.fareValue}>{formatCurrency(seatSurcharge)}</Text>
              </View>
            )}

            {discount > 0 && (
              <View style={styles.fareSummaryRow}>
                <Text style={[styles.fareLabel, styles.discountText]}>Promo Code Discount</Text>
                <Text style={[styles.fareValue, styles.discountText]}>-{formatCurrency(discount)}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.fareSummaryRow}>
              <Text style={styles.grandLabel}>Total Payable Amount</Text>
              <Text style={styles.grandValue}>{formatCurrency(totalFare)}</Text>
            </View>
          </View>

          {/* Payment Options Input */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="card" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Select Payment Method</Text>
            </View>

            {/* UPI Section */}
            <View style={styles.paymentInputBlock}>
              <Text style={styles.paymentInputLabel}>PAY VIA UPI ID</Text>
              <TextInput
                style={styles.input}
                value={upiId}
                onChangeText={(val) => {
                  setUpiId(val);
                  setCard("");
                }}
                placeholder="e.g. username@okaxis"
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.orDividerRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* Card Section */}
            <View style={styles.paymentInputBlock}>
              <Text style={styles.paymentInputLabel}>PAY VIA CREDIT/DEBIT CARD</Text>
              <TextInput
                style={styles.input}
                value={card}
                onChangeText={(val) => {
                  setCard(val);
                  setUpiId("");
                }}
                placeholder="XXXX XXXX XXXX XXXX"
                placeholderTextColor={TEXT_MUTED}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Pay Button */}
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={handlePay} 
            disabled={loading} 
            style={styles.payBtn}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color={WHITE} style={{ marginRight: 8 }} />
                <Text style={styles.payBtnText}>Pay Securely {formatCurrency(totalFare)}</Text>
              </>
            )}
          </TouchableOpacity>
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
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleWrap: {
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  headerSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginTop: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  containerWide: {
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  flightSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  airlineName: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  flightNum: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginTop: 1,
  },
  routeCol: {
    alignItems: "flex-end",
  },
  routeText: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  routeSubText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "650",
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
    fontWeight: "800",
    color: TEXT_DARK,
  },
  seatBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  seatBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY_RED,
  },
  fareSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  fareLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  fareValue: {
    fontSize: 12,
    color: TEXT_DARK,
    fontWeight: "800",
  },
  discountText: {
    color: "#059669",
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 6,
  },
  grandLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  grandValue: {
    fontSize: 16,
    fontWeight: "950",
    color: PRIMARY_RED,
  },
  paymentInputBlock: {
    gap: 6,
    marginTop: 4,
  },
  paymentInputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_DARK,
    fontSize: 13,
    fontWeight: "750",
  },
  orDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_MUTED,
  },
  payBtn: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: PRIMARY_RED,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  payBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },
});
