import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Image, Animated } from "react-native";
import { Marker } from "react-native-maps";

import carImage from "../../../assets/car.jpg";
import PhilipImage from "../../../assets/Philip.png";

const DriverMarker = ({ coordinate, rotateAnim, driverName = "Philip" }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.5, 0.2, 0],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Marker.Animated coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.markerContainer}>
        {/* Driver Avatar Bubble */}
        <View style={styles.avatarBubble}>
          <Image source={PhilipImage} style={styles.avatarImage} />
          <View style={styles.nameContainer}>
            <Text style={styles.nameText} numberOfLines={1}>{driverName}</Text>
          </View>
        </View>

        {/* Pulse Effect */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />

        {/* Car Icon */}
        <Animated.View
          style={[
            styles.carContainer,
            {
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          <Image source={carImage} style={styles.carImage} />
        </Animated.View>
      </View>
    </Marker.Animated>
  );
};

export default React.memo(DriverMarker);

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
    height: 100,
  },
  avatarBubble: {
    position: "absolute",
    top: -5,
    backgroundColor: "#FFFFFF",
    padding: 3,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  nameContainer: {
    paddingHorizontal: 4,
  },
  nameText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0F172A",
  },
  pulseRing: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(59, 130, 246, 0.4)", // transparent blue
    zIndex: 1,
  },
  carContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    zIndex: 5,
  },
  carImage: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
});
