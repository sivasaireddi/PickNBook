import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Map common amenities to icons
const getAmenityIcon = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("wifi") || lower.includes("wi-fi") || lower.includes("internet")) return "wifi";
  if (lower.includes("park")) return "car-outline";
  if (lower.includes("pool")) return "water-outline";
  if (lower.includes("gym") || lower.includes("fitness")) return "barbell-outline";
  if (lower.includes("breakfast") || lower.includes("food") || lower.includes("restaurant") || lower.includes("dining")) return "restaurant-outline";
  if (lower.includes("ac") || lower.includes("air condition")) return "snow-outline";
  if (lower.includes("bar")) return "wine-outline";
  if (lower.includes("spa")) return "leaf-outline";
  if (lower.includes("tv")) return "tv-outline";
  if (lower.includes("laundry")) return "shirt-outline";
  if (lower.includes("clean") || lower.includes("housekeeping")) return "sparkles-outline";
  if (lower.includes("front desk") || lower.includes("reception")) return "business-outline";
  if (lower.includes("elevat") || lower.includes("lift")) return "swap-vertical-outline";
  if (lower.includes("accessib")) return "body-outline";
  return "checkmark-circle-outline";
};

export default function AmenitiesPreview({ facilities, onViewAllPress }) {
  if (!facilities || facilities.length === 0) return null;

  const validFacilities = facilities.map((fac) => {
    return typeof fac === "object" ? (fac?.name || fac?.detail || "") : String(fac);
  }).filter(Boolean);

  if (validFacilities.length === 0) return null;

  const previewFacilities = validFacilities.slice(0, 6);
  const hasMore = validFacilities.length > 6;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.sectionTitle}>HOTEL AMENITIES</Text>
          <Text style={styles.subtitle}>Everything you need for a comfortable stay</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{validFacilities.length}</Text>
        </View>
      </View>
      
      <View style={styles.grid}>
        {previewFacilities.map((fac, idx) => (
          <View key={`${fac}-${idx}`} style={styles.amenityItem}>
            <View style={styles.iconBox}>
              <Ionicons name={getAmenityIcon(fac)} size={19} color="#B4232C" />
            </View>
            <Text style={styles.amenityText} numberOfLines={2}>{fac}</Text>
          </View>
        ))}
      </View>

      {hasMore && (
        <Pressable
          style={({ pressed }) => [styles.viewAllBtn, pressed && styles.pressed]}
          onPress={onViewAllPress}
          accessibilityRole="button"
          accessibilityLabel={`View all ${validFacilities.length} hotel amenities`}
        >
          <Text style={styles.viewAllText}>View all {validFacilities.length} amenities</Text>
          <Ionicons name="arrow-forward" size={17} color="#B4232C" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  countBadge: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: "#B4232C",
    fontSize: 13,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  amenityItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    marginBottom: 10,
    paddingRight: 4,
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  amenityText: {
    fontSize: 14,
    lineHeight: 19,
    color: "#1F2937",
    flex: 1,
    fontWeight: "600",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: "#B4232C",
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.65,
  },
});
