import { useState, useMemo, useCallback } from "react";

/**
 * Normalizes raw API flight objects into a unified, clean data model:
 * { id, airlineName, airlineCode, flightNumber, price, departureTime, arrivalTime, durationMinutes, stops, hasDeal, isCheapest, rawItem }
 */
export function normalizeFlight(item, index, globalMinPrice) {
  const segment = item?.Segments?.[0]?.[0] || item?.Segments?.[0] || item?.segment || {};
  const fareData = item?.FareDataMultiple?.[0] || item?.fareData || {};
  const fareObj = fareData?.Fare || item?.Fare || {};

  const airlineName =
    item?.airlineName ||
    item?.airline ||
    segment?.Airline?.AirlineName ||
    fareData?.AirlineName ||
    "Airline";

  const airlineCode =
    item?.airlineCode ||
    segment?.Airline?.AirlineCode ||
    fareData?.AirlineCode ||
    "AI";

  const flightNumber =
    item?.flightNumber ||
    item?.flightNo ||
    segment?.Airline?.FlightNumber ||
    fareData?.FlightNumber ||
    "";

  const price = Number(
    item?.displayFare ||
    item?.offeredFare ||
    item?.fare ||
    fareData?.OfferedFare ||
    fareObj?.OfferedFare ||
    fareObj?.PublishedFare ||
    0
  );

  const depTimeRaw = segment?.DepTime || item?.departureTimeIst || item?.departureTime || "12:00";
  const arrTimeRaw = segment?.ArrTime || item?.arrivalTimeIst || item?.arrivalTime || "14:00";

  let depFormatted = "12:00";
  if (depTimeRaw.includes("T")) {
    depFormatted = depTimeRaw.split("T")[1].slice(0, 5);
  } else if (depTimeRaw.length >= 5) {
    depFormatted = depTimeRaw.slice(0, 5);
  }

  let arrFormatted = "14:00";
  if (arrTimeRaw.includes("T")) {
    arrFormatted = arrTimeRaw.split("T")[1].slice(0, 5);
  } else if (arrTimeRaw.length >= 5) {
    arrFormatted = arrTimeRaw.slice(0, 5);
  }

  const durationMinutes = Number(segment?.Duration || item?.duration || 120);

  const stops =
    item?.stops !== undefined
      ? Number(item.stops)
      : Array.isArray(item?.Segments?.[0]) && item.Segments[0].length > 1
      ? item.Segments[0].length - 1
      : 0;

  const hasDeal = Boolean(
    item?.hasDeal ||
    item?.isLCC ||
    item?.IsLCC ||
    fareData?.IsLCC ||
    (item?.PickNBookDiscount && item.PickNBookDiscount > 0) ||
    (item?.PickNBookAvailableOffers && item.PickNBookAvailableOffers.length > 0)
  );

  const id = String(item?.id || item?.ResultIndex || fareData?.ResultIndex || `flight-${index}`);

  return {
    id,
    airlineName,
    airlineCode,
    flightNumber,
    price,
    departureTime: depFormatted,
    arrivalTime: arrFormatted,
    depTimeRaw,
    arrTimeRaw,
    durationMinutes,
    stops,
    hasDeal,
    isCheapest: globalMinPrice > 0 && price === globalMinPrice,
    rawItem: item,
  };
}

/**
 * Pure selector to filter and sort normalized flight list
 */
