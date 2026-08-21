import { useState, useMemo, useCallback } from "react";

function getDepMin(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(":");
  return parseInt(parts[0] || 0, 10) * 60 + parseInt(parts[1] || 0, 10);
}

function getTimeBucket(timeStr) {
  const mins = getDepMin(timeStr);
  if (mins < 6 * 60) return "early_morning"; // 00:00 - 06:00
  if (mins < 12 * 60) return "morning"; // 06:00 - 12:00
  if (mins < 18 * 60) return "afternoon"; // 12:00 - 18:00
  return "evening"; // 18:00 - 24:00
}

export function normalizeFlight(item, index, globalMinPrice) {
  const fareDataMultiple = item?.FareDataMultiple?.[0] || item?.fareData || {};
  const fareSegments = fareDataMultiple?.FareSegments || [];
  const firstFareSeg = fareSegments[0] || {};
  const segment = item?.Segments?.[0]?.[0] || item?.Segments?.[0] || item?.segment || {};

  const airlineName = firstFareSeg?.AirlineName || item?.airlineName || item?.airline || segment?.Airline?.AirlineName || "Airline";
  const airlineCode = firstFareSeg?.AirlineCode || item?.airlineCode || segment?.Airline?.AirlineCode || "AI";
  const flightNumber = firstFareSeg?.FlightNumber || item?.flightNumber || segment?.Airline?.FlightNumber || "";

  // Explicitly use B2CFinalFare as source of truth
  let b2cFinalFare = item?.B2CFinalFare ?? item?.Fare?.B2CFinalFare ?? fareDataMultiple?.Fare?.B2CFinalFare;
  const price = b2cFinalFare != null ? Number(b2cFinalFare) : Number(item?.displayFare || item?.offeredFare || item?.price || 0);

  const segmentsArr = item?.normalizedSegments || (Array.isArray(item?.Segments?.[0]) ? item.Segments[0] : []);
  const firstSegment = segmentsArr[0] || segment;
  const lastSegment = segmentsArr.length > 0 ? segmentsArr[segmentsArr.length - 1] : segment;

  const depTimeRaw = firstSegment?.DepTime || item?.departureTimeIst || item?.departureTime || "12:00";
  const arrTimeRaw = lastSegment?.ArrTime || item?.arrivalTimeIst || item?.arrivalTime || "14:00";

  let depFormatted = "12:00";
  if (depTimeRaw.includes("T")) depFormatted = depTimeRaw.split("T")[1].slice(0, 5);
  else if (depTimeRaw.length >= 5) depFormatted = depTimeRaw.slice(0, 5);

  let arrFormatted = "14:00";
  if (arrTimeRaw.includes("T")) arrFormatted = arrTimeRaw.split("T")[1].slice(0, 5);
  else if (arrTimeRaw.length >= 5) arrFormatted = arrTimeRaw.slice(0, 5);

  let durationMinutes = Number(lastSegment?.AccumulatedDuration || item?.duration || 0);
  if (!durationMinutes) {
    const s = new Date(firstSegment?.DepTime).getTime();
    const e = new Date(lastSegment?.ArrTime).getTime();
    if (!isNaN(s) && !isNaN(e)) durationMinutes = Math.floor((e - s) / 60000);
  }
  if (!durationMinutes && segmentsArr.length > 0) {
    durationMinutes = segmentsArr.reduce((acc, seg) => acc + Number(seg.Duration || 0) + Number(seg.GroundTime || 0), 0);
  }
  if (!durationMinutes) durationMinutes = Number(firstSegment?.Duration || 120);

  const stops = segmentsArr.length > 1 ? segmentsArr.length - 1 : 0;

  const hasDeal = Boolean(item?.hasDeal || item?.isLCC || item?.IsLCC || fareDataMultiple?.IsLCC || (item?.PickNBookDiscount > 0));

  const isRefundable = item?.IsRefundable ?? item?.isRefundable ?? false;
  
  const baggageRaw = firstFareSeg?.Baggage || "";
  let hasCheckin = false;
  let has15 = false;
  let has20 = false;
  if (baggageRaw && !baggageRaw.includes("Not Provided") && baggageRaw.toLowerCase().includes("kg")) {
    hasCheckin = true;
    const match = baggageRaw.match(/(\d+)\s*(KG|kg|Kg)/i);
    if (match) {
        const kg = parseInt(match[1], 10);
        if (kg >= 15) has15 = true;
        if (kg >= 20) has20 = true;
    }
  }

  const cabinClass = firstFareSeg?.CabinClassName || item?.travelClass || "Economy";
  
  const id = String(item?.id || item?.ResultIndex || fareDataMultiple?.ResultIndex || `flight-${index}`);

  return {
    id,
    airlineName,
    airlineCode,
    flightNumber,
    price,
    departureTime: depFormatted,
    arrivalTime: arrFormatted,
    depBucket: getTimeBucket(depFormatted),
    arrBucket: getTimeBucket(arrFormatted),
    durationMinutes,
    stops,
    hasDeal,
    isCheapest: globalMinPrice > 0 && price === globalMinPrice,
    isRefundable,
    baggageOpts: { hasCheckin, has15, has20 },
    cabinClass,
    rawItem: item,
  };
}

