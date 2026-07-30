import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function BottomBar({ onOpenFilters }) {
  return (
    <View style={styles.container}>
      
      {/* The main container pushes this inner view to the right */}
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={onOpenFilters}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Filters</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    // Changes 'space-around' to 'flex-end' to push content to the right
    justifyContent: "flex-end", 
    alignItems: "center",
  },

  filterBtn: {
    backgroundColor: "#E53935",
    paddingVertical: 12,
    paddingHorizontal: 20, // Added horizontal padding for a better button shape
    borderRadius: 10,
  },
});