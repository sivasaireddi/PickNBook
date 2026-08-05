import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export const BackgroundDecorations = React.memo(() => {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Soft Luxury Gradient */}
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFC", "#FFF5F5"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating Travel Background Motifs */}
      <View style={styles.watermarkContainer}>
        {/* Top Right Floating Airplane */}
        <View style={styles.topRightAirplane}>
          <MaterialCommunityIcons
            name="airplane-takeoff"
            size={160}
            color="rgba(229, 57, 53, 0.035)"
          />
        </View>

        {/* Flight Route Dotted Curve Decor */}
        <View style={styles.middleRouteDecor}>
          <MaterialCommunityIcons
            name="routes"
            size={140}
            color="rgba(148, 163, 184, 0.05)"
          />
        </View>

        {/* Cloud Watermark */}
        <View style={styles.bottomCloudDecor}>
          <Ionicons
            name="cloud-outline"
            size={180}
            color="rgba(229, 57, 53, 0.025)"
          />
        </View>

        {/* Passport / Luggage Watermark */}
        <View style={styles.leftPassportDecor}>
          <MaterialCommunityIcons
            name="passport"
            size={120}
            color="rgba(15, 23, 42, 0.02)"
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  watermarkContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  topRightAirplane: {
    position: "absolute",
    top: -20,
    right: -30,
    transform: [{ rotate: "-15deg" }],
  },
  middleRouteDecor: {
    position: "absolute",
    top: "35%",
    left: -40,
    transform: [{ rotate: "25deg" }],
  },
  bottomCloudDecor: {
    position: "absolute",
    bottom: 40,
    right: -40,
  },
  leftPassportDecor: {
    position: "absolute",
    bottom: "25%",
    left: -20,
    transform: [{ rotate: "-10deg" }],
  },
});

export default BackgroundDecorations;
