import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PassengerBadge = memo(function PassengerBadge({ label, seatNumber, index, isActive }) {
  const isAssigned = Boolean(seatNumber);

  return (
    <View style={[
      styles.card, 
      isAssigned && styles.cardAssigned, 
      isActive && styles.cardActive
    ]}>
      <View style={styles.header}>
        <Ionicons
          name="person"
          size={12}
          color={isActive ? "#E53935" : isAssigned ? "#E53935" : "#64748B"}
        />
        <Text style={[styles.title, isActive && styles.titleActive]}>Passenger {index + 1}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {label || `Passenger ${index + 1}`}
      </Text>
      <Text style={[styles.seat, isAssigned && styles.seatAssigned, isActive && styles.seatActive]}>
        {seatNumber ? `Seat ${seatNumber}` : "Choose seat"}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    minWidth: 120,
    marginRight: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardAssigned: {
    borderColor: "#E53935",
    backgroundColor: "#FFF5F5",
  },
  cardActive: {
    borderColor: "#E53935",
    backgroundColor: "#FFEBEB",
    borderWidth: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleActive: {
    color: "#E53935",
  },
  name: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  seat: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  seatAssigned: {
    color: "#E53935",
    fontWeight: "800",
  },
  seatActive: {
    color: "#E53935",
    fontWeight: "900",
  },
});

export default PassengerBadge;
