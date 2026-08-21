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

import { useFlightSearch } from "../hooks/useFlightSearch";
import { searchFlights } from "./dashboard/bottomTabScreens/flights/services/flightBookingService";
import { clearFlightBookingFlowState } from "./dashboard/bottomTabScreens/flights/services/flightBookingFlowStore";

import Header from "../components/redesign/Header";
import SegmentedControl from "../components/redesign/SegmentedControl";
import TicketCard from "../components/redesign/TicketCard";
import OptionRow from "../components/redesign/OptionRow";
import PrimaryButton from "../components/redesign/PrimaryButton";

import MultiCityCard from "../components/MultiCityCard";
import TravellerBottomSheet from "../bottomSheets/TravellerBottomSheet";
import CabinBottomSheet from "../bottomSheets/CabinBottomSheet";
import AirportSearchModal from "../components/AirportSearchModal";

import { theme } from "../theme/tokens";
import { scale } from "../utils/responsive";

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
        multiCitySegments: isMultiCity ? multiCitySegments : [],
        formattedSegments: isMultiCity ? formattedSegments : [],
        adults: travellers.adults,
        children: travellers.children,
        infants: travellers.infants,
        travellers,
        travelClass: cabinClass,
        cabinClass,
        ...(isMultiCity ? { segments: formattedSegments } : {}),
      };

      await clearFlightBookingFlowState();
      
      const fetchedFlights = await searchFlights(searchParams);

      const searchTraceId = fetchedFlights?.[0]?.traceId || fetchedFlights?.[0]?.TraceId || fetchedFlights?.traceId;
      
      const serializableParams = {
        ...searchParams,
        date: depDateString,
        departureDate: depDateString,
        returnDate: retDateString,
        traceId: searchTraceId,
        multiCitySegments: isMultiCity ? multiCitySegments.map((s) => ({
          ...s,
          date: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : String(s.date || depDateString),
          departureDate: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : String(s.date || depDateString),
        })) : [],
      };

      const navPayload = {
        searchParams: serializableParams,
        flights: fetchedFlights,
        traceId: searchTraceId,
        ...serializableParams,
      };

      if (navigation && typeof navigation.navigate === "function") {
        navigation.navigate("FlightListingScreen", navPayload);
      }
    } catch (err) {
      let friendlyMessage = "Failed to process search.";
      if (err?.status === 503 || String(err?.message || "").includes("ERR_NGROK_3004")) {
         friendlyMessage = "Flight service is temporarily unavailable. Please try again.";
      } else if (err?.status === 404 || String(err?.message || "").includes("ERR_NGROK_3200")) {
         friendlyMessage = "Flight service backend is offline. Please try again later.";
      } else if (err?.message) {
         friendlyMessage = err.message;
      }
      
      if (Platform.OS === "android") {
        ToastAndroid.show(friendlyMessage, ToastAndroid.LONG);
      } else {
        Alert.alert("Search Failed", friendlyMessage);
      }
    } finally {
      setSearching(false);
    }
  };

  const totalTravellers = travellers.adults + travellers.children + travellers.infants;

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
          {/* Custom Header */}
          <Header />

          {/* Trip Type Toggle */}
          <SegmentedControl
            selected={tripType}
            onChange={setTripType}
          />

          {tripType === "multicity" ? (
            <MultiCityCard
              segments={multiCitySegments}
              onPressSegmentOrigin={(idx) => {
                setActiveSegmentIndex(idx);
                setActiveSegmentTarget("origin");
                setShowOriginModal(true);
              }}
              onPressSegmentDestination={(idx) => {
                setActiveSegmentIndex(idx);
                setActiveSegmentTarget("destination");
                setShowDestinationModal(true);
              }}
              onPressSegmentDate={(idx) => {
                handleOpenMultiCityDate(idx);
              }}
              onAddSegment={addMultiCitySegment}
              onRemoveSegment={(idx) => removeMultiCitySegment(idx)}
              travellers={travellers}
              cabinClass={cabinClass}
              onPressTravellers={() => setShowTravellerSheet(true)}
              onPressCabin={() => setShowCabinSheet(true)}
              onSearch={handleSearchFlights}
              searching={searching}
            />
          ) : (
            <>
              {/* Route Boarding Pass Card */}
              <TicketCard
                origin={origin}
                destination={destination}
                departureDate={departureDate}
                returnDate={returnDate}
                tripType={tripType}
                onPressOrigin={() => {
                  setActiveSegmentIndex(null);
                  setShowOriginModal(true);
                }}
                onPressDestination={() => {
                  setActiveSegmentIndex(null);
                  setShowDestinationModal(true);
                }}
                onSwap={swapAirports}
                onPressDeparture={handleOpenDepartureDate}
                onPressReturn={handleOpenReturnDate}
              />

              {/* Travellers Row */}
              <OptionRow
                icon="person-outline"
                eyebrow="TRAVELLERS"
                value={`${totalTravellers} ${totalTravellers > 1 ? "Travellers" : "Adult"}`}
                onPress={() => setShowTravellerSheet(true)}
                accessibilityLabel="Select travellers"
              />

              {/* Cabin Class Row */}
              <OptionRow
                icon="briefcase-outline"
                eyebrow="CABIN"
                value={cabinClass}
                onPress={() => setShowCabinSheet(true)}
                accessibilityLabel="Select cabin class"
              />

              {/* Search Button */}
              <PrimaryButton
                title="Search flights"
                loading={searching}
                onPress={handleSearchFlights}
                style={styles.searchCta}
              />
            </>
          )}

          {/* Fare trust line */}
          <Text style={styles.trustCaption}>
            Fares update in real time · No hidden fees
          </Text>
        </ScrollView>
      </Animated.View>

      {/* DatePicker Component */}
      {showDatePicker && (
        <DateTimePicker
          value={
            datePickerMode === "multicity"
              ? multiCitySegments[datePickerSegIndex]?.date || new Date()
              : datePickerMode === "departure"
              ? departureDate || new Date()
              : returnDate || new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={
            datePickerMode === "multicity" && datePickerSegIndex > 0
              ? multiCitySegments[datePickerSegIndex - 1]?.date || new Date()
              : datePickerMode === "departure"
              ? new Date()
              : departureDate || new Date()
          }
          onChange={handleDateChange}
          accentColor={theme.colors.redDeep}
        />
      )}

      {/* Origin Airport Modal */}
      <AirportSearchModal
        visible={showOriginModal}
        title="Select Departure City"
        onClose={() => setShowOriginModal(false)}
        onSelectAirport={(selected) => {
          if (activeSegmentIndex !== null) {
            updateMultiCitySegment(activeSegmentIndex, activeSegmentTarget, selected);
          } else {
            setOrigin(selected);
          }
        }}
      />

      {/* Destination Airport Modal */}
      <AirportSearchModal
        visible={showDestinationModal}
        title="Select Arrival City"
        onClose={() => setShowDestinationModal(false)}
        onSelectAirport={(selected) => {
          if (activeSegmentIndex !== null) {
            updateMultiCitySegment(activeSegmentIndex, activeSegmentTarget, selected);
          } else {
            setDestination(selected);
          }
        }}
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
    backgroundColor: theme.colors.cloud,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  searchCta: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  trustCaption: {
    fontFamily: theme.typography.fontFamily.body.medium,
    fontSize: scale(11),
    color: theme.colors.slateSoft,
    textAlign: "center",
    marginTop: theme.spacing.sm,
    letterSpacing: 0.2,
  },
});
