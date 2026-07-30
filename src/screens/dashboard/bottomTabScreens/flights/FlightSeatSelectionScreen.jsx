import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { writeFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { formatCurrency, buildSeatMap } from "./utils/seatMapUtils";
import { SEAT_STATUS } from "./constants/seatMapConstants";

const TEXT = "#0F172A";
const MUTED = "#64748B";

function parsePassengers(flowState) {
  return Array.isArray(flowState.passengers) ? flowState.passengers : [];
}

export default function FlightSeatSelectionScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const flowState = route?.params || {};
  const passengers = parsePassengers(flowState);
  const passengerCount = Math.max(1, passengers.length || 1);

  // Requirement 1: fresh booking should start with empty array, preselect only if returning from a later step
  const initialSeatLabels = Array.isArray(flowState.selectedSeatLabels)
    ? flowState.selectedSeatLabels
    : [];

  // Track seat assignments per passenger slot (Array of length passengerCount)
  const [selectedSeatLabels, setSelectedSeatLabels] = useState(() => {
    const arr = Array(passengerCount).fill("");
    initialSeatLabels.forEach((label, idx) => {
      if (idx < passengerCount) arr[idx] = label;
    });
    return arr;
  });

  // Requirement 7: Active passenger indicator
  const [activePassengerIndex, setActivePassengerIndex] = useState(0);

  const activeSeatsList = useMemo(() => selectedSeatLabels.filter(Boolean), [selectedSeatLabels]);

  const selectedSeats = useMemo(() => {
    const seatMap = buildSeatMap(activeSeatsList);
    const map = new Map();
    seatMap.forEach((seat) => map.set(seat.seatNumber, seat));
    return activeSeatsList.map((label) => map.get(label)).filter(Boolean);
  }, [activeSeatsList]);

  const baseFare = Number(flowState.fareSummary?.baseFare || flowState.flight?.selectedTravelClassPriceInr || flowState.flight?.fare || 5208);
  const taxes = Number(flowState.fareSummary?.tax || Math.round(baseFare * 0.05));
  const seatCharges = selectedSeats.reduce((sum, seat) => sum + Number(seat?.price || 0), 0);
  const total = Math.max(0, baseFare + taxes + seatCharges);

  const toggleSeat = useCallback((seat) => {
    if (!seat || [SEAT_STATUS.BOOKED, SEAT_STATUS.BLOCKED, SEAT_STATUS.UNAVAILABLE].includes(seat.status)) {
      return;
    }

    const seatLabel = seat.seatNumber;

    setSelectedSeatLabels((prev) => {
      const next = [...prev];
      
      // Check if seat is selected by another passenger
      const existingIdx = next.indexOf(seatLabel);
      if (existingIdx !== -1) {
        next[existingIdx] = "";
        return next;
      }

      // Assign to active passenger (replaces existing seat for this passenger)
      next[activePassengerIndex] = seatLabel;

      // Automatically move focus to next empty seat slot
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
    if (activeSeatsList.length !== passengerCount) {
      return;
    }

    const passengerSeatMap = passengers.map((passenger, index) => ({
      passengerId: passenger.id ?? index + 1,
      passengerName: passenger.name || passenger.fullName || (passenger.firstName && passenger.lastName ? `${passenger.firstName} ${passenger.lastName}` : `Passenger ${index + 1}`),
      seatNumber: selectedSeatLabels[index] || "",
    }));

    const nextState = await writeFlightBookingFlowState({
      ...flowState,
      selectedSeatLabels: activeSeatsList,
      selectedSeats: selectedSeats.map((seat) => ({
        id: seat.id,
        label: seat.seatNumber,
        seatNumber: seat.seatNumber,
        type: seat.type,
        price: seat.price,
        status: seat.status,
      })),
      seatCharges,
      fareSummary: {
        ...(flowState.fareSummary || {}),
        baseFare,
        tax: taxes,
        seatSurcharge: seatCharges,
        totalFare: total,
      },
      passengerSeatMap,
      payableAmount: total,
    });

    navigation.navigate("FlightPaymentScreen", nextState);
  }, [baseFare, flowState, navigation, passengerCount, passengers, seatCharges, activeSeatsList, selectedSeatLabels, selectedSeats, taxes, total]);

  const remainingCount = Math.max(0, passengerCount - activeSeatsList.length);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {/* Back navigation & Header */}
      <View style={styles.headerNav}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <SeatHeader title="Seat Selection" subtitle="Choose your preferred seats" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.container, width >= 768 && styles.containerWide]}>
          
          {/* Legend */}
          <View style={styles.legendWrap}>
            <Legend />
          </View>

          {/* Requirement 9: Passenger Badges scrolled horizontally */}
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

          {/* Instruction Text */}
          <View style={styles.instructionBanner}>
            <Text style={styles.instructionText}>
              {remainingCount > 0
                ? `Assigning seat for Passenger ${activePassengerIndex + 1} (Choose ${remainingCount} more)`
                : "All passengers assigned! Tap continue to proceed."}
            </Text>
          </View>

          {/* Requirement 4: Enable horizontal scroll if width exceeds available screen width */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.cabinScrollContainer}
          >
            <View style={styles.cabinWrap}>
              <SeatMap
                selectedSeats={activeSeatsList}
                onSeatPress={toggleSeat}
              />
            </View>
          </ScrollView>

        </View>
      </ScrollView>

      {/* Sticky Bottom Summary Card */}
      <View style={styles.bottomDock}>
        <BottomSummary
          selectedSeats={activeSeatsList}
          seatCharges={seatCharges}
          baseFare={baseFare}
          taxes={taxes}
          total={total}
          onContinue={handleContinue}
          disabled={activeSeatsList.length !== passengerCount}
          remainingCount={remainingCount}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerNav: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 170, // Requirement 6: Proper bottom padding to clear BottomSummary overlay
  },
  container: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    gap: 16,
  },
  containerWide: {
    paddingHorizontal: 8,
  },
  legendWrap: {
    marginTop: 2,
  },
  paxScrollContainer: {
    height: 76,
  },
  passengerScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  instructionBanner: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  instructionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  cabinScrollContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  cabinWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingTop: 10, // Requirement 12: Reduce unnecessary whitespace above aircraft
    paddingBottom: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  bottomDock: {
    backgroundColor: "transparent",
  },
});
