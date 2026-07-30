import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HotelInfoCard({ hotel, searchContext }) {
  const checkIn = searchContext?.checkInDate;
  const checkOut = searchContext?.checkOutDate;
  let nightsText = "1 Night";
  if (checkIn && checkOut) {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffTime = outDate.getTime() - inDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const nights = diffDays > 0 ? diffDays : 1;
    nightsText = `${nights} ${nights === 1 ? "Night" : "Nights"}`;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{hotel?.hotelName || hotel?.name || "Hotel"}</Text>
      <View style={styles.metaRow}>
        <Meta icon="star" text={`${Number(hotel?.starRating || hotel?.rating || 4.4).toFixed(1)}`} />
        <Meta icon="location-outline" text={hotel?.hotelAddress || hotel?.address || searchContext?.cityCode || ""} />
        <Meta icon="moon-outline" text={nightsText} />
        <Meta icon="people-outline" text={`${searchContext?.adults || 2} Guests`} />
      </View>
    </View>
  );
}

function Meta({ icon, text }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color="#E53935" />
      <Text style={styles.metaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  name: { fontSize: 22, fontWeight: "900", color: "#212121", marginBottom: 12 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  metaText: { color: "#757575", fontSize: 12, fontWeight: "700", maxWidth: 120 },
});
