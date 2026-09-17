import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { getBannerHeight } from "../../../utils/responsive";
import busImage from "../../../../assets/bus.png";
import flightImage from "../../../../assets/flight.png";
import hotelImage from "../../../../assets/hotel.png";
import myBookingsImage from "../../../../assets/mybookings.png";

const CARD_GAP = 14;

const COLORS = {
  primary: "#FF3B5C",
  primaryDark: "#E53355",
  secondary: "#6D5DF6",
  blue: "#4F8DFF",
  green: "#20C997",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#111827",
  textSec: "#4B5563",
  textMuted: "#9CA3AF",
  border: "#F1F5F9",
  shadow: "#0F172A",
};

/* ─── helper: greeting based on hour ─── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

/* ─── Pressable with scale animation ─── */
function AnimatedCard({ children, onPress, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
          }).start()
        }
        style={{ flex: 1 }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0);
  const heroHeight = getBannerHeight(screenHeight);
  const cardWidth = (screenWidth - 48 - CARD_GAP) / 2;
  const logoHeight = Math.min(Math.max(Math.round(screenWidth * 0.22), 80), 100);
  const logoWidth = Math.round(logoHeight * 2.5);
  const [user, setUser] = useState({ name: 'User', profileImage: null });
  const [heroContent, setHeroContent] = useState({
    line1: 'Discover More',
    line2: 'With Every',
    highlight: 'Journey',
  });


  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadUserData = async () => {
        try {
          const storedUser = await SecureStore.getItemAsync('user');
          const savedImage = await SecureStore.getItemAsync('profileImage');

          let userName = 'User';
          let userImage = null;

          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            userName = parsed.firstName || parsed.fullName || 'User';
            userImage = parsed.profileImageUrl || null;
          }
          if (savedImage) {
            userImage = savedImage;
          }

          if (isActive) {
            setUser({ name: userName, profileImage: userImage });
          }
        } catch (error) {
          console.log('Error loading user data in HomeScreen:', error);
        }
      };

      const fetchDynamicContent = async () => {
        // Mocking an API call for Hero and Weather content
        setTimeout(() => {
          if (isActive) {
            setHeroContent({
              line1: 'Discover More',
              line2: 'With Every',
              highlight: 'Journey',
            });
          }
        }, 500);
      };

      loadUserData();
      fetchDynamicContent();

      return () => { isActive = false; };
    }, [])
  );

  const quickActions = [
    {
      id: "buses",
      title: "Buses",
      icon: "bus",
      color: "#FF3B5C",
      bgGrad: ["#FFF0F3", "#FFDCE3"],
      image: busImage,
      onPress: () => navigation.navigate("BusScreen"),
    },
    {
      id: "flights",
      title: "Flights",
      icon: "airplane",
      color: "#4F8DFF",
      bgGrad: ["#F0F5FF", "#DCE8FF"],
      image: flightImage,
      onPress: () => navigation.navigate("FlightScreen"),
    },
    {
      id: "hotels",
      title: "Hotels",
      icon: "bed",
      color: "#20C997",
      bgGrad: ["#E8F8F0", "#D3F4E3"],
      image: hotelImage,
      onPress: () => navigation.navigate("Hotels"),
    },
    {
      id: "bookings",
      title: "My Bookings",
      icon: "ticket",
      color: "#6D5DF6",
      bgGrad: ["#F3F0FF", "#E5DDFF"],
      image: myBookingsImage,
      onPress: () => navigation.navigate("Bookings"),
    },
  ];

  const destinations = [
    {
      name: "Goa",
      subtitle: "Beach Paradise",
      image: require("../../../../assets/dest_goa.jpg"),
    },
    {
      name: "Manali",
      subtitle: "Snow & Mountains",
      image: require("../../../../assets/dest_manali.jpg"),
    },
    {
      name: "Kerala",
      subtitle: "Backwaters",
      image: require("../../../../assets/dest_kerala.jpg"),
    },
    {
      name: "Dubai",
      subtitle: "City of Dreams",
      image: require("../../../../assets/HotelBanner.jpg"),
    },
  ];

  /* Mount fade-in animation */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ═══ HERO SECTION WITH BACKGROUND ARTWORK ═══ */}
            <ImageBackground
              source={require("../../../../assets/hero_bus.jpg")}
              style={[
                styles.heroBgContainer,
                { height: heroHeight },
              ]}
              imageStyle={styles.heroBgImage}
              resizeMode="cover"
            >
              {/* TOP HEADER BAR */}
              <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
                <View style={styles.headerLeft}>
                  <Image
                    source={require("../../../../assets/Splash-Icon.png")}
                    style={[
                      styles.headerAppIcon,
                      { width: logoWidth, height: logoHeight },
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.headerRight}>
                  <Pressable
                    onPress={() => navigation.navigate("NotificationsScreen")}
                    style={({ pressed }) => [
                      styles.notifBtn,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Ionicons name="notifications-outline" size={22} color="#111827" />
                  </Pressable>
                </View>
              </View>
            </ImageBackground>

            {/* ═══ WHITE SHEET CONTAINER OVERLAPPING HERO ═══ */}
            <View style={styles.whiteSheet}>
              {/* ═══ 2x2 CATEGORY GRID ═══ */}
              <View style={styles.gridContainer}>
                {quickActions.map((action) => (
                  <AnimatedCard
                    key={action.id}
                    onPress={action.onPress}
                    style={[styles.gridCard, { width: cardWidth, backgroundColor: action.bgGrad[0], borderColor: action.bgGrad[1] }]}
                  >
                    <View style={styles.cardImageContainer}>
                      <Image source={action.image} style={styles.cardBgImage} resizeMode="contain" />
                    </View>

                    <View style={styles.cardContentBottom}>
                      <Text
                        style={styles.categoryTitle}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                      >
                        {action.title}
                      </Text>
                      <View
                        style={[
                          styles.categoryArrow,
                          { backgroundColor: action.color },
                        ]}
                      >
                        <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                      </View>
                    </View>
                  </AnimatedCard>
                ))}
              </View>

              {/* ═══ TRENDING DESTINATIONS ═══ */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Trending Destinations</Text>
                  <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }}>
                    <Text style={styles.viewAll}>View all</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.destScroll}
                >
                  {destinations.map((dest, idx) => (
                    <View key={idx} style={styles.destCard}>
                      <ImageBackground
                        source={dest.image}
                        style={styles.destImage}
                        imageStyle={styles.destImageStyle}
                        resizeMode="cover"
                      >
                        <LinearGradient
                          colors={["transparent", "rgba(0,0,0,0.65)"]}
                          style={styles.destOverlay}
                        >
                          <View style={styles.destFavBtn}>
                            <Ionicons
                              name="heart-outline"
                              size={16}
                              color="#FFFFFF"
                            />
                          </View>
                          <View style={styles.destBottom}>
                            <Text style={styles.destName}>{dest.name}</Text>
                            <Text style={styles.destSub}>{dest.subtitle}</Text>
                          </View>
                        </LinearGradient>
                      </ImageBackground>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/* ═══════════════ STYLES ═══════════════ */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    backgroundColor: "#FFFFFF",
  },

  /* ── Hero Background & Header ── */
  heroBgContainer: {
    width: "100%",
    justifyContent: "space-between",
  },
  heroBgImage: {
    opacity: 0.95,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 0,
    paddingRight: 16,
    paddingVertical: 6,
  },
  headerLeft: {
    justifyContent: "center",
    alignItems: "flex-start",
    marginLeft: -22,
  },
  headerAppIcon: {
    resizeMode: "contain",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  notifBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  profileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  /* ── Hero Content Row ── */
  heroContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  heroLeft: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  headline: {
    fontSize: 34,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  headlineAccent: {
    color: COLORS.primary,
    fontStyle: "italic",
  },
  heroSubText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#334155",
    textShadowColor: "rgba(51, 65, 85, 0.3)",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
    marginTop: 12,
    lineHeight: 20,
  },

  /* ── Weather Pill ── */
  weatherPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  weatherInfo: {
    flexDirection: "column",
  },
  weatherTemp: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 18,
  },
  weatherCity: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },

  /* ── White Sheet Container ── */
  whiteSheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    paddingTop: 24,
    paddingBottom: 36,
    minHeight: 500,
  },

  /* ── 2x2 Grid Category Cards ── */
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    gap: CARD_GAP,
  },
  gridCard: {
    height: 126,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: "space-between",
  },
  cardImageContainer: {
    width: '100%',
    height: 80,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  busImageWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  busImageScaled: {
    width: '185%',
    height: '185%',
  },
  cardBgImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  cardContentBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 26,
    gap: 6,
  },
  categoryTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  categoryArrow: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Section Shared ── */
  sectionWrap: {
    paddingHorizontal: 20,
    marginTop: 24,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },

  /* ── Promo Banner ── */
  promoBanner: {
    borderRadius: 24,
    paddingVertical: 20,
    paddingLeft: 20,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  promoLeft: {
    flex: 1,
    paddingRight: 10,
    zIndex: 2,
  },
  promoBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  promoHeadline: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  promoSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  promoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignSelf: "flex-start",
    marginTop: 14,
    gap: 4,
  },
  promoBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  promoRight: {
    width: 130,
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
  },
  promoBusImg: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  paginationRow: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  dotActive: {
    width: 14,
    backgroundColor: "#FFFFFF",
  },

  /* ── Continue Planning ── */
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  planContent: {
    flex: 1,
  },
  planRoute: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  planArrowText: {
    color: COLORS.textMuted,
  },
  planMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 3,
  },

  /* ── Destinations ── */
  destScroll: {
    gap: 12,
    paddingRight: 20,
    paddingVertical: 10,
  },
  destCard: {
    width: 135,
    height: 165,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  destImage: {
    flex: 1,
  },
  destImageStyle: {
    borderRadius: 20,
  },
  destOverlay: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    justifyContent: "space-between",
  },
  destFavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  destBottom: {},
  destName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  destSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
});
