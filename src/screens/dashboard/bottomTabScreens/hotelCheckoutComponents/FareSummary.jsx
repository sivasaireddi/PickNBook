import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatCurrency = (value, currency = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function FareSummary({ basePrice, gst, convenienceFee, discount, totalPrice }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayCurrency = "INR";

  return (
    <View style={styles.container}>
      <Pressable style={styles.headerRow} onPress={() => setIsExpanded(!isExpanded)}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Fare Summary</Text>
          <Text style={styles.toggleText}>
            {isExpanded ? "Hide price breakdown" : "View price breakdown"} 
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color="#64748B" />
          </Text>
        </View>
        <Text style={styles.totalHeaderPrice}>{formatCurrency(totalPrice, displayCurrency)}</Text>
      </Pressable>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.row}>
            <Text style={styles.label}>Room Charges</Text>
            <Text style={styles.value}>{formatCurrency(basePrice, displayCurrency)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Taxes</Text>
            <Text style={styles.value}>{formatCurrency(gst, displayCurrency)}</Text>
          </View>
          
          {convenienceFee > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Service/Markup</Text>
              <Text style={styles.value}>{formatCurrency(convenienceFee, displayCurrency)}</Text>
            </View>
          )}

          {discount > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, styles.discountText]}>Coupon Discount</Text>
              <Text style={[styles.value, styles.discountText]}>-{formatCurrency(discount, displayCurrency)}</Text>
            </View>
          )}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalPrice, displayCurrency)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerLeft: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  toggleText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  totalHeaderPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#EF4444",
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    paddingTop: 12,
    backgroundColor: "#F8FAFC",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  value: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  discountText: {
    color: "#166534",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#EF4444",
  }
});
