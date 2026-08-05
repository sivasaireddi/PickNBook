import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY_RED = "#E11D2E";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

export default function RouteHeader({
  origin = "DEL",
  destination = "BOM",
  date = "3 Aug 2026",
  passengers = "1 Pax",
  travelClass = "Economy",
  onBack,
  onModify,
}) {
  const formatCity = (val, fallback) => {
    if (!val) return fallback;
    if (typeof val === "string") return val;
    return val.airportCode || val.cityName || val.airportId || fallback;
  };

  const originText = formatCity(origin, "DEL");
  const destText = formatCity(destination, "BOM");

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Go back to search"
      >
        <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
      </TouchableOpacity>

      <View style={styles.infoCol}>
        <View style={styles.titleRow}>
          <Text style={styles.cityText}>{originText}</Text>
          <Ionicons name="arrow-forward" size={16} color={PRIMARY_RED} style={styles.arrowIcon} />
          <Text style={styles.cityText}>{destText}</Text>
        </View>
        <Text style={styles.subText}>
          {date} • {passengers} • {travelClass}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onModify}
        style={styles.modifyBtn}
        accessibilityRole="button"
        accessibilityLabel="Modify search details"
      >
        <Text style={styles.modifyBtnText}>Modify</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityText: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },
  arrowIcon: {
    marginHorizontal: 2,
  },
  subText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "500",
    marginTop: 2,
  },
  modifyBtn: {
    borderWidth: 1.5,
    borderColor: PRIMARY_RED,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  modifyBtnText: {
    color: PRIMARY_RED,
    fontSize: 13,
    fontWeight: "700",
  },
});
