import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getFlightSeatMap, getFlightSSR } from "./services/flightBookingService";
import { formatCurrency, parseSrdvSeatMap } from "./utils/seatMapUtils";
import { SEAT_STATUS } from "./constants/seatMapConstants";

const TEXT = "#0F172A";
const MUTED = "#64748B";
const PRIMARY_RED = "#E53935";

function parsePassengers(flowState) {
  return Array.isArray(flowState.passengers) ? flowState.passengers : [];
}

function extractBaggageOptions(data, legIdx = 0) {
  if (!data) return [];
  const resObj = data?.Response || data?.Results || data;
  let raw = resObj?.Baggage || resObj?.Results?.Baggage || data?.Baggage || data?.data?.Baggage;

  if (Array.isArray(raw?.[legIdx])) return raw[legIdx];
  if (Array.isArray(raw?.[0]) && legIdx === 0) return raw[0];
  if (Array.isArray(raw)) return raw;
  return [];
}

function extractMealOptions(data, legIdx = 0) {
  if (!data) return [];
  const resObj = data?.Response || data?.Results || data;
  let raw = resObj?.MealDynamic || resObj?.Meal || resObj?.Results?.MealDynamic || data?.MealDynamic || data?.data?.MealDynamic;

  if (Array.isArray(raw?.[legIdx])) return raw[legIdx];
  if (Array.isArray(raw?.[0]) && legIdx === 0) return raw[0];
  if (Array.isArray(raw)) return raw;
  return [];
}


