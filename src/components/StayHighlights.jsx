import React from "react";
import { StyleSheet, Text, View } from "react-native";

const HIGHLIGHTS = ["1 Night Ready", "Policy Clarity", "Value Pick"];

export default function StayHighlights() {
  return (
    <View style={styles.row}>
      {HIGHLIGHTS.map((item) => (
        <View key={item} style={styles.card}>
          <Text style={styles.text}>✨ {item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18 },
  text: { fontSize: 13, fontWeight: "800", color: "#111827" },
});
