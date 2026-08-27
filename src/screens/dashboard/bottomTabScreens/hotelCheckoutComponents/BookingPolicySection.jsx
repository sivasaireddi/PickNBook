import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BookingPolicySection({ agreedToTerms, setAgreedToTerms, onViewPolicies }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Booking Policies</Text>
      
      <Pressable style={styles.checkboxRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
        <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
          {agreedToTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
        <Text style={styles.termsText}>
          I confirm that all guest details are accurate and agree to the booking policies.
        </Text>
      </Pressable>

      <Pressable style={styles.viewPolicyBtn} onPress={onViewPolicies}>
        <Text style={styles.viewPolicyText}>View cancellation policy</Text>
        <Ionicons name="chevron-forward" size={14} color="#0F172A" />
      </Pressable>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    fontWeight: "500",
  },
  viewPolicyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  viewPolicyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  }
});
