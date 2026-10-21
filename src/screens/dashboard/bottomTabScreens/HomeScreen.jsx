import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Linking,
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
import NotificationBell from "../../../components/NotificationBell";
import LegalEntityFooter from "../../../components/common/LegalEntityFooter";
import { theme } from "../../../theme/tokens";
import { resolveBusCity } from "../../../services/busService";
import { createBusSearchNavigationParams } from "../../../utils/busSearchParams";
import {
  getBlogImageUrl,
  getPublicBlogListingUrl,
  getPublicBlogUrl,
  getPublicBlogs,
} from "../../../services/blogService";
import { HOME_BENEFITS, HOME_DESTINATIONS, HOME_FAQS, HOME_POPULAR_ROUTES } from "./homeContent";

const HERO_IMAGE = require("../../../../assets/home/hero.jpg");
const LOGO_IMAGE = require("../../../../assets/home/picknbook-wordmark.png");
const BUS_IMAGE = require("../../../../assets/home/bus.png");
const FLIGHT_IMAGE = require("../../../../assets/home/flight.png");
const HOTEL_IMAGE = require("../../../../assets/home/hotel.png");
const BOOKINGS_IMAGE = require("../../../../assets/home/bookings.png");
const ASSURANCE_IMAGE = require("../../../../assets/home/bus-assurance.jpg");
const BLOG_FALLBACK_IMAGES = [
  require("../../../../assets/home/blog-bus.jpg"),
  ASSURANCE_IMAGE,
  HERO_IMAGE,
];

const PALETTE = {
  blush: "#FFF1F3",
  redSoft: "#F7C6CD",
  navy: "#10182E",
  navySoft: "#17233D",
  blueSoft: "#EDF4FF",
  amberSoft: "#FFF4E3",
  whiteMuted: "rgba(255,255,255,0.78)",
};

const SHADOW = {
  shadowColor: theme.colors.ink,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 18,
  elevation: 4,
};

function ScalePressable({ children, onPress, style, accessibilityLabel, disabled = false }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = useCallback((toValue) => {
    Animated.spring(scale, { toValue, friction: 7, tension: 100, useNativeDriver: true }).start();
  }, [scale]);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => !disabled && animate(0.98)}
        onPressOut={() => animate(1)}
        style={styles.pressFill}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const SectionHeading = memo(function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <View style={styles.sectionHeading}>
      {!!eyebrow && <Text style={styles.sectionEyebrow}>{eyebrow}</Text>}
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
});

