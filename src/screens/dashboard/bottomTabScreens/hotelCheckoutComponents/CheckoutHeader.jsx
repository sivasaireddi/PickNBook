import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CheckoutHeader({ onBackPress }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.iconBtn} onPress={onBackPress}>
        <Ionicons name="arrow-back" size={20} color="#0F172A" />
      </Pressable>
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle} numberOfLines={1}>Checkout</Text>
        <Text style={styles.progressText}>Guest Details → Review → Payment</Text>
      </View>
      <View style={{ width: 36 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  progressText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  }
});
