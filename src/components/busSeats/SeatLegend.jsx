import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

const LEGEND_ITEMS = [
  {
    key: "available",
    label: "Available",
    borderColor: "#9CA3AF",
    stripColor: "#9CA3AF",
    bgColor: "#FFFFFF",
    isFilled: false,
  },
  {
    key: "female",
    label: "For Female",
    borderColor: "#F472B6",
    stripColor: "#F472B6",
    bgColor: "#FFFFFF",
    isFilled: false,
  },
  {
    key: "male",
    label: "For Male",
    borderColor: "#60A5FA",
    stripColor: "#60A5FA",
    bgColor: "#FFFFFF",
    isFilled: false,
  },
  {
    key: "femaleBooked",
    label: "Female booked",
    borderColor: "#F472B6",
    stripColor: "#F472B6",
    bgColor: "#F472B6",
    isFilled: true,
  },
  {
    key: "booked",
    label: "Booked",
    borderColor: "#4B5563",
    stripColor: "#4B5563",
    bgColor: "#4B5563",
    isFilled: true,
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
            { backgroundColor: item.isFilled ? "#FFFFFF" : item.borderColor },
          ]}
        />
        <View
          style={[
            styles.miniSeatStrip,
            { backgroundColor: item.isFilled ? "#FFFFFF" : item.stripColor },
          ]}
        />
      </View>
      <Text numberOfLines={1} style={styles.legendText}>
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
    paddingTop: 8,
    paddingBottom: 4,
  },
  legendItem: {
    flex: 1,
    alignItems: "center",
  },
  miniSeat: {
    width: 20,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
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
    fontSize: 9.5,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
});
