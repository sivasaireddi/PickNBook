import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width * 0.76, 300);
const CARD_HEIGHT = 195;
const IMAGE_HEIGHT = 75;
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
    bookingType: "Bus",
    bgColors: ["#FFF0F2", "#FFE4E8"],
    badgeBg: "#D11A2A",
  },
  {
    offerId: "default_2",
    code: "BIGBUS",
    title: "Up to ₹500 OFF",
    subtitle: "on orders above ₹1500",
    description: "Get maximum discount on sleeper & AC express buses nationwide.",
    isPercentageDiscount: false,
    discountValue: 500,
    bookingType: "Bus",
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
    bookingType: "Bus",
    bgColors: ["#FEFCE8", "#FEF08A"],
    badgeBg: "#D97706",
  },
];

const OfferCardItem = React.memo(({ item, index, scrollX, onViewOffer }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const scalePress = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scalePress, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scalePress, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const code = item.code || item.couponCode || (item.title ? item.title.split(" ")[0].toUpperCase() : "OFFER");
  const discountStr = item.discountValue
    ? item.isPercentageDiscount
      ? `${item.discountValue}% OFF`
      : `${RUPEE}${item.discountValue} OFF`
    : item.title || "Special Offer";

  const bgGrad = item.bgColors || ["#FFF0F2", "#FFE4E8"];
  const badgeBg = item.badgeBg || "#D11A2A";
  const bookingType = String(item.bookingType || "bus").toLowerCase();

  // Booking Type Placeholder icon and color mapping
  const getPlaceholderDetails = (type) => {
    if (type.includes("bus")) {
      return { icon: "bus-outline", label: "Bus Offer", colors: ["#FFF0F2", "#FFE4E8"], iconColor: "#D11A2A" };
    } else if (type.includes("flight") || type.includes("air")) {
      return { icon: "airplane-outline", label: "Flight Offer", colors: ["#E0F2FE", "#BAE6FD"], iconColor: "#0284C7" };
    } else if (type.includes("hotel") || type.includes("stay")) {
      return { icon: "bed-outline", label: "Hotel Offer", colors: ["#FEF3C7", "#FDE68A"], iconColor: "#D97706" };
    }
    return { icon: "gift-outline", label: "Special Offer", colors: ["#FFF0F2", "#FFE4E8"], iconColor: "#D11A2A" };
  };

  const placeholder = getPlaceholderDetails(bookingType);
  const hasValidImage = Boolean(item.imageUrl && String(item.imageUrl).trim().length > 0 && !imageError);

  const cardScrollScale = scrollX.interpolate({
    inputRange: [
      (index - 1) * (CARD_WIDTH + 12),
      index * (CARD_WIDTH + 12),
      (index + 1) * (CARD_WIDTH + 12),
    ],
    outputRange: [0.96, 1.0, 0.96],
    extrapolate: "clamp",
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onViewOffer && onViewOffer(item)}
      style={styles.cardTouchWrapper}
    >
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            transform: [
              { scale: Animated.multiply(cardScrollScale, scalePress) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={bgGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Top Row Header: Badge & Tag */}
          <View style={styles.topRow}>
            <View style={[styles.couponBadge, { backgroundColor: badgeBg }]}>
              <Text style={styles.couponBadgeText} numberOfLines={1}>{code}</Text>
            </View>
            <Ionicons name="pricetag-outline" size={16} color="rgba(0,0,0,0.18)" />
          </View>

          {/* Dedicated Image Container (75px) */}
          <View style={styles.imageContainer}>
            {hasValidImage ? (
              <>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageError(true);
                    setImageLoading(false);
                  }}
                />
                {imageLoading && (
                  <View style={styles.imageLoaderOverlay}>
                    <ActivityIndicator size="small" color="#E53935" />
                  </View>
                )}
              </>
            ) : (
              <LinearGradient
                colors={placeholder.colors}
                style={styles.placeholderBox}
              >
                <Ionicons name={placeholder.icon} size={24} color={placeholder.iconColor} />
                <Text style={[styles.placeholderLabel, { color: placeholder.iconColor }]}>
                  {placeholder.label}
                </Text>
              </LinearGradient>
            )}
          </View>

          {/* Compact Content Section */}
          <View style={styles.cardContent}>
            <Text numberOfLines={1} style={styles.discountTitle}>
              {discountStr.includes("OFF") ? `Up to ${discountStr}` : discountStr}
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {item.subtitle || item.description || "valid on bookings"}
            </Text>
            <Text numberOfLines={1} style={styles.description}>
              {item.description || "Grab this exclusive discount on PickNBook."}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const FeaturedOffers = ({ onViewAll, onViewOffer }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation();
  const isNavigating = useRef(false);
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
      setOffers(DEFAULT_OFFERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFeaturedOffers();
  }, []);

  const handleViewAllPress = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setTimeout(() => {
      isNavigating.current = false;
    }, 1000);

    const displayOffers = offers.length > 0 ? offers : DEFAULT_OFFERS;
    if (typeof onViewAll === "function") {
      onViewAll(displayOffers);
    } else if (navigation && typeof navigation.navigate === "function") {
      try {
        navigation.navigate("Offers", { offers: displayOffers });
      } catch (e) {
        console.log("[FeaturedOffers] Navigation to Offers error:", e);
      }
    }
  };

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
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Top Offers For You</Text>
        <Pressable
          onPress={handleViewAllPress}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          style={({ pressed }) => [styles.viewAllBtn, pressed && styles.viewAllPressed]}
        >
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="chevron-forward" size={14} color="#E53935" />
        </Pressable>
      </View>

      {/* Horizontal FlatList */}
      <AnimatedFlatList
        data={displayOffers}
        keyExtractor={(item, index) => String(item.offerId || item.id || index)}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        contentContainerStyle={styles.scrollContainer}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        snapToAlignment="start"
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item, index }) => (
          <OfferCardItem
            item={item}
            index={index}
            scrollX={scrollX}
            onViewOffer={onViewOffer}
          />
        )}
      />
    </View>
  );
};

export default FeaturedOffers;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
  },
  loaderContainer: {
    height: CARD_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  heading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.2,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "rgba(229, 57, 53, 0.06)",
  },
  viewAllPressed: {
    opacity: 0.7,
    backgroundColor: "rgba(229, 57, 53, 0.12)",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E53935",
  },
  scrollContainer: {
    paddingRight: 10,
    paddingBottom: 0,
  },
  cardTouchWrapper: {
    marginRight: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 57, 53, 0.1)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  couponBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: "80%",
  },
  couponBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  imageContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 4,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderBox: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    padding: 4,
  },
  placeholderLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  cardContent: {
    justifyContent: "flex-end",
    gap: 1,
  },
  discountTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  description: {
    fontSize: 11,
    fontWeight: "400",
    color: "#757575",
  },
});
