import React, { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { BUS_SEAT_COLORS } from "../../theme/busSeatTheme";

const LEGEND_ITEMS = [
  {
    key: "available",
    label: "Available",
    type: "seat",
    borderColor: BUS_SEAT_COLORS.availableBorder,
    stripColor: BUS_SEAT_COLORS.availableStrip,
    bgColor: BUS_SEAT_COLORS.availableBg,
  },
  {
    key: "female",
    label: "Female",
    type: "image",
    imageSource: require("../../../assets/woman.png"),
  },
  {
    key: "male",
    label: "Male",
    type: "image",
    imageSource: require("../../../assets/man.png"),
  },
  {
    key: "femaleBooked",
    label: "Female Booked",
    type: "femaleBooked",
  },
  {
    key: "booked",
    label: "Booked",
    type: "seat",
    borderColor: BUS_SEAT_COLORS.bookedBorder,
    stripColor: BUS_SEAT_COLORS.bookedStrip,
    bgColor: BUS_SEAT_COLORS.bookedBg,
  },
];

const LegendCard = memo(({ item }) => {
  return (
    <View style={styles.legendItem}>
      <View style={styles.iconContainer}>
        {item.type === "seat" && (
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
        )}

        {item.type === "image" && (
          <Image
            source={item.imageSource}
            style={[
              styles.genderIcon,
              {
                tintColor:
                  item.key === "female"
                    ? BUS_SEAT_COLORS.femaleBorder
                    : BUS_SEAT_COLORS.maleBorder,
              },
            ]}
            resizeMode="contain"
          />
        )}

        {item.type === "femaleBooked" && (
          <View style={styles.femaleBookedSeat}>
            <View style={styles.femaleBookedPillow} />
            <Image
              source={require("../../../assets/woman.png")}
              style={[
                styles.femaleBookedGenderIcon,
                { tintColor: BUS_SEAT_COLORS.femaleBookedText },
              ]}
              resizeMode="contain"
            />
          </View>
        )}
      </View>

      <Text
        numberOfLines={1}
        style={styles.legendText}
      >
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
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 4,
    rowGap: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  legendItem: {
    flexGrow: 1,
    flexShrink: 0,
    alignItems: "center",
    paddingHorizontal: 0,
  },
  iconContainer: {
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 1,
  },
  genderIcon: {
    width: 25,
    height: 25,
  },
  femaleBookedGenderIcon: {
    width: 18,
    height: 18,
    marginTop: 2,
  },
  miniSeat: {
    width: 20,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: "space-between",
    alignItems: "center",
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
    height: 3.5,
  },
  femaleBookedSeat: {
    width: 25,
    height: 27,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: BUS_SEAT_COLORS.femaleBookedLegendBorder,
    backgroundColor: BUS_SEAT_COLORS.femaleBookedBg,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  femaleBookedPillow: {
    width: "70%",
    height: 3,
    backgroundColor: BUS_SEAT_COLORS.femaleBookedStrip,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#1F2937",
    textAlign: "center",
    flexShrink: 0,
    lineHeight: 14,
  },
});
