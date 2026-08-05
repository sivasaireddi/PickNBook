import React, { useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, RADII, SHADOWS } from "../theme/passengerDetailsTheme";

export const SegmentControl = React.memo(({ options, selectedValue, onSelect, label }) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.segmentedRow}>
        {options.map((option) => {
          const isActive = selectedValue === option;
          return (
            <SegmentItem
              key={option}
              option={option}
              isActive={isActive}
              onPress={() => onSelect(option)}
            />
          );
        })}
      </View>
    </View>
  );
});

const SegmentItem = React.memo(({ option, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.flex1}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.flex1]}>
        {isActive ? (
          <LinearGradient
            colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.segmentBtn, styles.segmentBtnActive]}
          >
            <Text style={styles.segmentTextActive}>{option}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.segmentBtn}>
            <Text style={styles.segmentTextInactive}>{option}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: COLORS.inputBg,
    padding: 5,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  flex1: {
    flex: 1,
  },
  segmentBtn: {
    height: 44,
    borderRadius: RADII.input - 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  segmentBtnActive: {
    borderWidth: 0,
    ...SHADOWS.glowButton,
  },
  segmentTextActive: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  segmentTextInactive: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
});

export default SegmentControl;
