import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const getAmenityIcon = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("wifi") || lower.includes("wi-fi") || lower.includes("internet")) return "wifi";
  if (lower.includes("park")) return "car-outline";
  if (lower.includes("pool")) return "water-outline";
  if (lower.includes("gym") || lower.includes("fitness")) return "barbell-outline";
  if (lower.includes("breakfast") || lower.includes("food") || lower.includes("restaurant") || lower.includes("dining")) return "restaurant-outline";
  if (lower.includes("ac") || lower.includes("air condition")) return "snow-outline";
  if (lower.includes("bar")) return "wine-outline";
  if (lower.includes("spa")) return "leaf-outline";
  if (lower.includes("tv")) return "tv-outline";
  if (lower.includes("laundry")) return "shirt-outline";
  if (lower.includes("clean") || lower.includes("housekeeping")) return "sparkles-outline";
  if (lower.includes("front desk") || lower.includes("reception")) return "business-outline";
  if (lower.includes("elevat") || lower.includes("lift")) return "swap-vertical-outline";
  if (lower.includes("accessib")) return "body-outline";
  return "checkmark-circle-outline";
};

export default function AmenitiesBottomSheet({ visible, onClose, facilities }) {
  const validFacilities = (facilities || []).map((fac) => {
    return typeof fac === "object" ? (fac?.name || fac?.detail || "") : String(fac);
  }).filter(Boolean);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>All Amenities</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </Pressable>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {validFacilities.map((fac, idx) => (
              <View key={`${fac}-${idx}`} style={styles.listItem}>
                <View style={styles.listIconBox}>
                  <Ionicons name={getAmenityIcon(fac)} size={18} color="#B4232C" />
                </View>
                <Text style={styles.listText}>{fac}</Text>
              </View>
            ))}
            <SafeAreaView />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "75%", // Cover most of the screen but leave some background visible
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    gap: 12,
  },
  listIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  listText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
    flex: 1,
  },
});
