import React, { useRef } from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, GRADIENT_RED } from "../constants/colors";
import { RADIUS, SPACING } from "../constants/spacing";

export const GradientButton = React.memo(function GradientButton({
  title = "Search flights",
  onPress,
  disabled = false,
  loading = false,
  showArrow = true,
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 100,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={styles.touchable}
      >
        <LinearGradient
          colors={disabled ? ["#CBD5E1", "#94A3B8"] : GRADIENT_RED}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, disabled && styles.disabledGradient]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.row}>
              <Text style={styles.buttonText}>{title}</Text>
              {showArrow && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                  style={styles.arrowIcon}
                />
              )}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  touchable: {
    width: "100%",
    borderRadius: RADIUS.xl,
    overflow: "hidden",
  },
  gradient: {
    height: 58,
    borderRadius: RADIUS.xl,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  disabledGradient: {
    shadowOpacity: 0,
    elevation: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  arrowIcon: {
    marginLeft: SPACING.sm,
  },
});

export default GradientButton;
