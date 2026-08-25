import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from "../../theme/busSeatTheme";

const DriverIndicator = () => {
  return (
    <View style={styles.container}>
      <View style={[styles.circularBadge, BUS_SEAT_SHADOWS.card]}>
        <MaterialCommunityIcons
          name="steering"
          size={14}
          color={BUS_SEAT_COLORS.textSecondary}
        />
      </View>
    </View>
  );
};

export default memo(DriverIndicator);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 6,
    top: 6,
    zIndex: 10,
  },
  circularBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BUS_SEAT_COLORS.coachFloorBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BUS_SEAT_COLORS.borderLight,
  },
});
