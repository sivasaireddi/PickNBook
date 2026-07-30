import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function RideScreenWeb() {
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#0f2f63", "#2b66ba"]}
        style={styles.card}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="car-outline" size={30} color="#fff" />
        </View>

        <Text style={styles.title}>Ride map preview is mobile-only</Text>
        <Text style={styles.body}>
          The live map and route tracking screen uses native map modules, so on
          web we show this lightweight placeholder instead. Open the Android or
          iOS app to test the live ride experience.
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#e6edf7",
    padding: 20,
    justifyContent: "center",
  },
  card: {
    borderRadius: 28,
    padding: 24,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: "rgba(255,255,255,0.92)",
  },
});
