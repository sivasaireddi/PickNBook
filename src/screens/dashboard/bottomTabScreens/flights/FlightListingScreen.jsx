import React, { useState, useMemo, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import useFlightResults from "./hooks/useFlightResults";
import RouteHeader from "./components/RouteHeader";
import FilterBar from "./components/FilterBar";
import FlightCard from "./components/FlightCard";
import SortSheet from "./components/SortSheet";
import FilterSheet from "./components/FilterSheet";

import CalendarFareBar from "./components/CalendarFareBar";

import { getFlightFareQuote, searchFlights } from "./services/flightBookingService";
import { writeFlightBookingFlowState } from "./services/flightBookingFlowStore";

const PRIMARY_RED = "#E11D2E";
const BACKGROUND_COLOR = "#F8F9FB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

export default function FlightListingScreen({ route, navigation }) {
  const routeParams = route?.params || {};
  const rawFlights = useMemo(() => {
    return routeParams.flights || routeParams.rawResults || [];
  }, [routeParams]);

  const searchParams = routeParams.searchParams || {};
  const formatCityCode = (val, fallback) => {
    if (!val) return fallback;
    if (typeof val === "string") return val;
    return val.airportCode || val.cityName || val.airportId || fallback;
  };

  const origin = formatCityCode(routeParams.origin || searchParams.from, "DEL");
  const destination = formatCityCode(routeParams.destination || searchParams.to, "BOM");
  const date = routeParams.departureDate || searchParams.date || "3 Aug 2026";
  const adults = routeParams.adults || searchParams.adults || 1;
  const travelClass = routeParams.travelClass || searchParams.travelClass || "Economy";
  const traceId = routeParams.traceId || searchParams.traceId || rawFlights?.[0]?.traceId || rawFlights?.[0]?.TraceId;

  const [loading, setLoading] = useState(false);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const handleCalendarDateSelect = useCallback(async (selectedDateObj) => {
    const formattedDate = selectedDateObj.toISOString().slice(0, 10);
    setLoading(true);
    try {
      const newResults = await searchFlights({
        from: origin,
        to: destination,
        date: formattedDate,
        adults,
        travelClass,
      });
      navigation.setParams({
        departureDate: formattedDate,
        flights: newResults,
        rawResults: newResults,
      });
    } catch (err) {
      console.log("[FlightListingScreen] Calendar fare search failed:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [origin, destination, adults, travelClass, navigation]);

  // Hook managing derived filtering and sorting
  const {
    filteredResults,
    activeSort,
    setActiveSort,
    dealsOnly,
    toggleDealsOnly,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    minPrice,
    maxPrice,
    availableAirlines,
  } = useFlightResults(rawFlights);

  // Handle flight selection
  const handleSelectFlight = useCallback(
    async (selectedFlight) => {
      const flightObj = selectedFlight.rawItem || selectedFlight;
      const resultIndex = flightObj?.resultIndex || flightObj?.ResultIndex;
      const activeTraceId = traceId || selectedFlight.traceId || selectedFlight.TraceId || flightObj.traceId || flightObj.TraceId || rawFlights?.[0]?.traceId || rawFlights?.[0]?.TraceId;

      console.log("\n==========================================");
      console.log("✈️ [FLIGHT RESULTS SCREEN - SELECT FLIGHT]");
      console.log("[FlightListingScreen] Selected Flight ID:", selectedFlight.id);
      console.log("[FlightListingScreen] Trace ID:", activeTraceId);
      console.log("[FlightListingScreen] Airline:", selectedFlight.airlineName);
      console.log("[FlightListingScreen] Price:", selectedFlight.price);
      console.log("==========================================\n");

      setLoading(true);
      try {
        let fareQuoteRes = null;
        if (activeTraceId && resultIndex) {
          console.log("[FlightListingScreen] Fetching Live FareQuote...");
          fareQuoteRes = await getFlightFareQuote({
            traceId: activeTraceId,
            resultIndex,
            srdvType: flightObj.srdvType || "MixAPI",
            srdvIndex: flightObj.srdvIndex || "2",
          });
        }

        const fareObj = fareQuoteRes?.Results?.Fare || fareQuoteRes?.Fare || fareQuoteRes?.Results;
        const activeFare = Number(fareObj?.OfferedFare || fareObj?.PublishedFare || selectedFlight.price || 0);
        const baseFare = Number(fareObj?.BaseFare || activeFare);
        const tax = Number(fareObj?.Tax || 0);
        const markup = Number(fareQuoteRes?.Results?.PickNBookMarkup || 0);
        const discount = Number(fareQuoteRes?.Results?.PickNBookDiscount || 0);
        const convenienceFee = Number(fareObj?.TransactionFee || fareObj?.OtherCharges || 0);

        const payload = {
          traceId: activeTraceId,
          resultIndex,
          srdvType: flightObj.srdvType || "MixAPI",
          srdvIndex: flightObj.srdvIndex || "2",
          flight: {
            ...flightObj,
            traceId: activeTraceId,
            resultIndex,
            selectedTravelClassPriceInr: activeFare,
            fromCity: origin,
            toCity: destination,
          },
          fareQuote: fareQuoteRes?.Results || fareQuoteRes,
          searchContext: {
            ...searchParams,
            travelClass,
            date,
          },
          fareSummary: {
            baseFare,
            tax,
            markup,
            convenienceFee,
            discount,
            totalFare: activeFare + markup + convenienceFee - discount,
          },
        };

        await writeFlightBookingFlowState(payload);
        navigation.navigate("FlightPassengerDetailsScreen", payload);
      } catch (e) {
        console.error("[FlightListingScreen] Select flight error:", e?.message);
        Alert.alert("Flight Selection Error", e?.message || "Failed to confirm flight details. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [traceId, origin, destination, date, travelClass, searchParams, navigation]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Route Header */}
      <RouteHeader
        origin={origin}
        destination={destination}
        date={date}
        passengers={`${adults} Pax`}
        travelClass={travelClass}
        onBack={() => navigation.goBack()}
        onModify={() => navigation.navigate("FlightSearchScreen")}
      />

      {/* Calendar Fare Bar */}
      <CalendarFareBar
        origin={origin}
        destination={destination}
        selectedDate={date}
        travelClass={travelClass}
        onSelectDate={handleCalendarDateSelect}
      />

      {/* Filter Bar */}
      <FilterBar
        activeSort={activeSort}
        onSelectSort={setActiveSort}
        dealsOnly={dealsOnly}
        onToggleDeals={toggleDealsOnly}
        activeFilterCount={activeFilterCount}
        onOpenSortSheet={() => setSortSheetVisible(true)}
        onOpenFilterSheet={() => setFilterSheetVisible(true)}
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={PRIMARY_RED} />
          <Text style={styles.loadingText}>Confirming flight fare...</Text>
        </View>
      )}

      {/* Results List / Empty State */}
      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FlightCard flight={item} onSelect={handleSelectFlight} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="airplane-outline" size={36} color={PRIMARY_RED} />
              </View>
              <Text style={styles.emptyTitle}>No flights match your filters</Text>
              <Text style={styles.emptySub}>
                Try adjusting your filter options or clearing filters to see available flights.
              </Text>
              <TouchableOpacity activeOpacity={0.85} onPress={resetFilters} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Reset filters</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Bottom Sheets */}
      <SortSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        activeSort={activeSort}
        onSelectSort={setActiveSort}
      />

      <FilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        filters={filters}
        onApplyFilters={setFilters}
        onResetFilters={resetFilters}
        minPrice={minPrice}
        maxPrice={maxPrice}
        availableAirlines={availableAirlines}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  loadingOverlay: {
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY_RED,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  resetBtn: {
    backgroundColor: PRIMARY_RED,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
