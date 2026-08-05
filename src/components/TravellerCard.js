import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { RADIUS, SPACING } from "../constants/spacing";

export const TravellerCard = React.memo(function TravellerCard({
  travellers,
  onPress,
}) {
  const getSummary = () => {
    if (!travellers) return "1 Adult";
    const parts = [];
    if (travellers.adults > 0)
      parts.push(`${travellers.adults} Adult${travellers.adults > 1 ? "s" : ""}`);
    if (travellers.children > 0)
      parts.push(`${travellers.children} Child${travellers.children > 1 ? "ren" : ""}`);
    if (travellers.infants > 0)
      parts.push(`${travellers.infants} Infant${travellers.infants > 1 ? "s" : ""}`);
    return parts.join(", ") || "1 Adult";
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.iconBox}>
        <Ionicons name="person-outline" size={18} color={COLORS.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.monoLabel}>TRAVELLERS</Text>
        <Text style={styles.valueText} numberOfLines={1}>
          {getSummary()}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    height: 62,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.chipBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  monoLabel: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: COLORS.textSecondary,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 2,
  },
  valueText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
});

export default TravellerCard;
