import React, { forwardRef, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const AMENITIES = [
  { icon: "wifi", label: "WiFi" },
  { icon: "car", label: "Parking" },
  { icon: "silverware-fork-knife", label: "Restaurant" },
  { icon: "air-conditioner", label: "Air Conditioning" },
  { icon: "washing-machine", label: "Laundry" },
  { icon: "room-service", label: "Room Service" },
];

const AmenitiesBottomSheet = forwardRef(function AmenitiesBottomSheet(_, ref) {
  const snapPoints = useMemo(() => ["38%"], []);

  return (
    <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enablePanDownToClose>
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Amenities</Text>
        <View style={styles.grid}>
          {AMENITIES.map((item) => (
            <View key={item.label} style={styles.item}>
              <MaterialCommunityIcons name={item.icon} size={20} color="#C8102E" />
              <Text style={styles.label}>{item.label}</Text>
            </View>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

export default AmenitiesBottomSheet;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 24, gap: 14 },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  item: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF8F8",
    padding: 14,
    borderRadius: 18,
  },
  label: { fontSize: 13, fontWeight: "800", color: "#111827" },
});
