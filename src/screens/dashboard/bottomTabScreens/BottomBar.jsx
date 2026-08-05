import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BottomBar({ onOpenFilters }) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={onOpenFilters}
        activeOpacity={0.88}
      >
        <Ionicons name="options-outline" size={18} color="#FFFFFF" style={styles.icon} />
        <Text style={styles.filterText}>Filters</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    right: 16,
    zIndex: 99,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  filterBtn: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D11A2A",
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: "#D11A2A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  icon: {
    marginRight: 6,
  },
  filterText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});