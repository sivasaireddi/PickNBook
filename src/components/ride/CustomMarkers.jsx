import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import { MapPin } from "lucide-react-native";

export const PickupMarker = React.memo(({ coordinate, label = "Pickup" }) => {
  if (!coordinate) return null;
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}>
      <View style={styles.markerContainer}>
        <View style={styles.labelCard}>
          <Text style={styles.labelText}>{label}</Text>
        </View>
        <View style={[styles.pinOuter, styles.pickupColor]}>
          <MapPin size={18} color="#FFFFFF" />
        </View>
      </View>
    </Marker>
  );
});

export const DestinationMarker = React.memo(({ coordinate, label = "Destination" }) => {
  if (!coordinate) return null;
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}>
      <View style={styles.markerContainer}>
        <View style={styles.labelCard}>
          <Text style={styles.labelText}>{label}</Text>
        </View>
        <View style={[styles.pinOuter, styles.destColor]}>
          <MapPin size={18} color="#FFFFFF" />
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1E293B",
  },
  pinOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pickupColor: {
    backgroundColor: "#10B981", // Green
  },
  destColor: {
    backgroundColor: "#EF4444", // Red
  },
});
