import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

const formatCurrency = (value, currency = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function BookingBottomBar({ totalPrice, roomCount, requiredRoomCount = roomCount, displayCurrency, onContinue, disabled }) {
  return (
    <View style={styles.container}>
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>TOTAL</Text>
        <Text style={styles.priceValue}>
          {disabled ? "—" : formatCurrency(totalPrice, displayCurrency)}
        </Text>
        <Text style={styles.roomCountText}>
          {disabled
            ? `Select ${requiredRoomCount} rate plan${requiredRoomCount > 1 ? "s" : ""} to continue`
            : `${roomCount} Room${roomCount > 1 ? "s" : ""} Selected`}
        </Text>
      </View>
      
      <Pressable 
        style={[styles.continueBtn, disabled && styles.continueBtnDisabled]} 
        onPress={onContinue}
        disabled={disabled}
      >
        <Text style={styles.continueBtnText}>Proceed to Checkout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginVertical: 2,
  },
  roomCountText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  continueBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  continueBtnDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});
