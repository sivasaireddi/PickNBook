import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

const LEGEND_ITEMS = [
  {
    key: "available",
    label: "Available",
    borderColor: "#D1D5DB",
    stripColor: "#D1D5DB",
    bgColor: "#FFFFFF",
  },
  {
    key: "female",
    label: "For Female",
    borderColor: "#EC4899",
    stripColor: "#EC4899",
    bgColor: "#FCE7F3",
  },
  {
    key: "male",
    label: "For Male",
    borderColor: "#3B82F6",
    stripColor: "#3B82F6",
    bgColor: "#EFF6FF",
  },
  {
    key: "femaleBooked",
    label: "Female Booked",
    borderColor: "#D1D5DB",
    stripColor: "#DB2777",
    bgColor: "#F3E5EB",
  },
  {
    key: "booked",
    label: "Booked",
    borderColor: "#D1D5DB",
    stripColor: "#D1D5DB",
    bgColor: "#E5E7EB",
  },
  {
    key: "selected",
    label: "Selected",
    borderColor: "#16A34A",
    stripColor: "#22C55E",
    bgColor: "#FFFFFF",
  },
];

const LegendCard = memo(({ item }) => {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.miniSeat,
          {
            borderColor: item.borderColor,
            backgroundColor: item.bgColor,
          },
        ]}
      >
        <View
          style={[
            styles.miniSeatPillow,
            { backgroundColor: item.borderColor },
          ]}
        />
        <View
          style={[
            styles.miniSeatStrip,
            { backgroundColor: item.stripColor },
          ]}
        />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.legendText}>
        {item.label}
      </Text>
    </View>
  );
});

const SeatLegend = () => {
  return (
    <View style={styles.container}>
      <View style={styles.legendContainer}>
        {LEGEND_ITEMS.map((item) => (
          <LegendCard key={item.key} item={item} />
        ))}
      </View>
    </View>
  );
};

export default memo(SeatLegend);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
  },
  legendItem: {
    flex: 1,
    alignItems: "center",
  },
  miniSeat: {
    width: 16,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
    overflow: "hidden",
  },
  miniSeatPillow: {
    width: "70%",
    height: 3,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
  miniSeatStrip: {
    width: "100%",
    height: 3,
  },
  legendText: {
    fontSize: 8,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
});
