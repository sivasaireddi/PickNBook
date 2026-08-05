import React, { useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, RADII, SHADOWS } from "../theme/passengerDetailsTheme";

export const StickyFooter = React.memo(({ onContinue, onClearDraft }) => {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <View style={[styles.stickyContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onContinue}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueGradientBtn}
          >
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={24} color={COLORS.white} />
            <Text style={styles.continueBtnText}>Continue to Seats Selection</Text>
            <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onClearDraft}
        style={styles.clearDraftBtn}
        hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
      >
        <Text style={styles.clearDraftText}>Clear Booking Draft</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  stickyContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 12,
    ...SHADOWS.glassCard,
  },
  continueGradientBtn: {
    height: 56,
    borderRadius: RADII.input,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    ...SHADOWS.glowButton,
  },
  continueBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  clearDraftBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  clearDraftText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export default StickyFooter;
