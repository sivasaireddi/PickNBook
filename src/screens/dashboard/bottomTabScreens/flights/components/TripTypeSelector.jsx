import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const PRIMARY = "#D11A2A";
const BORDER = "#E2E8F0";
const TEXT = "#0F172A";
const MUTED = "#64748B";

export default function TripTypeSelector({ value, onChange }) {
  return (
    <View style={styles.row}>
      {["oneway", "twoway"].map((item) => {
        const active = item === value;
        return (
          <Pressable key={item} onPress={() => onChange?.(item)} style={[styles.button, active && styles.buttonActive]}>
            <Text style={[styles.text, active && styles.textActive]}>{item === "oneway" ? "One Way" : "Two Way"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: "#fff", alignItems: "center" },
  buttonActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  text: { color: MUTED, fontWeight: "800" },
  textActive: { color: "#fff" },
});
