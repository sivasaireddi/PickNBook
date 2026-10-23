import React, { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

const ExitIndicator = ({ type, seatName, deck, row, column, width, height, left, top, containerHeight, anchor }) => {
  const isEmergencyExit = String(type).toUpperCase() === "BACK_EXIT";

  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[BusFlow] EXIT RENDER POSITION:", {
        type,
        seatName,
        deck,
        calculatedPosition: { left, top, width, height },
        anchor,
        row,
        column,
      });
    }
  }, [anchor, column, deck, height, left, row, seatName, top, type, width]);

  return (
    <View style={[styles.positioned, { left, top, width, height }]} pointerEvents="none">
      {isEmergencyExit ? (
        <View
          style={[
            styles.emergencyCallout,
            {
              top: Math.max(height + 2, containerHeight - top - 24),
            },
          ]}
        >
          <Text style={styles.downArrow}>{"\u2193"}</Text>
          <Text style={styles.emergencyText} numberOfLines={1}>
            emergency exit
          </Text>
        </View>
      ) : (
        <View style={styles.exitLabel}>
          <Text style={styles.exitText} numberOfLines={1}>
            ROOF EXIT
          </Text>
          <Text style={styles.arrow}>{"\u2192"}</Text>
        </View>
      )}
    </View>
  );
};

export default memo(ExitIndicator);

const styles = StyleSheet.create({
  positioned: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  exitLabel: {
    width: 78,
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyCallout: {
    position: "absolute",
    left: -16,
    width: 110,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  downArrow: {
    color: "#000000",
    fontSize: 32,
    lineHeight: 28,
    fontWeight: "700",
  },
  emergencyText: {
    color: "#111111",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    includeFontPadding: false,
  },
  exitText: {
    color: "#475569",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
    flexShrink: 0,
    includeFontPadding: false,
  },
  arrow: {
    color: "#E53935",
    fontSize: 19,
    lineHeight: 20,
    fontWeight: "600",
    alignSelf: "center",
    marginTop: 1,
  },
});