export function filterAndSortFlights(normalizedList, { activeSort, dealsOnly, filters }) {
  if (!Array.isArray(normalizedList)) return [];

  let result = normalizedList.filter((flight) => {
    if (dealsOnly && !flight.hasDeal) return false;
    
    // Stops
    if (filters.stops && filters.stops.length > 0) {
      const stopMatches = filters.stops.some((stopVal) => {
        if (stopVal === "nonstop" || stopVal === 0) return flight.stops === 0;
        if (stopVal === "1stop" || stopVal === 1) return flight.stops === 1;
        if (stopVal === "2plus" || stopVal >= 2) return flight.stops >= 2;
        return false;
      });
      if (!stopMatches) return false;
    }

    // Airlines
    if (filters.airlines && filters.airlines.length > 0) {
      const codeUpper = String(flight.airlineCode).toUpperCase();
      const nameUpper = String(flight.airlineName).toUpperCase();
      const airlineMatches = filters.airlines.some((a) => {
        const target = String(a).toUpperCase();
        return codeUpper === target || nameUpper.includes(target) || target.includes(codeUpper);
      });
      if (!airlineMatches) return false;
    }

    // Price
    if (Array.isArray(filters.priceRange) && filters.priceRange.length === 2) {
      const [minP, maxP] = filters.priceRange;
      if (flight.price < minP || flight.price > maxP) return false;
    }

    // Departure Time
    if (filters.departureTime && filters.departureTime.length > 0) {
      if (!filters.departureTime.includes(flight.depBucket)) return false;
    }

    // Arrival Time
    if (filters.arrivalTime && filters.arrivalTime.length > 0) {
      if (!filters.arrivalTime.includes(flight.arrBucket)) return false;
    }

    // Refundable
    if (filters.isRefundable && !flight.isRefundable) {
       return false;
    }

    // Duration
    if (filters.durationMax && flight.durationMinutes > filters.durationMax) {
       return false;
    }

    // Baggage
    if (filters.baggage && filters.baggage.length > 0) {
       const bagMatches = filters.baggage.every((b) => {
          if (b === 'checkin') return flight.baggageOpts.hasCheckin;
          if (b === '15kg') return flight.baggageOpts.has15;
          if (b === '20kg') return flight.baggageOpts.has20;
          return true;
       });
       if (!bagMatches) return false;
    }

    // Cabin Class
    if (filters.cabinClass && filters.cabinClass.length > 0) {
       if (!filters.cabinClass.includes(flight.cabinClass)) return false;
    }

    return true;
  });

  result = [...result].sort((a, b) => {
    switch (activeSort) {
      case "fastest":
        return a.durationMinutes - b.durationMinutes;
      case "earliest": 
        return getDepMin(a.departureTime) - getDepMin(b.departureTime);
      case "latest": 
        return getDepMin(b.departureTime) - getDepMin(a.departureTime);
      case "earliestarrival":
        return getDepMin(a.arrivalTime) - getDepMin(b.arrivalTime);
      case "cheapest":
      default:
        return a.price - b.price;
    }
  });

  return result;
}

