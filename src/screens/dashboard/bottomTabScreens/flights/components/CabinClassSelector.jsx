import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TRAVEL_CLASSES } from "../constants/travelClasses";

const PRIMARY = "#D11A2A";
const BORDER = "#E2E8F0";
const TEXT = "#0F172A";
const MUTED = "#64748B";

export default function CabinClassSelector({ value, onChange }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cabin class</Text>
      <View style={styles.grid}>
        {TRAVEL_CLASSES.map((item) => {
          const active = item === value;
          return (
            <Pressable key={item} onPress={() => onChange?.(item)} style={[styles.item, active && styles.itemActive]}>
              <Text style={[styles.itemText, active && styles.itemTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16 },
  title: { color: TEXT, fontWeight: "900", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  item: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: BORDER, backgroundColor: "#fff" },
  itemActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  itemText: { color: MUTED, fontWeight: "700", fontSize: 12 },
  itemTextActive: { color: "#fff" },
});
