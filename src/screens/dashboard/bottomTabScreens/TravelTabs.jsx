import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TravelTabs({ mode = "bus", onChange }) {
  const tabIndex = useRef(new Animated.Value(mode === "bus" ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(tabIndex, {
      toValue: mode === "bus" ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [mode]);

  const leftPosition = tabIndex.interpolate({
    inputRange: [0, 1],
    outputRange: ["1%", "50%"],
  });

  return (
    <View style={styles.wrapper}>
      {/* Sliding Active Pill Background */}
      <Animated.View 
        style={[
          styles.activeIndicator,
          {
            left: leftPosition,
          }
        ]}
      />

      <Pressable onPress={() => onChange?.("bus")} style={styles.tab}>
        <View style={styles.tabRow}>
          <Ionicons 
            name="bus-outline" 
            size={16} 
            color={mode === "bus" ? "#FFFFFF" : "#64748B"} 
          />
          <Text style={[styles.label, mode === "bus" && styles.labelActive]}>Buses</Text>
        </View>
      </Pressable>

      <Pressable onPress={() => onChange?.("flight")} style={styles.tab}>
        <View style={styles.tabRow}>
          <Ionicons 
            name="airplane-outline" 
            size={16} 
            color={mode === "flight" ? "#FFFFFF" : "#64748B"} 
          />
          <Text style={[styles.label, mode === "flight" && styles.labelActive]}>Flights</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 22,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 3,
    height: 42,
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: "48.5%",
    backgroundColor: "#D11A2A",
    borderRadius: 18,
    shadowColor: "#D11A2A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6, // Better icon spacing
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },
  labelActive: {
    color: "#FFFFFF",
  },
});
