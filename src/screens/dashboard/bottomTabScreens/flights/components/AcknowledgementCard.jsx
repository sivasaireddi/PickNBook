import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const NAVY = "#1F2D44";
const MUTED = "#687B98";
const RED = "#E11D2E";

export default function AcknowledgementCard({ value, onChange, error }) {
  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <Ionicons name="shield-checkmark-outline" size={20} color={NAVY} />
        <Text style={styles.heading}>Acknowledgement</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onChange(!value)}
        style={styles.checkboxRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value }}
        accessibilityLabel="Agree to the flight cancellation rules, booking terms and policies"
      >
        <View style={[styles.checkbox, value && styles.checkboxChecked]}>
          {value && <Ionicons name="checkmark" size={17} color="#FFFFFF" />}
        </View>
        <Text style={styles.agreementText}>
          I agree to the flight cancellation rules, booking terms &amp; policies. <Text style={styles.required}>*</Text>
        </Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6EBF2",
    borderBottomWidth: 1,
    borderBottomColor: "#E6EBF2",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  heading: {
    color: NAVY,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: "#818181",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: RED,
    borderColor: RED,
  },
  agreementText: {
    flex: 1,
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  required: {
    color: RED,
    fontWeight: "900",
  },
  error: {
    color: RED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
    marginLeft: 29,
  },
});
