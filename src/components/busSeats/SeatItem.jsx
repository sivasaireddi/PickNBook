import React, { memo } from "react";
import {
  Image,
  StyleSheet,
  View,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from "../../theme/busSeatTheme";

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
  staggerIndex = 0,
}) => {
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value },
    ],
  }));

  const isBooked = Boolean(seat?.isBooked);
  const gender = String(
    seat?.gender ?? seat?.seatGender ?? seat?.type ?? ""
  ).toLowerCase();

  // Keep the existing fare data path intact; the formatted value is no longer rendered in the seat.
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
        textColor: BUS_SEAT_COLORS.selectedText,
        priceColor: BUS_SEAT_COLORS.selectedPriceText,
        shadow: BUS_SEAT_SHADOWS.selectedGlow,
      };
    }

    if (isBooked) {
      if (gender === "female") {
        return {
          bgColor: BUS_SEAT_COLORS.femaleBookedBg,
          borderColor: BUS_SEAT_COLORS.femaleBookedBorder,
          stripColor: BUS_SEAT_COLORS.femaleBookedStrip,
          pillowColor: BUS_SEAT_COLORS.femaleBookedStrip,
          // Keep the female-booked top pillow pink, but remove the pink
          // indicator from the bottom of the seat.
          bottomStripColor: BUS_SEAT_COLORS.femaleBookedBg,
          textColor: BUS_SEAT_COLORS.femaleBookedText,
          priceColor: BUS_SEAT_COLORS.femaleBookedText,
          borderWidth: 1.8,
          shadow: null,
        };
      }
      return {
        bgColor: BUS_SEAT_COLORS.bookedBg,
        borderColor: BUS_SEAT_COLORS.bookedBorder,
        stripColor: BUS_SEAT_COLORS.bookedStrip,
        textColor: BUS_SEAT_COLORS.bookedText,
        priceColor: BUS_SEAT_COLORS.bookedText,
        borderWidth: 1.8,
        shadow: null,
      };
    }

    if (gender === "female") {
      return {
        bgColor: BUS_SEAT_COLORS.femaleBg,
        borderColor: BUS_SEAT_COLORS.femaleBorder,
        stripColor: BUS_SEAT_COLORS.femaleStrip,
        textColor: BUS_SEAT_COLORS.femaleText,
        priceColor: BUS_SEAT_COLORS.femalePriceText,
        shadow: BUS_SEAT_SHADOWS.card,
      };
    }

    if (gender === "male") {
      return {
        bgColor: BUS_SEAT_COLORS.maleBg,
        borderColor: BUS_SEAT_COLORS.maleBorder,
        stripColor: BUS_SEAT_COLORS.maleStrip,
        textColor: BUS_SEAT_COLORS.maleText,
        priceColor: BUS_SEAT_COLORS.malePriceText,
        shadow: BUS_SEAT_SHADOWS.card,
      };
    }

    // Default Available
    return {
      bgColor: BUS_SEAT_COLORS.availableBg,
      borderColor: BUS_SEAT_COLORS.availableBorder,
      stripColor: BUS_SEAT_COLORS.availableStrip,
      textColor: BUS_SEAT_COLORS.availableText,
      priceColor: BUS_SEAT_COLORS.availablePriceText,
      borderWidth: 1.8,
      shadow: BUS_SEAT_SHADOWS.card,
    };
  };

  const theme = getTheme();

  const handlePressIn = () => {
    if (isBooked) return;
    pressScale.value = withTiming(0.95, { duration: 150 });
  };

  const handlePressOut = () => {
    if (isBooked) return;
    pressScale.value = withTiming(1, { duration: 180 });
  };

  const genderImageSource =
    gender === "female"
      ? require("../../../assets/woman.png")
      : !isBooked && gender === "male"
        ? require("../../../assets/man.png")
        : null;
  const seatMinDimension = Math.min(Number(width) || 0, Number(height) || 0);
  const genderIconSize = Math.max(18, Math.min(40, seatMinDimension * 0.52));
  const genderIconColor =
    gender === "female"
      ? isBooked
        ? BUS_SEAT_COLORS.femaleBookedText
        : BUS_SEAT_COLORS.femaleBorder
      : BUS_SEAT_COLORS.maleText;

  return (
    <Animated.View
      style={[
        styles.absoluteContainer,
        { left, top, width, height },
        animatedStyle,
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
            ...(theme.borderWidth ? { borderWidth: theme.borderWidth } : {}),
          },
          isFilteredOut && styles.filteredOut,
        ]}
      >
        {/* Top Pillow / Headrest */}
        <View
          style={[
            styles.pillow,
            {
              backgroundColor: theme.pillowColor || theme.borderColor,
              height: isSleeper ? 5 : 3,
            },
          ]}
        />

        {/* Center gender icon. Seat IDs and fares remain in the data and are not rendered here. */}
        <View style={styles.contentStack}>
          {genderImageSource ? (
            <Image
              source={genderImageSource}
              style={[
                styles.genderIcon,
                {
                  width: genderIconSize,
                  height: genderIconSize,
                  tintColor: genderIconColor,
                },
              ]}
              resizeMode="contain"
            />
          ) : null}
        </View>

        {/* Bottom Indicator Strip */}
        <View
          style={[
            styles.bottomStrip,
            {
              backgroundColor: theme.bottomStripColor || theme.stripColor,
              height: theme.bottomStripColor ? (isSleeper ? 5 : 3.5) : undefined,
            },
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
  genderIcon: {
    alignSelf: "center",
    maxWidth: "100%",
    maxHeight: "100%",
  },
  bottomStrip: {
    width: "100%",
    height: 2.8,
  },
  filteredOut: {
    opacity: 0.25,
  },
});
