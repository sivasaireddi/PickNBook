import React, { memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from "../../theme/busSeatTheme";
import { moderateScale, scale } from "react-native-size-matters";

const LEGEND_ITEMS = [
  {
    key: "available",
    label: "Available",
    borderColor: BUS_SEAT_COLORS.availableBorder,
    stripColor: BUS_SEAT_COLORS.availableStrip,
    bgColor: BUS_SEAT_COLORS.availableBg,
  },
  {
    key: "female",
    label: "Female",
    borderColor: BUS_SEAT_COLORS.femaleBorder,
    stripColor: BUS_SEAT_COLORS.femaleStrip,
    bgColor: BUS_SEAT_COLORS.femaleBg,
  },
  {
    key: "male",
    label: "Male",
    borderColor: BUS_SEAT_COLORS.maleBorder,
    stripColor: BUS_SEAT_COLORS.maleStrip,
    bgColor: BUS_SEAT_COLORS.maleBg,
  },
  {
    key: "booked",
    label: "Booked",
    borderColor: BUS_SEAT_COLORS.bookedBorder,
    stripColor: BUS_SEAT_COLORS.bookedStrip,
    bgColor: BUS_SEAT_COLORS.bookedBg,
  },
  {
    key: "femaleBooked",
    label: "Female Booked",
    borderColor: BUS_SEAT_COLORS.femaleBookedBorder,
    stripColor: BUS_SEAT_COLORS.femaleBookedStrip,
    bgColor: BUS_SEAT_COLORS.femaleBookedBg,
  },
  {
    key: "selected",
    label: "Selected",
    borderColor: BUS_SEAT_COLORS.selectedBorder,
    stripColor: BUS_SEAT_COLORS.selectedStrip,
    bgColor: BUS_SEAT_COLORS.selectedBg,
  },
];

const LegendCard = memo(({ item }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.legendCard,
        BUS_SEAT_SHADOWS.card,
        pressed && styles.pressedCard,
      ]}
    >
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
      <Text numberOfLines={1} style={styles.legendText}>
        {item.label}
      </Text>
    </Pressable>
  );
});

const SeatLegend = () => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {LEGEND_ITEMS.map((item) => (
          <LegendCard key={item.key} item={item} />
        ))}
      </ScrollView>
    </View>
  );
};

export default memo(SeatLegend);

const styles = StyleSheet.create({
  container: {
    backgroundColor: BUS_SEAT_COLORS.cardSurface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BUS_SEAT_COLORS.borderLight,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 10,
  },
  legendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BUS_SEAT_COLORS.cardSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BUS_SEAT_COLORS.borderLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pressedCard: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  miniSeat: {
    width: 22,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  miniSeatPillow: {
    width: "70%",
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  miniSeatStrip: {
    width: "100%",
    height: 4,
  },
  legendText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: BUS_SEAT_COLORS.textSecondary,
  },
});
