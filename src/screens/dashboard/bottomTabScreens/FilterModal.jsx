import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  BUS_TYPE_OPTIONS,
  TIME_BANDS,
  createDefaultBusFilters,
} from "../../../utils/busFilters";

const COLORS = {
  primary: "#C8102E",
  text: "#1F2937",
};

const SCREEN_WIDTH = Dimensions.get("window").width;

// ─── Helpers ────────────────────────────────────────────────────────────────

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .trim();

const filterByQuery = (items, query) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return items;
  return items.filter((item) => normalize(item).includes(normalizedQuery));
};

const toggleListValue = (values, value) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

const parsePriceInput = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// ─── Sub-components ──────────────────────────────────────────────────────────

const FilterCard = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const CheckboxRow = ({ label, selected, onPress }) => (
  <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.88}>
    <View style={[styles.checkbox, selected && styles.checkboxActive]}>
      {selected && <Feather name="check" size={11} color="#fff" />}
    </View>
    <Text style={styles.optionLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── Dual-thumb Price Slider ─────────────────────────────────────────────────

const PriceSlider = ({ min, max, valueMin, valueMax, onChangeMin, onChangeMax }) => {
  const THUMB_SIZE = 24;
  const TRACK_PADDING = THUMB_SIZE / 2;

  const [trackWidth, setTrackWidth] = useState(1);

  // Convert price → 0..1 ratio, then to px offset
  const priceToRatio = (price) =>
    max === min ? 0 : clamp((price - min) / (max - min), 0, 1);

  const leftRatio = priceToRatio(valueMin ?? min);
  const rightRatio = priceToRatio(valueMax ?? max);

  // Refs that always hold the latest ratio (updated every render)
  const leftRatioRef  = useRef(leftRatio);
  const rightRatioRef = useRef(rightRatio);
  leftRatioRef.current  = leftRatio;
  rightRatioRef.current = rightRatio;

  // Snapshot ratio captured at the START of each drag — dx is relative to this
  const leftStartRatio  = useRef(leftRatio);
  const rightStartRatio = useRef(rightRatio);

  // trackWidth ref so PanResponder closures always see the latest value
  const trackWidthRef = useRef(1);
  useEffect(() => { trackWidthRef.current = trackWidth; }, [trackWidth]);

  const leftPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        // Snapshot the ratio exactly where the thumb is right now
        leftStartRatio.current = leftRatioRef.current;
      },
      onPanResponderMove: (_, { dx }) => {
        const newRatio = clamp(
          leftStartRatio.current + dx / trackWidthRef.current,
          0,
          rightRatioRef.current - 0.01,
        );
        onChangeMin(Math.round(min + newRatio * (max - min)));
      },
    }),
  ).current;

  const rightPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        rightStartRatio.current = rightRatioRef.current;
      },
      onPanResponderMove: (_, { dx }) => {
        const newRatio = clamp(
          rightStartRatio.current + dx / trackWidthRef.current,
          leftRatioRef.current + 0.01,
          1,
        );
        onChangeMax(Math.round(min + newRatio * (max - min)));
      },
    }),
  ).current;

  const leftPx = leftRatio * trackWidth;
  const rightPx = rightRatio * trackWidth;

  return (
    <View>
      {/* Price labels */}
      <View style={styles.priceHeader}>
        <Text style={styles.priceValue}>INR {(valueMin ?? min).toLocaleString("en-IN")}</Text>
        <Text style={styles.priceValue}>INR {(valueMax ?? max).toLocaleString("en-IN")}</Text>
      </View>

      {/* Track */}
      <View
        style={styles.sliderShell}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width - THUMB_SIZE;
          setTrackWidth(w);
          trackWidthRef.current = w;
        }}
      >
        {/* Inactive track */}
        <View style={styles.sliderTrack} />

        {/* Active track */}
        <View
          style={[
            styles.sliderActiveTrack,
            {
              left: leftPx + TRACK_PADDING,
              width: Math.max(rightPx - leftPx, 0),
            },
          ]}
        />

        {/* Left thumb */}
        <View
          {...leftPan.panHandlers}
          style={[styles.sliderThumb, { left: leftPx }]}
        />

        {/* Right thumb */}
        <View
          {...rightPan.panHandlers}
          style={[styles.sliderThumb, { left: rightPx + THUMB_SIZE / 2 }]}
        />
      </View>
    </View>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FilterModal({
  visible,
  onClose,
  filters = createDefaultBusFilters(),
  setFilters = () => {},
  options = {},
  resultCount,
  onReset,
}) {
  const [boardingQuery, setBoardingQuery] = useState("");
  const [droppingQuery, setDroppingQuery] = useState("");
  const [travelQuery, setTravelQuery] = useState("");
  const [amenityQuery, setAmenityQuery] = useState("");

  useEffect(() => {
    if (!visible) {
      setBoardingQuery("");
      setDroppingQuery("");
      setTravelQuery("");
      setAmenityQuery("");
    }
  }, [visible]);

  const priceBounds = options?.priceBounds ?? { min: 0, max: 0 };
  const minimumPrice = Number.isFinite(priceBounds?.min) ? priceBounds.min : 0;
  const maximumPrice = Number.isFinite(priceBounds?.max) ? priceBounds.max : minimumPrice;

  const busTypes = options?.busTypes?.length
    ? options.busTypes
    : BUS_TYPE_OPTIONS.map((item) => ({ ...item, count: 0 }));
  const departureTimes = options?.departureTimes?.length ? options.departureTimes : TIME_BANDS;
  const arrivalTimes = options?.arrivalTimes?.length ? options.arrivalTimes : TIME_BANDS;

  const amenityItems = useMemo(
    () => filterByQuery(options?.amenities ?? [], amenityQuery),
    [amenityQuery, options?.amenities],
  );
  const boardingItems = useMemo(
    () => filterByQuery(options?.boardingPoints ?? [], boardingQuery),
    [boardingQuery, options?.boardingPoints],
  );
  const droppingItems = useMemo(
    () => filterByQuery(options?.droppingPoints ?? [], droppingQuery),
    [droppingQuery, options?.droppingPoints],
  );
  const travelItems = useMemo(
    () => filterByQuery(options?.travels ?? [], travelQuery),
    [options?.travels, travelQuery],
  );

  const updateFilterList = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: toggleListValue(current?.[key] ?? [], value),
    }));
  };

  const clearAll = () => {
    if (typeof onReset === "function") onReset();
    else setFilters(createDefaultBusFilters());
  };

  const selectedMin = parsePriceInput(filters?.priceMin) ?? minimumPrice;
  const selectedMax = parsePriceInput(filters?.priceMax) ?? maximumPrice;

  const footerText = typeof resultCount === "number" ? `Show ${resultCount} Buses` : "Show Buses";

  // ── 4-column grid card dimensions ────────────────────────────────────────
  // card padding(12)*2 + gap(8)*3 columns / 4 items
  const CARD_H_PADDING = 12;
  const CARD_GAP = 8;
  const cardWidth =
    (SCREEN_WIDTH - 12 * 2 - CARD_H_PADDING * 2 - CARD_GAP * 3) / 4;

  // ── Generic 4-up grid section ─────────────────────────────────────────────
  const renderGridSection = (title, items, selectedKey, getIcon, IconComponent) => (
    <FilterCard title={title}>
      <View style={styles.fourGrid}>
        {items.map((item) => {
          const label = item.label ?? item;
          const value = item.value ?? item.label ?? item;
          const selected = (filters?.[selectedKey] ?? []).includes(value);
          const iconName = item.icon ?? getIcon?.(label) ?? "help-circle-outline";

          return (
            <TouchableOpacity
              key={value}
              style={[styles.gridCard, { width: cardWidth }, selected && styles.gridCardActive]}
              onPress={() => updateFilterList(selectedKey, value)}
              activeOpacity={0.85}
            >
              <IconComponent
                name={iconName}
                size={24}
                color={selected ? COLORS.primary : "#445065"}
              />
              <Text
                style={[styles.gridCardText, selected && styles.gridCardTextActive]}
                numberOfLines={2}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </FilterCard>
  );

  const renderListSection = (title, placeholder, items, selectedKey, query, setQuery) => (
    <FilterCard title={title}>
      <View style={styles.searchRow}>
        <Feather name="search" size={16} color="#6f84a4" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#9aa9bf"
          style={styles.searchInput}
        />
      </View>
      <View style={styles.optionList}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator
          style={styles.optionScroll}
          contentContainerStyle={styles.optionScrollContent}
        >
          {items.length > 0 ? (
            items.map((item) => {
              const selected = (filters?.[selectedKey] ?? []).includes(item);
              return (
                <CheckboxRow
                  key={item}
                  label={item}
                  selected={selected}
                  onPress={() => updateFilterList(selectedKey, item)}
                />
              );
            })
          ) : (
            <Text style={styles.emptyHint}>No matches found.</Text>
          )}
        </ScrollView>
      </View>
    </FilterCard>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Feather name="filter" size={16} color="#fff" />
              <Text style={styles.headerTitle}>FILTERS</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.resetButton} onPress={clearAll} activeOpacity={0.88}>
                <Feather name="rotate-ccw" size={18} color="#fff" />
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.88}>
                <Feather name="x" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Price Range ── */}
            <FilterCard title="₹ Price Range">
              <PriceSlider
                min={minimumPrice}
                max={maximumPrice}
                valueMin={selectedMin}
                valueMax={selectedMax}
                onChangeMin={(val) =>
                  setFilters((f) => ({ ...f, priceMin: val }))
                }
                onChangeMax={(val) =>
                  setFilters((f) => ({ ...f, priceMax: val }))
                }
              />
            </FilterCard>

            {/* ── Bus Type – 4 columns ── */}
            {renderGridSection(
              "Bus Type",
              busTypes,
              "busTypes",
              null,
              MaterialCommunityIcons,
            )}

            {/* ── Departure Time – 4 columns ── */}
            {renderGridSection(
              "Departure Time",
              departureTimes,
              "departureTimes",
              null,
              Ionicons,
            )}

            {/* ── Arrival Time – 4 columns ── */}
            {renderGridSection(
              "Arrival Time",
              arrivalTimes,
              "arrivalTimes",
              null,
              Ionicons,
            )}

            {/* ── Amenities ── */}
            <FilterCard title="Amenities">
              {amenityItems.length > 0 ? (
                <View style={styles.amenityList}>
                  {amenityItems.map((item) => {
                    const selected = (filters?.amenities ?? []).includes(item);
                    const icon =
                      item === "Blankets"
                        ? "blanket"
                        : item === "Charging Point"
                        ? "lightning-bolt-outline"
                        : item === "Pillow"
                        ? "pillow"
                        : "checkbox-blank-outline";
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.amenityRow, selected && styles.amenityRowSelected]}
                        onPress={() => updateFilterList("amenities", item)}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons
                          name={icon}
                          size={24}
                          color={selected ? COLORS.primary : "#A0A7B4"}
                        />
                        <Text
                          style={[
                            styles.amenityRowText,
                            selected && styles.amenityRowTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyStrip} />
              )}
            </FilterCard>

            {renderListSection(
              "Boarding Points",
              "Choose Boarding Point",
              boardingItems,
              "boardingPoints",
              boardingQuery,
              setBoardingQuery,
            )}
            {renderListSection(
              "Dropping Point",
              "Choose Dropping Point",
              droppingItems,
              "droppingPoints",
              droppingQuery,
              setDroppingQuery,
            )}
            {renderListSection(
              "Travels",
              "Choose Travel Name",
              travelItems,
              "travels",
              travelQuery,
              setTravelQuery,
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={clearAll} activeOpacity={0.9}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={onClose} activeOpacity={0.9}>
              <Text style={styles.applyText}>{footerText}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#C8102E",
  },
  headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  resetText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 18 },

  // Card
  card: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9e1ee",
  },
  cardTitle: { marginBottom: 10, color: "#1f2f4d", fontSize: 16, fontWeight: "800" },
  emptyStrip: { minHeight: 8 },

  // Price slider
  priceHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  priceValue: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  sliderShell: {
    height: 44,
    justifyContent: "center",
    marginHorizontal: 4,
    marginBottom: 4,
  },
  sliderTrack: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E8EBEF",
  },
  sliderActiveTrack: {
    position: "absolute",
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  sliderThumb: {
    position: "absolute",
    width: 24,
    height: 24,
    marginTop: -10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    // shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },

  // ── 4-column grid (Bus Type / Time) ──
  fourGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",   // keep all 4 on one row
    gap: 8,
  },
  gridCard: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DDE6",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  gridCardActive: { borderColor: COLORS.primary, backgroundColor: "#FFF4F4" },
  gridCardText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#303A4A",
    textAlign: "center",
    lineHeight: 15,
  },
  gridCardTextActive: { color: COLORS.primary },

  // Amenities
  amenityList: { gap: 12 },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#F1B9B9",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  amenityRowSelected: { borderColor: COLORS.primary, backgroundColor: "#FFF4F4" },
  amenityRowText: { marginLeft: 12, fontSize: 15, fontWeight: "600", color: "#2A3550" },
  amenityRowTextSelected: { color: COLORS.primary },

  // Search + list
  searchRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#cfd9ea",
    borderRadius: 12,
    backgroundColor: "#f8fbff",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 8, color: "#1d2d49", fontSize: 14, fontWeight: "700" },
  optionList: {
    maxHeight: 178,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e7f1",
    backgroundColor: "#f9fbff",
    overflow: "hidden",
  },
  optionScroll: { maxHeight: 178 },
  optionScrollContent: { paddingVertical: 4 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "#7d8fa8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxActive: { borderColor: "#2b66ba", backgroundColor: "#2b66ba" },
  optionLabel: { flex: 1, color: "#243856", fontSize: 13, fontWeight: "700" },
  emptyHint: { padding: 14, color: "#7b8ba4", fontSize: 13, fontWeight: "600" },

  // Footer
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#dfe6f1",
    backgroundColor: "#fff",
  },
  clearButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfd9ea",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  clearText: { color: "#425b7c", fontSize: 14, fontWeight: "800" },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C8102E",
  },
  applyText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});