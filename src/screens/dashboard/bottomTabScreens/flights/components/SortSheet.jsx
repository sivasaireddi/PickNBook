import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY_RED = "#E11D2E";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

const SORT_OPTIONS = [
  { id: "cheapest", label: "Cheapest", sub: "Lowest price first" },
  { id: "fastest", label: "Fastest", sub: "Shortest duration first" },
  { id: "earliest", label: "Earliest departure", sub: "Flights departing morning first" },
  { id: "latest", label: "Latest departure", sub: "Flights departing evening first" },
  { id: "earliestarrival", label: "Earliest arrival", sub: "Flights arriving morning first" },
];

export default function SortSheet({ visible, onClose, activeSort, onSelectSort }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Sort Flights By</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close sort sheet">
              <Ionicons name="close" size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = activeSort === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelectSort(opt.id);
                    onClose();
                  }}
                  style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${opt.label}, ${opt.sub}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optionSub}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  optionItemSelected: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FEF2F2",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  optionLabelSelected: {
    color: PRIMARY_RED,
  },
  optionSub: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: PRIMARY_RED,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY_RED,
  },
});
