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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BUS_SEAT_COLORS.borderLight,
    flexShrink: 0,
  },
  dragHandleWrapper: {
    alignItems: "center",
    paddingVertical: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: BUS_SEAT_COLORS.dragHandle,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  travelInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  travelName: {
    fontSize: moderateScale(15),
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
    borderRadius: 6,
    gap: 2,
  },
  ratingText: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.ratingText,
  },
  seatCountBadge: {
    backgroundColor: BUS_SEAT_COLORS.coachFloorBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  seatCountText: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: BUS_SEAT_COLORS.textSecondary,
  },
  chipsWrapper: {
    marginTop: 6,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  seatChipText: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.primaryRed,
  },
  noSeatHint: {
    fontSize: moderateScale(12),
    color: BUS_SEAT_COLORS.textMuted,
    marginVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: BUS_SEAT_COLORS.borderLight,
    marginVertical: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceContainer: {},
  totalLabel: {
    fontSize: moderateScale(11),
    color: BUS_SEAT_COLORS.textSecondary,
    marginBottom: 0,
  },
  totalPrice: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.textPrimary,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BUS_SEAT_COLORS.primaryRed,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 120,
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
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctaIcon: {
    marginLeft: 6,
  },
});
