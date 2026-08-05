import React, { memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from "../../theme/busSeatTheme";
import { moderateScale } from "react-native-size-matters";

const formatPrice = (val = 0) =>
  `\u20B9${Number(val || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const SeatBottomSheet = ({
  selectedSeats = [],
  totalPrice = 0,
  onNext,
  disabled,
  insets = { bottom: 0 },
  operatorName = "Bus Operator",
  rating = "4.8",
}) => {
  return (
    <View
      style={[
        styles.bottomSheet,
        BUS_SEAT_SHADOWS.bottomSheet,
        { paddingBottom: Math.max(insets.bottom, 12) + 8 },
      ]}
    >
      {/* Top Drag Indicator Handle */}
      <View style={styles.dragHandleWrapper}>
        <View style={styles.dragHandle} />
      </View>

      {/* Operator Header & Rating Badge */}
      <View style={styles.headerRow}>
        <View style={styles.travelInfo}>
          <Text numberOfLines={1} style={styles.travelName}>
            {operatorName}
          </Text>
          <View style={styles.ratingChip}>
            <Ionicons name="star" size={12} color={BUS_SEAT_COLORS.ratingText} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        </View>

        {/* Selected Seats Count Badge */}
        <View style={styles.seatCountBadge}>
          <Text style={styles.seatCountText}>
            {selectedSeats.length}{" "}
            {selectedSeats.length === 1 ? "Seat" : "Seats"}
          </Text>
        </View>
      </View>

      {/* Selected Seat Code Chips */}
      {selectedSeats.length > 0 ? (
        <View style={styles.chipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {selectedSeats.map((seatCode) => (
              <View key={seatCode} style={styles.seatChip}>
                <Ionicons
                  name="checkbox"
                  size={14}
                  color={BUS_SEAT_COLORS.primaryRed}
                />
                <Text style={styles.seatChipText}>{seatCode}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <Text style={styles.noSeatHint}>Select a seat to proceed</Text>
      )}

      <View style={styles.divider} />

      {/* Price Summary & CTA Button */}
      <View style={styles.footerRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalLabel}>Total Fare</Text>
          <Text style={styles.totalPrice}>{formatPrice(totalPrice)}</Text>
        </View>

        <Pressable
          disabled={disabled}
          onPress={onNext}
          style={({ pressed }) => [
            styles.ctaButton,
            disabled && styles.ctaDisabled,
            pressed && !disabled && styles.ctaPressed,
          ]}
        >
          <Text style={styles.ctaText}>Continue</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#FFFFFF"
            style={styles.ctaIcon}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default memo(SeatBottomSheet);

const styles = StyleSheet.create({
  bottomSheet: {
    backgroundColor: BUS_SEAT_COLORS.cardSurface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BUS_SEAT_COLORS.borderLight,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  dragHandleWrapper: {
    alignItems: "center",
    paddingVertical: 6,
  },
  dragHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: BUS_SEAT_COLORS.dragHandle,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  travelInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  travelName: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.textPrimary,
    marginRight: 8,
  },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BUS_SEAT_COLORS.ratingBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  ratingText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.ratingText,
  },
  seatCountBadge: {
    backgroundColor: BUS_SEAT_COLORS.coachFloorBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seatCountText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: BUS_SEAT_COLORS.textSecondary,
  },
  chipsWrapper: {
    marginTop: 10,
  },
  chipsScroll: {
    gap: 8,
  },
  seatChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BUS_SEAT_COLORS.selectedBg,
    borderWidth: 1,
    borderColor: BUS_SEAT_COLORS.selectedBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  seatChipText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.primaryRed,
  },
  noSeatHint: {
    fontSize: moderateScale(13),
    color: BUS_SEAT_COLORS.textMuted,
    marginVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: BUS_SEAT_COLORS.borderLight,
    marginVertical: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceContainer: {},
  totalLabel: {
    fontSize: moderateScale(12),
    color: BUS_SEAT_COLORS.textSecondary,
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.textPrimary,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BUS_SEAT_COLORS.primaryRed,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 140,
    ...BUS_SEAT_SHADOWS.selectedGlow,
  },
  ctaDisabled: {
    backgroundColor: BUS_SEAT_COLORS.primaryRedDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed: {
    backgroundColor: BUS_SEAT_COLORS.primaryRedPressed,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctaIcon: {
    marginLeft: 6,
  },
});
