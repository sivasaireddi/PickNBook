import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import AppHeader from "../../../components/AppHeader";
import BusBookingSection from "./BusBookingSection";
import TravelTabs from "./TravelTabs";
import FlightSearchScreen from "./flights/FlightSearchScreen";

export default function TravelScreen({ navigation, route }) {
  const [mode, setMode] = useState(route?.params?.mode || "bus");

  useEffect(() => {
    if (route?.params?.mode) {
      setMode(route.params.mode);
    }
  }, [route?.params?.mode]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <AppHeader title="Travel" />
      <View style={styles.screen}>
        {/* Subtle background route tracks and blobs */}
        <View style={styles.bgBlobLeft} pointerEvents="none" />
        <View style={styles.bgBlobRight} pointerEvents="none" />
        <View style={styles.bgRouteLine1} pointerEvents="none" />
        <View style={styles.bgRouteLine2} pointerEvents="none" />

        <TravelTabs mode={mode} onChange={setMode} />
        <View style={styles.body}>
          {mode === "bus" ? (
            <BusBookingSection navigation={navigation} />
          ) : (
            <FlightSearchScreen navigation={navigation} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  screen: { flex: 1, backgroundColor: "#F8F9FB", position: "relative", overflow: "hidden" },
  body: { flex: 1 },
  bgBlobLeft: {
    position: "absolute",
    top: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#D11A2A",
    opacity: 0.02,
  },
  bgBlobRight: {
    position: "absolute",
    bottom: 120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#D11A2A",
    opacity: 0.015,
  },
  bgRouteLine1: {
    position: "absolute",
    top: 150,
    left: -40,
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1.5,
    borderColor: "rgba(209, 26, 42, 0.03)",
    backgroundColor: "transparent",
  },
  bgRouteLine2: {
    position: "absolute",
    bottom: 250,
    right: -40,
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 1.5,
    borderColor: "rgba(209, 26, 42, 0.02)",
    backgroundColor: "transparent",
  },
});
