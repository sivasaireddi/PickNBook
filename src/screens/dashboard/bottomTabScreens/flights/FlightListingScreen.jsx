import React, { useState, useMemo, useCallback, useRef } from "react";
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


import { getFlightFareQuote, searchFlights } from "./services/flightBookingService";
import { writeFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { normalizeFlightObject, serializeSearchParamsForNavigation } from "./utils/flightNormalizeUtils";
import { allSelectionsShareTraceId, compactFlightForFlow, extractAuthoritativeFare, isValidAuthoritativeFare, safeFlightLog, selectedFlightIdentity } from "./utils/flightFlowUtils";

const PRIMARY_RED = "#E11D2E";
const BACKGROUND_COLOR = "#F8F9FB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

function getRecoverableFareMessage(error) {
  if (error?.backendCode === "MISSING_IDENTITY") {
    return "This fare is missing required booking information. Refresh results to try again.";
  }
  if (error?.isNetworkError) {
    return "Unable to confirm the fare. Check your connection and retry.";
  }
  const details = `${error?.backendCode || ""} ${error?.backendMessage || error?.message || ""}`.toLowerCase();
  if (details.includes("price") && details.includes("change")) {
    return "The airline changed this fare. Please retry to review the latest price.";
  }
  if (["expired", "unavailable", "not available", "sold out", "fare not found"].some((term) => details.includes(term))) {
    return "This fare is no longer available. Please retry or select another fare.";
  }
  return "We couldn’t confirm this fare. Please retry or select another fare.";
}

function withAuthoritativeFare(selectedFare, fare) {
  const current = selectedFare || {};
  return {
    ...current,
    OfferedFare: fare.total,
    B2CFinalFare: fare.total,
    Fare: {
      ...(current.Fare || {}),
      BaseFare: fare.baseFare,
      Tax: fare.tax,
      OfferedFare: fare.total,
      B2CFinalFare: fare.total,
    },
  };
}

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

  const origin = formatCityCode(routeParams.origin || searchParams.from, "—");
  const destination = formatCityCode(routeParams.destination || searchParams.to, "—");
  const date = routeParams.departureDate || searchParams.date || "";
  const returnDate = routeParams.returnDate || searchParams.returnDate || "";
  const adults = routeParams.adults || searchParams.adults || 1;
  const travelClass = routeParams.travelClass || searchParams.travelClass || "Economy";

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
    return [];
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
  const [fareError, setFareError] = useState(null);
  const fareQuoteInFlightRef = useRef(false);
  const retryFareActionRef = useRef(null);
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

  const handleRefreshResults = useCallback(async () => {
    if (fareQuoteInFlightRef.current) return;
    fareQuoteInFlightRef.current = true;
    setLoading(true);
    try {
      const refreshedFlights = await searchFlights({
        ...searchParams,
        from: searchParams.from || routeParams.origin || origin,
        to: searchParams.to || routeParams.destination || destination,
        date: searchParams.date || routeParams.departureDate || date,
        returnDate: searchParams.returnDate || routeParams.returnDate || returnDate,
      });
      retryFareActionRef.current = null;
      setFareError(null);
      navigation.setParams({ flights: refreshedFlights, rawResults: refreshedFlights });
    } catch (error) {
      retryFareActionRef.current = handleRefreshResults;
      setFareError({
        message: "Unable to refresh flight results. Check your connection and try again.",
        actionLabel: "Refresh Results",
      });
      safeFlightLog("[Flight][Search][HandledError]", {
        status: error?.status || null,
        message: String(error?.message || "Search refresh failed").slice(0, 240),
        retryAvailable: true,
      });
    } finally {
      fareQuoteInFlightRef.current = false;
      setLoading(false);
    }
  }, [searchParams, routeParams.origin, routeParams.destination, routeParams.departureDate, routeParams.returnDate, origin, destination, date, returnDate, navigation]);

  const recordFareQuoteFailure = useCallback((error, identity, retryAction, actionLabel = "Retry") => {
    const message = getRecoverableFareMessage(error);
    retryFareActionRef.current = retryAction;
    setFareError({ message, actionLabel });
    safeFlightLog("[Flight][FareQuote][HandledError]", {
      httpStatus: error?.httpStatus || null,
      backendCode: error?.backendCode || null,
      message: String(error?.backendMessage || error?.message || message).slice(0, 240),
      resolvedTraceId: identity?.resolvedTraceId || identity?.traceId || "",
      resolvedResultIndex: identity?.resolvedResultIndex || identity?.resultIndex || "",
      retryAvailable: Boolean(retryAction),
    });
  }, []);

  // Handle flight selection
  const handleSelectFlight = useCallback(
    async (selectedFlight) => {
      const flightObj = selectedFlight.rawItem || selectedFlight;
      const identity = selectedFlightIdentity(selectedFlight);
      const resultIndex = identity.resultIndex;
      const activeTraceId = identity.traceId;
      safeFlightLog("[Flight][Results][FareSelected]", { ...identity, fareTierCount: flightObj?.FareDataMultiple?.length || 0 });

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
      if (fareQuoteInFlightRef.current) return;
      fareQuoteInFlightRef.current = true;
      setFareError(null);
      setLoading(true);
      try {
        safeFlightLog("[Flight][Results][FareIdentityResolved]", identity);
        if (!activeTraceId || !resultIndex) {
          const missingIdentityError = new Error("Selected fare is missing its originating TraceId or ResultIndex.");
          missingIdentityError.backendCode = "MISSING_IDENTITY";
          throw missingIdentityError;
        }
        safeFlightLog("[Flight][FareQuote][Request]", {
          endpoint: "/api/flight/srdv/FareQuote",
          traceId: activeTraceId,
          resultIndex,
          srdvType: identity.srdvType,
          srdvIndex: identity.srdvIndex,
        });
        const fareQuoteRes = await getFlightFareQuote({
          traceId: activeTraceId,
          resultIndex,
          srdvType: identity.srdvType,
          srdvIndex: identity.srdvIndex,
          offeredFare: selectedFlight.offeredFare || selectedFlight.displayFare || selectedFlight.price || 0,
          baseFare: selectedFlight.baseFare || 0,
          tax: selectedFlight.tax || 0,
          isLCC: identity.isLCC,
        });

        if (!fareQuoteRes) throw new Error("The airline fare could not be confirmed.");
        safeFlightLog("[Flight][FareQuote][Response]", {
          traceId: activeTraceId,
          resultIndex,
          status: 200,
        });
        const confirmed = extractAuthoritativeFare(fareQuoteRes, 0);
        if (!isValidAuthoritativeFare(confirmed)) {
          const invalidFareError = new Error("The supplier returned an invalid fare.");
          invalidFareError.backendCode = "INVALID_FARE_QUOTE";
          throw invalidFareError;
        }
        const confirmedFare = confirmed.total;
        const baseFare = confirmed.baseFare;
        const tax = confirmed.tax;
        const initialPrice = Number(flightObj.offeredFare || flightObj.displayFare || selectedFlight.price || 0);

        if (initialPrice > 0 && confirmedFare > 0 && initialPrice !== confirmedFare) {
          safeFlightLog("[Flight][FareQuote][FareUpdated]", { total: confirmedFare, changed: true });
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
          srdvType: identity.srdvType,
          srdvIndex: identity.srdvIndex,
          source: identity.source,
          isLCC: identity.isLCC,
          isRoundTrip: isUnifiedRoundTrip,
          isMultiCity: isUnifiedMultiCity,
          journeyType: isUnifiedMultiCity ? 3 : (isUnifiedRoundTrip ? 2 : (searchParams.journeyType || 1)),
          multiCityFlights: normalizedMultiCityFlights,
          flight: compactFlightForFlow(selectedFlight, {
            traceId: activeTraceId,
            resultIndex,
            selectedTravelClassPriceInr: confirmedFare,
            displayFare: confirmedFare,
            offeredFare: confirmedFare,
            baseFare,
            tax,
            selectedFare: withAuthoritativeFare(selectedFlight.selectedFare, confirmed),
            fromCity: origin,
            toCity: destination,
            isRoundTrip: isUnifiedRoundTrip,
            isMultiCity: isUnifiedMultiCity,
          }),
          fareQuote: fareQuoteRes?.Results || fareQuoteRes,
          quoteTimestamp: Date.now(),
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
        retryFareActionRef.current = null;
        safeFlightLog("[Flight][Navigation]", { destinationRoute: "FlightPassengerDetailsScreen" });
        navigation.navigate("FlightPassengerDetailsScreen", payload);
      } catch (e) {
        const isMissingIdentity = e?.backendCode === "MISSING_IDENTITY";
        recordFareQuoteFailure(
          e,
          identity,
          isMissingIdentity ? handleRefreshResults : () => handleSelectFlight(selectedFlight),
          isMissingIdentity ? "Refresh Results" : "Retry"
        );
      } finally {
        fareQuoteInFlightRef.current = false;
        setLoading(false);
      }
    },
    [isMultiCity, activeLegIndex, multiCitySegments.length, isRoundTrip, activeTab, returnFlightsList.length, rawFlights, origin, destination, searchParams, travelClass, date, navigation, recordFareQuoteFailure, handleRefreshResults]
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

    if (fareQuoteInFlightRef.current) return;
    fareQuoteInFlightRef.current = true;
    setFareError(null);
    setLoading(true);
    try {
      if (!allSelectionsShareTraceId(selectedLegFlights)) {
        Alert.alert("Unsupported flight combination", "These multi-city legs came from different supplier sessions. Please choose flights from the same combined search result.");
        return;
      }
      const activeTraceId = selectedFlightIdentity(selectedLegFlights[0]).traceId;
      
      // Use Set to extract unique ResultIndexes to pass to getFlightFareQuote
      const uniqueIndices = Array.from(new Set(selectedLegFlights.map((f) => selectedFlightIdentity(f).resultIndex).filter(Boolean)));
      const combinedResultIndex = uniqueIndices.join(",");
      
      const initialTotal = calculateMultiCityTotal(selectedLegFlights);

      console.log(`[FARE_REVALIDATION_STARTED] Multi-city revalidating fare with supplier | Combined ResultIndex: ${combinedResultIndex}`);

      let fareQuoteRes = null;
      if (activeTraceId && combinedResultIndex) {
        fareQuoteRes = await getFlightFareQuote({
            traceId: activeTraceId,
            resultIndex: combinedResultIndex,
            srdvType: selectedFlightIdentity(selectedLegFlights[0]).srdvType,
            srdvIndex: selectedFlightIdentity(selectedLegFlights[0]).srdvIndex,
            offeredFare: initialTotal,
            baseFare: initialTotal,
            tax: 0,
            isLCC: selectedLegFlights.some((f) => selectedFlightIdentity(f).isLCC),
          });
      }

      if (!fareQuoteRes) throw new Error("The combined multi-city fare could not be confirmed.");
      const confirmed = extractAuthoritativeFare(fareQuoteRes, 0);
      if (!isValidAuthoritativeFare(confirmed)) {
        const invalidFareError = new Error("The supplier returned an invalid fare.");
        invalidFareError.backendCode = "INVALID_FARE_QUOTE";
        throw invalidFareError;
      }
      const confirmedTotal = confirmed.total;
      const baseFare = confirmed.baseFare;
      const tax = confirmed.tax;
      if (initialTotal > 0 && confirmedTotal > 0 && initialTotal !== confirmedTotal) {
        safeFlightLog("[Flight][FareQuote][FareUpdated]", { total: confirmedTotal, changed: true });
      }

      // Normalize all multi-city leg objects to guarantee clean origin/destination display across screens
      const normalizedMultiCityFlights = selectedLegFlights.map((leg, idx) => {
        const segInfo = multiCitySegments[idx] || {};
        const originCode = String(segInfo.origin?.airportCode || segInfo.from || leg.fromCity || leg.origin || "").toUpperCase();
        const originCity = String(segInfo.origin?.cityName || segInfo.origin?.airportName || leg.fromCity || originCode);

        const destCode = String(segInfo.destination?.airportCode || segInfo.to || leg.toCity || leg.destination || "").toUpperCase();
        const destCity = String(segInfo.destination?.cityName || segInfo.destination?.airportName || leg.toCity || destCode);

        return compactFlightForFlow(normalizeFlightObject({
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
        }, idx));
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
        srdvType: selectedFlightIdentity(selectedLegFlights[0]).srdvType,
        srdvIndex: selectedFlightIdentity(selectedLegFlights[0]).srdvIndex,
        source: selectedFlightIdentity(selectedLegFlights[0]).source,
        isLCC: selectedLegFlights.some((f) => selectedFlightIdentity(f).isLCC),
        isMultiCity: true,
        journeyType: 3,
        multiCityFlights: normalizedMultiCityFlights,
        flight: compactFlightForFlow(normalizedMultiCityFlights[0], {
          traceId: activeTraceId,
          resultIndex: combinedResultIndex,
          selectedTravelClassPriceInr: confirmedTotal,
          displayFare: confirmedTotal,
          offeredFare: confirmedTotal,
          baseFare,
          tax,
          selectedFare: withAuthoritativeFare(selectedLegFlights[0]?.selectedFare, confirmed),
          fromCity: origin,
          toCity: destination,
        }),
        fareQuote: fareQuoteRes?.Results || fareQuoteRes,
        quoteTimestamp: Date.now(),
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
      recordFareQuoteFailure(e, selectedFlightIdentity(selectedLegFlights[0] || {}), () => handleConfirmMultiCity());
    } finally {
      fareQuoteInFlightRef.current = false;
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

    if (fareQuoteInFlightRef.current) return;
    fareQuoteInFlightRef.current = true;
    setFareError(null);
    setLoading(true);
    try {
      const outboundObj = selectedOutboundFlight.rawItem || selectedOutboundFlight;
      const returnObj = selectedReturnFlight.rawItem || selectedReturnFlight;
      if (!allSelectionsShareTraceId([selectedOutboundFlight, selectedReturnFlight])) {
        Alert.alert("Unsupported flight combination", "Split-session round trips are not supported yet. Please choose an onward and return option from the same combined search result.");
        return;
      }
      const activeTraceId = selectedFlightIdentity(selectedOutboundFlight).traceId;

      const outboundPrice = Number(selectedOutboundFlight.displayFare || selectedOutboundFlight.price || 0);
      const returnPrice = Number(selectedReturnFlight.displayFare || selectedReturnFlight.price || 0);
      const initialTotal = outboundPrice + returnPrice;

      // Complete combined ResultIndex for SRDV Round Trip
      const combinedResultIndex = `${selectedFlightIdentity(selectedOutboundFlight).resultIndex},${selectedFlightIdentity(selectedReturnFlight).resultIndex}`;

      console.log(`[FARE_REVALIDATION_STARTED] Round-trip selection revalidating fare with supplier | ResultIndex: ${combinedResultIndex}`);

      let fareQuoteRes = null;
      if (activeTraceId && combinedResultIndex) {
        fareQuoteRes = await getFlightFareQuote({
            traceId: activeTraceId,
            resultIndex: combinedResultIndex,
            srdvType: selectedFlightIdentity(selectedOutboundFlight).srdvType,
            srdvIndex: selectedFlightIdentity(selectedOutboundFlight).srdvIndex,
            offeredFare: initialTotal,
            baseFare: initialTotal,
            tax: 0,
            isLCC: Boolean(selectedFlightIdentity(selectedOutboundFlight).isLCC || selectedFlightIdentity(selectedReturnFlight).isLCC),
          });
      }

      if (!fareQuoteRes) throw new Error("The combined round-trip fare could not be confirmed.");
      const confirmed = extractAuthoritativeFare(fareQuoteRes, 0);
      if (!isValidAuthoritativeFare(confirmed)) {
        const invalidFareError = new Error("The supplier returned an invalid fare.");
        invalidFareError.backendCode = "INVALID_FARE_QUOTE";
        throw invalidFareError;
      }
      const confirmedTotal = confirmed.total;

      if (initialTotal > 0 && confirmedTotal > 0 && initialTotal !== confirmedTotal) {
        safeFlightLog("[Flight][FareQuote][FareUpdated]", { total: confirmedTotal, changed: true });
      }

      const payload = {
        traceId: activeTraceId,
        resultIndex: combinedResultIndex,
        srdvType: selectedFlightIdentity(selectedOutboundFlight).srdvType,
        srdvIndex: selectedFlightIdentity(selectedOutboundFlight).srdvIndex,
        source: selectedFlightIdentity(selectedOutboundFlight).source,
        isLCC: Boolean(selectedFlightIdentity(selectedOutboundFlight).isLCC || selectedFlightIdentity(selectedReturnFlight).isLCC),
        isRoundTrip: true,
        outboundFlight: compactFlightForFlow(selectedOutboundFlight),
        returnFlight: compactFlightForFlow(selectedReturnFlight),
        flight: compactFlightForFlow(selectedOutboundFlight, {
          isRoundTrip: true,
          selectedTravelClassPriceInr: confirmedTotal,
          displayFare: confirmedTotal,
          offeredFare: confirmedTotal,
          baseFare: confirmed.baseFare,
          tax: confirmed.tax,
          selectedFare: withAuthoritativeFare(selectedOutboundFlight.selectedFare, confirmed),
          fromCity: origin,
          toCity: destination,
        }),
        fareQuote: fareQuoteRes?.Results || fareQuoteRes,
        quoteTimestamp: Date.now(),
        searchContext: {
          ...searchParams,
          travelClass,
          date,
          returnDate,
          journeyType: 2,
        },
        fareSummary: {
          baseFare: confirmed.baseFare,
          tax: confirmed.tax,
          markup: 0,
          convenienceFee: 0,
          discount: 0,
          totalFare: confirmedTotal,
        },
      };

      await writeFlightBookingFlowState(payload);
      navigation.navigate("FlightPassengerDetailsScreen", payload);
    } catch (e) {
      recordFareQuoteFailure(e, selectedFlightIdentity(selectedOutboundFlight || {}), () => handleConfirmRoundTrip());
    } finally {
      fareQuoteInFlightRef.current = false;
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
        onModify={() => navigation.navigate("FlightScreen", { restoreSearchParams: searchParams })}
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

      {fareError && (
        <View style={styles.fareErrorBanner} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={20} color="#B91C1C" />
          <Text style={styles.fareErrorText}>{fareError.message}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={loading}
            onPress={() => retryFareActionRef.current?.()}
            style={styles.fareErrorAction}
          >
            <Text style={styles.fareErrorActionText}>{fareError.actionLabel || "Retry"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setFareError(null)}
            style={styles.fareErrorDismiss}
          >
            <Ionicons name="close" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>
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
  fareErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  fareErrorText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  fareErrorAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  fareErrorActionText: {
    color: PRIMARY_RED,
    fontSize: 12,
    fontWeight: "800",
  },
  fareErrorDismiss: {
    padding: 4,
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

