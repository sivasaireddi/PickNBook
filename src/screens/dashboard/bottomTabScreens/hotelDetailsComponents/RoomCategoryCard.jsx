import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getRatePlanKey } from "./RoomRateOption";
import { getHotelRoomFinalPrice } from "./hotelPrice";

const formatCurrency = (value, currency = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function RoomCategoryCard({ categoryName, rooms, displayCurrency, onViewOptions, selectedRatePlanKey }) {
  if (!rooms || rooms.length === 0) return null;

  // Find the lowest price among all rate plans in this category
  const validPrices = rooms.map(getHotelRoomFinalPrice).filter((price) => price > 0);
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
  
  // Use the first room's data for basic info like image (if any) or bed type
  const firstRoom = rooms[0];
  const bedType =
    firstRoom?.bedTypes ||
    firstRoom?.bedType ||
    firstRoom?.bedTypeCode ||
    firstRoom?.servicesStatus?.find(s => s.name?.toLowerCase().includes("bed"))?.value ||
    "Standard Bed";

  const roomImage =
    firstRoom?.roomImages?.[0]?.image ||
    firstRoom?.roomImages?.[0]?.url ||
    (typeof firstRoom?.roomImages?.[0] === "string" ? firstRoom.roomImages[0] : null) ||
    firstRoom?.images?.[0] ||
    firstRoom?.image ||
    null;

  const mealSupplement = firstRoom?.hotelSupplements || "";

  // Check if any room in this category is currently selected
  const isCategorySelected = rooms.some(rm => getRatePlanKey(rm) === selectedRatePlanKey);

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
            <Text style={styles.bedText} numberOfLines={1}>{bedType}</Text>
          </View>

          {mealSupplement ? (
            <View style={styles.mealBadge}>
              <Ionicons name="restaurant-outline" size={11} color="#15803D" />
              <Text style={styles.mealBadgeText}>{mealSupplement}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>From</Text>
          <Text style={styles.priceValue}>
            {lowestPrice > 0 ? formatCurrency(lowestPrice, displayCurrency) : "Price unavailable"}
          </Text>
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
    flex: 1,
  },
  mealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  mealBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
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
