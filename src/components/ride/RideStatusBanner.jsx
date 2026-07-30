import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { Car } from "lucide-react-native";

const RideStatusBanner = ({ visible = false, message = "Your driver has arrived!" }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Continuous pulsing animation when visible
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 1.05,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, pulseScale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: pulseScale },
          ],
        },
      ]}
    >
      <View style={styles.iconCircle}>
        <Car size={20} color="#FFFFFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>Driver Arrived</Text>
        <Text style={styles.subText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

export default React.memo(RideStatusBanner);

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "#10B981", // Emerald green
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "#34D399",
    zIndex: 100,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  subText: {
    color: "#ECFDF5",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
});
