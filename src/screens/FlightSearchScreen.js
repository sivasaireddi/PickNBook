import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
  Alert,
  ToastAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, GRADIENT_RED } from "../constants/colors";
import { SPACING, RADIUS } from "../constants/spacing";
import { wp } from "../utils/responsive";
import { useFlightSearch } from "../hooks/useFlightSearch";
import { searchFlights } from "./dashboard/bottomTabScreens/flights/services/flightBookingService";

import TripTypeToggle from "../components/TripTypeToggle";
import AirportCard from "../components/AirportCard";
import TravellerCard from "../components/TravellerCard";
import CabinClassCard from "../components/CabinClassCard";
import GradientButton from "../components/GradientButton";
import TravellerBottomSheet from "../bottomSheets/TravellerBottomSheet";
import CabinBottomSheet from "../bottomSheets/CabinBottomSheet";
import AirportSearchModal from "../components/AirportSearchModal";

export default function FlightSearchScreen({ navigation }) {
  const {
    origin,
    setOrigin,
    destination,
    setDestination,
    departureDate,
    setDepartureDate,
    returnDate,
    setReturnDate,
    multiCitySegments,
    addMultiCitySegment,
    removeMultiCitySegment,
    updateMultiCitySegment,
    travellers,
    updateTravellers,
    cabinClass,
    setCabinClass,
    tripType,
    setTripType,
    swapAirports,
    validate,
  } = useFlightSearch();

  // Screen mount fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  // Modal & Sheet visibility states
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(null); // For multi-city modal targeting
  const [activeSegmentTarget, setActiveSegmentTarget] = useState("origin"); // "origin" | "destination"
  const [showTravellerSheet, setShowTravellerSheet] = useState(false);
  const [showCabinSheet, setShowCabinSheet] = useState(false);

  // DatePicker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState("departure"); // "departure" | "return" | "multicity"
  const [datePickerSegIndex, setDatePickerSegIndex] = useState(0);

  // Loading state during search validation & transition
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateYAnim]);

  // Toast / alert feedback helper
  const showToast = (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Notice", message, [{ text: "OK" }]);
    }
  };

  // Date selection handler
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      if (datePickerMode === "multicity") {
        updateMultiCitySegment(datePickerSegIndex, "date", selectedDate);
      } else if (datePickerMode === "departure") {
        setDepartureDate(selectedDate);
        if (returnDate && selectedDate > returnDate) {
          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          setReturnDate(nextDay);
        }
      } else {
        setReturnDate(selectedDate);
      }
    }
  };

  const handleOpenDepartureDate = useCallback(() => {
    setDatePickerMode("departure");
    setShowDatePicker(true);
  }, []);

  const handleOpenReturnDate = useCallback(() => {
    if (tripType === "oneway") {
      setTripType("roundtrip");
    }
    setDatePickerMode("return");
    setShowDatePicker(true);
  }, [tripType, setTripType]);

  const handleOpenMultiCityDate = (index) => {
    setDatePickerMode("multicity");
    setDatePickerSegIndex(index);
    setShowDatePicker(true);
  };

  // Search Submission
  const handleSearchFlights = async () => {
    const { isValid, message } = validate();
    if (!isValid) {
      showToast(message || "Please check your search parameters.");
      return;
    }

    setSearching(true);
    try {
      const depDateString = departureDate
        ? (departureDate instanceof Date ? departureDate.toISOString().slice(0, 10) : String(departureDate))
        : "";
      const retDateString = returnDate
        ? (returnDate instanceof Date ? returnDate.toISOString().slice(0, 10) : String(returnDate))
        : null;

      const isMultiCity = String(tripType).toLowerCase() === "multicity";

      const formattedSegments = multiCitySegments.map((s) => ({
        origin: s.origin?.airportCode || "DEL",
        destination: s.destination?.airportCode || "BOM",
        from: s.origin?.airportCode || "DEL",
        to: s.destination?.airportCode || "BOM",
        date: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : String(s.date || depDateString),
        departureDate: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : String(s.date || depDateString),
      }));

      const searchParams = {
        from: isMultiCity ? formattedSegments[0].origin : (origin?.airportCode || "DEL"),
        to: isMultiCity ? formattedSegments[formattedSegments.length - 1].destination : (destination?.airportCode || "BOM"),
        origin: isMultiCity ? multiCitySegments[0].origin : origin,
        destination: isMultiCity ? multiCitySegments[multiCitySegments.length - 1].destination : destination,
        date: depDateString,
        departureDate: depDateString,
        returnDate: retDateString,
        tripType,
        journeyType: isMultiCity ? 3 : (tripType === "roundtrip" ? 2 : 1),
        adults: travellers.adults,
        children: travellers.children,
        infants: travellers.infants,
        travellers,
        travelClass: cabinClass,
        cabinClass,
        ...(isMultiCity ? { segments: formattedSegments } : {}),
      };

      console.log("\n==========================================");
      console.log("✈️ [FLIGHT BOOKING FLOW - STEP 1: SEARCH]");
      console.log("[FlightSearchScreen] User submitted search form parameters:");
      console.log(JSON.stringify(searchParams, null, 2));
      console.log("==========================================\n");

      let fetchedFlights = [];
      try {
        console.log("[FlightSearchScreen] Invoking /api/flight/srdv/Search...");
        fetchedFlights = await searchFlights(searchParams);
        console.log(`[FlightSearchScreen] Search successful! Retrieved ${fetchedFlights?.length || 0} flights.`);
      } catch (apiErr) {
        console.warn("[FlightSearchScreen] Search API warning/error:", apiErr?.message);
      }

      const searchTraceId = fetchedFlights?.[0]?.traceId || fetchedFlights?.[0]?.TraceId || fetchedFlights?.traceId;
      const navPayload = {
        searchParams: {
          ...searchParams,
          traceId: searchTraceId,
        },
        flights: fetchedFlights,
        traceId: searchTraceId,
        ...searchParams,
      };

      if (navigation && typeof navigation.navigate === "function") {
        navigation.navigate("FlightListingScreen", navPayload);
      } else {
        console.log("[FlightSearchScreen] Navigating to FlightListingScreen with payload:", navPayload);
      }
    } catch (err) {
      showToast(err?.message || "Failed to process search.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Custom Header (Single Header) */}
          <View style={styles.headerContainer}>
            <View style={styles.brandRow}>
              <LinearGradient
                colors={GRADIENT_RED}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoSquare}
              >
                <Ionicons name="airplane" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.brandTextCol}>
                <Text style={styles.brandName}>PickNBook</Text>
                <Text style={styles.tagline}>Your smart travel companion</Text>
              </View>
            </View>

            {/* Headline */}
            <View style={styles.headlineWrapper}>
              <Text style={styles.headlineText}>
                Chase the <Text style={styles.highlightText}>horizon.</Text>
              </Text>
              <Text style={styles.headlineText}>Book the way there.</Text>
            </View>
          </View>

          {/* Trip Type Toggle */}
          <TripTypeToggle
            tripType={tripType}
            onChangeTripType={setTripType}
          />

          {/* Route Boarding Pass Card */}
          <AirportCard
            origin={origin}
            destination={destination}
            departureDate={departureDate}
            returnDate={returnDate}
            tripType={tripType}
            onPressOrigin={() => setShowOriginModal(true)}
            onPressDestination={() => setShowDestinationModal(true)}
            onSwap={swapAirports}
            onPressDeparture={handleOpenDepartureDate}
            onPressReturn={handleOpenReturnDate}
          />

          {/* Travellers Card */}
          <TravellerCard
            travellers={travellers}
            onPress={() => setShowTravellerSheet(true)}
          />

          {/* Cabin Class Card */}
          <CabinClassCard
            cabinClass={cabinClass}
            onPress={() => setShowCabinSheet(true)}
          />

          {/* Search Button */}
          <GradientButton
            title="Search flights"
            loading={searching}
            onPress={handleSearchFlights}
            style={styles.searchCta}
          />

          {/* Fare trust line */}
          <Text style={styles.trustCaption}>
            Fares update in real time · no hidden fees
          </Text>
        </ScrollView>
      </Animated.View>

      {/* DatePicker Component */}
      {showDatePicker && (
        <DateTimePicker
          value={
            datePickerMode === "departure"
              ? departureDate || new Date()
              : returnDate || new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={
            datePickerMode === "departure"
              ? new Date()
              : departureDate || new Date()
          }
          onChange={handleDateChange}
          accentColor="#E53935"
        />
      )}

      {/* Origin Airport Modal */}
      <AirportSearchModal
        visible={showOriginModal}
        title="Select Departure City"
        onClose={() => setShowOriginModal(false)}
        onSelectAirport={(selected) => setOrigin(selected)}
      />

      {/* Destination Airport Modal */}
      <AirportSearchModal
        visible={showDestinationModal}
        title="Select Arrival City"
        onClose={() => setShowDestinationModal(false)}
        onSelectAirport={(selected) => setDestination(selected)}
      />

      {/* Travellers Bottom Sheet */}
      <TravellerBottomSheet
        visible={showTravellerSheet}
        travellers={travellers}
        onClose={() => setShowTravellerSheet(false)}
        onApply={(updated) => updateTravellers(updated)}
      />

      {/* Cabin Class Bottom Sheet */}
      <CabinBottomSheet
        visible={showCabinSheet}
        selectedCabin={cabinClass}
        onClose={() => setShowCabinSheet(false)}
        onSelectCabin={(selected) => setCabinClass(selected)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  headerContainer: {
    marginBottom: SPACING.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  logoSquare: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTextCol: {
    justifyContent: "center",
  },
  brandName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headlineWrapper: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  headlineText: {
    fontSize: wp(7.2),
    fontWeight: "800",
    color: COLORS.textPrimary,
    lineHeight: wp(9.5),
    letterSpacing: -0.5,
  },
  highlightText: {
    color: COLORS.primary,
  },
  searchCta: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  trustCaption: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
    letterSpacing: 0.2,
  },
});
