import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, RADII, SHADOWS } from "../theme/passengerDetailsTheme";

export const PassengerHeader = React.memo(({ onBackPress }) => {
  return (
    <View style={styles.container}>
      {/* Header Top Row */}
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBackPress}
          style={styles.backCircleBtn}
          accessibilityLabel="Go Back"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>Passenger Details</Text>
          <Text style={styles.subtitle}>Step 2 of 4 • Add Traveller Information</Text>
        </View>
      </View>

      {/* Premium Airline Multi-Step Progress Indicator */}
      <View style={styles.progressContainer}>
        {/* Step 1: Search / Flight Selected (Done) */}
        <View style={styles.stepItem}>
          <View style={[styles.stepDot, styles.stepDotDone]}>
            <Ionicons name="checkmark" size={12} color={COLORS.white} />
          </View>
          <Text style={styles.stepTextDone}>Flight</Text>
        </View>

        <View style={[styles.stepLine, styles.stepLineDone]} />

        {/* Step 2: Passenger Details (Active) */}
        <View style={styles.stepItem}>
          <LinearGradient
            colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
            style={styles.stepDotActive}
          >
            <Text style={styles.stepDotActiveText}>2</Text>
          </LinearGradient>
          <Text style={styles.stepTextActive}>Passengers</Text>
        </View>

        <View style={styles.stepLine} />

        {/* Step 3: Seats */}
        <View style={styles.stepItem}>
          <View style={styles.stepDotUpcoming}>
            <Text style={styles.stepDotUpcomingText}>3</Text>
          </View>
          <Text style={styles.stepTextUpcoming}>Seats</Text>
        </View>

        <View style={styles.stepLine} />

        {/* Step 4: Payment */}
        <View style={styles.stepItem}>
          <View style={styles.stepDotUpcoming}>
            <Text style={styles.stepDotUpcomingText}>4</Text>
          </View>
          <Text style={styles.stepTextUpcoming}>Payment</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.glassCard,
  },
  titleWrap: {
    marginLeft: 14,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textDark,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingHorizontal: 4,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepDotDone: {
    width: 24,
    height: 24,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.successGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  stepTextDone: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.successGreen,
  },
  stepDotActive: {
    width: 26,
    height: 26,
    borderRadius: RADII.pill,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.focusedInput,
  },
  stepDotActiveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
  stepTextActive: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primaryRed,
  },
  stepDotUpcoming: {
    width: 24,
    height: 24,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotUpcomingText: {
    color: COLORS.textSubtle,
    fontSize: 11,
    fontWeight: "700",
  },
  stepTextUpcoming: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textSubtle,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.borderMedium,
    marginHorizontal: 6,
    marginBottom: 16,
  },
  stepLineDone: {
    backgroundColor: COLORS.successGreen,
  },
});

export default PassengerHeader;
