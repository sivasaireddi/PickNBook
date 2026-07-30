import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Image, Animated, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppHeader({ title = "Travel", rightComponent = null }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View 
        style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={styles.leftGroup}>
          {/* Branded Logo Outer circle Container */}
          <Animated.View style={[
            styles.logoContainer,
            { transform: [{ scale: scaleAnim }] }
          ]}>
            <Image 
              source={require("../../assets/icon.png")} 
              style={styles.logoImage}
              resizeMode="cover"
            />
          </Animated.View>
          
          {/* Brand Info */}
          <View style={styles.brandInfo}>
            <View style={styles.row}>
              <Text style={styles.brandName}>PickNBook</Text>
            </View>
            <Text style={styles.brandSubtitle}>Your Smart Travel Companion</Text>
          </View>
        </View>

        {rightComponent}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      android: {
        paddingTop: StatusBar.currentHeight ? 2 : 0,
      },
    }),
  },
  headerContainer: {
    height: 48,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoContainer: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  logoImage: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  brandInfo: {
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
    lineHeight: 18,
  },
  brandSubtitle: {
    fontSize: 8,
    fontWeight: "600",
    color: "#94A3B8",
    opacity: 0.7,
    letterSpacing: 0.1,
    marginTop: 0.5,
  },

});
