import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, GRADIENT_RED } from "../constants/colors";
import { RADIUS, SPACING } from "../constants/spacing";

export const TripTypeToggle = React.memo(function TripTypeToggle({
  tripType,
  onChangeTripType,
}) {
  const normType = String(tripType || "").toLowerCase();
  const activeIdx = normType === "multicity" ? 2 : (normType === "roundtrip" || normType === "twoway" ? 1 : 0);
  
  const slideAnim = useRef(new Animated.Value(activeIdx)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIdx,
      tension: 70,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [activeIdx, slideAnim]);

  const leftPosition = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ["0.5%", "33.5%", "66.5%"],
  });

  return (
    <View style={styles.container}>
      {/* Sliding active pill indicator */}
      <Animated.View style={[styles.activePillWrapper, { left: leftPosition }]}>
        <LinearGradient
          colors={GRADIENT_RED}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientPill}
        />
      </Animated.View>

      {/* One Way Tab */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onChangeTripType("oneway")}
        style={styles.tabButton}
      >
        <Text
          style={[
            styles.tabText,
            activeIdx === 0 ? styles.activeTabText : styles.inactiveTabText,
          ]}
        >
          One way
        </Text>
      </TouchableOpacity>

      {/* Round Trip Tab */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onChangeTripType("roundtrip")}
        style={styles.tabButton}
      >
        <Text
          style={[
            styles.tabText,
            activeIdx === 1 ? styles.activeTabText : styles.inactiveTabText,
          ]}
        >
          Round trip
        </Text>
      </TouchableOpacity>

      {/* Multi-city Tab */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onChangeTripType("multicity")}
        style={styles.tabButton}
      >
        <Text
          style={[
            styles.tabText,
            activeIdx === 2 ? styles.activeTabText : styles.inactiveTabText,
          ]}
        >
          Multi-city
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 52,
    backgroundColor: "#EDF0F7",
    borderRadius: RADIUS.pill,
    padding: 4,
    position: "relative",
    marginVertical: SPACING.md,
    alignItems: "center",
  },
  activePillWrapper: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: "33%",
    paddingHorizontal: 2,
  },
  gradientPill: {
    flex: 1,
    borderRadius: RADIUS.pill,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  inactiveTabText: {
    color: COLORS.textSecondary,
  },
});

export default TripTypeToggle;
