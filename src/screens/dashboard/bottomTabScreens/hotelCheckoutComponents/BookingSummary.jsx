import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BookingSummary({ hotelName, location, checkInDate, checkOutDate, roomCount, isConfirmed }) {
  // Simple calculation for nights if possible, or just default to 1 Night
  // Assuming Dates: checkInDate to checkOutDate
  return (
    <View style={styles.container}>
      <View style={styles.hotelInfoRow}>
        <View style={styles.iconBox}>
          <Ionicons name="business" size={24} color="#0F172A" />
        </View>
        <View style={styles.detailsCol}>
          <Text style={styles.hotelName} numberOfLines={1}>{hotelName}</Text>
          <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
          <Text style={styles.datesText}>
            {checkInDate} → {checkOutDate} · {roomCount} Room{roomCount > 1 ? "s" : ""}
          </Text>
        </View>
      </View>
      {isConfirmed && (
        <View style={styles.statusRow}>
          <Ionicons name="checkmark-circle" size={14} color="#166534" />
          <Text style={styles.statusText}>Availability Confirmed</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  hotelInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsCol: {
    flex: 1,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  locationText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  datesText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  statusText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "600",
  }
});
