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
      <Text style={styles.sectionTitle}>HOTEL AMENITIES</Text>
      
      <View style={styles.grid}>
        {previewFacilities.map((fac, idx) => (
          <View key={idx} style={styles.amenityItem}>
            <View style={styles.iconBox}>
              <Ionicons name={getAmenityIcon(fac)} size={16} color="#475569" />
            </View>
            <Text style={styles.amenityText} numberOfLines={2}>{fac}</Text>
          </View>
        ))}
      </View>

      {hasMore && (
        <Pressable style={styles.viewAllBtn} onPress={onViewAllPress}>
          <Text style={styles.viewAllText}>View All {validFacilities.length} Amenities</Text>
          <Ionicons name="chevron-forward" size={14} color="#EF4444" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 12,
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
    marginBottom: 12,
    gap: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  amenityText: {
    fontSize: 13,
    color: "#334155",
    flex: 1,
    fontWeight: "500",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "700",
  },
});
