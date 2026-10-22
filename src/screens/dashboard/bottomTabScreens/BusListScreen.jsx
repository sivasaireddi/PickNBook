import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FilterModal from "./FilterModal";
import RouteHeader from "./RouteHeader";

import BusCards from "./BusCards";
import {
  buildBusFilterOptions,
  createDefaultBusFilters,
} from "../../../utils/busFilters";
import SortBar from "./SortBar";

export default function BusListScreen({ route }) {
  const { from, to, date, dateValue } = route?.params || {};

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(() => createDefaultBusFilters());
  const [sortState, setSortState] = useState({
    field: "arrival",
    direction: "asc",
  });
  const [busData, setBusData] = useState([]);
  const [resultCount, setResultCount] = useState(null);
  const previousSortRef = useRef({ field: "arrival", direction: "asc" });

  const filterOptions = useMemo(
    () => buildBusFilterOptions(busData),
    [busData],
  );

  const handleDataChange = useCallback((items) => {
    setBusData(Array.isArray(items) ? items : []);
  }, []);

  const handleResultsCountChange = useCallback((count) => {
    setResultCount(typeof count === "number" ? count : null);
  }, []);

  const toggleFilterValue = useCallback((key, value) => {
    setFilters((current) => {
      const values = current?.[key] ?? [];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];

      return { ...current, [key]: nextValues };
    });
  }, []);

  const toggleFilterGroup = useCallback((key, groupValues) => {
    setFilters((current) => {
      const values = current?.[key] ?? [];
      const groupIsActive = groupValues.every((value) => values.includes(value));
      const nextValues = groupIsActive
        ? values.filter((value) => !groupValues.includes(value))
        : Array.from(new Set([...values, ...groupValues]));

      return { ...current, [key]: nextValues };
    });
  }, []);

  const handleSortChange = useCallback((field, direction = "asc") => {
    setSortState({ field, direction });
  }, []);

  const handleToggleQuickFilter = useCallback((id) => {
    switch (id) {
      case "ac":
        toggleFilterValue("busTypes", "AC");
        break;
      case "nonAc":
        toggleFilterValue("busTypes", "Non AC");
        break;
      case "seater":
        toggleFilterValue("busTypes", "Seater");
        break;
      case "sleeper":
        toggleFilterValue("busTypes", "Sleeper");
        break;
      case "day":
        toggleFilterGroup("departureTimes", ["morning", "afternoon"]);
        break;
      case "night":
        toggleFilterGroup("departureTimes", ["evening", "night"]);
        break;
      case "cheapest":
        setSortState((current) => {
          if (current.field === "fare" && current.direction === "asc") {
            return previousSortRef.current;
          }

          previousSortRef.current = current;
          return { field: "fare", direction: "asc" };
        });
        break;
      default:
        break;
    }
  }, [toggleFilterGroup, toggleFilterValue]);

  const clearFiltersAndSort = useCallback(() => {
    setFilters(createDefaultBusFilters());
    setSortState({ field: "arrival", direction: "asc" });
    previousSortRef.current = { field: "arrival", direction: "asc" };
  }, []);

  const quickFilterStates = useMemo(() => {
    const busTypes = filters?.busTypes ?? [];
    const departureTimes = filters?.departureTimes ?? [];

    return {
      ac: busTypes.includes("AC"),
      nonAc: busTypes.includes("Non AC"),
      cheapest: sortState.field === "fare" && sortState.direction === "asc",
      seater: busTypes.includes("Seater"),
      sleeper: busTypes.includes("Sleeper"),
      day: ["morning", "afternoon"].every((value) => departureTimes.includes(value)),
      night: ["evening", "night"].every((value) => departureTimes.includes(value)),
    };
  }, [filters?.busTypes, filters?.departureTimes, sortState]);

  const activeFilterCount = useMemo(() => {
    const activeGroups = [
      filters?.priceMin !== "" || filters?.priceMax !== "",
      (filters?.busTypes?.length ?? 0) > 0,
      (filters?.departureTimes?.length ?? 0) > 0,
      (filters?.arrivalTimes?.length ?? 0) > 0,
      (filters?.amenities?.length ?? 0) > 0,
      (filters?.boardingPoints?.length ?? 0) > 0,
      (filters?.droppingPoints?.length ?? 0) > 0,
      (filters?.travels?.length ?? 0) > 0,
      sortState.field !== "arrival" || sortState.direction !== "asc",
    ];

    return activeGroups.filter(Boolean).length;
  }, [filters, sortState]);

  const hasActiveFilters = activeFilterCount > 0;


  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* HEADER (dynamic data passed) */}
      <RouteHeader from={from} to={to} date={date} dateValue={dateValue} />

      <SortBar
        onOpenFilters={() => setShowFilters(true)}
        resultCount={resultCount}
        activeFilterCount={activeFilterCount}
        quickFilterStates={quickFilterStates}
        onToggleQuickFilter={handleToggleQuickFilter}
      />
      {/* CONTENT */}
      <View style={styles.listContainer}>
        <BusCards
          from={from}
          to={to}
          date={dateValue || date}
          filters={filters}
          sortBy={sortState.field}
          sortDirection={sortState.direction}
          onDataChange={handleDataChange}
          onResultsCountChange={handleResultsCountChange}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFiltersAndSort}
        />
      </View>

      {/* FILTER MODAL */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        options={filterOptions}
        resultCount={resultCount}
        sortState={sortState}
        onSortChange={handleSortChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
});
