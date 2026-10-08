import React, { useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { authTheme } from "./authStyles";

export default function AuthPrimaryButton({ title, onPress, loading, disabled, icon = "arrow-forward", compact = false }) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;
  const animate = (toValue) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, friction: 7, tension: 160 }).start();

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }, isDisabled && styles.disabled]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => animate(0.975)}
        onPressOut={() => animate(1)}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      >
        <LinearGradient
          colors={[authTheme.colors.coral, authTheme.colors.redDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, compact && styles.buttonCompact]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.title}>{title}</Text>
              {!!icon && <Ionicons name={icon} size={19} color="#FFFFFF" />}
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: authTheme.radii.medium,
    shadowColor: authTheme.colors.redDeep,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  disabled: { opacity: 0.62 },
  button: {
    height: 52,
    borderRadius: authTheme.radii.medium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 20,
  },
  buttonCompact: { height: 48, borderRadius: 13 },
  title: { fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 15.5 },
});
