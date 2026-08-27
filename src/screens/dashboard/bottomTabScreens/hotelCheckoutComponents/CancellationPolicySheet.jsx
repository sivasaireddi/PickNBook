import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CancellationPolicySheet({ visible, onClose, rooms }) {
  if (!rooms || rooms.length === 0) return null;

  // Extract all cancellation policies from rooms
  const allPolicies = [];
  rooms.forEach((room, rIdx) => {
    if (room.cancellationPolicies && room.cancellationPolicies.length > 0) {
      allPolicies.push({
        roomIndex: rIdx + 1,
        policies: room.cancellationPolicies
      });
    }
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Cancellation Policies</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </Pressable>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {allPolicies.length > 0 ? (
              allPolicies.map((roomPol, idx) => (
                <View key={idx} style={styles.roomPolicyBlock}>
                  <Text style={styles.roomTitle}>Room {roomPol.roomIndex}</Text>
                  {roomPol.policies.map((policy, pIdx) => {
                    const fromDate = policy.fromDate || policy.FromDate;
                    const charge = policy.charge || policy.Charge || 0;
                    const chargeType = policy.chargeType || policy.ChargeType || "Amount";
                    
                    return (
                      <View key={pIdx} style={styles.policyItem}>
                        <Ionicons name="alert-circle" size={16} color="#B45309" style={styles.policyIcon} />
                        <View style={styles.policyTextWrap}>
                          {fromDate && <Text style={styles.policyDate}>From: {fromDate}</Text>}
                          <Text style={styles.policyCharge}>
                            Charge: {chargeType === "Percentage" ? `${charge}%` : `₹${charge}`}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            ) : (
              <View style={styles.noPolicyBox}>
                <Ionicons name="information-circle-outline" size={32} color="#94A3B8" />
                <Text style={styles.noPolicyText}>No specific cancellation policies provided for this booking.</Text>
              </View>
            )}
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
    height: "60%", 
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  roomPolicyBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    paddingBottom: 8,
  },
  policyItem: {
    flexDirection: "row",
    marginBottom: 10,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
  },
  policyIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  policyTextWrap: {
    flex: 1,
  },
  policyDate: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "700",
    marginBottom: 2,
  },
  policyCharge: {
    fontSize: 13,
    color: "#B45309",
    fontWeight: "600",
  },
  noPolicyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noPolicyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  }
});
