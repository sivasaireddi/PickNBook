import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getHotelRoomFinalPrice } from "./hotelPrice";
import { CancellationDetails } from "./HotelInfoSections";

export const getRatePlanKey = (room) =>
  String(room?.optionId || room?.ratePlanCode || room?.ratePlan || room?.roomId || "");

const formatCurrency = (value, currency = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function RoomRateOption({ room, displayCurrency, isSelected, onSelect }) {
  const rmPrice = getHotelRoomFinalPrice(room);
  const roomDescriptions = Array.isArray(room.description)
    ? room.description.filter((description) => Boolean(description && String(description).trim()))
    : (room.description ? [String(room.description)] : []);
  
  // Extract up to 3 important amenities
  const previewAmenities = Array.isArray(room.amenities) 
    ? room.amenities.slice(0, 3).map(am => typeof am === "object" ? (am?.name || am?.detail || "") : String(am)).filter(Boolean)
    : [];

  const promotion = room.roomPromotion || room.roomTypeName || "Standard Rate";

  return (
    <Pressable
      style={[styles.container, isSelected && styles.containerSelected]}
      onPress={onSelect}
    >
      <View style={styles.headerRow}>
        <Text style={styles.promotionText} numberOfLines={1}>{promotion}</Text>
        <Text style={styles.priceText}>
          {rmPrice > 0 ? formatCurrency(rmPrice, displayCurrency) : "Price unavailable"}
        </Text>
      </View>

      {roomDescriptions.length > 0 ? (
        <Text style={styles.descText} numberOfLines={2}>
          {roomDescriptions.join(" · ")}
        </Text>
      ) : null}

      {previewAmenities.length > 0 && (
        <View style={styles.amenitiesRow}>
          {previewAmenities.map((am, idx) => (
            <View key={idx} style={styles.amenityChip}>
              <Ionicons name="checkmark" size={12} color="#059669" />
              <Text style={styles.amenityChipText}>{am}</Text>
            </View>
          ))}
          {Array.isArray(room.amenities) && room.amenities.length > 3 && (
            <Text style={styles.moreAmenitiesText}>+{room.amenities.length - 3} more</Text>
          )}
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={styles.flagsContainer}>
          {room.hotelSupplements ? (
            <Text style={[styles.flagBadge, styles.flagBadgeGreen]}>
              <Ionicons name="restaurant-outline" size={10} color="#15803D" /> {room.hotelSupplements}
            </Text>
          ) : null}
          {room.isPANMandatory ? <Text style={styles.flagBadge}>PAN Req</Text> : null}
          {room.isPassportMandatory ? <Text style={styles.flagBadge}>Passport Req</Text> : null}
          {(room.cancellationPolicies && room.cancellationPolicies.length > 0) || room.cancellationPolicy ? (
            <Text style={[styles.flagBadge, styles.flagBadgeGreen]}>Cancellation Available</Text>
          ) : null}
        </View>

        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </View>

      {(room.smokingPreference || room.childCount !== undefined || room.roomTypeCategory || room.servicesStatus?.length) ? (
        <View style={styles.roomDetailsRow}>
          {room.roomTypeCategory ? <Text style={styles.detailBadge}>Type: {room.roomTypeCategory}</Text> : null}
          {room.smokingPreference ? <Text style={styles.detailBadge}>Smoking: {room.smokingPreference}</Text> : null}
          {room.childCount !== undefined && room.childCount !== null ? <Text style={styles.detailBadge}>Children: {room.childCount}</Text> : null}
          {Array.isArray(room.servicesStatus) ? room.servicesStatus.map((service, index) => (
            <Text key={`${service?.name}-${index}`} style={styles.detailBadge}>
              {[service?.name, service?.value].filter(Boolean).join(": ")}
            </Text>
          )) : null}
        </View>
      ) : null}

      <CancellationDetails room={room} formatCurrency={formatCurrency} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
  },
  containerSelected: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  promotionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    paddingRight: 8,
  },
  priceText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#EF4444",
  },
  descText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  amenityChipText: {
    fontSize: 10,
    color: "#15803D",
    fontWeight: "600",
  },
  moreAmenitiesText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  roomDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  detailBadge: {
    fontSize: 10,
    color: "#475569",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 4,
  },
  flagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  flagBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  flagBadgeGreen: {
    color: "#15803D",
    backgroundColor: "#DCFCE7",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  radioOuterSelected: {
    borderColor: "#EF4444",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
});
