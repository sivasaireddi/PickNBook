import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#D11A2A";
const BORDER = "#E2E8F0";
const TEXT = "#0F172A";
const MUTED = "#64748B";

export default function TravellerSelector({ visible, value, onClose, onChange }) {
  const adults = value?.adults ?? 1;
  const children = value?.children ?? 0;
  const infants = value?.infants ?? 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Travelers</Text>
          <Counter label="Adults" value={adults} min={1} max={9} onChange={(next) => onChange?.({ ...value, adults: next })} />
          <Counter label="Children" value={children} min={0} max={9} onChange={(next) => onChange?.({ ...value, children: next })} />
          <Counter label="Infants" value={infants} min={0} max={9} onChange={(next) => onChange?.({ ...value, infants: next })} />
          <Pressable style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Counter({ label, value, min, max, onChange }) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.meta}>{value}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => onChange?.(Math.max(min, value - 1))} style={styles.iconBtn}>
          <Ionicons name="remove" size={18} color={TEXT} />
        </Pressable>
        <Pressable onPress={() => onChange?.(Math.min(max, value + 1))} style={styles.iconBtn}>
          <Ionicons name="add" size={18} color={TEXT} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 16 },
  title: { fontSize: 18, fontWeight: "900", color: TEXT, marginBottom: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },
  label: { color: TEXT, fontWeight: "800" },
  meta: { color: MUTED, marginTop: 4 },
  actions: { flexDirection: "row", gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  done: { backgroundColor: PRIMARY, borderRadius: 18, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  doneText: { color: "#fff", fontWeight: "900" },
});