export default function FlightSeatSelectionScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const routeParams = route?.params || {};
  const [currentFlowState, setCurrentFlowState] = useState(routeParams);

  useEffect(() => {
    console.log("================================================================================");
    console.log("✈️ [FLIGHT BOOKING FLOW - STEP 4: SEAT & SSR SELECTION SCREEN MOUNTED]");
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🆔 Trace ID: ${routeParams.traceId || routeParams.flight?.traceId || "N/A"}`);
    console.log(`🏷️ Result Index: ${routeParams.resultIndex || routeParams.flight?.resultIndex || "N/A"}`);
    console.log("================================================================================");

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

  const normTripType = String(
    flowState.tripType || flowState.searchContext?.tripType || "oneway"
  ).toLowerCase();

  const journeyTypeNum = Number(
    flowState.journeyType || flowState.searchContext?.journeyType || 1
  );

  const isMultiCity = Boolean(
    (flowState.isMultiCity || journeyTypeNum === 3 || normTripType === "multicity") &&
    normTripType !== "oneway" &&
    normTripType !== "roundtrip"
  );

  const isRoundTrip = !isMultiCity && Boolean(
    flowState.isRoundTrip ||
    journeyTypeNum === 2 ||
    normTripType === "roundtrip" ||
    normTripType === "twoway"
  );

  const legResultIndices = useMemo(() => {
    const rawIdx = String(resultIndex || "");
    if (rawIdx.includes(",")) {
      const parts = rawIdx.split(",");
      return { outbound: parts[0], return: parts[1] };
    }
    return {
      outbound: flowState.outboundFlight?.resultIndex || rawIdx,
      return: flowState.returnFlight?.resultIndex || rawIdx,
    };
  }, [resultIndex, flowState]);

  // Dynamic SeatMap selection state
  const originCode = String(
    flowState.flight?.fromCityCode || flowState.flight?.fromCity || flowState.searchContext?.from || "DEL"
  ).toUpperCase();
  const destinationCode = String(
    flowState.flight?.toCityCode || flowState.flight?.toCity || flowState.searchContext?.to || "BOM"
  ).toUpperCase();

  const multiCityFlightsList = useMemo(() => {
    if (isMultiCity) {
      if (Array.isArray(flowState.multiCityFlights) && flowState.multiCityFlights.length > 0) {
        return flowState.multiCityFlights;
      }
      if (Array.isArray(flowState.searchContext?.multiCitySegments) && flowState.searchContext.multiCitySegments.length > 0) {
        return flowState.searchContext.multiCitySegments;
      }
    }
    if (isRoundTrip) {
      return [
        { fromCity: originCode, toCity: destinationCode, origin: originCode, destination: destinationCode },
        { fromCity: destinationCode, toCity: originCode, origin: destinationCode, destination: originCode },
      ];
    }
    return [{ fromCity: originCode, toCity: destinationCode, origin: originCode, destination: destinationCode }];
  }, [flowState, isMultiCity, isRoundTrip, originCode, destinationCode]);

  const legCount = multiCityFlightsList.length;
  const [activeLegIndex, setActiveLegIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seatNotApplicable, setSeatNotApplicable] = useState(false);

  // Dynamic SeatMap data map per leg index (0: Leg1, 1: Leg2, 2: Leg3, ...)
  const [legSeatDataMap, setLegSeatDataMap] = useState({});

  // Dynamic Seat selection labels per leg index
  const [legSeatLabelsMap, setLegSeatLabelsMap] = useState(() => {
    const initialMap = {};
    for (let i = 0; i < 6; i++) {
      initialMap[i] = Array(passengerCount).fill("");
    }
    return initialMap;
  });

  // SSR States
  const [ssrExpanded, setSsrExpanded] = useState(false);
  const [ssrLoading, setSsrLoading] = useState(false);
  const [ssrData, setSsrData] = useState(null);
  const [ssrError, setSsrError] = useState(null);
  
  // Separate SSR selection per leg
  const [selectedOutboundBaggage, setSelectedOutboundBaggage] = useState(null);
  const [selectedReturnBaggage, setSelectedReturnBaggage] = useState(null);
  const [selectedOutboundMeal, setSelectedOutboundMeal] = useState(null);
  const [selectedReturnMeal, setSelectedReturnMeal] = useState(null);

  const selectedSsrBaggage = activeLegIndex === 0 ? selectedOutboundBaggage : selectedReturnBaggage;
  const setSelectedSsrBaggage = activeLegIndex === 0 ? setSelectedOutboundBaggage : setSelectedReturnBaggage;

  const selectedSsrMeal = activeLegIndex === 0 ? selectedOutboundMeal : selectedReturnMeal;
  const setSelectedSsrMeal = activeLegIndex === 0 ? setSelectedOutboundMeal : setSelectedReturnMeal;

  const [activePassengerIndex, setActivePassengerIndex] = useState(0);

  // Active seat labels and updater for current active leg index
  const activeSeatLabels = legSeatLabelsMap[activeLegIndex] || Array(passengerCount).fill("");

  const setActiveSeatLabels = useCallback((updater) => {
    setLegSeatLabelsMap((prevMap) => {
      const currentLabels = prevMap[activeLegIndex] || Array(passengerCount).fill("");
      const nextLabels = typeof updater === "function" ? updater(currentLabels) : updater;
      return {
        ...prevMap,
        [activeLegIndex]: nextLabels,
      };
    });
  }, [activeLegIndex, passengerCount]);

  const activeSeatsList = useMemo(() => activeSeatLabels.filter(Boolean), [activeSeatLabels]);
  const activeSrdvSeatData = legSeatDataMap[activeLegIndex] || null;
  const isLegSeatMapEmpty = !activeSrdvSeatData || !activeSrdvSeatData.Seats; 
  const activeSeatNotApplicable = seatNotApplicable || (!loading && isLegSeatMapEmpty);

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

      const resultIndices = String(resultIndex || "").split(",").map((s) => s.trim()).filter(Boolean);
      const updatedMap = {};

      console.log(`[SEATMAP_FETCH] Fetching seat maps for ${legCount} legs (TraceId: ${traceId}, Indices: ${resultIndices.join(" | ")})...`);

      // 1. Fetch seatmap for each leg's specific ResultIndex
      if (resultIndices.length >= 1) {
        for (let i = 0; i < legCount; i++) {
          const legIdxStr = resultIndices[i] || resultIndices[0];
          console.log(`[SEATMAP_FETCH] Fetching Leg ${i + 1} seat map with ResultIndex: ${legIdxStr}...`);
          try {
            const legRes = await getFlightSeatMap({ traceId, resultIndex: legIdxStr });
            if (legRes?.success && legRes?.data) {
              const rawLegData = legRes.data?.Results || legRes.data?.Response?.Results || legRes.data;
              const segSeatData = Array.isArray(rawLegData)
                ? (rawLegData.find((s) => {
                    const lFrom = String(
                      multiCityFlightsList[i]?.fromCity || multiCityFlightsList[i]?.origin?.airportCode || multiCityFlightsList[i]?.origin || ""
                    ).toUpperCase();
                    return String(s.FromAirportCode || "").toUpperCase() === lFrom;
                  }) || rawLegData[0])
                : rawLegData;
              if (segSeatData) {
                updatedMap[i] = segSeatData;
              }
            }
          } catch (legErr) {
            console.warn(`[SEATMAP_FETCH] Warning fetching Leg ${i + 1} seat map:`, legErr?.message);
          }
        }
      }

      // 2. Fallback: If map is still incomplete, query combined resultIndex and parse array
      if (Object.keys(updatedMap).length < legCount) {
        const res = await getFlightSeatMap({ traceId, resultIndex });
        if (res?.success && res?.data) {
          const rawData = res.data?.Results || res.data?.Response?.Results || res.data;

          if (Array.isArray(rawData)) {
            console.log(`[SEATMAP_SUCCESS] Multi-segment seatmap array returned (${rawData.length} segments).`);
            multiCityFlightsList.forEach((leg, idx) => {
              const legFrom = String(
                leg?.fromCity || leg?.origin?.cityName || leg?.origin?.airportCode || leg?.origin || ""
              ).toUpperCase();

              const matched = rawData.find(
                (s) => String(s.FromAirportCode || "").toUpperCase() === legFrom || String(s.FromCity || "").toUpperCase().includes(legFrom)
              );

              if (matched && !updatedMap[idx]) {
                updatedMap[idx] = matched;
              }
            });
          } else if (rawData && typeof rawData === "object" && !updatedMap[0]) {
            updatedMap[0] = rawData;
          }
        }
      }

      console.log(`[SEATMAP_DONE] Loaded seat maps for ${Object.keys(updatedMap).length}/${legCount} legs.`);
      setLegSeatDataMap(updatedMap);
      if (Object.keys(updatedMap).length === 0) {
        setSeatNotApplicable(true);
      }
    } catch (err) {
      const msg = String(err?.message || "");
      console.log("[SEATMAP_FAILED] Seat map warning:", msg);
      setError(msg || "Seat map unavailable for this flight.");
      setSeatNotApplicable(true);
    } finally {
      setLoading(false);
    }
  }, [traceId, resultIndex, legCount, multiCityFlightsList, flowState]);

  const handleFetchSSR = useCallback(async () => {
    setSsrLoading(true);
    setSsrError(null);
    try {
      console.log(`[SSR_STARTED] User requested SSR add-on options for ResultIndex: ${resultIndex}`);
      const res = await getFlightSSR({ traceId, resultIndex });
      if (res?.success && res?.data) {
        setSsrData(res.data);
      } else {
        console.log(`[SSR_UNAVAILABLE] Code: ${res?.code || "SSR_UNAVAILABLE"} | Message: ${res?.message}`);
        setSsrError(res?.message || "Add-on baggage and meal options are unavailable for this flight.");
      }
    } catch (err) {
      console.warn("[SSR_FAILED] Exception:", err?.message);
      setSsrError(err?.message || "Failed to load SSR add-ons.");
    } finally {
      setSsrLoading(false);
    }
  }, [traceId, resultIndex]);

  const handleToggleSSR = useCallback(() => {
    const nextState = !ssrExpanded;
    setSsrExpanded(nextState);
    if (nextState && !ssrData && !ssrLoading) {
      handleFetchSSR();
    }
  }, [ssrExpanded, ssrData, ssrLoading, handleFetchSSR]);

  useEffect(() => {
    loadSeatMap();
  }, [loadSeatMap]);

  const seatMap = useMemo(() => {
    return parseSrdvSeatMap(activeSrdvSeatData, activeSeatsList);
  }, [activeSrdvSeatData, activeSeatsList]);

  const baseFare = Number(flowState.fareSummary?.baseFare || flowState.flight?.selectedTravelClassPriceInr || flowState.flight?.fare || 0);
  const taxes = Number(flowState.fareSummary?.tax || 0);

  const seatCharges = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < legCount; i++) {
      const labels = legSeatLabelsMap[i] || [];
      const sMap = parseSrdvSeatMap(legSeatDataMap[i], labels.filter(Boolean));
      const sMapLookup = new Map();
      sMap.forEach((s) => sMapLookup.set(s.seatNumber, s));
      labels.forEach((lbl) => {
        const found = sMapLookup.get(lbl);
        if (found?.price) sum += Number(found.price);
      });
    }
    return sum;
  }, [legCount, legSeatLabelsMap, legSeatDataMap]);

  const outboundSsrCharges = Number(selectedOutboundBaggage?.Price || selectedOutboundBaggage?.Amount || 0) + Number(selectedOutboundMeal?.Price || selectedOutboundMeal?.Amount || 0);
  const returnSsrCharges = Number(selectedReturnBaggage?.Price || selectedReturnBaggage?.Amount || 0) + Number(selectedReturnMeal?.Price || selectedReturnMeal?.Amount || 0);
  const ssrCharges = outboundSsrCharges + returnSsrCharges;

  const total = Math.max(0, baseFare + taxes + seatCharges + ssrCharges);

  const toggleSeat = useCallback((seat) => {
    if (!seat || [SEAT_STATUS.BOOKED, SEAT_STATUS.BLOCKED, SEAT_STATUS.UNAVAILABLE].includes(seat.status)) {
      return;
    }

    const seatLabel = seat.seatNumber;

    setActiveSeatLabels((prev) => {
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
  }, [activePassengerIndex, setActiveSeatLabels]);

  const handleContinue = useCallback(async () => {
    if (activeLegIndex < legCount - 1) {
      const currentLegLabels = legSeatLabelsMap[activeLegIndex] || [];
      const isLegEmpty = !legSeatDataMap[activeLegIndex] || !legSeatDataMap[activeLegIndex].Seats;
      if (!seatNotApplicable && !isLegEmpty && currentLegLabels.filter(Boolean).length !== passengerCount) {
        Alert.alert(
          `Incomplete Leg ${activeLegIndex + 1} Seats`,
          `Please select seats for all ${passengerCount} traveler(s) for Leg ${activeLegIndex + 1} before proceeding.`
        );
        return;
      }

      console.log(`[FlightSeatSelectionScreen] Leg ${activeLegIndex + 1} seats selected. Switching to Leg ${activeLegIndex + 2} seat map...`);
      setActiveLegIndex((prev) => prev + 1);
      setActivePassengerIndex(0);
      return;
    }

    const currentLegLabels = legSeatLabelsMap[activeLegIndex] || [];
    const isLegEmpty = !legSeatDataMap[activeLegIndex] || !legSeatDataMap[activeLegIndex].Seats;
    if (!seatNotApplicable && !isLegEmpty && currentLegLabels.filter(Boolean).length !== passengerCount) {
      Alert.alert(
        `Incomplete Leg ${activeLegIndex + 1} Seats`,
        `Please select seats for all ${passengerCount} traveler(s) before proceeding to payment.`
      );
      return;
    }

    const combinedSeatLabels = [];
    for (let i = 0; i < legCount; i++) {
      combinedSeatLabels.push(...(legSeatLabelsMap[i] || []));
    }

    console.log("================================================================================");
    console.log("✈️ [MULTI-CITY SEAT & SSR SELECTION TELEMETRY]");
    console.log(`🆔 Trace ID: ${traceId} | Result Index: ${resultIndex}`);
    console.log(`🔢 Total Legs: ${legCount}`);
    for (let i = 0; i < legCount; i++) {
      const legSeats = (legSeatLabelsMap[i] || []).filter(Boolean).join(", ") || "Auto-assigned";
      console.log(`  💺 Leg ${i + 1} Seats: ${legSeats}`);
    }
    console.log(`💰 Seat Surcharge Total: ₹${seatCharges}`);
    console.log(`🧳 SSR Extra Baggage: ${selectedSsrBaggage ? JSON.stringify(selectedSsrBaggage) : "None"}`);
    console.log(`🍱 SSR Meal Service: ${selectedSsrMeal ? JSON.stringify(selectedSsrMeal) : "None"}`);
    console.log(`💳 Grand Total Payable: ₹${total}`);
    console.log("================================================================================");

    const legSeatObjectsMap = {};
    for (let i = 0; i < legCount; i++) {
      const labels = legSeatLabelsMap[i] || [];
      const sMap = parseSrdvSeatMap(legSeatDataMap[i], labels.filter(Boolean));
      const sMapLookup = new Map();
      sMap.forEach((s) => sMapLookup.set(s.seatNumber, s));
      legSeatObjectsMap[i] = labels.map((lbl) => {
        if (!lbl) return null;
        const found = sMapLookup.get(lbl);
        return {
          label: lbl,
          price: found?.price || 0,
          rawSeat: found?.rawSeat || (found?.rawCode ? { Code: found.rawCode, SeatNo: found.seatNumber } : null)
        };
      });
    }

    const realSeatsList = combinedSeatLabels.filter(Boolean);
    const nextState = await writeFlightBookingFlowState({
      ...flowState,
      selectedSeatLabels: realSeatsList,
      selectedSeats: realSeatsList.map((lbl) => ({ label: lbl })),
      legSeatLabelsMap,
      legSeatObjectsMap,
      legCount,
      seatCharges,
      ssrDetails: {
        baggage: selectedSsrBaggage,
        meal: selectedSsrMeal,
        outboundBaggage: selectedOutboundBaggage,
        returnBaggage: selectedReturnBaggage,
        outboundMeal: selectedOutboundMeal,
        returnMeal: selectedReturnMeal,
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
      payableAmount: total,
    });

    console.log("[FlightSeatSelectionScreen] Navigating to FlightPaymentScreen...");
    navigation.navigate("FlightPaymentScreen", nextState);
  }, [activeLegIndex, legCount, legSeatLabelsMap, seatNotApplicable, passengerCount, seatCharges, selectedSsrBaggage, selectedSsrMeal, selectedOutboundBaggage, selectedReturnBaggage, selectedOutboundMeal, selectedReturnMeal, ssrCharges, total, flowState, baseFare, taxes, navigation]);

  const currentLegSeatsList = activeSeatLabels.filter(Boolean);
  const remainingCount = seatNotApplicable ? 0 : Math.max(0, passengerCount - currentLegSeatsList.length);
  const baggageOptions = extractBaggageOptions(ssrData, activeLegIndex);
  const mealOptions = extractMealOptions(ssrData, activeLegIndex);

  const ctaButtonTitle = activeLegIndex < legCount - 1
    ? `Select Leg ${activeLegIndex + 2} Seats →`
    : "Proceed to Payment →";


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

      {/* Round Trip / Multi-City Leg Selector Tabs */}
      {(isMultiCity || isRoundTrip) && (
        <View style={styles.legTabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, flexDirection: "row" }}>
            {multiCityFlightsList.map((legItem, idx) => {
              const isActive = activeLegIndex === idx;
              const legFrom = legItem?.fromCity || legItem?.origin?.cityName || legItem?.origin?.airportCode || legItem?.origin || `City ${idx + 1}`;
              const legTo = legItem?.toCity || legItem?.destination?.cityName || legItem?.destination?.airportCode || legItem?.destination || `City ${idx + 2}`;
              const selectedCount = (legSeatLabelsMap[idx] || []).filter(Boolean).length;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.85}
                  onPress={() => {
                    setActiveLegIndex(idx);
                    setActivePassengerIndex(0);
                  }}
                  style={[styles.legTabBtn, isActive && styles.legTabBtnActive, { minWidth: 150 }]}
                >
                  <Ionicons name="airplane-outline" size={16} color={isActive ? "#FFFFFF" : PRIMARY_RED} />
                  <View style={{ marginLeft: 6 }}>
                    <Text style={[styles.legTabTitle, isActive && styles.legTabTitleActive]}>
                      Leg {idx + 1}: {legFrom} → {legTo}
                    </Text>
                    <Text style={[styles.legTabSub, isActive && styles.legTabTitleActive]}>
                      {selectedCount}/{passengerCount} Seats Selected
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.container, width >= 768 && styles.containerWide]}>
          
          {/* Passenger Badges */}
          {!activeSeatNotApplicable && (
            <View style={styles.paxScrollContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.passengerScroll}>
                {passengers.map((passenger, index) => {
                  const seatLabel = activeSeatLabels[index] || "";
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

          {/* Instruction Banner */}
          {!activeSeatNotApplicable && (
            <View style={styles.instructionBanner}>
              <Text style={styles.instructionText}>
                {isRoundTrip
                  ? activeLegIndex === 0
                    ? `[Leg 1: Outbound] Assigning seat for Passenger ${activePassengerIndex + 1} (${remainingCount > 0 ? `Choose ${remainingCount} more` : "Outbound complete! Tap next for Return seats"})`
                    : `[Leg 2: Return] Assigning seat for Passenger ${activePassengerIndex + 1} (${remainingCount > 0 ? `Choose ${remainingCount} more` : "Return complete! Tap proceed to pay"})`
                  : remainingCount > 0
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
          ) : activeSeatNotApplicable ? (
            <View style={styles.notApplicableCard}>
              <Ionicons name="information-circle-outline" size={36} color="#2563EB" />
              <Text style={styles.notApplicableTitle}>Auto-Assigned Seating</Text>
              <Text style={styles.notApplicableText}>
                Seat selection is not applicable for {isRoundTrip ? (activeLegIndex === 0 ? "Outbound Flight" : "Return Flight") : "this flight"}. Seats will be automatically assigned by the airline at check-in free of charge.
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
                    <TouchableOpacity onPress={handleFetchSSR} style={styles.ssrRetryBtn}>
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
                                  {bag.Weight ? (String(bag.Weight).toLowerCase().includes("kg") ? bag.Weight : `${bag.Weight} KG`) : bag.Description || bag.Code}
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
          selectedSeats={currentLegSeatsList}
          seatCharges={seatCharges + ssrCharges}
          baseFare={baseFare}
          taxes={taxes}
          total={total}
          onContinue={handleContinue}
          disabled={(!seatNotApplicable && !activeSeatNotApplicable && currentLegSeatsList.length !== passengerCount) || loading}
          remainingCount={remainingCount}
          buttonTitle={ctaButtonTitle}
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
  legTabContainer: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 10, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderColor: "#E2E8F0" },
  legTabBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  legTabBtnActive: { backgroundColor: PRIMARY_RED, borderColor: PRIMARY_RED },
  legTabTitle: { fontSize: 12, fontWeight: "800", color: "#0F172A" },
  legTabTitleActive: { color: "#FFFFFF" },
  legTabSub: { fontSize: 10, fontWeight: "600", color: MUTED, marginTop: 1 },
  scrollContent: { flexGrow: 1, padding: 16 },
  container: { gap: 16 },
  containerWide: { maxWidth: 768, alignSelf: "center", width: "100%" },
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
});
