import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions, Image } from "react-native";
import { getStoredAuthToken, clearAuthSession, isJwtExpired } from "../../utils/authSession";
import { LinearGradient } from 'expo-linear-gradient';
import { Bus, Building2, Plane } from 'lucide-react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

const SPLASH_DURATION_MS = 3400;

const SERVICES = [
  { id: 'bus', title: 'Bus Booking', desc: 'Find. Book. Travel.', label: 'Bus', Icon: Bus },
  { id: 'hotel', title: 'Hotel Booking', desc: 'Find Your Perfect Stay.', label: 'Hotels', Icon: Building2 },
  { id: 'flight', title: 'Flight Booking', desc: 'Fly To Your Next Adventure.', label: 'Flights', Icon: Plane },
];

const FadedHeroImage = ({ source, style }) => (
  <MaskedView
    style={{ width: '100%', height: '100%' }}
    maskElement={
      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Svg height="100%" width="100%">
          <Defs>
            <RadialGradient
              id="fadeGrad"
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
              fx="50%"
              fy="50%"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0.35" stopColor="#000" stopOpacity="1" />
              <Stop offset="0.75" stopColor="#000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#fadeGrad)" />
        </Svg>
      </View>
    }
  >
    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Image source={source} style={style} />
    </View>
  </MaskedView>
);

const SplashScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();

  const [activeService, setActiveService] = useState(-1);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;

  // Hero animations
  const heroOpacities = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const heroScales = [
    useRef(new Animated.Value(0.95)).current,
    useRef(new Animated.Value(0.95)).current,
    useRef(new Animated.Value(0.95)).current,
  ];
  const heroTranslateYs = [
    useRef(new Animated.Value(20)).current,
    useRef(new Animated.Value(20)).current,
    useRef(new Animated.Value(20)).current,
  ];

  // Phase 1: Initial Reveal
  useEffect(() => {
    Animated.sequence([
      Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start();
  }, [bgOpacity, logoOpacity, logoScale, taglineOpacity]);

  // Phase 2: Rotating Service Cards & Hero Images
  useEffect(() => {
    if (activeService >= 0) {
      cardOpacity.setValue(0);
      cardTranslateY.setValue(15);

      const animations = [
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cardTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true })
      ];

      heroOpacities.forEach((opacity, index) => {
        if (index === activeService) {
          heroScales[index].setValue(0.95);
          heroTranslateYs[index].setValue(20);

          animations.push(
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(heroScales[index], { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(heroTranslateYs[index], { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true })
          );
        } else {
          animations.push(
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true })
          );
        }
      });

      Animated.parallel(animations).start();
    }
  }, [activeService, cardOpacity, cardTranslateY]);

  // Timing Logic & Navigation
  useEffect(() => {
    let isMounted = true;

    const timers = [
      setTimeout(() => isMounted && setActiveService(0), 600),   // Bus
      setTimeout(() => isMounted && setActiveService(1), 1400),  // Hotel
      setTimeout(() => isMounted && setActiveService(2), 2200),  // Flight
    ];

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

    const navigationTimer = setTimeout(checkSessionAndNavigate, SPLASH_DURATION_MS);

    return () => {
      isMounted = false;
      timers.forEach(clearTimeout);
      clearTimeout(navigationTimer);
    };
  }, [navigation]);

  const currentService = activeService >= 0 ? SERVICES[activeService] : null;

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      <LinearGradient
        colors={['#FFFFFF', '#FFF8F6', '#FCE4EC']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.topSection}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }], alignItems: 'center' }}>
          <Text style={styles.logoText}>
            <Text style={{ color: '#D71920' }}>Pick</Text>
            <Text style={{ color: '#FF8A00' }}>N</Text>
            <Text style={{ color: '#121826' }}>Book</Text>
          </Text>
        </Animated.View>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          One App. Every Journey.
        </Animated.Text>

        <View style={styles.cardContainer}>
          {currentService && (
            <Animated.View style={[styles.serviceCard, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>
              <View style={styles.cardIconContainer}>
                <currentService.Icon size={38} color="#D71920" strokeWidth={2} />
              </View>
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>{currentService.title}</Text>
                <Text style={styles.cardDesc}>{currentService.desc}</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={styles.heroSection}>
        <Animated.View style={[styles.heroImageContainer, { opacity: heroOpacities[0], transform: [{ scale: heroScales[0] }, { translateY: heroTranslateYs[0] }] }]}>
          <FadedHeroImage source={require('../../../assets/splash/bus-hero.jpg')} style={styles.heroImage} />
        </Animated.View>
        <Animated.View style={[styles.heroImageContainer, { opacity: heroOpacities[1], transform: [{ scale: heroScales[1] }, { translateY: heroTranslateYs[1] }] }]}>
          <FadedHeroImage source={require('../../../assets/splash/hotel-hero.jpg')} style={styles.heroImage} />
        </Animated.View>
        <Animated.View style={[styles.heroImageContainer, { opacity: heroOpacities[2], transform: [{ scale: heroScales[2] }, { translateY: heroTranslateYs[2] }] }]}>
          <FadedHeroImage source={require('../../../assets/splash/flight-hero.jpg')} style={styles.heroImage} />
        </Animated.View>
      </View>

      <View style={styles.bottomIndicators}>
        {SERVICES.map((s, index) => {
          const isActive = index === activeService;
          const { Icon } = s;
          return (
            <View key={s.id} style={styles.indicatorWrap}>
              <Icon size={isActive ? 32 : 26} color={isActive ? '#D71920' : '#A0AEC0'} strokeWidth={isActive ? 2.5 : 2} />
              <Text style={[styles.indicatorText, { color: isActive ? '#D71920' : '#A0AEC0', fontSize: isActive ? 15 : 14 }]}>{s.label}</Text>
              {isActive && <View style={styles.activeDot} />}
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topSection: {
    flex: 0.45,
    paddingTop: 90,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoText: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardContainer: {
    marginTop: 45,
    height: 90,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 20,
    width: '90%',
    shadowColor: '#D71920',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.08)',
  },
  cardIconContainer: {
    marginRight: 15,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#121826',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  heroSection: {
    flex: 0.4,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '95%',
    height: '95%',
    resizeMode: 'contain',
  },
  bottomIndicators: {
    flex: 0.15,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  indicatorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  indicatorText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  activeDot: {
    position: 'absolute',
    bottom: -14,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D71920',
  }
});
