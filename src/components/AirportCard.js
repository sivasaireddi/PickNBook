import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, GRADIENT_RED } from "../constants/colors";
import { RADIUS, SPACING } from "../constants/spacing";

export const AirportCard = React.memo(function AirportCard({
  origin,
  destination,
  departureDate,
  returnDate,
  tripType,
  onPressOrigin,
  onPressDestination,
  onSwap,
  onPressDeparture,
  onPressReturn,
}) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const isRoundTrip = tripType === "roundtrip" || tripType === "roundTrip";

  const handleSwapPress = () => {
    Animated.spring(rotateAnim, {
      toValue: 1,
      tension: 110,
      friction: 8,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
    });
    onSwap();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const formatDate = (dateObj) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <View style={styles.card}>
      {/* Die-cut circular side notches matching page background */}
      <View style={styles.notchLeft} />
      <View style={styles.notchRight} />

      {/* Top Section: FROM & TO */}
      <View style={styles.topRow}>
        {/* FROM */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressOrigin}
          style={styles.locationCol}
        >
          <Text style={styles.monoLabel}>FROM</Text>
          <Text style={styles.cityName} numberOfLines={1}>
            {origin?.cityName || origin?.city || "Delhi"}
          </Text>
          <Text style={styles.airportCode}>
            {origin?.airportCode || origin?.iataCode || "DEL"}
          </Text>
        </TouchableOpacity>

        {/* Swap Button */}
        <View style={styles.swapContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSwapPress}
            style={styles.swapTouchArea}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <LinearGradient
                colors={GRADIENT_RED}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.swapCircle}
              >
                <Ionicons name="swap-vertical" size={22} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* TO */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressDestination}
          style={[styles.locationCol, styles.alignRight]}
        >
          <Text style={styles.monoLabel}>TO</Text>
          <Text style={styles.cityName} numberOfLines={1}>
            {destination?.cityName || destination?.city || "Mumbai"}
          </Text>
          <Text style={styles.airportCode}>
            {destination?.airportCode || destination?.iataCode || "BOM"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dashed perforation line */}
      <View style={styles.perforationRow}>
        <View style={styles.dashedLine} />
      </View>

      {/* Bottom Section: Departure & Return dates */}
      <View style={styles.bottomRow}>
        {/* DEPARTURE */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressDeparture}
          style={styles.dateCol}
        >
          <Text style={styles.monoLabel}>DEPARTURE</Text>
          <Text style={styles.dateValue}>
            {formatDate(departureDate) || "Mon, 3 Aug"}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.verticalDivider} />

        {/* RETURN */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressReturn}
          style={[styles.dateCol, styles.paddingLeft]}
        >
          <Text style={styles.monoLabel}>RETURN</Text>
          {isRoundTrip && returnDate ? (
            <Text style={styles.dateValue}>{formatDate(returnDate)}</Text>
          ) : (
            <Text style={styles.addReturnText}>+ Add return</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    borderColor: COLORS.border,
    borderWidth: 1,
    position: "relative",
    marginVertical: SPACING.md,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    overflow: "hidden",
  },
  notchLeft: {
    position: "absolute",
    left: -14,
    top: "48%",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    zIndex: 10,
  },
  notchRight: {
    position: "absolute",
    right: -14,
    top: "48%",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    zIndex: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationCol: {
    flex: 1,
  },
  alignRight: {
    alignItems: "flex-end",
  },
  monoLabel: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: COLORS.textSecondary,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cityName: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  airportCode: {
    fontSize: 28,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  swapContainer: {
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  swapTouchArea: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  swapCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  perforationRow: {
    marginVertical: SPACING.md,
    overflow: "hidden",
  },
  dashedLine: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 1,
    marginHorizontal: 10,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 4,
  },
  dateCol: {
    flex: 1,
  },
  paddingLeft: {
    paddingLeft: SPACING.md,
  },
  dateValue: {
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  addReturnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
});

export default AirportCard;
