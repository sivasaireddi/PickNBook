import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SeatHeader from "./components/SeatHeader";
import Legend from "./components/Legend";
import PassengerBadge from "./components/PassengerBadge";
import SeatMap from "./components/SeatMap";
import BottomSummary from "./components/BottomSummary";
import { writeFlightBookingFlowState, readFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { getFlightSeatMap, getFlightSSR, getFlightFareRule } from "./services/flightBookingService";
import { formatCurrency, parseSrdvSeatMap } from "./utils/seatMapUtils";
import { SEAT_STATUS } from "./constants/seatMapConstants";
import FareRuleModal from "./components/FareRuleModal";

const TEXT = "#0F172A";
const MUTED = "#64748B";
const PRIMARY_RED = "#E53935";

function parsePassengers(flowState) {
  return Array.isArray(flowState.passengers) ? flowState.passengers : [];
}

function extractBaggageOptions(data) {
  if (!data) return [];
  const resObj = data?.Response || data?.Results || data;
  let raw = resObj?.Baggage || resObj?.Results?.Baggage || data?.Baggage;
  if (Array.isArray(raw?.[0])) return raw[0];
  if (Array.isArray(raw)) return raw;
  return [];
}

function extractMealOptions(data) {
  if (!data) return [];
  const resObj = data?.Response || data?.Results || data;
  let raw = resObj?.MealDynamic || resObj?.Meal || resObj?.Results?.MealDynamic || data?.MealDynamic;
  if (Array.isArray(raw?.[0])) return raw[0];
  if (Array.isArray(raw)) return raw;
  return [];
}

export default function FlightSeatSelectionScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const routeParams = route?.params || {};
  const [currentFlowState, setCurrentFlowState] = useState(routeParams);

  useEffect(() => {
    (async () => {
      const stored = await readFlightBookingFlowState();
      if (stored) {
        setCurrentFlowState((prev) => ({
          ...stored,
          ...prev,
          traceId: prev.traceId || prev.flight?.traceId || stored.traceId || stored.flight?.traceId,
          resultIndex: prev.resultIndex || prev.flight?.resultIndex || stored.resultIndex || stored.flight?.resultIndex,
          srdvType: prev.srdvType || prev.flight?.srdvType || stored.srdvType || stored.flight?.srdvType || "MixAPI",
          srdvIndex: prev.srdvIndex || prev.flight?.srdvIndex || stored.srdvIndex || stored.flight?.srdvIndex || "2",
        }));
      }
    })();
  }, []);

  const flowState = useMemo(() => ({ ...currentFlowState, ...routeParams }), [currentFlowState, routeParams]);
  const passengers = parsePassengers(flowState);
  const passengerCount = Math.max(1, passengers.length || 1);

  const traceId = flowState.traceId || flowState.flight?.traceId || routeParams.traceId || routeParams.flight?.traceId;
  const resultIndex = flowState.resultIndex || flowState.flight?.resultIndex || routeParams.resultIndex || routeParams.flight?.resultIndex;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seatNotApplicable, setSeatNotApplicable] = useState(false);
  const [srdvSeatData, setSrdvSeatData] = useState(null);

  // SSR States
  const [ssrExpanded, setSsrExpanded] = useState(false);
  const [ssrLoading, setSsrLoading] = useState(false);
  const [ssrData, setSsrData] = useState(null);
  const [ssrError, setSsrError] = useState(null);
  const [selectedSsrBaggage, setSelectedSsrBaggage] = useState(null);
  const [selectedSsrMeal, setSelectedSsrMeal] = useState(null);

  const initialSeatLabels = Array.isArray(flowState.selectedSeatLabels)
    ? flowState.selectedSeatLabels
    : [];

  const [selectedSeatLabels, setSelectedSeatLabels] = useState(() => {
    const arr = Array(passengerCount).fill("");
    initialSeatLabels.forEach((label, idx) => {
      if (idx < passengerCount) arr[idx] = label;
    });
    return arr;
  });

  const [activePassengerIndex, setActivePassengerIndex] = useState(0);

  const activeSeatsList = useMemo(() => selectedSeatLabels.filter(Boolean), [selectedSeatLabels]);

  const loadSeatMap = useCallback(async () => {
    if (flowState.fareQuote?.SeatSelectAllowed === false || flowState.flight?.SeatSelectAllowed === false) {
      setSeatNotApplicable(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSeatNotApplicable(false);

    try {
      if (!traceId || !resultIndex) {
        throw new Error("Session trace ID or flight result index missing. Please re-select flight.");
      }
      const data = await getFlightSeatMap({ traceId, resultIndex });
      setSrdvSeatData(data);
    } catch (err) {
      const msg = String(err?.message || "");
      console.log("[FlightSeatSelectionScreen] Seat map not provided by supplier for this flight:", msg);
      // Fallback: If supplier does not provide seat map for this trace/flight, mark as auto-assigned by airline
      setSeatNotApplicable(true);
    } finally {
      setLoading(false);
    }
  }, [traceId, resultIndex, flowState.fareQuote?.SeatSelectAllowed, flowState.flight?.SeatSelectAllowed]);

  const handleToggleSSR = useCallback(async () => {
    const nextState = !ssrExpanded;
    setSsrExpanded(nextState);

    if (nextState && !ssrData && !ssrLoading) {
      setSsrLoading(true);
      setSsrError(null);
      console.log("[FlightSeatSelectionScreen] User clicked SSR. Invoking /api/flight/srdv/SSR with:", {
        traceId,
        resultIndex,
        srdvType: flowState.srdvType || flowState.flight?.srdvType,
        srdvIndex: flowState.srdvIndex || flowState.flight?.srdvIndex,
      });

      try {
        const data = await getFlightSSR({
          traceId,
          resultIndex,
          srdvType: flowState.srdvType || flowState.flight?.srdvType,
          srdvIndex: flowState.srdvIndex || flowState.flight?.srdvIndex,
        });
        console.log("[FlightSeatSelectionScreen] SSR API raw response received:", JSON.stringify(data, null, 2));
        setSsrData(data);
      } catch (err) {
        console.log("[FlightSeatSelectionScreen] SSR API not available for this flight:", err?.message);
        setSsrError("No extra baggage or meal services are available for this flight.");
      } finally {
        setSsrLoading(false);
      }
    }
  }, [ssrExpanded, ssrData, ssrLoading, traceId, resultIndex, flowState]);

  useEffect(() => {
    loadSeatMap();
  }, [loadSeatMap]);

  const seatMap = useMemo(() => {
    return parseSrdvSeatMap(srdvSeatData, activeSeatsList);
  }, [srdvSeatData, activeSeatsList]);

  const selectedSeats = useMemo(() => {
    const map = new Map();
    seatMap.forEach((seat) => map.set(seat.seatNumber, seat));
    return activeSeatsList.map((label) => map.get(label)).filter(Boolean);
  }, [seatMap, activeSeatsList]);

  const baseFare = Number(flowState.fareSummary?.baseFare || flowState.flight?.selectedTravelClassPriceInr || flowState.flight?.fare || 0);
  const taxes = Number(flowState.fareSummary?.tax || 0);
  const seatCharges = selectedSeats.reduce((sum, seat) => sum + Number(seat?.price || 0), 0);
  const ssrCharges = Number(selectedSsrBaggage?.Price || selectedSsrBaggage?.Amount || 0) + Number(selectedSsrMeal?.Price || selectedSsrMeal?.Amount || 0);
  const total = Math.max(0, baseFare + taxes + seatCharges + ssrCharges);

  const toggleSeat = useCallback((seat) => {
    if (!seat || [SEAT_STATUS.BOOKED, SEAT_STATUS.BLOCKED, SEAT_STATUS.UNAVAILABLE].includes(seat.status)) {
      return;
    }

    const seatLabel = seat.seatNumber;

    setSelectedSeatLabels((prev) => {
      const next = [...prev];
      const existingIdx = next.indexOf(seatLabel);
      if (existingIdx !== -1) {
        next[existingIdx] = "";
        return next;
      }

      next[activePassengerIndex] = seatLabel;

      setTimeout(() => {
        const nextEmpty = next.findIndex(s => s === "");
        if (nextEmpty !== -1) {
          setActivePassengerIndex(nextEmpty);
        }
      }, 50);

      return next;
    });
  }, [activePassengerIndex]);

  const handleContinue = useCallback(async () => {
    if (!seatNotApplicable && activeSeatsList.length !== passengerCount) {
      return;
    }

    const passengerSeatMap = passengers.map((passenger, index) => ({
      passengerId: passenger.id ?? index + 1,
      passengerName: passenger.name || passenger.fullName || (passenger.firstName && passenger.lastName ? `${passenger.firstName} ${passenger.lastName}` : `Passenger ${index + 1}`),
      seatNumber: selectedSeatLabels[index] || "",
    }));

    console.log("\n==========================================");
    console.log("✈️ [FLIGHT BOOKING FLOW - STEP 4: SEAT & SSR SELECTION]");
    console.log("[FlightSeatSelectionScreen] Selected seats:", activeSeatsList);
    console.log("[FlightSeatSelectionScreen] Seat Surcharge:", seatCharges);
    console.log("[FlightSeatSelectionScreen] Selected Baggage SSR:", selectedSsrBaggage);
    console.log("[FlightSeatSelectionScreen] Selected Meal SSR:", selectedSsrMeal);
    console.log("[FlightSeatSelectionScreen] Total Payable Amount:", total);
    console.log("==========================================\n");

    const nextState = await writeFlightBookingFlowState({
      ...flowState,
      selectedSeatLabels: activeSeatsList,
      selectedSeats: selectedSeats.map((seat) => ({
        id: seat.id,
        label: seat.seatNumber,
        seatNumber: seat.seatNumber,
        rawCode: seat.rawCode || seat.seatNumber,
        rawSeat: seat.rawSeat || { Code: seat.rawCode || seat.seatNumber, SeatNo: seat.seatNumber },
        type: seat.type,
        price: seat.price,
        status: seat.status,
      })),
      seatCharges,
      ssrDetails: {
        baggage: selectedSsrBaggage,
        meal: selectedSsrMeal,
        ssrCharges,
      },
      fareSummary: {
        ...(flowState.fareSummary || {}),
        baseFare,
        tax: taxes,
        seatSurcharge: seatCharges,
        ssrSurcharge: ssrCharges,
        totalFare: total,
      },
      passengerSeatMap,
      payableAmount: total,
    });

    console.log("[FlightSeatSelectionScreen] Navigating to FlightPaymentScreen");
    navigation.navigate("FlightPaymentScreen", nextState);
  }, [baseFare, flowState, navigation, passengerCount, passengers, seatCharges, ssrCharges, activeSeatsList, selectedSeatLabels, selectedSeats, selectedSsrBaggage, selectedSsrMeal, taxes, total, seatNotApplicable]);

  const remainingCount = seatNotApplicable ? 0 : Math.max(0, passengerCount - activeSeatsList.length);
  const baggageOptions = extractBaggageOptions(ssrData);
  const mealOptions = extractMealOptions(ssrData);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View style={styles.headerNav}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <SeatHeader title="Seat & Extras Selection" subtitle="Select seats and optional baggage/meals" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.container, width >= 768 && styles.containerWide]}>
          
          {/* Passenger Badges */}
          {!seatNotApplicable && (
            <View style={styles.paxScrollContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.passengerScroll}>
                {passengers.map((passenger, index) => {
                  const seatLabel = selectedSeatLabels[index] || "";
                  const nameDisplay = passenger.name || passenger.fullName || (passenger.firstName && passenger.lastName ? `${passenger.firstName} ${passenger.lastName}` : `Passenger ${index + 1}`);
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.85}
                      onPress={() => setActivePassengerIndex(index)}
                    >
                      <PassengerBadge
                        index={index}
                        label={nameDisplay}
                        seatNumber={seatLabel}
                        isActive={index === activePassengerIndex}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Instruction / Not Applicable Text */}
          {!seatNotApplicable && (
            <View style={styles.instructionBanner}>
              <Text style={styles.instructionText}>
                {remainingCount > 0
                  ? `Assigning seat for Passenger ${activePassengerIndex + 1} (Choose ${remainingCount} more)`
                  : "All passengers assigned! Tap continue to proceed."}
              </Text>
            </View>
          )}

          {/* Seat Map Loading / Error / Not Applicable / Content */}
          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={PRIMARY_RED} />
              <Text style={styles.stateText}>Loading live seat map from API...</Text>
            </View>
          ) : seatNotApplicable ? (
            <View style={styles.notApplicableCard}>
              <Ionicons name="information-circle-outline" size={36} color="#2563EB" />
              <Text style={styles.notApplicableTitle}>Auto-Assigned Seating</Text>
              <Text style={styles.notApplicableText}>
                Seat selection is not applicable for this flight itinerary. Seats will be automatically assigned by the airline at check-in free of charge.
              </Text>
            </View>
          ) : error ? (
            <View style={styles.stateCard}>
              <Ionicons name="alert-circle-outline" size={32} color={PRIMARY_RED} />
              <Text style={styles.errorText}>Seat Map Error</Text>
              <Text style={styles.errorSubText}>{error}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <TouchableOpacity activeOpacity={0.8} onPress={loadSeatMap} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={handleProceed} style={[styles.retryBtn, { backgroundColor: "#2563EB" }]}>
                  <Text style={styles.retryBtnText}>Skip Seats & Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.legendWrap}>
                <Legend />
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.cabinScrollContainer}
              >
                <View style={styles.cabinWrap}>
                  <SeatMap
                    seatMap={seatMap}
                    onSeatPress={toggleSeat}
                  />
                </View>
              </ScrollView>
            </>
          )}

          {/* SSR Special Services Section (Extra Baggage / Meals) */}
          <View style={styles.ssrSection}>
            <TouchableOpacity 
              activeOpacity={0.75} 
              onPress={handleToggleSSR} 
              style={styles.ssrHeaderBtn}
            >
              <View style={styles.ssrHeaderLeft}>
                <Ionicons name="fast-food-outline" size={20} color={PRIMARY_RED} />
                <Text style={styles.ssrSectionTitle}>Extra Baggage & Meal Services (SSR)</Text>
              </View>
              <Ionicons 
                name={ssrExpanded ? "chevron-up" : "chevron-down"} 
                size={22} 
                color="#0F172A" 
              />
            </TouchableOpacity>

            {ssrExpanded && (
              <View style={styles.ssrBody}>
                {ssrLoading ? (
                  <View style={styles.ssrLoadingRow}>
                    <ActivityIndicator size="small" color={PRIMARY_RED} />
                    <Text style={styles.ssrLoadingText}>Fetching live SSR baggage & meal options...</Text>
                  </View>
                ) : ssrError ? (
                  <View style={styles.ssrErrorRow}>
                    <Text style={styles.ssrErrorText}>{ssrError}</Text>
                    <TouchableOpacity onPress={handleToggleSSR} style={styles.ssrRetryBtn}>
                      <Text style={styles.ssrRetryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Baggage Options */}
                    {baggageOptions.length > 0 && (
                      <View style={styles.ssrBlock}>
                        <Text style={styles.ssrBlockLabel}>Extra Baggage Allowance</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ssrOptionsRow}>
                          {baggageOptions.map((bag, idx) => {
                            const selected = selectedSsrBaggage?.Code === bag.Code;
                            return (
                              <TouchableOpacity 
                                key={idx} 
                                onPress={() => setSelectedSsrBaggage(selected ? null : bag)} 
                                style={[styles.ssrChip, selected && styles.ssrChipActive]}
                              >
                                <Text style={[styles.ssrChipText, selected && styles.ssrChipTextActive]}>
                                  {bag.Weight ? `${bag.Weight} KG` : bag.Description || bag.Code}
                                </Text>
                                <Text style={styles.ssrChipPrice}>{formatCurrency(bag.Price || bag.Amount || 0)}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    {/* Meal Options */}
                    {mealOptions.length > 0 && (
                      <View style={styles.ssrBlock}>
                        <Text style={styles.ssrBlockLabel}>In-Flight Meal Options</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ssrOptionsRow}>
                          {mealOptions.map((meal, idx) => {
                            const selected = selectedSsrMeal?.Code === meal.Code;
                            return (
                              <TouchableOpacity 
                                key={idx} 
                                onPress={() => setSelectedSsrMeal(selected ? null : meal)} 
                                style={[styles.ssrChip, selected && styles.ssrChipActive]}
                              >
                                <Text style={[styles.ssrChipText, selected && styles.ssrChipTextActive]}>
                                  {meal.Description || meal.Code || `Meal ${idx + 1}`}
                                </Text>
                                <Text style={styles.ssrChipPrice}>{formatCurrency(meal.Price || meal.Amount || 0)}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    {baggageOptions.length === 0 && mealOptions.length === 0 && (
                      <Text style={styles.ssrEmptyText}>No extra baggage or meal options available for this flight.</Text>
                    )}
                  </>
                )}
              </View>
            )}
          </View>

        </View>
      </ScrollView>

      {/* Sticky Bottom Summary Card */}
      <View style={styles.bottomDock}>
        <BottomSummary
          selectedSeats={activeSeatsList}
          seatCharges={seatCharges + ssrCharges}
          baseFare={baseFare}
          taxes={taxes}
          total={total}
          onContinue={handleContinue}
          disabled={(!seatNotApplicable && activeSeatsList.length !== passengerCount) || loading || Boolean(error)}
          remainingCount={remainingCount}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  headerNav: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderColor: "#E2E8F0", gap: 8 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingVertical: 4, paddingRight: 12 },
  backText: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  scrollContent: { flexGrow: 1, padding: 16 },
  container: { gap: 16 },
  containerWide: { maxWidth: 768, alignSelf: "center", width: "100%" },
  fareRuleBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5" },
  fareRuleBtnText: { fontSize: 12, fontWeight: "700", color: PRIMARY_RED },
  legendWrap: { marginVertical: 4 },
  paxScrollContainer: { marginVertical: 4 },
  passengerScroll: { gap: 8 },
  instructionBanner: { backgroundColor: "#EFF6FF", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#BFDBFE" },
  instructionText: { fontSize: 12, fontWeight: "700", color: "#1D4ED8", textAlign: "center" },
  cabinScrollContainer: { width: "100%", alignItems: "center" },
  cabinWrap: { width: "100%" },
  bottomDock: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderColor: "#E2E8F0" },
  stateCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 24, alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0", marginVertical: 16 },
  stateText: { fontSize: 13, fontWeight: "600", color: MUTED },
  errorText: { fontSize: 16, fontWeight: "800", color: PRIMARY_RED },
  errorSubText: { fontSize: 12, color: MUTED, textAlign: "center" },
  retryBtn: { marginTop: 8, backgroundColor: PRIMARY_RED, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  notApplicableCard: { backgroundColor: "#EFF6FF", borderRadius: 12, padding: 24, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#BFDBFE", marginVertical: 16 },
  notApplicableTitle: { fontSize: 16, fontWeight: "800", color: "#1D4ED8" },
  notApplicableText: { fontSize: 13, color: "#3B82F6", textAlign: "center", lineHeight: 18 },
  ssrSection: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", gap: 10 },
  ssrHeaderBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ssrHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  ssrSectionTitle: { fontSize: 14, fontWeight: "800", color: TEXT },
  ssrBody: { marginTop: 8, gap: 12 },
  ssrLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  ssrLoadingText: { fontSize: 12, color: MUTED },
  ssrErrorRow: { gap: 6, alignItems: "flex-start" },
  ssrErrorText: { fontSize: 12, color: PRIMARY_RED },
  ssrRetryBtn: { backgroundColor: "#FEF2F2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  ssrRetryText: { fontSize: 11, fontWeight: "700", color: PRIMARY_RED },
  ssrBlock: { gap: 6 },
  ssrBlockLabel: { fontSize: 12, fontWeight: "600", color: MUTED },
  ssrOptionsRow: { gap: 8, paddingVertical: 4 },
  ssrChip: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F8FAFC", alignItems: "center" },
  ssrChipActive: { borderColor: PRIMARY_RED, backgroundColor: "#FEF2F2" },
  ssrChipText: { fontSize: 12, fontWeight: "700", color: TEXT },
  ssrChipTextActive: { color: PRIMARY_RED },
  ssrChipPrice: { fontSize: 10, color: MUTED, marginTop: 2 },
  ssrEmptyText: { fontSize: 12, color: MUTED, fontStyle: "italic", paddingVertical: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  modalBody: { marginTop: 8 },
  ruleText: { fontSize: 12, color: TEXT, lineHeight: 18 },
});
