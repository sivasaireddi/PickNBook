import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#EF4444",
  primaryLight: "#FEF2F2",
  textDark: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
};

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const FilterCard = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const PriceSlider = ({ min, max, valueMin, valueMax, onChangeMin, onChangeMax }) => {
  const THUMB_SIZE = 24;
  const TRACK_PADDING = THUMB_SIZE / 2;

  const [trackWidth, setTrackWidth] = useState(1);

  const priceToRatio = (price) =>
    max === min ? 0 : clamp((price - min) / (max - min), 0, 1);

  const leftRatio = priceToRatio(valueMin ?? min);
  const rightRatio = priceToRatio(valueMax ?? max);

  const leftRatioRef = useRef(leftRatio);
  const rightRatioRef = useRef(rightRatio);
  leftRatioRef.current = leftRatio;
  rightRatioRef.current = rightRatio;

  const leftStartRatio = useRef(leftRatio);
  const rightStartRatio = useRef(rightRatio);

  const trackWidthRef = useRef(1);
  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  const leftPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        leftStartRatio.current = leftRatioRef.current;
      },
      onPanResponderMove: (_, { dx }) => {
        const newRatio = clamp(
          leftStartRatio.current + dx / trackWidthRef.current,
          0,
          rightRatioRef.current - 0.01
        );
        onChangeMin(Math.round(min + newRatio * (max - min)));
      },
    })
  ).current;

  const rightPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        rightStartRatio.current = rightRatioRef.current;
      },
      onPanResponderMove: (_, { dx }) => {
        const newRatio = clamp(
          rightStartRatio.current + dx / trackWidthRef.current,
          leftRatioRef.current + 0.01,
          1
        );
        onChangeMax(Math.round(min + newRatio * (max - min)));
      },
    })
  ).current;

  const leftPx = leftRatio * trackWidth;
  const rightPx = rightRatio * trackWidth;

  const formatPrice = (val) =>
    `₹${Number(val || 0).toLocaleString("en-IN")}`;

  return (
    <View>
      <View style={styles.priceHeader}>
        <Text style={styles.priceValue}>{formatPrice(valueMin ?? min)}</Text>
        <Text style={styles.priceValue}>{formatPrice(valueMax ?? max)}</Text>
      </View>

      <View
        style={styles.sliderShell}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width - THUMB_SIZE;
          setTrackWidth(w);
          trackWidthRef.current = w;
        }}
      >
        <View style={styles.sliderTrack} />
        <View
          style={[
            styles.sliderActiveTrack,
            {
              left: leftPx + TRACK_PADDING,
              width: Math.max(rightPx - leftPx, 0),
            },
          ]}
        />
        <View {...leftPan.panHandlers} style={[styles.sliderThumb, { left: leftPx }]} />
        <View {...rightPan.panHandlers} style={[styles.sliderThumb, { left: rightPx + THUMB_SIZE / 2 }]} />
      </View>
    </View>
  );
};

export const createDefaultHotelFilters = (priceBounds = { min: 0, max: 100000 }) => ({
  searchQuery: "",
  priceMin: priceBounds.min,
  priceMax: priceBounds.max,
  starRatings: [],
  categories: [],
  facilities: [],
});

