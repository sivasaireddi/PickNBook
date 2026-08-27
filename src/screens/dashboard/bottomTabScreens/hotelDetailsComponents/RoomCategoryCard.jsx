import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatCurrency = (value, currency = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function RoomCategoryCard({ categoryName, rooms, displayCurrency, onViewOptions, selectedRoomId }) {
  if (!rooms || rooms.length === 0) return null;

  // Find the lowest price among all rate plans in this category
  const lowestPrice = Math.min(...rooms.map(rm => rm.price?.offeredPrice || rm.offeredPrice || Infinity));
  
  // Use the first room's data for basic info like image (if any) or bed type
  const firstRoom = rooms[0];
  const bedType = firstRoom?.bedTypeCode || firstRoom?.bedType || "Standard Bed";
  const roomImage = firstRoom?.images?.[0] || null;

  // Check if any room in this category is currently selected
  const isCategorySelected = rooms.some(rm => rm.roomId === selectedRoomId);

  return (
    <View style={[styles.card, isCategorySelected && styles.cardSelected]}>
      <View style={styles.cardHeader}>
        {roomImage ? (
          <Image source={{ uri: roomImage }} style={styles.roomImage} resizeMode="cover" />
        ) : (
          <View style={styles.noImageBox}>
            <Ionicons name="bed-outline" size={24} color="#94A3B8" />
          </View>
        )}
        
        <View style={styles.cardInfo}>
          <Text style={styles.categoryName} numberOfLines={2}>{categoryName}</Text>
          <View style={styles.bedRow}>
            <Ionicons name="bed-outline" size={14} color="#64748B" />
            <Text style={styles.bedText}>{bedType}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>From</Text>
          <Text style={styles.priceValue}>{formatCurrency(lowestPrice, displayCurrency)}</Text>
        </View>
        
        <Pressable 
          style={styles.viewOptionsBtn} 
          onPress={() => onViewOptions(categoryName, rooms)}
        >
          <Text style={styles.viewOptionsText}>View Options</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardSelected: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  cardHeader: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  roomImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  noImageBox: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  bedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bedText: {
    fontSize: 13,
    color: "#64748B",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  priceContainer: {
    flexDirection: "column",
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#EF4444",
  },
  viewOptionsBtn: {
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewOptionsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
