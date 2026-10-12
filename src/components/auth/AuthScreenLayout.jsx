import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { ResizeMode, Video } from "expo-av";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { authTheme } from "./authStyles";

const pickAndBookLogo = require("../../../assets/Splash-Icon.png");
const authBackgroundVideo = require("../../../assets/picknbook_bus_hero_mobile_9x16.mp4");

const AuthVideoBackground = React.memo(function AuthVideoBackground() {
  const isFocused = useIsFocused();

  return (
    <View style={styles.videoLayer} pointerEvents="none">
      <Video
        source={authBackgroundVideo}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        shouldPlay={isFocused}
        isLooping
        isMuted
        useNativeControls={false}
      />
      <View style={styles.videoTint} />
    </View>
  );
});

export default function AuthScreenLayout({
  children,
  eyebrow = "PICK&BOOK",
  title,
  subtitle,
  onBack,
  compact = false,
  login = false,
  keyboardSafe = false,
  keyboardVerticalOffset = 0,
  topAligned = false,
}) {
  const AndroidKeyboardContainer = keyboardSafe ? KeyboardAvoidingView : View;
  const androidKeyboardProps = keyboardSafe
    ? {
        behavior: "position",
        keyboardVerticalOffset,
        contentContainerStyle: styles.keyboardPositionContent,
      }
    : {};

  return (
    <View style={styles.root}>
      <AuthVideoBackground />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.decor} pointerEvents="none">
          <View style={styles.wash} />
          <View style={styles.routeArc} />
        </View>

        <View style={[styles.screen, login && styles.screenLogin]}>
        <View style={styles.authHeader}>
          <View style={styles.headerSide}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backButton}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={20} color={authTheme.colors.ink} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Image source={pickAndBookLogo} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerSide} />
        </View>

        {Platform.OS === "ios" ? (
          <KeyboardAvoidingView style={styles.keyboardArea} behavior="padding">
            <View style={[styles.content, compact && styles.contentCompact, login && styles.contentLogin, topAligned && styles.contentTopAligned]}>
              {login ? (
                <View style={styles.loginIntro}>
                  <Text style={styles.loginSubtitle}>{subtitle}</Text>
                </View>
              ) : <View style={[styles.titleBlock, compact && styles.titleBlockCompact]}>
                <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>{eyebrow}</Text>
                <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
                {!!subtitle && (
                  <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={compact ? 1 : 2}>
                    {subtitle}
                  </Text>
                )}
              </View>}
              <View style={[styles.surface, compact && styles.surfaceCompact, login && styles.loginSurface]}>{children}</View>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <AndroidKeyboardContainer style={styles.keyboardArea} {...androidKeyboardProps}>
          <View style={[styles.content, compact && styles.contentCompact, login && styles.contentLogin, topAligned && styles.contentTopAligned]}>
            {login ? (
              <View style={styles.loginIntro}>
                <Text style={styles.loginSubtitle}>{subtitle}</Text>
              </View>
            ) : <View style={[styles.titleBlock, compact && styles.titleBlockCompact]}>
              <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>{eyebrow}</Text>
              <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
              {!!subtitle && (
                <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={compact ? 1 : 2}>
                  {subtitle}
                </Text>
              )}
            </View>}
            <View style={[styles.surface, compact && styles.surfaceCompact, login && styles.loginSurface]}>{children}</View>
          </View>
          </AndroidKeyboardContainer>
        )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: authTheme.colors.background },
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: authTheme.colors.background,
  },
  videoTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 248, 248, 0.56)",
  },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  screen: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 16 },
  screenLogin: { paddingHorizontal: 28 },
  decor: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  wash: {
    position: "absolute",
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: "rgba(229, 56, 63, 0.06)",
    top: -175,
    right: -105,
  },
  routeArc: {
    position: "absolute",
    width: 390,
    height: 210,
    borderWidth: 1,
    borderColor: "rgba(180, 24, 42, 0.08)",
    borderRadius: 200,
    top: 76,
    left: -220,
    transform: [{ rotate: "-13deg" }],
  },
  authHeader: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSide: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(180,24,42,0.12)",
  },
  logo: { width: 176, height: 96 },
  keyboardArea: { flex: 1, overflow: "hidden" },
  keyboardPositionContent: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingBottom: 8 },
  contentLogin: { justifyContent: "flex-start", paddingTop: 18, paddingBottom: 10 },
  contentCompact: { justifyContent: "flex-start", paddingTop: 2, paddingBottom: 4 },
  contentTopAligned: { justifyContent: "flex-start", paddingTop: 18, paddingBottom: 10 },
  titleBlock: { marginBottom: 12, paddingHorizontal: 2 },
  titleBlockCompact: { marginBottom: 6 },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: authTheme.colors.redDeep,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  eyebrowCompact: { fontSize: 9, marginBottom: 2 },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.8,
    color: authTheme.colors.ink,
  },
  titleCompact: { fontSize: 24, lineHeight: 28 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    color: authTheme.colors.slate,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  subtitleCompact: { fontSize: 11.5, lineHeight: 15, marginTop: 2 },
  loginIntro: { alignItems: "center", paddingHorizontal: 20, marginBottom: 18 },
  loginSubtitle: {
    fontFamily: "Inter_500Medium",
    color: authTheme.colors.inkSoft,
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
  },
  surface: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(180,24,42,0.08)",
    padding: 16,
    shadowColor: "#41131A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  surfaceCompact: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  loginSurface: {
    padding: 24,
    borderRadius: 26,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
