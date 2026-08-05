import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SEAT_STATUS, SEAT_TYPES } from "../constants/seatMapConstants";

const Seat = memo(function Seat({ seat, onPress, accessibleLabel }) {
  const isSelected = seat.status === SEAT_STATUS.SELECTED;
  const isBooked = seat.status === SEAT_STATUS.BOOKED || seat.status === SEAT_STATUS.BLOCKED;
  const isPremium = seat.type === SEAT_TYPES.PREMIUM || seat.type === SEAT_TYPES.BUSINESS;
  const isExitRow = seat.type === SEAT_TYPES.EXIT_ROW;

  // Determine styles based on seat status and type
  let seatBgStyle = styles.availableBg;
  let seatBorderStyle = styles.availableBorder;
  let textStyle = styles.availableText;

  if (isSelected) {
    seatBgStyle = styles.selectedBg;
    seatBorderStyle = styles.selectedBorder;
    textStyle = styles.selectedText;
  } else if (isBooked) {
    seatBgStyle = styles.bookedBg;
    seatBorderStyle = styles.bookedBorder;
    textStyle = styles.bookedText;
  } else if (isPremium) {
    seatBgStyle = styles.premiumBg;
    seatBorderStyle = styles.premiumBorder;
    textStyle = styles.premiumText;
  }

  // Surcharge text
  const showSurcharge = seat.price > 0 && !isBooked;

  return (
    <Pressable
      disabled={isBooked}
      onPress={onPress}
      accessibilityLabel={accessibleLabel}
      style={({ pressed }) => [
        styles.touchArea,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.seatOuter, seatBorderStyle, seatBgStyle]}>
        {/* Seat Backrest indicator */}
        <View style={[styles.backrest, isSelected ? styles.whiteIndicator : isBooked ? styles.grayIndicator : isPremium ? styles.goldIndicator : styles.lightGrayIndicator]} />
        
        {/* Seat letter label */}
        <Text style={[styles.label, textStyle]}>
          {seat.seatNumber}
        </Text>

        {/* Small Exit Row Label */}
        {isExitRow && !isBooked && !isSelected && (
          <View style={styles.exitBadge}>
            <Text style={styles.exitBadgeText}>EXIT</Text>
          </View>
        )}
      </View>
      
      {/* Surcharge Text */}
      {showSurcharge ? (
        <Text style={[styles.price, isSelected && styles.selectedPrice]}>
          +₹{seat.price}
        </Text>
      ) : (
        <Text style={styles.pricePlaceholder}> </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  touchArea: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
    marginHorizontal: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  seatOuter: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  backrest: {
    position: "absolute",
    top: 2,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
  },
  exitBadge: {
    position: "absolute",
    bottom: 2,
    backgroundColor: "#FEE2E2",
    borderRadius: 2,
    paddingHorizontal: 2,
    paddingVertical: 0.5,
  },
  exitBadgeText: {
    fontSize: 6,
    fontWeight: "900",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 8,
    fontWeight: "750",
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  selectedPrice: {
    color: "#E53935",
  },
  pricePlaceholder: {
    fontSize: 8,
    marginTop: 2,
  },
  
  // Indicators
  whiteIndicator: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  grayIndicator: {
    backgroundColor: "rgba(100, 116, 139, 0.2)",
  },
  goldIndicator: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
  },
  lightGrayIndicator: {
    backgroundColor: "rgba(203, 213, 225, 0.4)",
  },

  // Color Styles - Available
  availableBg: {
    backgroundColor: "#FFFFFF",
  },
  availableBorder: {
    borderColor: "#CBD5E1",
  },
  availableText: {
    color: "#334155",
  },

  // Color Styles - Selected
  selectedBg: {
    backgroundColor: "#E53935",
  },
  selectedBorder: {
    borderColor: "#E53935",
  },
  selectedText: {
    color: "#FFFFFF",
  },

  // Color Styles - Booked
  bookedBg: {
    backgroundColor: "#E2E8F0",
  },
  bookedBorder: {
    borderColor: "#CBD5E1",
  },
  bookedText: {
    color: "#94A3B8",
  },

  // Color Styles - Premium (Available state with gold border)
  premiumBg: {
    backgroundColor: "#FFFFFF",
  },
  premiumBorder: {
    borderColor: "#D4AF37", // Gold border
    borderWidth: 2,
  },
  premiumText: {
    color: "#B45309", // Warm dark gold/amber
  },
});

export default Seat;
