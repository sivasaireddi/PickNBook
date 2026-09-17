import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import RoomRateOption, { getRatePlanKey } from "./RoomRateOption";

export default function RoomSelectionSheet({ visible, onClose, categoryName, rooms, selectedRatePlanKey, onSelectRoom, displayCurrency }) {
  if (!rooms) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Select Rate Plan</Text>
              <Text style={styles.categorySubtitle}>{categoryName}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </Pressable>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {rooms.map((rm, idx) => {
              const isSelected = selectedRatePlanKey === getRatePlanKey(rm);
              
              return (
                <RoomRateOption
              key={getRatePlanKey(rm) || idx}
                  room={rm}
                  displayCurrency={displayCurrency}
                  isSelected={isSelected}
                  onSelect={() => {
                    onSelectRoom(rm);
                    onClose(); // Automatically close after selection for better UX
                  }}
                />
              );
            })}
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
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%", // Give more space for rate options
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    zIndex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  categorySubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
