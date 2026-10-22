import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Armchair,
  BedDouble,
  Check,
  IndianRupee,
  Moon,
  SlidersHorizontal,
  Snowflake,
  Sun,
  Wind,
} from "lucide-react-native";

const PRIMARY_RED = "#C8102E";

const QUICK_FILTERS = [
  { id: "ac", label: "AC", Icon: Snowflake },
  { id: "nonAc", label: "Non AC", Icon: Wind },
  { id: "cheapest", label: "Cheapest First", Icon: IndianRupee },
  { id: "seater", label: "Seater", Icon: Armchair },
  { id: "sleeper", label: "Sleeper", Icon: BedDouble },
  { id: "day", label: "Day Time", Icon: Sun },
  { id: "night", label: "Night Time", Icon: Moon },
];

const QuickFilterChip = React.memo(({ item, selected, onToggle }) => {
  const Icon = item.Icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.label} quick filter`}
      accessibilityState={{ selected }}
      onPress={() => onToggle(item.id)}
      style={({ pressed }) => [
        styles.quickChip,
        selected && styles.quickChipSelected,
        pressed && styles.pressed,
      ]}
    >
      {selected ? (
        <Check size={14} color={PRIMARY_RED} strokeWidth={3} />
      ) : (
        <Icon size={15} color="#64748B" strokeWidth={2} />
      )}
      <Text style={[styles.quickChipText, selected && styles.quickChipTextSelected]}>
        {item.label}
      </Text>
    </Pressable>
  );
});

export default function SortBar({
  resultCount = null,
  activeFilterCount = 0,
  quickFilterStates = {},
  onToggleQuickFilter = () => {},
  onOpenFilters = () => {},
}) {
  const resultLabel = resultCount === null
    ? "Finding buses..."
    : `${resultCount} ${resultCount === 1 ? "Bus" : "Buses"} available`;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.resultCount} accessibilityLiveRegion="polite">
        {resultLabel}
      </Text>

      <View style={styles.toolbarRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open all bus filters and sorting"
          onPress={onOpenFilters}
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
        >
          <SlidersHorizontal size={17} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.filterButtonText}>Sort & Filters</Text>
          {activeFilterCount > 0 ? (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.quickListViewport}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickListContent}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_FILTERS.map((item) => (
              <QuickFilterChip
                key={item.id}
                item={item}
                selected={!!quickFilterStates[item.id]}
                onToggle={onToggleQuickFilter}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 10,
    backgroundColor: "#F8F9FB",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  resultCount: {
    marginBottom: 8,
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  toolbarRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  filterButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: PRIMARY_RED,
    zIndex: 2,
  },
  filterButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  filterCountBadge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  filterCountText: { color: PRIMARY_RED, fontSize: 10, fontWeight: "900" },
  quickListViewport: { flex: 1, minWidth: 0, marginLeft: 8, overflow: "hidden" },
  quickListContent: { alignItems: "center", paddingRight: 16, gap: 8 },
  quickChip: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8DEE8",
    backgroundColor: "#FFFFFF",
  },
  quickChipSelected: { borderColor: "#E6A5AF", backgroundColor: "#FFF0F2" },
  quickChipText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  quickChipTextSelected: { color: PRIMARY_RED, fontWeight: "800" },
  pressed: { opacity: 0.78 },
});
