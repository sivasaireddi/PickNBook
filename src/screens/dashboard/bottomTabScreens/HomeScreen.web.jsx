import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";
import busImage from "../../../../assets/bus.png";
import flightImage from "../../../../assets/flight.png";
import hotelImage from "../../../../assets/hotel.png";
import myBookingsImage from "../../../../assets/mybookings.png";

export default function HomeScreenWeb({ navigation }) {
  const quickActions = [
    {
      id: "buses",
      title: "Buses",
      icon: "bus",
      color: "#E11D48",
      bgColor: "#FFE4E6",
      image: busImage,
      onPress: () => navigation.navigate("BusScreen"),
    },
    {
      id: "flights",
      title: "Flights",
      icon: "airplane",
      color: "#0284C7",
      bgColor: "#E0F2FE",
      image: flightImage,
      onPress: () => navigation.navigate("FlightScreen"),
    },
    {
      id: "hotels",
      title: "Hotels",
      icon: "bed",
      color: "#059669",
      bgColor: "#D1FAE5",
      image: hotelImage,
      onPress: () => navigation.navigate("Hotels"),
    },
    {
      id: "bookings",
      title: "My Bookings",
      icon: "receipt",
      color: "#7C3AED",
      bgColor: "#F3E8FF",
      image: myBookingsImage,
      onPress: () => navigation.navigate("Bookings"),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <AppHeader />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentMaxWidth}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>Welcome to PickNBook Web Portal! 👋</Text>
            <Text style={styles.subGreeting}>Simplify your travels. Search and book buses, flights, and hotels easily.</Text>
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.gridContainer}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.gridCard, { backgroundColor: action.bgColor, borderColor: action.bgColor }]}
                activeOpacity={0.8}
                onPress={action.onPress}
              >
                <View style={styles.imageContainer}>
                  <Image source={action.image} style={styles.cardImage} resizeMode="contain" />
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{action.title}</Text>
                  <View style={[styles.arrowButton, { backgroundColor: action.color }]}>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Why Choose Us */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Why PickNBook?</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <View style={[styles.infoIconBox, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="shield-checkmark-outline" size={24} color="#059669" />
                </View>
                <Text style={styles.infoTitle}>100% Safe & Secure</Text>
                <Text style={styles.infoDesc}>
                  Verified travel operators and secure checkout processes.
                </Text>
              </View>

              <View style={styles.infoCard}>
                <View style={[styles.infoIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="headset-outline" size={24} color="#2563EB" />
                </View>
                <Text style={styles.infoTitle}>24/7 Live Support</Text>
                <Text style={styles.infoDesc}>
                  Need assistance? Our support team is here for you day and night.
                </Text>
              </View>

              <View style={styles.infoCard}>
                <View style={[styles.infoIconBox, { backgroundColor: "#FFFBEB" }]}>
                  <Ionicons name="sparkles-outline" size={24} color="#D97706" />
                </View>
                <Text style={styles.infoTitle}>Best Price Guarantee</Text>
                <Text style={styles.infoDesc}>
                  No hidden charges. Find the best rates for your travel needs.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  scrollContent: {
    padding: 24,
    alignItems: "center",
    paddingBottom: 20,
  },
  contentMaxWidth: {
    width: "100%",
    maxWidth: 1000,
  },
  welcomeSection: {
    marginBottom: 32,
    marginTop: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
  },
  subGreeting: {
    fontSize: 16,
    color: "#475569",
    marginTop: 8,
    fontWeight: "500",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 36,
    gap: 12,
  },
  gridCard: {
    flex: 1,
    minWidth: 220,
    height: 140,
    borderRadius: 20,
    padding: 9,
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    flex: 1,
    minHeight: 80,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  busImageWrapper: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  busImageScaled: {
    width: "185%",
    height: "185%",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  cardBottom: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    flexShrink: 1,
  },
  arrowButton: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionContainer: {
    marginBottom: 36,
    width: "100%",
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 18,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  infoCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  infoDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
});
