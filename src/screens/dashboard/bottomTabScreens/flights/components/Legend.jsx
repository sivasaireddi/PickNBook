import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

const Legend = memo(function Legend() {
  return (
    <View style={styles.wrap}>
      <View style={styles.item}>
        <View style={[styles.swatch, styles.available]} />
        <Text style={styles.label}>Available</Text>
      </View>
      <View style={styles.item}>
        <View style={[styles.swatch, styles.selected]} />
        <Text style={styles.label}>Selected</Text>
      </View>
      <View style={styles.item}>
        <View style={[styles.swatch, styles.booked]} />
        <Text style={styles.label}>Booked</Text>
      </View>
      <View style={styles.item}>
        <View style={[styles.swatch, styles.premium]}>
          <Text style={styles.star}>★</Text>
        </View>
        <Text style={styles.label}>Premium</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  available: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
  },
  selected: {
    backgroundColor: "#D11A2A",
    borderColor: "#D11A2A",
  },
  booked: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
  },
  premium: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D4AF37", // Gold
  },
  star: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#D4AF37",
    lineHeight: 12,
  },
  label: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default Legend;
