import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";
import FeaturedOffers from "./FeaturedOffers";

export default function HomeScreenWeb({ navigation }) {
  const quickActions = [
    {
      id: "buses",
      title: "Buses",
      icon: "bus",
      color: "#E11D48",
      bgColor: "#FFE4E6",
      description: "Book cheap bus tickets online with best routes",
      onPress: () => navigation.navigate("BusScreen"),
    },
    {
      id: "flights",
      title: "Flights",
      icon: "airplane",
      color: "#0284C7",
      bgColor: "#E0F2FE",
      description: "Compare and book international & domestic flights",
      onPress: () => navigation.navigate("FlightScreen"),
    },
    {
      id: "hotels",
      title: "Hotels",
      icon: "bed",
      color: "#7C3AED",
      bgColor: "#F3E8FF",
      description: "Find cozy stays, luxury hotels & budget rooms",
      onPress: () => navigation.navigate("Hotels"),
    },
    {
      id: "bookings",
      title: "My Bookings",
      icon: "receipt",
      color: "#059669",
      bgColor: "#D1FAE5",
      description: "Manage, cancel, or download your booking tickets",
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
                style={styles.gridCard}
                activeOpacity={0.8}
                onPress={action.onPress}
              >
                <View style={[styles.iconContainer, { backgroundColor: action.bgColor }]}>
                  <Ionicons name={action.icon} size={32} color={action.color} />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>{action.title}</Text>
                  <Text style={styles.cardDesc}>{action.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Featured Offers */}
          <View style={styles.sectionContainer}>
            <FeaturedOffers />
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
    gap: 16,
  },
  gridCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
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
