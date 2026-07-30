import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

const formatAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(3) : "0.000";
};

export default function FareSummaryCard({ roomPrice = 0, discount = 0 }) {
  const summary = useMemo(() => {
    const base = Number(roomPrice) || 0;
    const gst = Math.round(base * 0.12);
    const fee = 150;
    const discountVal = Number(discount) || 0;
    return { base, gst, fee, discount: discountVal, total: Math.max(0, base + gst + fee - discountVal) };
  }, [roomPrice, discount]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Fare Summary</Text>
      <Row label="Room Charges" value={summary.base} />
      <Row label="GST" value={summary.gst} />
      <Row label="Convenience Fee" value={summary.fee} />
      {summary.discount > 0 && (
        <Row label="Coupon Discount" value={-summary.discount} discount />
      )}
      <View style={styles.divider} />
      <Row label="Total" value={summary.total} total />
    </View>
  );
}

function Row({ label, value, total, discount }) {
  const isNegative = value < 0;
  const displayVal = Math.abs(value);
  return (
    <View style={styles.row}>
      <Text style={[styles.label, total && styles.totalLabel, discount && styles.discountLabel]}>{label}</Text>
      <Text style={[styles.value, total && styles.totalValue, discount && styles.discountValue]}>
        {isNegative ? "- " : ""}₹ {formatAmount(displayVal)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  label: {
    color: "#757575",
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    color: "#212121",
    fontSize: 13,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 12,
  },
  totalLabel: {
    color: "#212121",
    fontSize: 15,
    fontWeight: "800",
  },
  totalValue: {
    color: "#B71C1C",
    fontSize: 16,
    fontWeight: "900",
  },
  discountLabel: {
    color: "#2E7D32",
  },
  discountValue: {
    color: "#2E7D32",
  },
});
