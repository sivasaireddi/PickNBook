import React, { useState, useMemo, useCallback } from "react";
import {
  FlatList,
  ScrollView,
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
import FlightItineraryCard from "./components/FlightItineraryCard";
import CompactFlightCard from "./components/CompactFlightCard";
import SortSheet from "./components/SortSheet";
import FilterSheet from "./components/FilterSheet";

import CalendarFareBar from "./components/CalendarFareBar";

import { getFlightFareQuote, searchFlights } from "./services/flightBookingService";
import { writeFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { normalizeFlightObject, serializeSearchParamsForNavigation } from "./utils/flightNormalizeUtils";

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
  const returnDate = routeParams.returnDate || searchParams.returnDate || "";
  const adults = routeParams.adults || searchParams.adults || 1;
  const travelClass = routeParams.travelClass || searchParams.travelClass || "Economy";
  const traceId = routeParams.traceId || searchParams.traceId || rawFlights?.[0]?.traceId || rawFlights?.[0]?.TraceId;

  const normTripType = String(searchParams.tripType || routeParams.tripType || "oneway").toLowerCase();
  const journeyTypeNum = Number(searchParams.journeyType || routeParams.journeyType || 1);

  const isMultiCity = Boolean(
    journeyTypeNum === 3 ||
    normTripType === "multicity" ||
    rawFlights.isMultiCityResults
  );

  const isRoundTrip = !isMultiCity && Boolean(
    journeyTypeNum === 2 ||
    normTripType === "roundtrip" ||
    normTripType === "twoway" ||
    (returnDate && normTripType !== "oneway")
  );

  const multiCitySegments = useMemo(() => {
    if (searchParams.formattedSegments && searchParams.formattedSegments.length > 0) return searchParams.formattedSegments;
    if (searchParams.multiCitySegments && searchParams.multiCitySegments.length > 0) return searchParams.multiCitySegments;
    return [
      { origin, destination, date },
      { origin: destination, destination: "BLR", date },
    ];
  }, [searchParams, origin, destination, date]);

  const isUnifiedRoundTrip = useMemo(() => {
    if (!isRoundTrip) return false;
    const firstFlight = rawFlights?.[0];
    const rawSegments = firstFlight?.rawItem?.Segments || firstFlight?.Segments;
    return Array.isArray(rawSegments) && rawSegments.length > 1;
  }, [isRoundTrip, rawFlights]);

  const isUnifiedMultiCity = false;

  const [activeTab, setActiveTab] = useState("outbound");
  const [activeLegIndex, setActiveLegIndex] = useState(0);

  const [selectedOutboundFlight, setSelectedOutboundFlight] = useState(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState(null);
  const [selectedLegFlights, setSelectedLegFlights] = useState(() => Array(multiCitySegments.length).fill(null));

  // Split flights into Outbound & Return datasets
  const outboundFlightsList = useMemo(() => {
    if (rawFlights.outbound && rawFlights.outbound.length > 0) return rawFlights.outbound;
    return rawFlights.filter((f) => f.legIndex === 0 || f.tripDirection === "outbound" || !f.tripDirection);
  }, [rawFlights]);

  const returnFlightsList = useMemo(() => {
    if (rawFlights.return && rawFlights.return.length > 0) return rawFlights.return;
    return rawFlights.filter((f) => f.legIndex === 1 || f.tripDirection === "return");
  }, [rawFlights]);

  const currentDisplayList = useMemo(() => {
    if (isMultiCity) {
      if (isUnifiedMultiCity) return rawFlights;
      if (rawFlights.legs && rawFlights.legs[activeLegIndex]) {
        return rawFlights.legs[activeLegIndex];
      }
      return rawFlights.filter((f) => f.legIndex === activeLegIndex);
    }
    if (!isRoundTrip) return rawFlights;
    if (isUnifiedRoundTrip) return rawFlights;
    if (activeTab === "outbound") return outboundFlightsList;
    return returnFlightsList.length > 0 ? returnFlightsList : outboundFlightsList;
  }, [isMultiCity, activeLegIndex, isRoundTrip, isUnifiedRoundTrip, activeTab, rawFlights, outboundFlightsList, returnFlightsList]);

  React.useEffect(() => {
    console.log("================================================================================");
    console.log("✈️ [FLIGHT BOOKING FLOW - STEP 2: FLIGHT RESULTS / LISTING SCREEN MOUNTED]");
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`📍 Route: ${origin} ${isMultiCity ? "➜ MULTI-CITY" : isRoundTrip ? "⇄" : "✈️"} ${destination}`);
    console.log(`🔁 Mode: ${isMultiCity ? "MULTI CITY" : isRoundTrip ? "ROUND TRIP" : "ONE WAY"}`);
    console.log("================================================================================");
  }, [isMultiCity, isRoundTrip, origin, destination]);

  const [loading, setLoading] = useState(false);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const calculateMultiCityTotal = useCallback((flights) => {
    if (!flights || !Array.isArray(flights)) return 0;
    
    const uniqueResults = new Map();
    flights.forEach((flight) => {
      if (!flight) return;
      
      const resultIndex = flight.rawItem?.ResultIndex || flight.rawItem?.resultIndex || flight.ResultIndex || flight.resultIndex || flight.id;
      if (!resultIndex) return;

      if (!uniqueResults.has(resultIndex)) {
        uniqueResults.set(
          resultIndex,
          Number(
            flight.displayFare ??
            flight.price ??
            flight.rawItem?.B2CFinalFare ??
            flight.rawItem?.Fare?.B2CFinalFare ??
            0
          )
        );
      }
    });

    const multiCityTotal = Array.from(uniqueResults.values()).reduce((sum, fare) => sum + fare, 0);
    
    console.log('[MultiCity] Selected displayed legs:', flights.filter(Boolean).length);
    console.log('[MultiCity] Unique ResultIndexes:', uniqueResults.size);
    console.log('[MultiCity] Unique ResultIndexes Array:', Array.from(uniqueResults.keys()));
    console.log('[MultiCity] Calculated Total:', multiCityTotal);
    
    return multiCityTotal;
  }, []);


  const handleCalendarDateSelect = useCallback(async (selectedDateObj) => {
    const formattedDate = selectedDateObj.toISOString().slice(0, 10);
    console.log(`[FlightListingScreen] Calendar fare date clicked: ${formattedDate}. Re-querying search API...`);
    setLoading(true);
    try {
      const newResults = await searchFlights({
        from: origin,
        to: destination,
        date: formattedDate,
        returnDate,
        journeyType: isMultiCity ? 3 : isRoundTrip ? 2 : 1,
        adults,
        travelClass,
      });
      console.log(`[FlightListingScreen] Re-search successful. Loaded ${newResults?.length || 0} flights for ${formattedDate}`);
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
  }, [origin, destination, returnDate, isMultiCity, isRoundTrip, adults, travelClass, navigation]);

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
    minDuration,
    maxDuration,
    availableAirlines,
    availableCabinClasses,
  } = useFlightResults(currentDisplayList);

  // Handle flight selection
  const handleSelectFlight = useCallback(
    async (selectedFlight) => {
      const flightObj = selectedFlight.rawItem || selectedFlight;
      const resultIndex = flightObj?.resultIndex || flightObj?.ResultIndex;
      const activeTraceId = traceId || selectedFlight.traceId || selectedFlight.TraceId || flightObj.traceId || flightObj.TraceId || rawFlights?.[0]?.traceId || rawFlights?.[0]?.TraceId;

      if (isMultiCity && !isUnifiedMultiCity) {
        setSelectedLegFlights((prev) => {
          const next = [...prev];
          next[activeLegIndex] = selectedFlight;
          return next;
        });
        console.log(`[FlightListingScreen] Multi-city Leg ${activeLegIndex + 1} flight selected: ${selectedFlight.airlineName} ${selectedFlight.flightNumber || ""} (Price: ₹${selectedFlight.price || selectedFlight.displayFare})`);
        if (activeLegIndex < multiCitySegments.length - 1) {
          setActiveLegIndex((prev) => prev + 1);
        }
        return;
      }

      if (isRoundTrip && !isUnifiedRoundTrip) {
        if (activeTab === "outbound") {
          setSelectedOutboundFlight(selectedFlight);
          console.log(`[FlightListingScreen] Outbound flight selected: ${selectedFlight.airlineName} ${selectedFlight.flightNumber || ""} (Price: ₹${selectedFlight.price || selectedFlight.displayFare})`);
          if (returnFlightsList.length > 0) {
            setActiveTab("return");
          }
          return;
        } else {
          setSelectedReturnFlight(selectedFlight);
          console.log(`[FlightListingScreen] Return flight selected: ${selectedFlight.airlineName} ${selectedFlight.flightNumber || ""} (Price: ₹${selectedFlight.price || selectedFlight.displayFare})`);
          return;
        }
      }

      // One-way or Unified Round-Trip selection handling
      setLoading(true);
      try {
        console.log(`[FARE_REVALIDATION_STARTED] One-way selection revalidating fare with supplier | ResultIndex: ${resultIndex}`);
        let fareQuoteRes = null;
        if (activeTraceId && resultIndex) {
          fareQuoteRes = await getFlightFareQuote({
            traceId: activeTraceId,
            resultIndex,
            srdvType: flightObj.srdvType || "MixAPI",
            srdvIndex: flightObj.srdvIndex || "2",
            offeredFare: flightObj.offeredFare || flightObj.displayFare || flightObj.fare || selectedFlight?.price || 0,
            baseFare: flightObj.baseFare || flightObj.displayFare || flightObj.fare || 0,
            tax: flightObj.tax || 0,
            isLCC: flightObj.isLCC,
          });
        }

        const fareObj = fareQuoteRes?.Results?.Fare || fareQuoteRes?.Fare || fareQuoteRes?.Results;
        const confirmedFare = Number(fareObj?.OfferedFare || fareObj?.PublishedFare || selectedFlight.price || 0);
        const baseFare = Number(fareObj?.BaseFare || confirmedFare);
        const tax = Number(fareObj?.Tax || 0);
        const initialPrice = Number(flightObj.offeredFare || flightObj.displayFare || selectedFlight.price || 0);

        if (initialPrice > 0 && confirmedFare > 0 && initialPrice !== confirmedFare) {
          console.warn(`[FARE_CHANGED] Supplier updated fare from ₹${initialPrice} to ₹${confirmedFare}`);
          Alert.alert(
            "Fare Updated by Airline",
            `The airline updated the flight fare from ₹${initialPrice.toLocaleString("en-IN")} to ₹${confirmedFare.toLocaleString("en-IN")}.`,
            [{ text: "OK" }]
          );
        }

        let normalizedMultiCityFlights = undefined;
        if (isUnifiedMultiCity) {
           let segmentsMatrix = flightObj?.Segments || [];
           if (segmentsMatrix.length === 0) {
              const fareSegs = flightObj?.FareDataMultiple?.[0]?.FareSegments || [];
              if (fareSegs.length > 0) {
                 segmentsMatrix = fareSegs.map(fs => [fs]);
              }
           }
           
           normalizedMultiCityFlights = segmentsMatrix.map((segs, idx) => {
             const firstSeg = segs[0] || {};
             const lastSeg = segs[segs.length - 1] || firstSeg;
             
             const fromAirport = firstSeg.Origin?.AirportCode || firstSeg.FromAirportCode;
             const toAirport = lastSeg.Destination?.AirportCode || lastSeg.ToAirportCode;
             const fromCityName = firstSeg.Origin?.CityName || firstSeg.FromCity || fromAirport;
             const toCityName = lastSeg.Destination?.CityName || lastSeg.ToCity || toAirport;

             return {
                ...flightObj,
                fromCity: fromCityName,
                toCity: toCityName,
                from: fromAirport,
                to: toAirport,
             };
           });
        }

        const payload = {
          traceId: activeTraceId,
          resultIndex,
          srdvType: flightObj.srdvType || "MixAPI",
          srdvIndex: flightObj.srdvIndex || "2",
          isLCC: flightObj.isLCC,
          isRoundTrip: isUnifiedRoundTrip,
          isMultiCity: isUnifiedMultiCity,
          journeyType: isUnifiedMultiCity ? 3 : (isUnifiedRoundTrip ? 2 : (searchParams.journeyType || 1)),
          multiCityFlights: normalizedMultiCityFlights,
          flight: {
            ...flightObj,
            traceId: activeTraceId,
            resultIndex,
            selectedTravelClassPriceInr: confirmedFare,
            fromCity: origin,
            toCity: destination,
            isRoundTrip: isUnifiedRoundTrip,
            isMultiCity: isUnifiedMultiCity,
          },
          fareQuote: fareQuoteRes?.Results || fareQuoteRes,
          searchContext: {
            ...searchParams,
            travelClass,
            date,
            returnDate: isUnifiedRoundTrip ? returnDate : undefined,
            journeyType: isUnifiedMultiCity ? 3 : (isUnifiedRoundTrip ? 2 : (searchParams.journeyType || 1)),
          },
          fareSummary: {
            baseFare,
            tax,
            markup: 0,
            convenienceFee: 0,
            discount: 0,
            totalFare: confirmedFare,
          },
        };

        await writeFlightBookingFlowState(payload);
        navigation.navigate("FlightPassengerDetailsScreen", payload);
      } catch (e) {
        console.error("[FARE_REVALIDATION_FAILED] Select flight error:", e?.message);
        Alert.alert("Supplier Fare Revalidation Failed", e?.message || "Unable to confirm real-time pricing from airline. Please try another flight.");
      } finally {
        setLoading(false);
      }
    },
    [isMultiCity, activeLegIndex, multiCitySegments.length, isRoundTrip, activeTab, returnFlightsList.length, traceId, rawFlights, origin, destination, searchParams, travelClass, date, navigation]
  );

  const handleConfirmMultiCity = async () => {
    const unselectedIdx = selectedLegFlights.findIndex((f) => !f);
    if (unselectedIdx !== -1) {
      const seg = multiCitySegments[unselectedIdx];
      const fromName = seg?.origin?.airportCode || seg?.from || `Leg ${unselectedIdx + 1}`;
      const toName = seg?.destination?.airportCode || seg?.to || "";
      Alert.alert("Incomplete Selection", `Please select a flight for Leg ${unselectedIdx + 1} (${fromName} → ${toName}) before proceeding.`);
      return;
    }

    setLoading(true);
    try {
      const activeTraceId = traceId || selectedLegFlights[0]?.rawItem?.traceId || selectedLegFlights[0]?.traceId;
      
      // Use Set to extract unique ResultIndexes to pass to getFlightFareQuote
      const uniqueIndices = Array.from(new Set(selectedLegFlights.map((f) => f.rawItem?.ResultIndex || f.rawItem?.resultIndex || f.resultIndex || f.ResultIndex).filter(Boolean)));
      const combinedResultIndex = uniqueIndices.join(",");
      
      const initialTotal = calculateMultiCityTotal(selectedLegFlights);

      console.log(`[FARE_REVALIDATION_STARTED] Multi-city revalidating fare with supplier | Combined ResultIndex: ${combinedResultIndex}`);

      let fareQuoteRes = null;
      if (activeTraceId && combinedResultIndex) {
        try {
          fareQuoteRes = await getFlightFareQuote({
            traceId: activeTraceId,
            resultIndex: combinedResultIndex,
            srdvType: selectedLegFlights[0]?.rawItem?.srdvType || "MixAPI",
            srdvIndex: selectedLegFlights[0]?.rawItem?.srdvIndex || "2",
            offeredFare: initialTotal,
            baseFare: initialTotal,
            tax: 0,
            isLCC: selectedLegFlights.some((f) => f.isLCC),
          });
        } catch (quoteErr) {
          console.warn("[FARE_REVALIDATION_WARNING] Multi-city combined quote returned error, proceeding with leg fares:", quoteErr?.message);
        }
      }

      const fareObj = fareQuoteRes?.Results?.Fare || fareQuoteRes?.Fare || fareQuoteRes?.Results;
      const confirmedTotal = Number(fareObj?.OfferedFare || fareObj?.PublishedFare || initialTotal);
      const baseFare = Number(fareObj?.BaseFare || confirmedTotal);
      const tax = Number(fareObj?.Tax || 0);

      // Normalize all multi-city leg objects to guarantee clean origin/destination display across screens
      const normalizedMultiCityFlights = selectedLegFlights.map((leg, idx) => {
        const segInfo = multiCitySegments[idx] || {};
        const originCode = String(segInfo.origin?.airportCode || segInfo.from || leg.fromCity || leg.origin || "DEL").toUpperCase();
        const originCity = String(segInfo.origin?.cityName || segInfo.origin?.airportName || leg.fromCity || originCode);

        const destCode = String(segInfo.destination?.airportCode || segInfo.to || leg.toCity || leg.destination || "BOM").toUpperCase();
        const destCity = String(segInfo.destination?.cityName || segInfo.destination?.airportName || leg.toCity || destCode);

        return normalizeFlightObject({
          ...leg,
          fromCity: originCity,
          toCity: destCity,
          from: originCode,
          to: destCode,
          origin: originCode,
          destination: destCode,
          originCode,
          destinationCode: destCode,
          originCity,
          destinationCity: destCity,
        }, idx);
      });

      const serializableSearchParams = serializeSearchParamsForNavigation({
        ...searchParams,
        travelClass,
        date,
        journeyType: 3,
        tripType: "multicity",
      });

      const payload = {
        traceId: activeTraceId,
        resultIndex: combinedResultIndex,
        srdvType: selectedLegFlights[0]?.rawItem?.srdvType || "MixAPI",
        srdvIndex: selectedLegFlights[0]?.rawItem?.srdvIndex || "2",
        isLCC: selectedLegFlights.some((f) => (f.rawItem || f).isLCC),
        isMultiCity: true,
        journeyType: 3,
        multiCityFlights: normalizedMultiCityFlights,
        flight: {
          ...normalizedMultiCityFlights[0],
          traceId: activeTraceId,
          resultIndex: combinedResultIndex,
          selectedTravelClassPriceInr: confirmedTotal,
          fromCity: origin,
          toCity: destination,
        },
        fareQuote: fareQuoteRes?.Results || fareQuoteRes,
        searchContext: serializableSearchParams,
        fareSummary: {
          baseFare,
          tax,
          markup: 0,
          convenienceFee: 0,
          discount: 0,
          totalFare: confirmedTotal,
        },
      };

      await writeFlightBookingFlowState(payload);
      navigation.navigate("FlightPassengerDetailsScreen", payload);
    } catch (e) {
      console.error("[FARE_REVALIDATION_FAILED] Multi-city error:", e?.message);
      Alert.alert("Supplier Fare Revalidation Failed", e?.message || "Unable to confirm real-time pricing from airline. Please try another flight.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRoundTrip = async () => {
    if (!selectedOutboundFlight) {
      Alert.alert("Outbound Flight Required", "Please select an outbound flight first.");
      return;
    }
    if (!selectedReturnFlight) {
      Alert.alert("Return Flight Required", "Please select a return flight to complete your round trip.");
      return;
    }

    setLoading(true);
    try {
      const outboundObj = selectedOutboundFlight.rawItem || selectedOutboundFlight;
      const returnObj = selectedReturnFlight.rawItem || selectedReturnFlight;
      const activeTraceId = traceId || outboundObj.traceId || returnObj.traceId;

      const outboundPrice = Number(selectedOutboundFlight.displayFare || selectedOutboundFlight.price || 0);
      const returnPrice = Number(selectedReturnFlight.displayFare || selectedReturnFlight.price || 0);
      const initialTotal = outboundPrice + returnPrice;

      // Complete combined ResultIndex for SRDV Round Trip
      const combinedResultIndex = `${outboundObj.resultIndex || ""},${returnObj.resultIndex || ""}`;

      console.log(`[FARE_REVALIDATION_STARTED] Round-trip selection revalidating fare with supplier | ResultIndex: ${combinedResultIndex}`);

      let fareQuoteRes = null;
      if (activeTraceId && combinedResultIndex) {
        try {
          fareQuoteRes = await getFlightFareQuote({
            traceId: activeTraceId,
            resultIndex: combinedResultIndex,
            srdvType: outboundObj.srdvType || "MixAPI",
            srdvIndex: outboundObj.srdvIndex || "2",
            offeredFare: initialTotal,
            baseFare: initialTotal,
            tax: 0,
            isLCC: Boolean(outboundObj.isLCC || returnObj.isLCC),
          });
        } catch (quoteErr) {
          console.warn("[FARE_REVALIDATION_WARNING] Combined quote call returned error, proceeding with individual leg quotes:", quoteErr?.message);
        }
      }

      const fareObj = fareQuoteRes?.Results?.Fare || fareQuoteRes?.Fare || fareQuoteRes?.Results;
      const confirmedTotal = Number(fareObj?.OfferedFare || fareObj?.PublishedFare || initialTotal);

      if (initialTotal > 0 && confirmedTotal > 0 && initialTotal !== confirmedTotal) {
        console.warn(`[FARE_CHANGED] Supplier updated round-trip total from ₹${initialTotal} to ₹${confirmedTotal}`);
        Alert.alert(
          "Fare Updated by Airline",
          `The airline updated the total round-trip fare from ₹${initialTotal.toLocaleString("en-IN")} to ₹${confirmedTotal.toLocaleString("en-IN")}.`,
          [{ text: "OK" }]
        );
      }

      const payload = {
        traceId: activeTraceId,
        resultIndex: combinedResultIndex,
        srdvType: outboundObj.srdvType || "MixAPI",
        srdvIndex: outboundObj.srdvIndex || "2",
        isLCC: Boolean(outboundObj.isLCC || returnObj.isLCC),
        isRoundTrip: true,
        outboundFlight: selectedOutboundFlight,
        returnFlight: selectedReturnFlight,
        flight: {
          ...outboundObj,
          isRoundTrip: true,
          outbound: selectedOutboundFlight,
          return: selectedReturnFlight,
          selectedTravelClassPriceInr: confirmedTotal,
          fromCity: origin,
          toCity: destination,
        },
        fareQuote: fareQuoteRes?.Results || fareQuoteRes,
        searchContext: {
          ...searchParams,
          travelClass,
          date,
          returnDate,
          journeyType: 2,
        },
        fareSummary: {
          baseFare: confirmedTotal,
          tax: 0,
          markup: 0,
          convenienceFee: 0,
          discount: 0,
          totalFare: confirmedTotal,
        },
      };

      await writeFlightBookingFlowState(payload);
      navigation.navigate("FlightPassengerDetailsScreen", payload);
    } catch (e) {
      console.error("[FARE_REVALIDATION_FAILED] Round trip error:", e?.message);
      Alert.alert("Supplier Fare Revalidation Failed", e?.message || "Unable to confirm real-time pricing from airline. Please try another flight.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Route Header */}
      <RouteHeader
        origin={origin}
        destination={destination}
        date={isRoundTrip ? `${date} - ${returnDate || "Return"}` : date}
        passengers={`${adults} Pax`}
        travelClass={travelClass}
        onBack={() => navigation.goBack()}
        onModify={() => navigation.navigate("FlightSearchScreen")}
      />

      {/* Multi-City Tab Controller Banner */}
      {isMultiCity && !isUnifiedMultiCity && (
        <View style={styles.multiCityTabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.multiCityScroll}>
            {multiCitySegments.map((seg, idx) => {
              const isSelected = activeLegIndex === idx;
              const selectedFlight = selectedLegFlights[idx];
              const segOrigin = seg.origin?.airportCode || seg.origin || seg.from || `Leg ${idx + 1}`;
              const segDest = seg.destination?.airportCode || seg.destination || seg.to || "";
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.85}
                  onPress={() => setActiveLegIndex(idx)}
                  style={[styles.multiCityTabBtn, isSelected && styles.multiCityTabBtnActive]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="airplane-outline" size={14} color={isSelected ? "#FFFFFF" : PRIMARY_RED} />
                    <Text style={[styles.multiCityTabTitle, isSelected && styles.multiCityTabTitleActive]}>
                      Leg {idx + 1}: {segOrigin} {segDest ? `→ ${segDest}` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.multiCityTabSub, isSelected && styles.multiCityTabTitleActive]}>
                    {selectedFlight ? `Selected (₹${selectedFlight.displayFare || selectedFlight.price})` : "Tap to Select"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Round Trip Tab Controller Banner */}
      {isRoundTrip && !isUnifiedRoundTrip && (
        <View style={styles.roundTripBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("outbound")}
            style={[styles.roundTab, activeTab === "outbound" && styles.activeRoundTab]}
          >
            <Ionicons name="airplane" size={16} color={activeTab === "outbound" ? "#FFFFFF" : PRIMARY_RED} />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.roundTabText, activeTab === "outbound" && styles.activeRoundTabText]}>
                1. Departure ({origin} → {destination})
              </Text>
              <Text style={[styles.roundTabSub, activeTab === "outbound" && styles.activeRoundTabText]}>
                {selectedOutboundFlight ? `Selected (₹${selectedOutboundFlight.displayFare || selectedOutboundFlight.price})` : "Tap to Select"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("return")}
            style={[styles.roundTab, activeTab === "return" && styles.activeRoundTab]}
          >
            <Ionicons name="airplane" size={16} color={activeTab === "return" ? "#FFFFFF" : PRIMARY_RED} style={{ transform: [{ rotate: "180deg" }] }} />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.roundTabText, activeTab === "return" && styles.activeRoundTabText]}>
                2. Return ({destination} → {origin})
              </Text>
              <Text style={[styles.roundTabSub, activeTab === "return" && styles.activeRoundTabText]}>
                {selectedReturnFlight ? `Selected (₹${selectedReturnFlight.displayFare || selectedReturnFlight.price})` : "Tap to Select"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Calendar Fare Bar */}
      <CalendarFareBar
        origin={activeTab === "return" ? destination : origin}
        destination={activeTab === "return" ? origin : destination}
        selectedDate={activeTab === "return" && returnDate ? returnDate : date}
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
          <Text style={styles.loadingText}>Confirming flight details...</Text>
        </View>
      )}

      {/* Results List / Empty State */}
      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = (isMultiCity && !isUnifiedMultiCity)
            ? selectedLegFlights[activeLegIndex]?.id === item.id
            : (isRoundTrip && !isUnifiedRoundTrip)
            ? (activeTab === "outbound" && selectedOutboundFlight?.id === item.id) ||
              (activeTab === "return" && selectedReturnFlight?.id === item.id)
            : false;

          return (
            <View style={isSelected ? styles.selectedCardWrapper : null}>
              <CompactFlightCard 
                flight={item} 
                onSelect={handleSelectFlight} 
                onViewDetails={(f) => navigation.navigate("FlightDetailsScreen", { flight: f, onSelect: handleSelectFlight })}
              />
            </View>
          );
        }}
        contentContainerStyle={[styles.listContent, ((isRoundTrip && !isUnifiedRoundTrip) || (isMultiCity && !isUnifiedMultiCity)) && { paddingBottom: 90 }]}
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

      {/* Sticky Bottom Bar for Round Trip & Multi-City */}
      {((isRoundTrip && !isUnifiedRoundTrip) || (isMultiCity && !isUnifiedMultiCity)) && (
        <View style={styles.stickyBottomBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bottomBarLabel}>{isMultiCity ? "MULTI-CITY TOTAL" : "ROUND TRIP TOTAL"}</Text>
            <Text style={styles.bottomBarPrice}>
              ₹{isMultiCity
                ? calculateMultiCityTotal(selectedLegFlights).toLocaleString("en-IN")
                : (
                    Number(selectedOutboundFlight?.displayFare || selectedOutboundFlight?.price || 0) +
                    Number(selectedReturnFlight?.displayFare || selectedReturnFlight?.price || 0)
                  ).toLocaleString("en-IN")
              }
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={isMultiCity ? handleConfirmMultiCity : handleConfirmRoundTrip}
            style={[
              styles.proceedRoundTripBtn,
              (isMultiCity ? selectedLegFlights.some((f) => !f) : (!selectedOutboundFlight || !selectedReturnFlight)) && styles.disabledProceedBtn,
            ]}
          >
            <Text style={styles.proceedRoundTripText}>
              {isMultiCity
                ? selectedLegFlights.every(Boolean)
                  ? "Book Multi-City →"
                  : `Select Leg ${selectedLegFlights.findIndex((f) => !f) + 1}`
                : !selectedOutboundFlight
                ? "Select Outbound"
                : !selectedReturnFlight
                ? "Select Return"
                : "Book Round Trip →"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
        minDuration={minDuration}
        maxDuration={maxDuration}
        availableAirlines={availableAirlines}
        availableCabinClasses={availableCabinClasses}
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
  roundTripBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  roundTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeRoundTab: {
    backgroundColor: PRIMARY_RED,
    borderColor: PRIMARY_RED,
  },
  roundTabText: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  roundTabSub: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  activeRoundTabText: {
    color: "#FFFFFF",
  },
  selectedCardWrapper: {
    borderWidth: 2,
    borderColor: PRIMARY_RED,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  stickyBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bottomBarLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  bottomBarPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  multiCityTabContainer: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  multiCityScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  multiCityTabBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 150,
  },
  multiCityTabBtnActive: {
    backgroundColor: PRIMARY_RED,
    borderColor: PRIMARY_RED,
  },
  multiCityTabTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  multiCityTabTitleActive: {
    color: "#FFFFFF",
  },
  multiCityTabSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  proceedRoundTripBtn: {
    backgroundColor: PRIMARY_RED,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  disabledProceedBtn: {
    backgroundColor: "#64748B",
  },
  proceedRoundTripText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});

