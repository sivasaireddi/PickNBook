import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";

const formatCurrency = (value, currency = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function CheckoutBottomBar({ totalPrice, onConfirm, disabled, loading, buttonText = "Confirm & Book" }) {
  const displayCurrency = "INR";

  return (
    <View style={styles.container}>
      <View style={styles.priceCol}>
        <Text style={styles.priceLabel}>Total Payable</Text>
        <Text style={styles.priceValue}>{formatCurrency(totalPrice, displayCurrency)}</Text>
      </View>
      <Pressable 
        style={[styles.btn, disabled && styles.btnDisabled]} 
        onPress={onConfirm}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={[styles.btnText, disabled && styles.btnTextDisabled]}>
            {buttonText}
          </Text>
        )}
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  priceCol: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },
  btn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: "#F1F5F9",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  btnTextDisabled: {
    color: "#94A3B8",
  }
});
