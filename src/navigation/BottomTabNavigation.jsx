import React, { useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View, Animated } from "react-native";
import HomeScreen from "../screens/dashboard/bottomTabScreens/HomeScreen";
import PickCashScreen from "../screens/dashboard/bottomTabScreens/PickCashScreen";
import BookingsScreen from "../screens/dashboard/bottomTabScreens/BookingsScreen";
import HelpScreen from "../screens/dashboard/bottomTabScreens/HelpScreen";
import ProfileScreen from "../screens/dashboard/bottomTabScreens/ProfileScreen";

const Tab = createBottomTabNavigator();

function TabBarIcon({ name, focused, color }) {
  const scale = useRef(new Animated.Value(focused ? 1.08 : 1.0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.08 : 1.0,
      friction: 5,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={name} size={22} color={color} />
      </Animated.View>
    </View>
  );
}

export default function BottomTabNavigation() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#FF3B5C",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9",
          height: Platform.OS === "ios" ? 82 : 62,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 22 : 8,
          elevation: 8,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Bookings") {
            iconName = focused ? "briefcase" : "briefcase-outline";
          } else if (route.name === "Offers") {
            iconName = focused ? "gift" : "gift-outline";
          } else if (route.name === "Help") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "Account") {
            iconName = focused ? "person" : "person-outline";
          }

          return <TabBarIcon name={iconName} focused={focused} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Offers" component={PickCashScreen} />
      <Tab.Screen name="Help" component={HelpScreen} />
      <Tab.Screen name="Account" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 28,
  },
});
