import React, { useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../utils/flightUtils";

const PRIMARY_RED = "#E11D2E";
const PRIMARY_RED_DARK = "#B3121F";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

const STOPS_OPTIONS = [
  { id: "nonstop", label: "Non-stop" },
  { id: "1stop", label: "1 Stop" },
  { id: "2plus", label: "2+ Stops" },
];

export default function FilterSheet({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  minPrice = 0,
  maxPrice = 50000,
  availableAirlines = [],
}) {
  const [selectedStops, setSelectedStops] = useState(filters.stops || []);
  const [selectedAirlines, setSelectedAirlines] = useState(filters.airlines || []);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState(
    Array.isArray(filters.priceRange) && filters.priceRange[1] ? filters.priceRange[1] : maxPrice
  );

  useEffect(() => {
    setSelectedStops(filters.stops || []);
    setSelectedAirlines(filters.airlines || []);
    setSelectedMaxPrice(
      Array.isArray(filters.priceRange) && filters.priceRange[1] ? filters.priceRange[1] : maxPrice
    );
  }, [filters, maxPrice, visible]);

  const toggleStop = (id) => {
    setSelectedStops((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAirline = (code) => {
    setSelectedAirlines((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  };

  const handleApply = () => {
    onApplyFilters({
      stops: selectedStops,
      airlines: selectedAirlines,
      priceRange: [minPrice, selectedMaxPrice],
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedStops([]);
    setSelectedAirlines([]);
    setSelectedMaxPrice(maxPrice);
    onResetFilters();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter Flights</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close filter sheet">
              <Ionicons name="close" size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Stops Filter Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stops</Text>
              <View style={styles.chipRow}>
                {STOPS_OPTIONS.map((opt) => {
                  const isSelected = selectedStops.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.8}
                      onPress={() => toggleStop(opt.id)}
                      style={[styles.checkboxChip, isSelected && styles.checkboxChipSelected]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`Filter by ${opt.label}`}
                    >
                      <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={18}
                        color={isSelected ? PRIMARY_RED : TEXT_MUTED}
                      />
                      <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Airlines Multi-Select Section */}
            {availableAirlines && availableAirlines.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Airlines</Text>
                <View style={styles.airlineList}>
                  {availableAirlines.map((airline) => {
                    const isSelected = selectedAirlines.includes(airline.code);
                    return (
                      <TouchableOpacity
                        key={airline.code}
                        activeOpacity={0.8}
                        onPress={() => toggleAirline(airline.code)}
                        style={[styles.airlineRow, isSelected && styles.airlineRowSelected]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`Filter by ${airline.name}`}
                      >
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={18}
                          color={isSelected ? PRIMARY_RED : TEXT_MUTED}
                        />
                        <Text style={[styles.airlineText, isSelected && styles.airlineTextSelected]}>
                          {airline.name} ({airline.code})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Price Cap Section */}
            <View style={styles.section}>
              <View style={styles.priceHeader}>
                <Text style={styles.sectionTitle}>Max Price Cap</Text>
                <Text style={styles.priceValText}>{formatCurrency(selectedMaxPrice)}</Text>
              </View>
              <Text style={styles.priceSubText}>
                Showing flights up to {formatCurrency(selectedMaxPrice)}
              </Text>
            </View>
          </ScrollView>

          {/* Footer CTAs */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Reset All</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={handleApply} style={{ flex: 1 }}>
              <LinearGradient
                colors={[PRIMARY_RED, PRIMARY_RED_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.applyBtn}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  checkboxChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  checkboxChipSelected: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FEF2F2",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  chipLabelSelected: {
    color: PRIMARY_RED,
    fontWeight: "700",
  },
  airlineList: {
    gap: 8,
  },
  airlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  airlineRowSelected: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FEF2F2",
  },
  airlineText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  airlineTextSelected: {
    color: PRIMARY_RED,
    fontWeight: "700",
  },
  priceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceValText: {
    fontSize: 16,
    fontWeight: "900",
    color: PRIMARY_RED,
  },
  priceSubText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  resetBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  applyBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
