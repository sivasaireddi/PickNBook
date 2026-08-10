import React, { memo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
} from "react-native";
import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from "../../theme/busSeatTheme";
import { moderateScale } from "react-native-size-matters";

const formatPrice = (val = 0) => {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return "";
  const rounded = Math.round(num);
  return `\u20B9${rounded}`;
};

const SeatItem = ({
  seat,
  isSelected,
  isFilteredOut,
  onPressSeat,
  layoutPrice,
  width,
  height,
  left,
  top,
  isSleeper,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isBooked = Boolean(seat?.isBooked);
  const gender = String(
    seat?.gender ?? seat?.seatGender ?? seat?.type ?? ""
  ).toLowerCase();

  // Price determination
  const priceVal =
    seat?.priceInr ??
    seat?.price ??
    seat?.Price?.BaseFare ??
    seat?.Price?.baseFare ??
    seat?.baseFare ??
    seat?.Price?.Fare ??
    seat?.Price?.fare ??
    layoutPrice ??
    0;

  const formattedPrice = formatPrice(priceVal);

  // Compute theme according to status rules
  const getTheme = () => {
    if (isSelected) {
      return {
        bgColor: BUS_SEAT_COLORS.selectedBg,
        borderColor: BUS_SEAT_COLORS.selectedBorder,
        stripColor: BUS_SEAT_COLORS.selectedStrip,
        textColor: BUS_SEAT_COLORS.selectedBorder,
        priceColor: BUS_SEAT_COLORS.selectedBorder,
        shadow: BUS_SEAT_SHADOWS.selectedGlow,
      };
    }

    if (isBooked) {
      if (gender === "female") {
        return {
          bgColor: BUS_SEAT_COLORS.femaleBookedBg,
          borderColor: BUS_SEAT_COLORS.femaleBookedBorder,
          stripColor: BUS_SEAT_COLORS.femaleBookedStrip,
          textColor: BUS_SEAT_COLORS.femaleBookedText,
          priceColor: BUS_SEAT_COLORS.femaleBookedText,
          shadow: null,
        };
      }
      return {
        bgColor: BUS_SEAT_COLORS.bookedBg,
        borderColor: BUS_SEAT_COLORS.bookedBorder,
        stripColor: BUS_SEAT_COLORS.bookedStrip,
        textColor: BUS_SEAT_COLORS.bookedText,
        priceColor: BUS_SEAT_COLORS.bookedText,
        shadow: null,
      };
    }

    if (gender === "female") {
      return {
        bgColor: BUS_SEAT_COLORS.femaleBg,
        borderColor: BUS_SEAT_COLORS.femaleBorder,
        stripColor: BUS_SEAT_COLORS.femaleStrip,
        textColor: BUS_SEAT_COLORS.textPrimary,
        priceColor: BUS_SEAT_COLORS.femalePriceText,
        shadow: BUS_SEAT_SHADOWS.card,
      };
    }

    if (gender === "male") {
      return {
        bgColor: BUS_SEAT_COLORS.maleBg,
        borderColor: BUS_SEAT_COLORS.maleBorder,
        stripColor: BUS_SEAT_COLORS.maleStrip,
        textColor: BUS_SEAT_COLORS.textPrimary,
        priceColor: BUS_SEAT_COLORS.malePriceText,
        shadow: BUS_SEAT_SHADOWS.card,
      };
    }

    // Default Available
    return {
      bgColor: BUS_SEAT_COLORS.availableBg,
      borderColor: BUS_SEAT_COLORS.availableBorder,
      stripColor: BUS_SEAT_COLORS.availableStrip,
      textColor: BUS_SEAT_COLORS.textPrimary,
      priceColor: BUS_SEAT_COLORS.availablePriceText,
      shadow: BUS_SEAT_SHADOWS.card,
    };
  };

  const theme = getTheme();

  const handlePressIn = () => {
    if (isBooked) return;
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (isBooked) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.absoluteContainer,
        { left, top, width, height },
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        disabled={isBooked}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPressSeat?.(seat?.seatCode)}
        style={[
          styles.seatCard,
          theme.shadow,
          {
            backgroundColor: theme.bgColor,
            borderColor: theme.borderColor,
          },
          isFilteredOut && styles.filteredOut,
        ]}
      >
        {/* Top Pillow / Headrest */}
        <View
          style={[
            styles.pillow,
            {
              backgroundColor: theme.borderColor,
              height: isSleeper ? 5 : 3,
            },
          ]}
        />

        {/* Center Stack: Seat Name (Top) + Price (Below) */}
        <View style={styles.contentStack}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[styles.seatName, { color: theme.textColor }]}
          >
            {seat.seatName || seat.seatCode}
          </Text>

          {formattedPrice !== "" && (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[styles.priceText, { color: theme.priceColor }]}
            >
              {formattedPrice}
            </Text>
          )}
        </View>

        {/* Bottom Indicator Strip */}
        <View
          style={[
            styles.bottomStrip,
            { backgroundColor: theme.stripColor },
          ]}
        />
      </Pressable>
    </Animated.View>
  );
};

export default memo(SeatItem);

const styles = StyleSheet.create({
  absoluteContainer: {
    position: "absolute",
  },
  seatCard: {
    flex: 1,
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  pillow: {
    width: "70%",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  contentStack: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 1.5,
    paddingVertical: 1,
  },
  seatName: {
    fontSize: moderateScale(10.5),
    fontWeight: "600",
    textAlign: "center",
  },
  priceText: {
    fontSize: moderateScale(9),
    fontWeight: "600",
    textAlign: "center",
    marginTop: 0.5,
  },
  bottomStrip: {
    width: "100%",
    height: 2.8,
  },
  filteredOut: {
    opacity: 0.25,
  },
});