export function useFlightResults(rawResults = []) {
  const [activeSort, setActiveSortState] = useState("cheapest");
  const [dealsOnly, setDealsOnly] = useState(false);
  const [filters, setFilters] = useState({
    stops: [],
    airlines: [],
    priceRange: [0, Infinity],
    departureTime: [],
    arrivalTime: [],
    isRefundable: false,
    durationMax: Infinity,
    baggage: [],
    cabinClass: []
  });

  const rawNormalizedResults = useMemo(() => {
    if (!Array.isArray(rawResults) || rawResults.length === 0) return [];
    
    let minPrice = Infinity;
    rawResults.forEach((item) => {
      let b2cFinalFare = item?.B2CFinalFare ?? item?.Fare?.B2CFinalFare ?? item?.FareDataMultiple?.[0]?.Fare?.B2CFinalFare;
      const p = b2cFinalFare != null ? Number(b2cFinalFare) : Number(item?.displayFare || item?.offeredFare || item?.price || Infinity);
      if (p < minPrice) minPrice = p;
    });

    return rawResults.map((item, idx) => normalizeFlight(item, idx, minPrice === Infinity ? 0 : minPrice));
  }, [rawResults]);

  const datasetMeta = useMemo(() => {
    if (rawNormalizedResults.length === 0) {
      return { minPrice: 0, maxPrice: 50000, airlines: [], minDuration: 0, maxDuration: 1440, cabinClasses: [] };
    }

    let minPrice = Infinity, maxPrice = -Infinity;
    let minDuration = Infinity, maxDuration = -Infinity;
    const airlineMap = new Map();
    const cabinClasses = new Set();

    rawNormalizedResults.forEach((item) => {
      if (item.price < minPrice) minPrice = item.price;
      if (item.price > maxPrice) maxPrice = item.price;
      
      if (item.durationMinutes < minDuration) minDuration = item.durationMinutes;
      if (item.durationMinutes > maxDuration) maxDuration = item.durationMinutes;

      if (!airlineMap.has(item.airlineCode)) {
        airlineMap.set(item.airlineCode, { code: item.airlineCode, name: item.airlineName });
      }
      
      if (item.cabinClass) cabinClasses.add(item.cabinClass);
    });

    return {
      minPrice: minPrice === Infinity ? 0 : minPrice,
      maxPrice: maxPrice === -Infinity ? 50000 : maxPrice,
      minDuration: minDuration === Infinity ? 0 : minDuration,
      maxDuration: maxDuration === -Infinity ? 1440 : maxDuration,
      airlines: Array.from(airlineMap.values()),
      cabinClasses: Array.from(cabinClasses)
    };
  }, [rawNormalizedResults]);

  // Sync default dynamic limits if they were missing (like Infinity initial state)
  useMemo(() => {
     if (filters.priceRange[1] === Infinity && datasetMeta.maxPrice > 0) {
        setFilters(f => ({...f, priceRange: [datasetMeta.minPrice, datasetMeta.maxPrice], durationMax: datasetMeta.maxDuration}));
     }
  }, [datasetMeta, filters.priceRange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.stops && filters.stops.length > 0) count += filters.stops.length;
    if (filters.airlines && filters.airlines.length > 0) count += filters.airlines.length;
    if (filters.priceRange[0] > datasetMeta.minPrice || filters.priceRange[1] < datasetMeta.maxPrice) count += 1;
    if (filters.departureTime && filters.departureTime.length > 0) count += filters.departureTime.length;
    if (filters.arrivalTime && filters.arrivalTime.length > 0) count += filters.arrivalTime.length;
    if (filters.isRefundable) count += 1;
    if (filters.durationMax < datasetMeta.maxDuration) count += 1;
    if (filters.baggage && filters.baggage.length > 0) count += filters.baggage.length;
    if (filters.cabinClass && filters.cabinClass.length > 0) count += filters.cabinClass.length;
    return count;
  }, [filters, datasetMeta]);

  const filteredResults = useMemo(() => {
    return filterAndSortFlights(rawNormalizedResults, { activeSort, dealsOnly, filters });
  }, [rawNormalizedResults, activeSort, dealsOnly, filters]);

  const setActiveSort = useCallback((newSort) => setActiveSortState(newSort), []);
  const toggleDealsOnly = useCallback(() => setDealsOnly((prev) => !prev), []);
  
  const resetFilters = useCallback(() => {
    setDealsOnly(false);
    setActiveSortState("cheapest");
    setFilters({
      stops: [],
      airlines: [],
      priceRange: [datasetMeta.minPrice, datasetMeta.maxPrice],
      departureTime: [],
      arrivalTime: [],
      isRefundable: false,
      durationMax: datasetMeta.maxDuration,
      baggage: [],
      cabinClass: []
    });
  }, [datasetMeta]);

  return {
    filteredResults,
    rawNormalizedResults,
    activeSort,
    setActiveSort,
    dealsOnly,
    toggleDealsOnly,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    minPrice: datasetMeta.minPrice,
    maxPrice: datasetMeta.maxPrice,
    minDuration: datasetMeta.minDuration,
    maxDuration: datasetMeta.maxDuration,
    availableAirlines: datasetMeta.airlines,
    availableCabinClasses: datasetMeta.cabinClasses
  };
}

export default useFlightResults;
