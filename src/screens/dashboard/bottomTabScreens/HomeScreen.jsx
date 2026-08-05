import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import FeaturedOffers from "./FeaturedOffers";

const { width } = Dimensions.get("window");
const CARD_GAP = 14;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2; // 2x2 grid column width

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
  const quickActions = [
    {
      id: "buses",
      title: "Buses",
      icon: "bus",
      color: "#FF3B5C",
      bgGrad: ["#FFE0E6", "#FFBCC7"],
      description: "Book affordable\nbus tickets",
      onPress: () => navigation.navigate("BusScreen"),
    },
    {
      id: "flights",
      title: "Flights",
      icon: "airplane",
      color: "#4F8DFF",
      bgGrad: ["#DBEAFE", "#BFDBFE"],
      description: "Fly to your\ndream destinations",
      onPress: () => navigation.navigate("FlightScreen"),
    },
    {
      id: "hotels",
      title: "Hotels",
      icon: "bed",
      color: "#20C997",
      bgGrad: ["#D1FAE5", "#A7F3D0"],
      description: "Find cozy\nstays",
      onPress: () => navigation.navigate("Hotels"),
    },
    {
      id: "bookings",
      title: "My Bookings",
      icon: "ticket",
      color: "#6D5DF6",
      bgGrad: ["#EDE9FE", "#DDD6FE"],
      description: "Manage your\ntickets",
      onPress: () => navigation.navigate("Bookings"),
    },
  ];

  const destinations = [
    {
      name: "Goa",
      subtitle: "Beach Paradise",
      image: require("../../../../assets/dest_goa.png"),
    },
    {
      name: "Manali",
      subtitle: "Snow & Mountains",
      image: require("../../../../assets/dest_manali.png"),
    },
    {
      name: "Kerala",
      subtitle: "Backwaters",
      image: require("../../../../assets/dest_kerala.png"),
    },
    {
      name: "Dubai",
      subtitle: "City of Dreams",
      image: require("../../../../assets/dest_dubai.png"),
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
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FC" />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
              source={require("../../../../assets/hero_bg.png")}
              style={styles.heroBgContainer}
              imageStyle={styles.heroBgImage}
              resizeMode="cover"
            >
              {/* TOP HEADER BAR */}
              <View style={styles.headerBar}>
                <Text style={styles.brandName}>PickNBook</Text>
                <View style={styles.headerRight}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.notifBtn,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Ionicons name="notifications-outline" size={22} color="#111827" />
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>3</Text>
                    </View>
                  </Pressable>

                  <View style={styles.avatarWrap}>
                    <Ionicons name="person" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </View>

              {/* HERO GREETING & HEADLINE & WEATHER */}
              <View style={styles.heroContentRow}>
                <View style={styles.heroLeft}>
                  <Text style={styles.greeting}>{getGreeting()}, Sai 👋</Text>
                  <Text style={styles.headline}>Explore</Text>
                  <Text style={styles.headline}>
                    Your Next <Text style={styles.headlineAccent}>Journey</Text>
                  </Text>
                </View>

                {/* Weather Floating Pill */}
                <View style={styles.weatherPill}>
                  <Ionicons name="sunny" size={22} color="#FFB347" />
                  <View style={styles.weatherInfo}>
                    <Text style={styles.weatherTemp}>28°</Text>
                    <Text style={styles.weatherCity}>Hyderabad</Text>
                  </View>
                </View>
              </View>

              {/* SPACING AT BOTTOM OF HERO ARTWORK */}
              <View style={{ height: 40 }} />
            </ImageBackground>

            {/* ═══ WHITE SHEET CONTAINER OVERLAPPING HERO ═══ */}
            <View style={styles.whiteSheet}>
              {/* ═══ 2x2 CATEGORY GRID ═══ */}
              <View style={styles.gridContainer}>
                {quickActions.map((action) => (
                  <AnimatedCard
                    key={action.id}
                    onPress={action.onPress}
                    style={styles.gridCard}
                  >
                    <View style={styles.cardHeaderRow}>
                      <LinearGradient
                        colors={action.bgGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.categoryIconWrap}
                      >
                        <Ionicons name={action.icon} size={20} color={action.color} />
                      </LinearGradient>
                    </View>

                    <Text style={styles.categoryTitle}>{action.title}</Text>
                    <Text style={styles.categorySub}>{action.description}</Text>

                    <View style={styles.cardFooterRow}>
                      <View
                        style={[
                          styles.categoryArrow,
                          { backgroundColor: action.color },
                        ]}
                      >
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </AnimatedCard>
                ))}
              </View>

              {/* ═══ PROMOTIONAL BANNER ═══ */}
              <View style={styles.sectionWrap}>
                <Pressable onPress={() => navigation.navigate("BusScreen")}>
                  <LinearGradient
                    colors={["#E53935", "#C2185B"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.promoBanner}
                  >
                    <View style={styles.promoLeft}>
                      <Text style={styles.promoBadgeText}>SUMMER SPECIAL OFFER</Text>
                      <Text style={styles.promoHeadline}>Save up to 50%</Text>
                      <Text style={styles.promoSub}>On Bus Tickets</Text>

                      <View style={styles.promoBtn}>
                        <Text style={styles.promoBtnText}>Book Now</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color="#E53935"
                        />
                      </View>
                    </View>

                    <View style={styles.promoRight}>
                      <Image
                        source={require("../../../../assets/hero_bg.png")}
                        style={styles.promoBusImg}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Carousel Pagination Dots */}
                    <View style={styles.paginationRow}>
                      <View style={[styles.dot, styles.dotActive]} />
                      <View style={styles.dot} />
                      <View style={styles.dot} />
                      <View style={styles.dot} />
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* ═══ CONTINUE PLANNING ═══ */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Continue Planning</Text>
                  <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }}>
                    <Text style={styles.viewAll}>View all</Text>
                  </Pressable>
                </View>
                <View style={styles.planCard}>
                  <View style={styles.planIconWrap}>
                    <Ionicons name="bus" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.planContent}>
                    <Text style={styles.planRoute}>
                      Hyderabad <Text style={styles.planArrowText}>→</Text> Bangalore
                    </Text>
                    <Text style={styles.planMeta}>12 Jun 2025  •  1 Adult</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.textMuted}
                  />
                </View>
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

              {/* ═══ FEATURED OFFERS ═══ */}
              <View style={styles.sectionWrap}>
                <FeaturedOffers />
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
    paddingBottom: 20,
    flexGrow: 0,
  },

  /* ── Hero Background & Header ── */
  heroBgContainer: {
    width: "100%",
    paddingTop: Platform.OS === "android" ? 6 : 0,
  },
  heroBgImage: {
    opacity: 0.9,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
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
  greeting: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
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
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    paddingTop: 24,
    minHeight: 500,
  },

  /* ── 2x2 Grid Category Cards ── */
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: CARD_GAP,
  },
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: "space-between",
  },
  cardHeaderRow: {
    marginBottom: 6,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  categorySub: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    lineHeight: 14,
    marginBottom: 4,
  },
  cardFooterRow: {
    alignItems: "flex-end",
  },
  categoryArrow: {
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
    paddingRight: 10,
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
