import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FilterModal from "./FilterModal";
import BottomBar from "./BottomBar";
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

  const resetFilters = useCallback(() => {
    setFilters(createDefaultBusFilters());
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* HEADER (dynamic data passed) */}
      <RouteHeader from={from} to={to} date={date} dateValue={dateValue} />

      <SortBar
        value={sortState.field}
        direction={sortState.direction}
        onChange={(field, direction) =>
          setSortState({ field, direction: direction || "asc" })
        }
        onOpenFilters={() => setShowFilters(true)}
        resultCount={resultCount}
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
        />
      </View>

      {/* BOTTOM BAR */}
      <BottomBar onOpenFilters={() => setShowFilters(true)} />

      {/* FILTER MODAL */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        options={filterOptions}
        resultCount={resultCount}
        onReset={resetFilters}
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
