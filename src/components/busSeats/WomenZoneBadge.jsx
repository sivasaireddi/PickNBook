import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from "../../theme/busSeatTheme";
import { moderateScale } from "react-native-size-matters";

const WomenZoneBadge = () => {
  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={[
          BUS_SEAT_COLORS.womenZoneGradientStart,
          BUS_SEAT_COLORS.womenZoneGradientEnd,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.capsule, BUS_SEAT_SHADOWS.soft]}
      >
        <Ionicons
          name="woman-outline"
          size={16}
          color={BUS_SEAT_COLORS.femaleBorder}
          style={styles.icon}
        />
        <Text style={styles.text}>Women Reserved Zone</Text>
      </LinearGradient>
    </View>
  );
};

export default memo(WomenZoneBadge);

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: "center",
    marginVertical: 6,
  },
  capsule: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BUS_SEAT_COLORS.womenZoneBorder,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.womenZoneText,
    letterSpacing: 0.2,
  },
});
