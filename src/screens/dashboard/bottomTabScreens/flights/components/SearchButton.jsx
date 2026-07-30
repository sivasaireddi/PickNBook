import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function SearchButton({ loading, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={styles.wrap}>
      <LinearGradient colors={["#FF5A6B", "#E53935"]} style={styles.button}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>Search Flights</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 18, overflow: "hidden" },
  button: { minHeight: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