function Hero({ onPress }) {
  return (
    <View style={styles.heroOuter}>
      <ImageBackground source={HERO_IMAGE} resizeMode="cover" style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient
          colors={["rgba(9,15,32,0.08)", "rgba(9,15,32,0.18)", "rgba(9,15,32,0.9)"]}
          locations={[0, 0.4, 1]}
          style={styles.heroOverlay}
        >
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>YOUR NEXT JOURNEY</Text>
          </View>
          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle}>Travel comfortably.{"\n"}Arrive happily.</Text>
            <Text style={styles.heroSubtitle}>Buses, flights and stays—planned from one place.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start with buses"
              onPress={onPress}
              style={({ pressed }) => [styles.heroAction, pressed && styles.heroActionPressed]}
            >
              <Text style={styles.heroActionText}>Start with buses</Text>
              <Ionicons name="arrow-forward" size={17} color={theme.colors.ink} />
            </Pressable>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

function ServiceBento({ navigation }) {
  return (
    <View style={styles.section}>
      <SectionHeading eyebrow="PLAN YOUR WAY" title="Book your journey" subtitle="Everything you need for the next trip." />

      <ScalePressable accessibilityLabel="Book buses" onPress={() => navigation.navigate("BusScreen")} style={styles.busCard}>
        <LinearGradient colors={[theme.colors.redDeep, theme.colors.red]} style={styles.busCardGradient}>
          <View style={[styles.serviceArrow, styles.serviceArrowOnRed]}><Ionicons name="arrow-up" size={18} color={theme.colors.redDeep} style={styles.diagonalArrow} /></View>
          <View style={styles.primaryServiceCopy}>
            <View style={styles.serviceIconLight}><Ionicons name="bus-outline" size={21} color={theme.colors.redDeep} /></View>
            <Text style={styles.primaryServiceKicker}>FEATURED SERVICE</Text>
            <Text style={styles.primaryServiceTitle}>Buses</Text>
            <Text style={styles.primaryServiceText}>Find city-to-city journeys and choose your seat.</Text>
          </View>
          <Image source={BUS_IMAGE} style={styles.busArtwork} resizeMode="contain" />
        </LinearGradient>
      </ScalePressable>

      <View style={styles.servicePair}>
        <ScalePressable accessibilityLabel="Search flights" onPress={() => navigation.navigate("FlightScreen")} style={[styles.serviceCard, styles.flightCard]}>
          <View style={styles.smallServiceTop}>
            <View style={[styles.smallServiceIcon, styles.flightIcon]}><Ionicons name="airplane-outline" size={20} color="#315EA8" /></View>
            <View style={styles.serviceArrow}><Ionicons name="arrow-up" size={18} color="#315EA8" style={styles.diagonalArrow} /></View>
          </View>
          <Text style={styles.smallServiceTitle}>Flights</Text>
          <Text style={styles.smallServiceText}>Search your next flight</Text>
          <Image source={FLIGHT_IMAGE} style={styles.smallServiceArtwork} resizeMode="contain" />
        </ScalePressable>

        <ScalePressable accessibilityLabel="Find hotels" onPress={() => navigation.navigate("Hotels")} style={[styles.serviceCard, styles.hotelCard]}>
          <View style={styles.smallServiceTop}>
            <View style={[styles.smallServiceIcon, styles.hotelIcon]}><Ionicons name="bed-outline" size={20} color="#A05D16" /></View>
            <View style={styles.serviceArrow}><Ionicons name="arrow-up" size={18} color="#A05D16" style={styles.diagonalArrow} /></View>
          </View>
          <Text style={styles.smallServiceTitle}>Hotels</Text>
          <Text style={styles.smallServiceText}>Find your perfect stay</Text>
          <Image source={HOTEL_IMAGE} style={styles.smallServiceArtwork} resizeMode="contain" />
        </ScalePressable>
      </View>

      <ScalePressable accessibilityLabel="Open My Bookings" onPress={() => navigation.navigate("Bookings")} style={styles.bookingStrip}>
        <LinearGradient colors={["#FFFFFF", PALETTE.blush]} style={styles.bookingCardInner}>
          <View style={[styles.serviceArrow, styles.bookingArrow]}><Ionicons name="arrow-up" size={18} color={theme.colors.redDeep} style={styles.diagonalArrow} /></View>
          <View style={styles.bookingCopy}>
            <View style={styles.bookingIcon}><Ionicons name="ticket-outline" size={21} color={theme.colors.redDeep} /></View>
            <Text style={styles.bookingEyebrow}>MY TRIPS</Text>
            <Text style={styles.bookingTitle}>My Bookings</Text>
            <Text style={styles.bookingText}>Trips, tickets & journey status</Text>
          </View>
          <Image source={BOOKINGS_IMAGE} style={styles.bookingArtwork} resizeMode="contain" />
        </LinearGradient>
      </ScalePressable>
    </View>
  );
}

const DestinationCard = memo(function DestinationCard({ item, width }) {
  return (
    <View style={[styles.destinationCard, { width }]}>
      <ImageBackground source={item.image} resizeMode="cover" style={styles.destinationImage} imageStyle={styles.destinationImageRadius}>
        <LinearGradient colors={["transparent", "rgba(5,12,26,0.86)"]} style={styles.destinationOverlay}>
          <View style={styles.destinationTag}>
            <Ionicons name="location-outline" size={13} color={theme.colors.card} />
            <Text style={styles.destinationTagText}>DISCOVER</Text>
          </View>
          <View>
            <Text style={styles.destinationName}>{item.name}</Text>
            <Text style={styles.destinationDescriptor}>{item.descriptor}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
});

function Destinations({ cardWidth }) {
  const renderItem = useCallback(({ item }) => <DestinationCard item={item} width={cardWidth} />, [cardWidth]);
  return (
    <View style={styles.sectionTopOnly}>
      <View style={styles.horizontalHeadingPadding}>
        <SectionHeading eyebrow="CURATED ESCAPES" title="Trending destinations" subtitle="A little inspiration for wherever you go next." />
      </View>
      <FlatList
        horizontal
        data={HOME_DESTINATIONS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.horizontalList}
        ItemSeparatorComponent={ListGap}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + theme.spacing.sm}
        decelerationRate="fast"
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
}

function OffersBridge({ onPress }) {
  return (
    <View style={styles.section}>
      <ScalePressable accessibilityLabel="View current travel offers" onPress={onPress} style={styles.offersCard}>
        <LinearGradient colors={[PALETTE.navySoft, PALETTE.navy]} style={styles.offersGradient}>
          <View style={styles.offerGlowOne} /><View style={styles.offerGlowTwo} />
          <View style={styles.offerIcon}><Ionicons name="gift-outline" size={25} color={theme.colors.red} /></View>
          <View style={styles.offerCopy}>
            <Text style={styles.offerEyebrow}>OFFERS FOR YOUR NEXT TRIP</Text>
            <Text style={styles.offerTitle}>Unlock travel savings</Text>
            <Text style={styles.offerText}>See current offers for buses, flights and hotels.</Text>
          </View>
          <View style={styles.offerArrow}><Ionicons name="arrow-forward" size={18} color={theme.colors.ink} /></View>
        </LinearGradient>
      </ScalePressable>
    </View>
  );
}

function Benefits() {
  return (
    <View style={styles.section}>
      <View style={styles.benefitsShell}>
        <View style={styles.benefitsIntro}>
          <Text style={styles.benefitsEyebrow}>WHY PICK&BOOK</Text>
          <Text style={styles.benefitsTitle}>Travel, made simpler.</Text>
          <Text style={styles.benefitsSubtitle}>A clear path from search to confirmed journey.</Text>
        </View>
        <View style={styles.benefitList}>
          {HOME_BENEFITS.map((benefit, index) => (
            <View key={benefit.id} style={[styles.benefitRow, index > 0 && styles.benefitDivider]}>
              <View style={styles.benefitIcon}><Ionicons name={benefit.icon} size={19} color={theme.colors.redDeep} /></View>
              <View style={styles.benefitCopy}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const RouteCard = memo(function RouteCard({ item, width, onPress, loading }) {
  return (
    <ScalePressable
      style={[styles.routeCard, { width }]}
      accessibilityLabel={`Search buses from ${item.from} to ${item.to}`}
      onPress={() => onPress(item)}
      disabled={loading}
    >
      <View style={styles.routeCardInner}>
        <LinearGradient colors={["#FFF3F5", "#FCE4E8"]} style={styles.routeTopBand}>
          <View style={styles.routeMode}><Ionicons name="bus-outline" size={14} color={theme.colors.redDeep} /><Text style={styles.routeModeText}>POPULAR BUS ROUTE</Text></View>
          <View style={styles.routeArrow}>{loading ? <ActivityIndicator size="small" color={theme.colors.redDeep} /> : <Ionicons name="arrow-up" size={17} color={theme.colors.redDeep} style={styles.diagonalArrow} />}</View>
        </LinearGradient>
        <View style={styles.routeBody}>
          <View style={styles.routeCityRow}>
            <View style={styles.routeCityCopy}><Text style={styles.routeCity} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>{item.from}</Text><Text style={styles.routeLabel}>FROM</Text></View>
            <Ionicons name="arrow-forward" size={17} color={theme.colors.slateSoft} />
            <View style={[styles.routeCityCopy, styles.routeCityCopyRight]}><Text style={styles.routeCity} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>{item.to}</Text><Text style={styles.routeLabel}>TO</Text></View>
          </View>
          <View style={styles.routeConnector}>
            <View style={styles.routeEndpoint} /><View style={styles.routeDash} /><View style={styles.routeBusDot}><Ionicons name="bus" size={14} color={theme.colors.card} /></View><View style={styles.routeDash} /><View style={styles.routeEndpoint} />
          </View>
          <View style={styles.routeFooter}><Text style={styles.routeFootnote}>{loading ? "Preparing your route…" : "Explore this route"}</Text><View style={styles.routeViewAction}><Text style={styles.routeViewText}>View</Text><Ionicons name="arrow-forward" size={14} color={theme.colors.redDeep} /></View></View>
        </View>
      </View>
    </ScalePressable>
  );
});

function ListGap() { return <View style={styles.horizontalGap} />; }

function PopularRoutes({ cardWidth, onRoutePress, loadingId }) {
  const renderItem = useCallback(({ item }) => <RouteCard item={item} width={cardWidth} onPress={onRoutePress} loading={loadingId === item.id} />, [cardWidth, loadingId, onRoutePress]);
  return (
    <View style={styles.sectionTopOnly}>
      <View style={styles.horizontalHeadingPadding}>
        <SectionHeading eyebrow="CITY TO CITY" title="Popular routes" subtitle="Choose a city pair and start your bus search." />
      </View>
      <FlatList
        horizontal
        data={HOME_POPULAR_ROUTES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.horizontalList}
        ItemSeparatorComponent={ListGap}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + theme.spacing.sm}
        decelerationRate="fast"
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
}

function Assurance() {
  return (
    <View style={styles.section}>
      <ImageBackground source={ASSURANCE_IMAGE} resizeMode="cover" style={styles.assurance} imageStyle={styles.assuranceImage}>
        <LinearGradient colors={["rgba(9,15,32,0.15)", "rgba(9,15,32,0.92)"]} style={styles.assuranceOverlay}>
          <View style={styles.assuranceBadge}><Ionicons name="shield-checkmark" size={14} color={theme.colors.card} /><Text style={styles.assuranceBadgeText}>BUS TRAVEL ASSURED</Text></View>
          <View>
            <Text style={styles.assuranceTitle}>Book bus tickets with confidence.</Text>
            <Text style={styles.assuranceText}>Review the details that matter before you confirm your seat.</Text>
            <View style={styles.assuranceChips}>
              {["Fare details", "Seat selection", "Booking support"].map((label) => (
                <View key={label} style={styles.assuranceChip}><View style={styles.assuranceChipDot} /><Text style={styles.assuranceChipText}>{label}</Text></View>
              ))}
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

function formatBlogDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const BlogCard = memo(function BlogCard({ item, width, onPress, fallbackImage }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getBlogImageUrl(item);
  const summary = item.shortDescription || item.subTitle || item.metaDescription || "";
  const publishedDate = formatBlogDate(item.publishedAtUtc || item.createdAtUtc);

  return (
    <ScalePressable style={[styles.blogCard, { width }]} accessibilityLabel={`Read ${item.title}`} onPress={() => onPress(item)}>
      <View style={styles.blogImageWrap}>
        <Image
          source={!imageFailed && imageUrl ? { uri: imageUrl } : fallbackImage}
          style={styles.blogImage}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
        <View style={styles.blogCategory}><Text style={styles.blogCategoryText}>{item.category || "TRAVEL"}</Text></View>
      </View>
      <View style={styles.blogBody}>
        <Text style={styles.blogTitle} numberOfLines={2}>{item.title}</Text>
        {!!summary && <Text style={styles.blogSummary} numberOfLines={2}>{summary}</Text>}
        <View style={styles.blogFooter}>
          <Text style={styles.blogDate}>{publishedDate}</Text>
          <View style={styles.blogRead}><Text style={styles.blogReadText}>Read</Text><Ionicons name="arrow-up" size={15} color={theme.colors.redDeep} style={styles.diagonalArrow} /></View>
        </View>
      </View>
    </ScalePressable>
  );
});

function TravelBlog({ blogs, loading, cardWidth, onArticlePress, onViewAll }) {
  const renderItem = useCallback(({ item, index }) => <BlogCard item={item} width={cardWidth} onPress={onArticlePress} fallbackImage={BLOG_FALLBACK_IMAGES[index % BLOG_FALLBACK_IMAGES.length]} />, [cardWidth, onArticlePress]);

  return (
    <View style={styles.sectionTopOnly}>
      <View style={[styles.horizontalHeadingPadding, styles.blogHeadingRow]}>
        <View style={styles.blogHeadingCopy}><SectionHeading eyebrow="LATEST STORIES" title="Latest from our Travel Blog" /></View>
        <Pressable accessibilityRole="link" onPress={onViewAll} hitSlop={8} style={styles.blogViewAll}><Text style={styles.blogViewAllText}>View all</Text><Ionicons name="arrow-forward" size={14} color={theme.colors.redDeep} /></Pressable>
      </View>
      {loading ? (
        <View style={styles.blogStatus}><ActivityIndicator color={theme.colors.redDeep} /><Text style={styles.blogStatusText}>Loading the latest stories…</Text></View>
      ) : blogs.length > 0 ? (
        <FlatList
          horizontal
          data={blogs}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id || item.slug)}
          contentContainerStyle={styles.horizontalList}
          ItemSeparatorComponent={ListGap}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + theme.spacing.sm}
          decelerationRate="fast"
          removeClippedSubviews={Platform.OS === "android"}
        />
      ) : (
        <View style={styles.blogStatus}><Ionicons name="newspaper-outline" size={20} color={theme.colors.slate} /><Text style={styles.blogStatusText}>New travel stories are coming soon.</Text></View>
      )}
    </View>
  );
}

function FAQ() {
  const [openId, setOpenId] = useState(HOME_FAQS[0].id);
  return (
    <View style={styles.section}>
      <SectionHeading eyebrow="TRAVEL QUESTIONS" title="Good to know" subtitle="Quick answers before your next booking." />
      <View style={styles.faqList}>
        {HOME_FAQS.map((item) => {
          const open = openId === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpenId((current) => (current === item.id ? null : item.id))}
              style={({ pressed }) => [styles.faqItem, pressed && styles.faqPressed]}
            >
              <View style={styles.faqQuestionRow}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <View style={[styles.faqToggle, open && styles.faqToggleOpen]}><Ionicons name={open ? "remove" : "add"} size={18} color={open ? theme.colors.card : theme.colors.redDeep} /></View>
              </View>
              {open && <Text style={styles.faqAnswer}>{item.answer}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BrandEnding() {
  return (
    <View style={styles.brandEnding}>
      <View style={styles.brandRule} />
      <Image source={LOGO_IMAGE} style={styles.brandLogo} resizeMode="contain" />
      <Text style={styles.brandTitle}>One app. Every journey.</Text>
      <Text style={styles.brandText}>Search and manage buses, flights and hotels from one place, built to make each trip simpler.</Text>
      <LegalEntityFooter style={styles.legalFooter} />
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(12)).current;
  const routeRequestRef = useRef(false);
  const [routeLoadingId, setRouteLoadingId] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const destinationCardWidth = Math.min(Math.max(width * 0.74, 258), 304);
  const routeCardWidth = Math.min(Math.max(width * 0.82, 296), 340);
  const blogCardWidth = Math.min(Math.max(width * 0.82, 292), 340);

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [fade, translate]);

  useEffect(() => {
    let mounted = true;
    getPublicBlogs({ page: 1, pageSize: 3, category: "Bus Booking" })
      .then((items) => {
        if (mounted) setBlogs(items.filter((item) => item?.slug && item?.title).slice(0, 3));
      })
      .catch((error) => console.warn("[Home] Unable to load travel blogs:", error?.message || error))
      .finally(() => mounted && setBlogsLoading(false));
    return () => { mounted = false; };
  }, []);

  const openPublicUrl = useCallback(async (url) => {
    if (!/^https:\/\/www\.picknbook\.in\//i.test(url || "")) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn("[Home] Unable to open public link:", error?.message || error);
      Alert.alert("Unable to open link", "Please try again in a moment.");
    }
  }, []);

  const handlePopularRoute = useCallback(async (item) => {
    if (routeRequestRef.current) return;
    routeRequestRef.current = true;
    setRouteLoadingId(item.id);
    try {
      const [from, to] = await Promise.all([resolveBusCity(item.from), resolveBusCity(item.to)]);
      if (!from || !to) {
        Alert.alert("Route unavailable", "We could not prepare this route right now. Please choose the cities from Bus search.");
        return;
      }
      navigation.navigate("BusListScreen", createBusSearchNavigationParams({ from, to, date: new Date() }));
    } catch (error) {
      console.warn("[Home] Popular route failed:", error?.message || error);
      Alert.alert("Route unavailable", "We could not prepare this route right now. Please try again.");
    } finally {
      routeRequestRef.current = false;
      setRouteLoadingId(null);
    }
  }, [navigation]);

  const handleBlogPress = useCallback((blog) => openPublicUrl(getPublicBlogUrl(blog.slug)), [openPublicUrl]);
  const handleBlogViewAll = useCallback(() => openPublicUrl(getPublicBlogListingUrl()), [openPublicUrl]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.card} translucent />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Image source={LOGO_IMAGE} style={styles.headerLogo} resizeMode="contain" />
          <View style={styles.headerSide}><NotificationBell navigation={navigation} /></View>
        </View>

        <Animated.View style={[styles.body, { opacity: fade, transform: [{ translateY: translate }] }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 28, 48) }]}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          >
            <Hero onPress={() => navigation.navigate("BusScreen")} />
            <ServiceBento navigation={navigation} />
            <Destinations cardWidth={destinationCardWidth} />
            <OffersBridge onPress={() => navigation.navigate("Offers")} />
            <Benefits />
            <PopularRoutes cardWidth={routeCardWidth} onRoutePress={handlePopularRoute} loadingId={routeLoadingId} />
            <Assurance />
            <TravelBlog blogs={blogs} loading={blogsLoading} cardWidth={blogCardWidth} onArticlePress={handleBlogPress} onViewAll={handleBlogViewAll} />
            <FAQ />
            <BrandEnding />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.cloud },
  safeArea: { flex: 1, backgroundColor: theme.colors.card },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { backgroundColor: theme.colors.cloud },
  pressFill: { flex: 1 },
  header: { height: 56, paddingHorizontal: theme.spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.colors.card },
  headerSide: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerLogo: { width: 145, height: 29 },
  heroOuter: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm },
  hero: { height: 258, overflow: "hidden" },
  heroImage: { borderRadius: 28 },
  heroOverlay: { flex: 1, borderRadius: 28, padding: theme.spacing.lg, justifyContent: "space-between" },
  heroBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.88)" },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.red },
  heroBadgeText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 10, letterSpacing: 1.1, color: theme.colors.ink },
  heroBottom: { maxWidth: 292 },
  heroTitle: { fontFamily: theme.typography.fontFamily.display.bold, fontSize: 31, lineHeight: 34, letterSpacing: -0.8, color: theme.colors.card },
  heroSubtitle: { marginTop: 7, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 13, lineHeight: 19, color: PALETTE.whiteMuted },
  heroAction: { marginTop: theme.spacing.md, alignSelf: "flex-start", minHeight: 42, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 15, borderRadius: 14, backgroundColor: theme.colors.card },
  heroActionPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  heroActionText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 13, color: theme.colors.ink },
  section: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xxl },
  sectionTopOnly: { paddingTop: theme.spacing.xxl },
  horizontalHeadingPadding: { paddingHorizontal: theme.spacing.md },
  sectionHeading: { marginBottom: theme.spacing.md },
  sectionEyebrow: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 10, letterSpacing: 1.3, color: theme.colors.redDeep, marginBottom: 6 },
  sectionTitle: { fontFamily: theme.typography.fontFamily.display.bold, fontSize: 24, lineHeight: 29, letterSpacing: -0.45, color: theme.colors.ink },
  sectionSubtitle: { marginTop: 5, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 13, lineHeight: 19, color: theme.colors.slate },
  busCard: { height: 170, borderRadius: 26, overflow: "hidden", ...SHADOW },
  busCardGradient: { flex: 1, flexDirection: "row", overflow: "hidden" },
  primaryServiceCopy: { width: "63%", padding: theme.spacing.lg, zIndex: 2 },
  serviceIconLight: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.card },
  primaryServiceKicker: { marginTop: theme.spacing.sm, fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 9, letterSpacing: 1.1, color: "rgba(255,255,255,0.72)" },
  primaryServiceTitle: { marginTop: 2, fontFamily: theme.typography.fontFamily.display.bold, fontSize: 27, color: theme.colors.card },
  primaryServiceText: { marginTop: 3, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.78)" },
  serviceArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.72)", borderWidth: 1, borderColor: "rgba(17,22,43,0.06)", alignItems: "center", justifyContent: "center" },
  serviceArrowOnRed: { position: "absolute", right: theme.spacing.md, top: theme.spacing.md, backgroundColor: theme.colors.card, borderColor: "rgba(255,255,255,0.3)", zIndex: 3 },
  busArtwork: { position: "absolute", width: 174, height: 174, right: -28, bottom: -28, opacity: 0.96 },
  servicePair: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  serviceCard: { flex: 1, height: 154, borderRadius: 22, padding: theme.spacing.md, overflow: "hidden", borderWidth: 1, ...SHADOW },
  flightCard: { backgroundColor: PALETTE.blueSoft, borderColor: "#D9E7FB" },
  hotelCard: { backgroundColor: PALETTE.amberSoft, borderColor: "#F4E1C7" },
  smallServiceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  smallServiceIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  flightIcon: { backgroundColor: "#DDEBFF" },
  hotelIcon: { backgroundColor: "#FBE4C7" },
  diagonalArrow: { transform: [{ rotate: "45deg" }] },
  smallServiceTitle: { marginTop: theme.spacing.sm, fontFamily: theme.typography.fontFamily.display.semiBold, fontSize: 19, color: theme.colors.ink },
  smallServiceText: { width: "55%", marginTop: 2, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 11, lineHeight: 15, color: theme.colors.slate },
  smallServiceArtwork: { position: "absolute", width: 58, height: 58, right: 3, bottom: 3, opacity: 0.78 },
  bookingStrip: { height: 148, marginTop: theme.spacing.sm, borderRadius: 24, overflow: "hidden", backgroundColor: theme.colors.card, borderWidth: 1, borderColor: "#F2DDE1", ...SHADOW },
  bookingCardInner: { flex: 1, overflow: "hidden" },
  bookingCopy: { width: "62%", padding: theme.spacing.lg, zIndex: 2 },
  bookingIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.card, borderWidth: 1, borderColor: "#F3DDE1" },
  bookingEyebrow: { marginTop: theme.spacing.sm, fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 9, letterSpacing: 1.1, color: theme.colors.redDeep },
  bookingTitle: { marginTop: 2, fontFamily: theme.typography.fontFamily.display.bold, fontSize: 24, color: theme.colors.ink },
  bookingText: { width: "100%", marginTop: 3, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 11, lineHeight: 16, color: theme.colors.slate },
  bookingArtwork: { position: "absolute", width: 138, height: 138, right: -4, bottom: -17, opacity: 0.96 },
  bookingArrow: { position: "absolute", right: theme.spacing.md, top: theme.spacing.md, zIndex: 3 },
  horizontalList: { paddingHorizontal: theme.spacing.md },
  horizontalGap: { width: theme.spacing.sm },
  destinationCard: { height: 220, borderRadius: 24, overflow: "hidden", backgroundColor: theme.colors.line, ...SHADOW },
  destinationImage: { flex: 1 },
  destinationImageRadius: { borderRadius: 24 },
  destinationOverlay: { flex: 1, padding: theme.spacing.md, justifyContent: "space-between", borderRadius: 24 },
  destinationTag: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(10,16,32,0.4)" },
  destinationTagText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 9, letterSpacing: 1, color: theme.colors.card },
  destinationName: { fontFamily: theme.typography.fontFamily.display.bold, fontSize: 27, color: theme.colors.card },
  destinationDescriptor: { marginTop: 2, fontFamily: theme.typography.fontFamily.body.medium, fontSize: 12, color: "rgba(255,255,255,0.76)" },
  offersCard: { height: 138, borderRadius: 24, overflow: "hidden", ...SHADOW },
  offersGradient: { flex: 1, flexDirection: "row", alignItems: "center", padding: theme.spacing.lg, overflow: "hidden" },
  offerGlowOne: { position: "absolute", width: 116, height: 116, borderRadius: 58, backgroundColor: "rgba(229,56,63,0.22)", top: -48, right: 24 },
  offerGlowTwo: { position: "absolute", width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.06)", bottom: -22, right: -10 },
  offerIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center" },
  offerCopy: { flex: 1, marginHorizontal: theme.spacing.md, zIndex: 2 },
  offerEyebrow: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 9, letterSpacing: 1, color: PALETTE.redSoft },
  offerTitle: { marginTop: 4, fontFamily: theme.typography.fontFamily.display.semiBold, fontSize: 20, color: theme.colors.card },
  offerText: { marginTop: 3, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 11, lineHeight: 16, color: "rgba(255,255,255,0.63)" },
  offerArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center", zIndex: 2 },
  benefitsShell: { borderRadius: 28, overflow: "hidden", backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line, ...SHADOW },
  benefitsIntro: { padding: theme.spacing.xl, backgroundColor: PALETTE.blush },
  benefitsEyebrow: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 10, letterSpacing: 1.2, color: theme.colors.redDeep },
  benefitsTitle: { marginTop: 6, fontFamily: theme.typography.fontFamily.display.bold, fontSize: 26, color: theme.colors.ink },
  benefitsSubtitle: { marginTop: 5, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 13, lineHeight: 19, color: theme.colors.slate },
  benefitList: { paddingHorizontal: theme.spacing.lg, paddingVertical: 5 },
  benefitRow: { minHeight: 78, flexDirection: "row", alignItems: "center" },
  benefitDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.line },
  benefitIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: PALETTE.blush, alignItems: "center", justifyContent: "center" },
  benefitCopy: { flex: 1, marginLeft: theme.spacing.sm },
  benefitTitle: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 14, color: theme.colors.ink },
  benefitText: { marginTop: 2, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 11, lineHeight: 16, color: theme.colors.slate },
  routeCard: { height: 204, borderRadius: 24, overflow: "hidden", backgroundColor: theme.colors.card, borderWidth: 1, borderColor: "#EEDDE1", ...SHADOW },
  routeCardInner: { flex: 1, backgroundColor: theme.colors.card },
  routeTopBand: { height: 50, paddingHorizontal: theme.spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 3, borderTopColor: theme.colors.redDeep },
  routeMode: { flexDirection: "row", alignItems: "center", gap: 7 },
  routeModeText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 9, letterSpacing: 0.8, color: theme.colors.redDeep },
  routeArrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line },
  routeBody: { flex: 1, paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md },
  routeCityRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  routeCityCopy: { flex: 1 },
  routeCityCopyRight: { alignItems: "flex-end" },
  routeLabel: { marginTop: 2, fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 8, letterSpacing: 1, color: theme.colors.slateSoft },
  routeCity: { width: "100%", fontFamily: theme.typography.fontFamily.display.bold, fontSize: 18, lineHeight: 22, color: theme.colors.ink },
  routeConnector: { flexDirection: "row", alignItems: "center", marginTop: 9 },
  routeDash: { flex: 1, height: 1, marginHorizontal: 4, borderTopWidth: 1, borderStyle: "dashed", borderColor: PALETTE.redSoft },
  routeEndpoint: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.redDeep, borderWidth: 2, borderColor: PALETTE.redSoft },
  routeBusDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.red, alignItems: "center", justifyContent: "center" },
  routeFooter: { marginTop: 9, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  routeFootnote: { fontFamily: theme.typography.fontFamily.body.medium, fontSize: 11, color: theme.colors.slate },
  routeViewAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  routeViewText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 11, color: theme.colors.redDeep },
  assurance: { height: 296, overflow: "hidden" },
  assuranceImage: { borderRadius: 28 },
  assuranceOverlay: { flex: 1, borderRadius: 28, padding: theme.spacing.lg, justifyContent: "space-between" },
  assuranceBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(229,56,63,0.88)" },
  assuranceBadgeText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 9, letterSpacing: 1, color: theme.colors.card },
  assuranceTitle: { maxWidth: 290, fontFamily: theme.typography.fontFamily.display.bold, fontSize: 28, lineHeight: 33, color: theme.colors.card },
  assuranceText: { maxWidth: 300, marginTop: 7, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 12, lineHeight: 18, color: PALETTE.whiteMuted },
  assuranceChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: theme.spacing.md },
  assuranceChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  assuranceChipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: PALETTE.redSoft },
  assuranceChipText: { fontFamily: theme.typography.fontFamily.body.medium, fontSize: 9, color: theme.colors.card },
  blogHeadingRow: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm },
  blogHeadingCopy: { flex: 1 },
  blogViewAll: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, marginTop: 14 },
  blogViewAllText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 11, color: theme.colors.redDeep },
  blogCard: { height: 320, borderRadius: 24, overflow: "hidden", backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line, ...SHADOW },
  blogImageWrap: { height: 160, backgroundColor: theme.colors.line },
  blogImage: { width: "100%", height: "100%" },
  blogCategory: { position: "absolute", left: theme.spacing.md, bottom: theme.spacing.sm, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.92)" },
  blogCategoryText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 8, letterSpacing: 0.9, color: theme.colors.redDeep },
  blogBody: { flex: 1, padding: theme.spacing.md },
  blogTitle: { fontFamily: theme.typography.fontFamily.display.semiBold, fontSize: 19, lineHeight: 24, color: theme.colors.ink },
  blogSummary: { marginTop: 6, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 11, lineHeight: 17, color: theme.colors.slate },
  blogFooter: { marginTop: "auto", paddingTop: theme.spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  blogDate: { fontFamily: theme.typography.fontFamily.body.medium, fontSize: 10, color: theme.colors.slate },
  blogRead: { flexDirection: "row", alignItems: "center", gap: 4 },
  blogReadText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 11, color: theme.colors.redDeep },
  blogStatus: { minHeight: 82, marginHorizontal: theme.spacing.md, paddingHorizontal: theme.spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 20, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line },
  blogStatusText: { fontFamily: theme.typography.fontFamily.body.regular, fontSize: 12, color: theme.colors.slate },
  faqList: { gap: 9 },
  faqItem: { padding: theme.spacing.md, borderRadius: 18, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line },
  faqPressed: { backgroundColor: "#FFFAFA" },
  faqQuestionRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  faqQuestion: { flex: 1, fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 14, lineHeight: 20, color: theme.colors.ink },
  faqToggle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: PALETTE.blush },
  faqToggleOpen: { backgroundColor: theme.colors.redDeep },
  faqAnswer: { marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.line, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 12, lineHeight: 19, color: theme.colors.slate },
  brandEnding: { marginTop: theme.spacing.xxl, paddingHorizontal: theme.spacing.xl, alignItems: "center" },
  brandRule: { width: 42, height: 3, borderRadius: 2, backgroundColor: PALETTE.redSoft, marginBottom: theme.spacing.lg },
  brandLogo: { width: 132, height: 27 },
  brandTitle: { marginTop: theme.spacing.sm, fontFamily: theme.typography.fontFamily.display.semiBold, fontSize: 21, color: theme.colors.ink },
  brandText: { maxWidth: 320, marginTop: 7, textAlign: "center", fontFamily: theme.typography.fontFamily.body.regular, fontSize: 12, lineHeight: 19, color: theme.colors.slate },
  legalFooter: { marginTop: theme.spacing.lg },
});
