import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function HostCard() {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" }}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Hosted by Tanya</Text>
        <Text style={styles.title}>Superhost style service</Text>
        <Text style={styles.desc}>3 years hosting, quick replies, flexible support.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 14, backgroundColor: "#fff", borderRadius: 24, padding: 18, alignItems: "center" },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#E5E7EB" },
  label: { fontSize: 12, fontWeight: "800", color: "#C8102E" },
  title: { fontSize: 16, fontWeight: "900", color: "#111827", marginTop: 2 },
  desc: { fontSize: 13, color: "#6B7280", marginTop: 4, lineHeight: 18 },
});
