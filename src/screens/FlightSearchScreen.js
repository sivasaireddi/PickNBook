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
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFlightSearch } from "../hooks/useFlightSearch";
import { searchFlights } from "./dashboard/bottomTabScreens/flights/services/flightBookingService";
import { clearFlightBookingFlowState } from "./dashboard/bottomTabScreens/flights/services/flightBookingFlowStore";

import MultiCityCard from "../components/MultiCityCard";
import TravellerBottomSheet from "../bottomSheets/TravellerBottomSheet";
import CabinBottomSheet from "../bottomSheets/CabinBottomSheet";
import AirportSearchModal from "../components/AirportSearchModal";
import OffersCarousel from "../components/OffersCarousel";
import { AssuranceStrip, SearchPanelHeading, TravelPrimaryButton, TravelSearchHero } from "../components/travelSearch/TravelSearchChrome";

import { theme } from "../theme/tokens";
import { scale } from "../utils/responsive";
import { normalizeCityName } from "../screens/dashboard/bottomTabScreens/flights/utils/flightUtils";

const getAirportCity = (airport, fallback) => {
  const code = airport?.airportCode || airport?.iataCode;
  return normalizeCityName(code || airport?.cityName || airport?.city || fallback);
};

// Reusable animated pressable - identical pattern to HotelsScreen
const AnimatedPressable = ({ children, style, onPress, disabled, activeScale = 0.95, wrapperStyle }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      style={wrapperStyle}
      onPressIn={() => { if (disabled) return; Animated.spring(scaleAnim, { toValue: activeScale, useNativeDriver: true }).start(); }}
      onPressOut={() => { if (disabled) return; Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start(); }}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const TRIPS = [
  { id: "oneway", label: "One Way" },
  { id: "roundtrip", label: "Round Trip" },
  { id: "multicity", label: "Multi-city" },
];

export default function FlightSearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    origin, setOrigin,
    destination, setDestination,
    departureDate, setDepartureDate,
    returnDate, setReturnDate,
    multiCitySegments,
    addMultiCitySegment, removeMultiCitySegment, updateMultiCitySegment,
    travellers, updateTravellers,
    cabinClass, setCabinClass,
    tripType, setTripType,
    swapAirports, validate,
  } = useFlightSearch();

  // Entrance animations — identical to HotelsScreen
  const cardTranslateY = useRef(new Animated.Value(35)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const cardScale     = useRef(new Animated.Value(0.98)).current;

  // Modal & Sheet states
  const [showOriginModal, setShowOriginModal]           = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex]     = useState(null);
  const [activeSegmentTarget, setActiveSegmentTarget]   = useState("origin");
  const [showTravellerSheet, setShowTravellerSheet]     = useState(false);
  const [showCabinSheet, setShowCabinSheet]             = useState(false);

  // DatePicker states
  const [showDatePicker, setShowDatePicker]     = useState(false);
  const [datePickerMode, setDatePickerMode]     = useState("departure");
  const [datePickerSegIndex, setDatePickerSegIndex] = useState(0);

  const [searching, setSearching] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity,    { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardTranslateY, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
      Animated.spring(cardScale,      { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const showToast = (msg) => {
    if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert("Notice", msg, [{ text: "OK" }]);
  };

  const formatDate = (d) => {
    if (!d) return "";
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === "multicity") {
        updateMultiCitySegment(datePickerSegIndex, "date", selectedDate);
      } else if (datePickerMode === "departure") {
        setDepartureDate(selectedDate);
        if (returnDate && selectedDate > returnDate) {
          const nd = new Date(selectedDate); nd.setDate(nd.getDate() + 1); setReturnDate(nd);
        }
      } else { setReturnDate(selectedDate); }
    }
  };

  const handleOpenDepartureDate = useCallback(() => { setDatePickerMode("departure"); setShowDatePicker(true); }, []);
  const handleOpenReturnDate    = useCallback(() => {
    if (tripType === "oneway") setTripType("roundtrip");
    setDatePickerMode("return"); setShowDatePicker(true);
  }, [tripType, setTripType]);
  const handleOpenMultiCityDate = (i) => { setDatePickerMode("multicity"); setDatePickerSegIndex(i); setShowDatePicker(true); };

  // Search submission — fully preserved, zero changes
  const handleSearchFlights = async () => {
    const { isValid, message } = validate();
    if (!isValid) { showToast(message || "Please check your search parameters."); return; }
    setSearching(true);
    try {
      const depDateString = departureDate ? (departureDate instanceof Date ? departureDate.toISOString().slice(0, 10) : String(departureDate)) : "";
      const retDateString = tripType === "roundtrip" && returnDate
        ? (returnDate instanceof Date ? returnDate.toISOString().slice(0, 10) : String(returnDate))
        : null;
      const isMultiCity   = String(tripType).toLowerCase() === "multicity";
      const formattedSegments = multiCitySegments.map((s) => ({
        origin: s.origin?.airportCode || "", destination: s.destination?.airportCode || "",
        from:   s.origin?.airportCode || "", to:          s.destination?.airportCode || "",
        date:          s.date instanceof Date ? s.date.toISOString().slice(0, 10) : String(s.date || depDateString),
        departureDate: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : String(s.date || depDateString),
      }));
      const searchParams = {
        from:   isMultiCity ? formattedSegments[0].origin                                  : (origin?.airportCode      || ""),
        to:     isMultiCity ? formattedSegments[formattedSegments.length - 1].destination  : (destination?.airportCode || ""),
        origin:      isMultiCity ? multiCitySegments[0].origin                                        : origin,
        destination: isMultiCity ? multiCitySegments[multiCitySegments.length - 1].destination        : destination,
        date: depDateString, departureDate: depDateString, returnDate: retDateString, tripType,
        journeyType: isMultiCity ? 3 : (tripType === "roundtrip" ? 2 : 1),
        multiCitySegments: isMultiCity ? multiCitySegments : [],
        formattedSegments: isMultiCity ? formattedSegments : [],
        adults: travellers.adults, children: travellers.children, infants: travellers.infants,
        travellers, travelClass: cabinClass, cabinClass,
        ...(isMultiCity ? { segments: formattedSegments } : {}),
      };
      await clearFlightBookingFlowState();
      const fetchedFlights = await searchFlights(searchParams);
      const searchTraceId  = fetchedFlights?.[0]?.traceId || fetchedFlights?.[0]?.TraceId || fetchedFlights?.traceId;
      const serializableParams = {
        ...searchParams, date: depDateString, departureDate: depDateString, returnDate: retDateString, traceId: searchTraceId,
        multiCitySegments: isMultiCity ? multiCitySegments.map((s) => ({
          ...s,
          date:          s.date instanceof Date ? s.date.toISOString().slice(0, 10) : String(s.date || depDateString),
          departureDate: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : String(s.date || depDateString),
        })) : [],
      };
      const navPayload = { searchParams: serializableParams, flights: fetchedFlights, traceId: searchTraceId, ...serializableParams };
      if (navigation && typeof navigation.navigate === "function") navigation.navigate("FlightListingScreen", navPayload);
    } catch (err) {
      let msg = "Failed to process search.";
      if (err?.status === 503) msg = "Flight service is temporarily unavailable. Please try again.";
      else if (err?.status === 404) msg = "Flight service backend is offline. Please try again later.";
      else if (err?.message) msg = err.message;
      if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.LONG);
      else Alert.alert("Search Failed", msg);
    } finally { setSearching(false); }
  };

  const totalTravellers = travellers.adults + travellers.children + travellers.infants;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (Platform.OS === "ios" ? 84 : 64) + insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero Banner — identical treatment to HotelsScreen */}
        <TravelSearchHero
          image={require("../../assets/flightBanner.png")}
          title="Your next destination starts here."
          subtitle="Compare fares and plan your journey."
          onBack={() => navigation?.canGoBack?.() ? navigation.goBack() : navigation.navigate?.("DashBoard")}
        />

        {/* Search Card — overlaps banner by 24px, identical to HotelsScreen */}
        <View style={styles.cardContainer}>
          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }, { scale: cardScale }] }]}>
            <SearchPanelHeading title="Search flights" subtitle="Build your itinerary in a few simple steps." />

            {/* Trip Type segmented control */}
            <View style={styles.segmentedRow}>
              {TRIPS.map((trip) => {
                const isActive = tripType === trip.id;
                return (
                  <TouchableOpacity key={trip.id} style={[styles.segTab, isActive && styles.segTabActive]} onPress={() => setTripType(trip.id)} activeOpacity={0.75} accessibilityRole="button" accessibilityState={{ selected: isActive }} accessibilityLabel={trip.label}>
                    <Text style={[styles.segLabel, isActive && styles.segLabelActive]}>{trip.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {tripType === "multicity" ? (
              <MultiCityCard
                segments={multiCitySegments}
                onPressSegmentOrigin={(idx) => { setActiveSegmentIndex(idx); setActiveSegmentTarget("origin");      setShowOriginModal(true); }}
                onPressSegmentDestination={(idx) => { setActiveSegmentIndex(idx); setActiveSegmentTarget("destination"); setShowDestinationModal(true); }}
                onPressSegmentDate={(idx) => handleOpenMultiCityDate(idx)}
                onAddSegment={addMultiCitySegment}
                onRemoveSegment={(idx) => removeMultiCitySegment(idx)}
                travellers={travellers} cabinClass={cabinClass}
                onPressTravellers={() => setShowTravellerSheet(true)}
                onPressCabin={() => setShowCabinSheet(true)}
                onSearch={handleSearchFlights} searching={searching}
              />
            ) : (
              <>
                {/* FROM / TO */}
                <View style={styles.routeCard}>
                  {/* FROM column */}
                  <AnimatedPressable style={styles.airportBlock} activeScale={0.97} onPress={() => { setActiveSegmentIndex(null); setShowOriginModal(true); }}>
                    <Text style={styles.fieldLabel}>FROM</Text>
                    <Text style={[styles.cityName, !origin && styles.emptyField]} numberOfLines={1}>{getAirportCity(origin, "Select city")}</Text>
                    {origin?.airportCode ? <Text style={styles.airportCode}>{origin.airportCode}</Text> : null}
                  </AnimatedPressable>

                  {/* Swap button column — sits between FROM and TO */}
                  <AnimatedPressable style={styles.swapButton} activeScale={0.88} onPress={swapAirports}>
                    <Ionicons name="swap-horizontal" size={scale(19)} color={theme.colors.redDeep} />
                  </AnimatedPressable>

                  {/* TO column */}
                  <AnimatedPressable style={[styles.airportBlock, styles.airportBlockRight]} activeScale={0.97} onPress={() => { setActiveSegmentIndex(null); setShowDestinationModal(true); }}>
                    <Text style={[styles.fieldLabel, { textAlign: "right" }]}>TO</Text>
                    <Text style={[styles.cityName, !destination && styles.emptyField, { textAlign: "right" }]} numberOfLines={1}>{getAirportCity(destination, "Select city")}</Text>
                    {destination?.airportCode ? <Text style={[styles.airportCode, { textAlign: "right" }]}>{destination.airportCode}</Text> : null}
                  </AnimatedPressable>
                </View>

                {/* Boarding-pass perforation divider */}
                {/* DEPARTURE / RETURN */}
                <View style={styles.dateRow}>
                  <AnimatedPressable style={styles.dateBlock} activeScale={0.96} onPress={handleOpenDepartureDate}>
                    <Text style={styles.fieldLabel}>DEPARTURE</Text>
                    <Text style={[styles.dateValue, !departureDate && styles.datePlaceholder]}>{departureDate ? formatDate(departureDate) : "Select date"}</Text>
                  </AnimatedPressable>
                  <View style={styles.dateDivider} />
                  <AnimatedPressable style={styles.dateBlock} activeScale={0.96} onPress={handleOpenReturnDate}>
                    <Text style={styles.fieldLabel}>RETURN</Text>
                    {tripType === "roundtrip" && returnDate
                      ? <Text style={styles.dateValue}>{formatDate(returnDate)}</Text>
                      : <Text style={styles.addReturnText}>+ Add return</Text>}
                  </AnimatedPressable>
                </View>

                {/* TRAVELLERS */}
                <AnimatedPressable style={styles.optionRow} activeScale={0.97} onPress={() => setShowTravellerSheet(true)}>
                  <View style={styles.optionIconCircle}><Ionicons name="person-outline" size={scale(18)} color={theme.colors.redDeep} /></View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.fieldLabel}>TRAVELLERS</Text>
                    <Text style={styles.optionValue}>{`${totalTravellers} ${totalTravellers > 1 ? "Travellers" : "Adult"}`}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={scale(20)} color={theme.colors.slateSoft} />
                </AnimatedPressable>

                {/* CABIN */}
                <AnimatedPressable style={styles.optionRow} activeScale={0.97} onPress={() => setShowCabinSheet(true)}>
                  <View style={styles.optionIconCircle}><Ionicons name="briefcase-outline" size={scale(18)} color={theme.colors.redDeep} /></View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.fieldLabel}>CABIN</Text>
                    <Text style={styles.optionValue}>{cabinClass}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={scale(20)} color={theme.colors.slateSoft} />
                </AnimatedPressable>

                {/* Search Flights button — same gradient / height / radius / shadow as HotelsScreen */}
                <TravelPrimaryButton label="Search Flights" onPress={handleSearchFlights} loading={searching} disabled={searching} />
              </>
            )}
          </Animated.View>

          <AssuranceStrip items={["One-way, return and multi-city", "Traveller options", "Secure booking"]} />
          <OffersCarousel serviceType="flight" />
        </View>
      </ScrollView>

      {/* DatePicker — logic fully preserved */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === "multicity" ? multiCitySegments[datePickerSegIndex]?.date || new Date() : datePickerMode === "departure" ? departureDate || new Date() : returnDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={datePickerMode === "multicity" && datePickerSegIndex > 0 ? multiCitySegments[datePickerSegIndex - 1]?.date || new Date() : datePickerMode === "departure" ? new Date() : departureDate || new Date()}
          onChange={handleDateChange}
          accentColor={theme.colors.redDeep}
        />
      )}

      {/* Airport Modals — fully preserved */}
      <AirportSearchModal visible={showOriginModal} title="Select Departure City" onClose={() => setShowOriginModal(false)}
        onSelectAirport={(sel) => { if (activeSegmentIndex !== null) updateMultiCitySegment(activeSegmentIndex, activeSegmentTarget, sel); else setOrigin(sel); }} />
      <AirportSearchModal visible={showDestinationModal} title="Select Arrival City" onClose={() => setShowDestinationModal(false)}
        onSelectAirport={(sel) => { if (activeSegmentIndex !== null) updateMultiCitySegment(activeSegmentIndex, activeSegmentTarget, sel); else setDestination(sel); }} />

      {/* Bottom Sheets — fully preserved */}
      <TravellerBottomSheet visible={showTravellerSheet} travellers={travellers} onClose={() => setShowTravellerSheet(false)} onApply={(u) => updateTravellers(u)} />
      <CabinBottomSheet visible={showCabinSheet} selectedCabin={cabinClass} onClose={() => setShowCabinSheet(false)} onSelectCabin={(s) => setCabinClass(s)} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Outer container
  container:     { flex: 1, backgroundColor: theme.colors.cloud },
  scrollContent: { paddingBottom: scale(32) },

  // Banner — mirrors HotelsScreen exactly
  headerBannerContainer: { overflow: "hidden", borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20) },
  headerBackground:      { width: "100%" },
  headerBackgroundImage: { resizeMode: "cover" },
  headerGradient:        { flex: 1, paddingBottom: scale(24) },
  headerRow:             { flexDirection: "row", alignItems: "center", paddingHorizontal: scale(16) },

  // Back button — identical to HotelsScreen
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },

  // Card container — negative marginTop overlaps banner (identical to HotelsScreen)
  cardContainer: { marginHorizontal: scale(16), marginTop: -scale(32) },
  card: { backgroundColor: "#FFFFFF", borderRadius: scale(26), padding: scale(20), shadowColor: theme.colors.ink, shadowOffset: { width: 0, height: scale(7) }, shadowOpacity: 0.08, shadowRadius: scale(16), elevation: 4 },

  // Segmented trip-type control
  segmentedRow:  { flexDirection: "row", backgroundColor: theme.colors.cloud, borderRadius: scale(14), padding: scale(4), marginBottom: scale(16), borderWidth: 1, borderColor: theme.colors.line },
  segTab:        { flex: 1, paddingHorizontal: 2, alignItems: "center", justifyContent: "center", borderRadius: scale(11), minHeight: scale(42) },
  segTabActive:  { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: "#F1D5DA", shadowColor: theme.colors.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
  segLabel:      { fontSize: scale(12), fontWeight: "500", color: "#8992A9" },
  segLabelActive:{ fontWeight: "700", color: theme.colors.redDeep },

  // FROM / TO route row — 3-column flex (no absolute positioning)
  routeCard:        { flexDirection: "row", alignItems: "center", padding: scale(14), borderRadius: scale(18), backgroundColor: theme.colors.cloud, borderWidth: 1, borderColor: theme.colors.line, marginBottom: scale(12) },
  airportBlock:     { flex: 1, flexBasis: 0, minWidth: 0, minHeight: scale(64), justifyContent: "center" },
  airportBlockRight:{ alignItems: "flex-end" },
  fieldLabel:       { fontSize: scale(9), fontWeight: "800", color: "#94A3B8", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: scale(2) },
  cityName:         { fontSize: scale(14), fontWeight: "700", color: theme.colors.ink, marginBottom: scale(1) },
  emptyField:       { color: "#9CA3AF", fontWeight: "500" },
  airportCode:      { fontSize: scale(22), fontWeight: "900", color: "#0F172A", lineHeight: scale(26) },

  // Swap button — inline flex item, no absolute positioning
  swapButton: { width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: theme.colors.card, borderWidth: 1, borderColor: "#F1CDD3", justifyContent: "center", alignItems: "center", marginHorizontal: scale(8), shadowColor: theme.colors.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },

  // Boarding-pass perforation divider
  perforationDivider:  { flexDirection: "row", alignItems: "center", height: scale(16), position: "relative", overflow: "hidden", marginBottom: scale(2) },
  perforationHoleLeft: { width: scale(16), height: scale(16), borderRadius: scale(8), backgroundColor: "#F4F3F1", position: "absolute", left: -scale(8), zIndex: 2 },
  perforationHoleRight:{ width: scale(16), height: scale(16), borderRadius: scale(8), backgroundColor: "#F4F3F1", position: "absolute", right: -scale(8), zIndex: 2 },
  dashedLine:          { flex: 1, height: 1, borderStyle: "dashed", borderWidth: 1, borderColor: "#E7E9F2", marginHorizontal: scale(12) },

  // Date row
  dateRow:      { flexDirection: "row", marginBottom: scale(12), padding: scale(4), borderRadius: scale(16), backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line },
  dateBlock:    { flex: 1, minHeight: scale(58), justifyContent: "center", paddingHorizontal: scale(10) },
  dateDivider:  { width: 1, backgroundColor: "#E7E9F2", marginHorizontal: scale(9), alignSelf: "stretch" },
  dateValue:    { fontSize: scale(13), fontWeight: "700", color: "#0F172A" },
  datePlaceholder:{ color: "#9CA3AF", fontWeight: "500" },
  addReturnText:  { fontSize: scale(13), fontWeight: "700", color: "#B4182A" },

  // Option rows (Travellers / Cabin) — mirrors HotelsScreen input rows
  optionRow:          { flexDirection: "row", alignItems: "center", minHeight: scale(60), backgroundColor: theme.colors.cloud, borderWidth: 1, borderColor: theme.colors.line, borderRadius: scale(16), paddingHorizontal: scale(14), marginBottom: scale(10) },
  optionIconCircle:   { width: scale(38), height: scale(38), backgroundColor: "#FFF0F2", borderRadius: scale(13), justifyContent: "center", alignItems: "center", marginRight: scale(10) },
  optionTextContainer:{ flex: 1 },
  optionValue:        { fontSize: scale(13), fontWeight: "600", color: "#1F2937" },

  // Search button — identical gradient / height / radius / shadow to HotelsScreen
  searchButtonWrapper: { marginTop: scale(1), shadowColor: "rgba(192,39,45,0.25)", shadowOffset: { width: 0, height: scale(4) }, shadowOpacity: 1, shadowRadius: scale(9), elevation: 3 },
  searchButtonGradient:{ borderRadius: scale(19), height: scale(38), justifyContent: "center", alignItems: "center" },
  searchButtonContent: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: scale(5) },
  searchButtonText:    { color: "#FFFFFF", fontSize: scale(13), fontWeight: "700" },

});
