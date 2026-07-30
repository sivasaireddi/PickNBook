import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { getStoredAuthToken, clearAuthSession, isJwtExpired } from "../../utils/authSession";

const SPLASH_DURATION_MS = 3400; // Slightly longer duration to allow for the slow intro

const SplashScreen = ({ navigation }) => {
  const scale = useRef(new Animated.Value(0.85)).current; // Start slightly smaller for a gradual growth
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Choreographing the two distinct phases
    Animated.sequence([
      // PHASE 1: The Slow Reveal
      // The text gently fades in and creeps up in scale over 1.5 seconds
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // PHASE 2: The Explosive Zoom (Netflix Signature)
      // Once fully visible, it accelerates rapidly into the camera
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 5.0, // Rushes past the viewport boundaries
          duration: 1200,
          easing: Easing.bezier(0.4, 0, 1, 1), // Sharp acceleration curve
          useNativeDriver: true,
        }),
        // Dissolve the text into nothingness right at the end of its zoom
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    let isMounted = true;
    const checkSessionAndNavigate = async () => {
      try {
        const token = await getStoredAuthToken();
        if (!isMounted) return;

        if (token && String(token).trim()) {
          if (isJwtExpired(token)) {
            console.log("[SplashScreen] Stored token has expired. Clearing session -> Login");
            await clearAuthSession();
            navigation?.replace?.("Login");
          } else {
            console.log("[SplashScreen] Valid auth token found -> DashBoard");
            navigation?.replace?.("DashBoard");
          }
        } else {
          console.log("[SplashScreen] No active token found -> Login");
          navigation?.replace?.("Login");
        }
      } catch (error) {
        console.warn("[SplashScreen] Token verification error:", error?.message);
        if (isMounted) {
          navigation?.replace?.("Login");
        }
      }
    };

    // Handoff to DashBoard or Login screen based on stored token
    const navigationTimer = setTimeout(checkSessionAndNavigate, SPLASH_DURATION_MS);

    return () => {
      isMounted = false;
      clearTimeout(navigationTimer);
    };
  }, [navigation, scale, opacity]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.textWrap,
          {
            opacity: opacity,
            transform: [{ scale: scale }],
          },
        ]}
      >
        <Text style={styles.baseText}>
          PICK<Text style={styles.accentText}>N</Text>BOOK
        </Text>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  baseText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 3,
    fontVariant: ["tabular-nums"],
  },
  accentText: {
    color: "#D11A2A",
  },
});