export default function HotelFilterModal({
  visible,
  onClose,
  filters,
  setFilters,
  priceBounds = { min: 0, max: 100000 },
  availableCategories = [],
  availableFacilities = [],
  filteredCount = 0,
  onReset,
}) {
  const [localSearchQuery, setLocalSearchQuery] = useState(filters?.searchQuery || "");

  useEffect(() => {
    if (visible) {
      setLocalSearchQuery(filters?.searchQuery || "");
    }
  }, [visible, filters?.searchQuery]);

  const minPrice = Number.isFinite(priceBounds?.min) ? priceBounds.min : 0;
  const maxPrice = Number.isFinite(priceBounds?.max) ? priceBounds.max : minPrice;

  const currentMinPrice = filters?.priceMin ?? minPrice;
  const currentMaxPrice = filters?.priceMax ?? maxPrice;

  const toggleArrayItem = (key, item) => {
    setFilters((prev) => {
      const currentList = prev?.[key] || [];
      const updated = currentList.includes(item)
        ? currentList.filter((x) => x !== item)
        : [...currentList, item];
      return { ...prev, [key]: updated };
    });
  };

  const handleSearchChange = (text) => {
    setLocalSearchQuery(text);
    setFilters((prev) => ({ ...prev, searchQuery: text }));
  };

  const handleReset = () => {
    setLocalSearchQuery("");
    if (typeof onReset === "function") {
      onReset();
    } else {
      setFilters(createDefaultHotelFilters(priceBounds));
    }
  };

  const starOptions = [5, 4, 3, 2, 1];

  const defaultCategories = ["HOTEL", "RESORT", "APARTMENT", "VILLA", "BED & BREAKFAST"];
  const categoriesList = useMemo(() => {
    const combined = Array.from(new Set([...defaultCategories, ...availableCategories]));
    return combined.filter(Boolean);
  }, [availableCategories]);

  const defaultFacilities = ["Breakfast", "Room Only", "Dinner", "Half Board"];
  const facilitiesList = useMemo(() => {
    const combined = Array.from(new Set([...defaultFacilities, ...availableFacilities]));
    return combined.filter(Boolean);
  }, [availableFacilities]);

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
              <Ionicons name="options-outline" size={20} color="#FFFFFF" />
              <Text style={styles.headerTitle}>HOTEL FILTERS</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Search Hotel Name */}
            <FilterCard title="Hotel Name">
              <View style={styles.searchRow}>
                <Ionicons name="search" size={18} color="#64748B" />
                <TextInput
                  value={localSearchQuery}
                  onChangeText={handleSearchChange}
                  placeholder="Search hotel name..."
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                />
                {localSearchQuery ? (
                  <TouchableOpacity onPress={() => handleSearchChange("")}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </FilterCard>

            {/* Price Range */}
            <FilterCard title="Price Range (per night)">
              <PriceSlider
                min={minPrice}
                max={maxPrice}
                valueMin={currentMinPrice}
                valueMax={currentMaxPrice}
                onChangeMin={(val) => setFilters((f) => ({ ...f, priceMin: val }))}
                onChangeMax={(val) => setFilters((f) => ({ ...f, priceMax: val }))}
              />
            </FilterCard>

            {/* Star Rating */}
            <FilterCard title="Star Rating">
              <View style={styles.chipRow}>
                {starOptions.map((stars) => {
                  const selected = (filters?.starRatings || []).includes(stars);
                  return (
                    <TouchableOpacity
                      key={`star-${stars}`}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => toggleArrayItem("starRatings", stars)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="star"
                        size={14}
                        color={selected ? "#EF4444" : "#FFB300"}
                      />
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {stars} Star{stars > 1 ? "s" : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FilterCard>

            {/* Property Category */}
            <FilterCard title="Property Type">
              <View style={styles.chipRow}>
                {categoriesList.map((cat) => {
                  const selected = (filters?.categories || []).includes(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => toggleArrayItem("categories", cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FilterCard>

            {/* Facilities / Inclusions */}
            <FilterCard title="Inclusions & Meals">
              <View style={styles.chipRow}>
                {facilitiesList.map((fac) => {
                  const selected = (filters?.facilities || []).includes(fac);
                  return (
                    <TouchableOpacity
                      key={fac}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => toggleArrayItem("facilities", fac)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={selected ? "checkmark-circle" : "ellipse-outline"}
                        size={14}
                        color={selected ? "#EF4444" : "#64748B"}
                      />
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {fac}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FilterCard>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={handleReset} activeOpacity={0.9}>
              <Text style={styles.clearText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={onClose} activeOpacity={0.9}>
              <Text style={styles.applyText}>
                Show {filteredCount} Hotel{filteredCount === 1 ? "" : "s"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    marginBottom: 12,
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: "800",
  },
  searchRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  priceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },
  sliderShell: {
    height: 40,
    justifyContent: "center",
    marginHorizontal: 4,
  },
  sliderTrack: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.border,
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
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: "#FFFFFF",
  },
  clearButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  clearText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  applyButton: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  applyText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
