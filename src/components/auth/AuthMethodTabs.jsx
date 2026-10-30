import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authTheme } from "./authStyles";

const METHODS = [
  { value: "email", label: "Email", icon: "mail-outline" },
  { value: "phone", label: "Phone", icon: "call-outline" },
];

export default function AuthMethodTabs({ value, onChange }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {METHODS.map((method) => {
        const selected = value === method.value;
        return (
          <TouchableOpacity
            key={method.value}
            style={[styles.tab, selected && styles.selectedTab]}
            onPress={() => onChange(method.value)}
            activeOpacity={0.78}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Ionicons
              name={method.icon}
              size={20}
              color={selected ? "#FFFFFF" : authTheme.colors.inkSoft}
            />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{method.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 52,
    flexDirection: "row",
    padding: 4,
    marginBottom: 20,
    borderRadius: authTheme.radii.pill,
    backgroundColor: authTheme.colors.authBlush,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: authTheme.radii.pill,
  },
  selectedTab: {
    backgroundColor: authTheme.colors.red,
    shadowColor: authTheme.colors.redDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 3,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: authTheme.colors.inkSoft,
  },
  selectedLabel: { color: "#FFFFFF" },
});
