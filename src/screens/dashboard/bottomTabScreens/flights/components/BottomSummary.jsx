import React, { memo } from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { formatCurrency } from "../utils/seatMapUtils";

const BottomSummary = memo(function BottomSummary({
  selectedSeats,
  seatCharges,
  baseFare,
  taxes,
  total,
  onContinue,
  disabled,
  remainingCount,
  buttonTitle,
}) {
  return (
    <View style={styles.container}>
      {/* Upper info section */}
      <View style={styles.infoRow}>
        <View style={styles.col}>
          <Text style={styles.label}>Selected Seats</Text>
          <Text style={styles.value}>
            {selectedSeats.length ? selectedSeats.join(", ") : "None Selected"}
          </Text>
        </View>
        <View style={[styles.col, styles.alignRight]}>
          <Text style={styles.label}>Seat Surcharges</Text>
          <Text style={styles.value}>{formatCurrency(seatCharges)}</Text>
        </View>
      </View>

      {/* Fare Breakdown */}
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownText}>Base: {formatCurrency(baseFare)}</Text>
        <Text style={styles.breakdownDot}>•</Text>
        <Text style={styles.breakdownText}>Taxes: {formatCurrency(taxes)}</Text>
      </View>

      {/* Total and CTA Row */}
      <View style={styles.actionRow}>
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Total Fare</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
        <Pressable
          disabled={disabled}
          onPress={onContinue}
          style={({ pressed }) => [
            styles.button,
            disabled && styles.buttonDisabled,
            pressed && !disabled && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {buttonTitle || (remainingCount > 0 ? `Select ${remainingCount} Seat${remainingCount > 1 ? "s" : ""}` : "Continue")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  col: {
    flex: 1,
  },
  alignRight: {
    alignItems: "flex-end",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  breakdownText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  breakdownDot: {
    fontSize: 11,
    color: "#CBD5E1",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  totalBlock: {
    justifyContent: "center",
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#D11A2A",
  },
  button: {
    flex: 1,
    backgroundColor: "#D11A2A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D11A2A",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});

export default BottomSummary;
