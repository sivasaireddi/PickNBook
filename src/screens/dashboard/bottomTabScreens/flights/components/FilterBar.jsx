import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY_RED = "#E11D2E";
const TEXT_DARK = "#1F2937";
const BORDER_COLOR = "#E5E7EB";

export default function FilterBar({
  activeSort = "cheapest",
  onSelectSort,
  dealsOnly = false,
  onToggleDeals,
  activeFilterCount = 0,
  onOpenSortSheet,
  onOpenFilterSheet,
}) {
  const getSortLabel = () => {
    switch (activeSort) {
      case "fastest": return "Sort: Fastest";
      case "earliest": return "Sort: Earliest";
      case "latest": return "Sort: Latest";
      case "earliestarrival": return "Sort: Arrival";
      case "cheapest":
      default: return "Sort by";
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Filter Chip */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onOpenFilterSheet}
          style={[styles.chip, activeFilterCount > 0 && styles.chipActiveBorder]}
          accessibilityRole="button"
          accessibilityLabel={`Filter flights, ${activeFilterCount} active filters`}
        >
          <Ionicons name="options-outline" size={15} color={activeFilterCount > 0 ? PRIMARY_RED : TEXT_DARK} />
          <Text style={[styles.chipText, activeFilterCount > 0 && styles.chipActiveText]}>
            Filter {activeFilterCount > 0 ? `· ${activeFilterCount}` : ""}
          </Text>
        </TouchableOpacity>

        {/* 2. Stops */}
        <TouchableOpacity activeOpacity={0.8} onPress={onOpenFilterSheet} style={styles.chip}>
          <Text style={styles.chipText}>Stops</Text>
          <Ionicons name="chevron-down" size={14} color={TEXT_DARK} />
        </TouchableOpacity>

        {/* 3. Departure */}
        <TouchableOpacity activeOpacity={0.8} onPress={onOpenFilterSheet} style={styles.chip}>
          <Text style={styles.chipText}>Departure</Text>
          <Ionicons name="chevron-down" size={14} color={TEXT_DARK} />
        </TouchableOpacity>

        {/* 4. Airlines */}
        <TouchableOpacity activeOpacity={0.8} onPress={onOpenFilterSheet} style={styles.chip}>
          <Text style={styles.chipText}>Airlines</Text>
          <Ionicons name="chevron-down" size={14} color={TEXT_DARK} />
        </TouchableOpacity>

        {/* 5. Sort by Chip */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onOpenSortSheet}
          style={[styles.chip, activeSort !== "cheapest" && styles.chipActiveBorder]}
          accessibilityRole="button"
          accessibilityLabel={`${getSortLabel()}, button`}
        >
          <Text style={[styles.chipText, activeSort !== "cheapest" && styles.chipActiveText]}>
            {getSortLabel()}
          </Text>
          <Ionicons name="chevron-down" size={14} color={activeSort !== "cheapest" ? PRIMARY_RED : TEXT_DARK} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActiveBorder: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FEF2F2",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  chipActiveText: {
    color: PRIMARY_RED,
    fontWeight: "700",
  },
});
