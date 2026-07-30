import React from "react";
import { Pressable, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RoomCard({ room, quantity = 0, onIncrement, onDecrement, formatCurrency }) {
  const isSelected = quantity > 0;

  return (
    <View style={[styles.card, isSelected && styles.selected]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.category}>{room?.roomCategory || "Room"}</Text>
        <Text style={styles.desc} numberOfLines={2}>{room?.roomDescription || ""}</Text>
        <Text style={styles.meta}>{room?.bedType || ""}</Text>
        <Text style={styles.policy}>{room?.cancellationPolicy || ""}</Text>
      </View>
      
      <View style={styles.right}>
        <Text style={styles.price}>
          {formatCurrency(room?.price || 0)} / night
        </Text>

        {!isSelected ? (
          <TouchableOpacity 
            activeOpacity={0.85}
            onPress={onIncrement} 
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>Choose Room</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.qtyContainer}>
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={onDecrement} 
              style={styles.qtyBtn}
            >
              <Ionicons name="remove" size={16} color="#E53935" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={onIncrement} 
              style={styles.qtyBtn}
            >
              <Ionicons name="add" size={16} color="#E53935" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    flexDirection: "row",
    gap: 12,
  },
  selected: {
    borderColor: "#E53935",
    backgroundColor: "#FAFAFA",
    shadowColor: "#E53935",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  category: { fontSize: 16, fontWeight: "900", color: "#212121" },
  desc: { marginTop: 4, fontSize: 13, color: "#757575", lineHeight: 18 },
  meta: { marginTop: 8, fontSize: 12, fontWeight: "800", color: "#757575" },
  policy: { marginTop: 8, fontSize: 12, color: "#E53935", fontWeight: "750" },
  right: { alignItems: "flex-end", justifyContent: "space-between", minWidth: 110 },
  price: { fontSize: 14, fontWeight: "900", color: "#E53935", textAlign: "right" },
  addButton: {
    backgroundColor: "#FFEBEE",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  addButtonText: {
    color: "#E53935",
    fontSize: 12,
    fontWeight: "900",
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginTop: 20,
    gap: 12,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#E53935",
  },
});
