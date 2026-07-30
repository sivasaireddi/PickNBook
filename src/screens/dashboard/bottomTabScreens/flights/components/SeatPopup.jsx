import React, { memo, useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { formatCurrency } from "../utils/seatMapUtils";

const SeatPopup = memo(function SeatPopup({ visible, seat, onClose, onSelect, passengerName }) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      damping: 16,
      stiffness: 140,
    }).start();
  }, [visible, pop]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.sheet, { transform: [{ scale: pop }] }]} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>{seat?.seatNumber || "Seat"}</Text>
          <Text style={styles.meta}>
            {seat?.type || "Seat"} {seat?.isWindow ? "• Window" : seat?.isAisle ? "• Aisle" : seat?.isMiddle ? "• Middle" : ""}
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>Price</Text>
            <Text style={styles.price}>{formatCurrency(seat?.price || 0)}</Text>
          </View>
          <View style={styles.features}>
            {seat?.features?.extraLegroom ? <Text style={styles.pill}>Extra Legroom</Text> : null}
            {seat?.features?.nearExit ? <Text style={styles.pill}>Near Exit</Text> : null}
            {seat?.features?.mealIncluded ? <Text style={styles.pill}>Meal Included</Text> : null}
          </View>
          {passengerName ? <Text style={styles.passenger}>For {passengerName}</Text> : null}
          <Pressable style={styles.button} onPress={() => onSelect?.(seat)}>
            <Text style={styles.buttonText}>Select Seat</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.48)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 10 },
  title: { fontSize: 20, fontWeight: "900", color: "#101828" },
  meta: { fontSize: 13, fontWeight: "700", color: "#667085" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  label: { color: "#667085", fontWeight: "800" },
  price: { color: "#D11A2A", fontSize: 18, fontWeight: "900" },
  features: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  pill: { backgroundColor: "#F9FAFB", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: "#E2E8F0", color: "#344054", fontWeight: "800", fontSize: 12 },
  passenger: { color: "#101828", fontWeight: "800", marginTop: 4 },
  button: { marginTop: 8, backgroundColor: "#D11A2A", borderRadius: 16, alignItems: "center", paddingVertical: 14 },
  buttonText: { color: "#fff", fontWeight: "900" },
});

export default SeatPopup;
