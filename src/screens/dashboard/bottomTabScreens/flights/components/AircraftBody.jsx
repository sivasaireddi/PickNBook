import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AircraftBody({ children }) {
  return (
    <View style={styles.aircraft}>
      {/* Nose Cone / Cockpit */}
      <View style={styles.nose}>
        <View style={styles.cockpitWindows}>
          <View style={[styles.window, styles.windowLeft]} />
          <View style={[styles.window, styles.windowRight]} />
        </View>
        <Text style={styles.noseLabel}>FRONT</Text>
      </View>

      {/* Fuselage / Main Cabin wrapper */}
      <View style={styles.fuselage}>
        {children}
      </View>

      {/* Tail Fin Section */}
      <View style={styles.tail}>
        <View style={styles.stabilizerLeft} />
        <View style={styles.tailFin} />
        <View style={styles.stabilizerRight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  aircraft: {
    alignItems: "center",
    width: "100%",
    backgroundColor: "transparent",
  },
  nose: {
    width: 330,
    height: 70,
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 165,
    borderTopRightRadius: 165,
    borderWidth: 2,
    borderColor: "#94A3B8",
    borderBottomWidth: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
    position: "relative",
  },
  cockpitWindows: {
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    top: 24,
  },
  window: {
    width: 38,
    height: 14,
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderColor: "#475569",
  },
  windowLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 3,
    transform: [{ skewY: "-6deg" }],
  },
  windowRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 3,
    transform: [{ skewY: "6deg" }],
  },
  noseLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#64748B",
    letterSpacing: 2,
  },
  fuselage: {
    width: 330,
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "#94A3B8",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tail: {
    width: 330,
    height: 60,
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
  },
  tailFin: {
    width: 22,
    height: 48,
    backgroundColor: "#94A3B8",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  stabilizerLeft: {
    position: "absolute",
    left: 45,
    top: 0,
    width: 90,
    height: 16,
    backgroundColor: "#CBD5E1",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 2,
    transform: [{ skewY: "-12deg" }],
  },
  stabilizerRight: {
    position: "absolute",
    right: 45,
    top: 0,
    width: 90,
    height: 16,
    backgroundColor: "#CBD5E1",
    borderTopRightRadius: 16,
    borderBottomRightRadius: 2,
    transform: [{ skewY: "12deg" }],
  },
});