export function filterAndSortFlights(normalizedList, { activeSort, dealsOnly, filters }) {
  if (!Array.isArray(normalizedList)) return [];

  // 1. Apply Filters
  let result = normalizedList.filter((flight) => {
    // Filter by Deals Only
    if (dealsOnly && !flight.hasDeal) {
      return false;
    }

    // Filter by Stops
    if (filters.stops && filters.stops.length > 0) {
      const stopMatches = filters.stops.some((stopVal) => {
        if (stopVal === "nonstop" || stopVal === 0) return flight.stops === 0;
        if (stopVal === "1stop" || stopVal === 1) return flight.stops === 1;
        if (stopVal === "2plus" || stopVal >= 2) return flight.stops >= 2;
        return false;
      });
      if (!stopMatches) return false;
    }

    // Filter by Airlines
    if (filters.airlines && filters.airlines.length > 0) {
      const codeUpper = String(flight.airlineCode).toUpperCase();
      const nameUpper = String(flight.airlineName).toUpperCase();
      const airlineMatches = filters.airlines.some((a) => {
        const target = String(a).toUpperCase();
        return codeUpper === target || nameUpper.includes(target) || target.includes(codeUpper);
      });
      if (!airlineMatches) return false;
    }

    // Filter by Price Range
    if (Array.isArray(filters.priceRange) && filters.priceRange.length === 2) {
      const [minP, maxP] = filters.priceRange;
      if (flight.price < minP || flight.price > maxP) {
        return false;
      }
    }

    return true;
  });

  // 2. Apply Active Sort
  result = [...result].sort((a, b) => {
    switch (activeSort) {
      case "fastest":
        return a.durationMinutes - b.durationMinutes;
      case "earliest": {
        const getDepMin = (timeStr) => {
          const parts = String(timeStr).split(":");
          return parseInt(parts[0] || 0, 10) * 60 + parseInt(parts[1] || 0, 10);
        };
        return getDepMin(a.departureTime) - getDepMin(b.departureTime);
      }
      case "latest": {
        const getDepMin = (timeStr) => {
          const parts = String(timeStr).split(":");
          return parseInt(parts[0] || 0, 10) * 60 + parseInt(parts[1] || 0, 10);
        };
        return getDepMin(b.departureTime) - getDepMin(a.departureTime);
      }
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
    priceRange: [0, 100000],
  });

  // Normalize raw results
  const rawNormalizedResults = useMemo(() => {
    if (!Array.isArray(rawResults) || rawResults.length === 0) return [];
    
    // Find min price across dataset
    let minPrice = Infinity;
    rawResults.forEach((item) => {
      const p = Number(item?.displayFare || item?.offeredFare || item?.fare || item?.Fare?.OfferedFare || Infinity);
      if (p < minPrice) minPrice = p;
    });

    return rawResults.map((item, idx) => normalizeFlight(item, idx, minPrice === Infinity ? 0 : minPrice));
  }, [rawResults]);

  // Derived dataset boundaries & available airlines
  const datasetMeta = useMemo(() => {
    if (rawNormalizedResults.length === 0) {
      return { minPrice: 0, maxPrice: 50000, airlines: [] };
    }

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    const airlineMap = new Map();

    rawNormalizedResults.forEach((item) => {
      if (item.price < minPrice) minPrice = item.price;
      if (item.price > maxPrice) maxPrice = item.price;

      if (!airlineMap.has(item.airlineCode)) {
        airlineMap.set(item.airlineCode, {
          code: item.airlineCode,
          name: item.airlineName,
        });
      }
    });

    return {
      minPrice: minPrice === Infinity ? 0 : minPrice,
      maxPrice: maxPrice === -Infinity ? 50000 : maxPrice,
      airlines: Array.from(airlineMap.values()),
    };
  }, [rawNormalizedResults]);

  // Compute active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.stops && filters.stops.length > 0) count += filters.stops.length;
    if (filters.airlines && filters.airlines.length > 0) count += filters.airlines.length;
    if (
      Array.isArray(filters.priceRange) &&
      (filters.priceRange[0] > datasetMeta.minPrice || filters.priceRange[1] < datasetMeta.maxPrice)
    ) {
      count += 1;
    }
    return count;
  }, [filters, datasetMeta]);

  // Single memoized selector combining filters & sort
  const filteredResults = useMemo(() => {
    return filterAndSortFlights(rawNormalizedResults, { activeSort, dealsOnly, filters });
  }, [rawNormalizedResults, activeSort, dealsOnly, filters]);

  // Handlers
  const setActiveSort = useCallback((newSort) => {
    setActiveSortState(newSort);
  }, []);

  const toggleDealsOnly = useCallback(() => {
    setDealsOnly((prev) => !prev);
  }, []);

  const resetFilters = useCallback(() => {
    setDealsOnly(false);
    setActiveSortState("cheapest");
    setFilters({
      stops: [],
      airlines: [],
      priceRange: [datasetMeta.minPrice, datasetMeta.maxPrice],
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
    availableAirlines: datasetMeta.airlines,
  };
}

export default useFlightResults;
