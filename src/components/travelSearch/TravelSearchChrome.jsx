import React from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/tokens";

const HERO_MIN_HEIGHT = 232;
const HERO_MAX_HEIGHT = 272;

export function TravelSearchHero({ image, title, subtitle, onBack }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const heroHeight = Math.min(Math.max(height * 0.29, HERO_MIN_HEIGHT), HERO_MAX_HEIGHT);

  return (
    <View style={styles.heroClip}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={image} resizeMode="cover" style={[styles.hero, { height: heroHeight }]}>
        <LinearGradient colors={["rgba(9,14,30,0.16)", "rgba(9,14,30,0.78)"]} style={styles.heroGradient}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={6}
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              { marginTop: Math.max(insets.top + 8, 20) },
              pressed && styles.backButtonPressed,
            ]}
          >
            <Ionicons name="chevron-back" size={23} color={theme.colors.ink} />
          </Pressable>

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

export function SearchPanelHeading({ eyebrow = "PLAN YOUR TRIP", title, subtitle }) {
  return (
    <View style={styles.panelHeading}>
      <Text style={styles.panelEyebrow}>{eyebrow}</Text>
      <Text style={styles.panelTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.panelSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export function TravelPrimaryButton({ label, onPress, loading = false, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.ctaWrap, (disabled || loading) && styles.ctaDisabled, pressed && styles.ctaPressed]}
    >
      <LinearGradient colors={[theme.colors.red, theme.colors.redDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
        {loading ? (
          <ActivityIndicator color={theme.colors.card} />
        ) : (
          <>
            <Text style={styles.ctaText}>{label}</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.card} />
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function AssuranceStrip({ items }) {
  return (
    <View style={styles.assurance}>
      <View style={styles.assuranceTitleRow}>
        <View style={styles.assuranceIcon}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.redDeep} />
        </View>
        <View style={styles.assuranceHeadingCopy}>
          <Text style={styles.assuranceEyebrow}>BOOK WITH CONFIDENCE</Text>
          <Text style={styles.assuranceTitle}>Your trip, clearly planned</Text>
        </View>
      </View>
      <View style={styles.assuranceItems}>
        {items.map((item) => (
          <View key={item} style={styles.assuranceItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.good} />
            <Text style={styles.assuranceText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroClip: { overflow: "hidden", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hero: { width: "100%" },
  heroGradient: { flex: 1, paddingHorizontal: theme.spacing.md, paddingBottom: 48 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.65)", alignItems: "center", justifyContent: "center", shadowColor: theme.colors.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 9, elevation: 5 },
  backButtonPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  heroCopy: { marginTop: "auto", maxWidth: 330 },
  heroTitle: { fontFamily: theme.typography.fontFamily.display.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: theme.colors.card },
  heroSubtitle: { marginTop: 5, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.82)" },
  panelHeading: { marginBottom: theme.spacing.lg },
  panelEyebrow: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 10, letterSpacing: 1.1, color: theme.colors.redDeep },
  panelTitle: { marginTop: 4, fontFamily: theme.typography.fontFamily.display.bold, fontSize: 24, lineHeight: 29, letterSpacing: -0.4, color: theme.colors.ink },
  panelSubtitle: { marginTop: 4, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 12, lineHeight: 18, color: theme.colors.slate },
  ctaWrap: { marginTop: theme.spacing.md, borderRadius: 18, shadowColor: theme.colors.redDeep, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  cta: { height: 56, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  ctaText: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 16, color: theme.colors.card },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  ctaDisabled: { opacity: 0.62 },
  assurance: { marginHorizontal: theme.spacing.md, marginTop: theme.spacing.lg, padding: theme.spacing.lg, borderRadius: 22, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line },
  assuranceTitleRow: { flexDirection: "row", alignItems: "center" },
  assuranceIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFF0F2", alignItems: "center", justifyContent: "center" },
  assuranceHeadingCopy: { flex: 1, marginLeft: theme.spacing.sm },
  assuranceEyebrow: { fontFamily: theme.typography.fontFamily.body.semiBold, fontSize: 9, letterSpacing: 1, color: theme.colors.redDeep },
  assuranceTitle: { marginTop: 2, fontFamily: theme.typography.fontFamily.display.semiBold, fontSize: 17, color: theme.colors.ink },
  assuranceItems: { marginTop: theme.spacing.md, gap: 9 },
  assuranceItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  assuranceText: { flex: 1, fontFamily: theme.typography.fontFamily.body.regular, fontSize: 12, color: theme.colors.slate },
});
