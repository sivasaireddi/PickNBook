import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.72;
const RUPEE = "\u20B9";

const DEFAULT_OFFERS = [
  {
    offerId: "default_1",
    code: "BUSSAVE",
    title: "Up to ₹250 OFF",
    subtitle: "on bus tickets",
    description: "Save big on your next journey across popular intercity routes.",
    isPercentageDiscount: false,
    discountValue: 250,
    bgColors: ["#FFF0F2", "#FFE4E8"],
    badgeBg: "#E53935",
  },
  {
    offerId: "default_2",
    code: "BIGBUS",
    title: "Up to ₹500 OFF",
    subtitle: "on orders above ₹1500",
    description: "Get maximum discount on sleeper & AC express buses nationwide.",
    isPercentageDiscount: false,
    discountValue: 500,
    bgColors: ["#EFF6FF", "#DBEAFE"],
    badgeBg: "#2563EB",
  },
  {
    offerId: "default_3",
    code: "NEWUSER",
    title: "₹75 OFF",
    subtitle: "for new users",
    description: "Special welcome offer valid on your very first bus booking.",
    isPercentageDiscount: false,
    discountValue: 75,
    bgColors: ["#FEFCE8", "#FEF08A"],
    badgeBg: "#D97706",
  },
];

const FeaturedOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const getFeaturedOffers = async () => {
    try {
      const response = await axios.get(
        "https://paycheck-baton-overfull.ngrok-free.dev/api/FeaturedOffers"
      );
      const apiOffers = response.data?.offers;
      if (Array.isArray(apiOffers) && apiOffers.length > 0) {
        setOffers(apiOffers);
      } else {
        setOffers(DEFAULT_OFFERS);
      }
    } catch (error) {
      console.log("API ERROR:", error);
      setOffers(DEFAULT_OFFERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFeaturedOffers();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#E53935" />
      </View>
    );
  }

  const displayOffers = offers.length > 0 ? offers : DEFAULT_OFFERS;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Top Offers For You</Text>
        <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <View style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>View all</Text>
            <Ionicons name="chevron-forward" size={14} color="#E53935" />
          </View>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        contentContainerStyle={styles.scrollContainer}
        snapToInterval={CARD_WIDTH + 14}
        decelerationRate="fast"
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
      >
        {displayOffers.map((item, i) => {
          const scale = scrollX.interpolate({
            inputRange: [
              (i - 1) * (CARD_WIDTH + 14),
              i * (CARD_WIDTH + 14),
              (i + 1) * (CARD_WIDTH + 14),
            ],
            outputRange: [0.94, 1.0, 0.94],
            extrapolate: "clamp",
          });

          const code = item.code || item.couponCode || (item.title ? item.title.split(" ")[0].toUpperCase() : "OFFER");
          const discountStr = item.discountValue
            ? item.isPercentageDiscount
              ? `${item.discountValue}% OFF`
              : `${RUPEE}${item.discountValue} OFF`
            : item.title || "Special Offer";

          const bgGrad = item.bgColors || ["#FFF0F2", "#FFE4E8"];
          const badgeBg = item.badgeBg || "#E53935";

          return (
            <Animated.View
              key={item.offerId || i}
              style={[styles.cardWrapper, { transform: [{ scale }] }]}
            >
              <LinearGradient
                colors={bgGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                <View style={styles.topRow}>
                  <View style={[styles.couponBadge, { backgroundColor: badgeBg }]}>
                    <Text style={styles.couponBadgeText}>{code}</Text>
                  </View>
                  <Ionicons name="pricetag-outline" size={18} color="rgba(0,0,0,0.15)" />
                </View>

                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.cardContent}>
                  <Text numberOfLines={1} style={styles.discountTitle}>
                    {discountStr.includes("OFF") ? `Up to ${discountStr}` : discountStr}
                  </Text>
                  <Text numberOfLines={1} style={styles.subtitle}>
                    {item.subtitle || item.description || "valid on bus bookings"}
                  </Text>
                  {item.description ? (
                    <Text numberOfLines={2} style={styles.description}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </LinearGradient>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
};

export default FeaturedOffers;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  loaderContainer: {
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  heading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.2,
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E53935",
  },
  scrollContainer: {
    paddingRight: 10,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: 14,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 57, 53, 0.08)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 130,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  couponBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  couponBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  image: {
    width: "100%",
    height: 70,
    borderRadius: 10,
    marginVertical: 6,
  },
  cardContent: {
    justifyContent: "center",
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
  },
  description: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 15,
  },
});
