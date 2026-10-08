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
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { authTheme } from "./authStyles";

const pickAndBookLogo = require("../../../assets/Splash-Icon.png");

export default function AuthScreenLayout({
  children,
  eyebrow = "PICK&BOOK",
  title,
  subtitle,
  onBack,
  compact = false,
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.decor} pointerEvents="none">
        <View style={styles.wash} />
        <View style={styles.routeArc} />
      </View>

      <View style={styles.screen}>
        <View style={styles.authHeader}>
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
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <Image source={pickAndBookLogo} style={styles.logo} resizeMode="contain" />
        </View>

        {Platform.OS === "ios" ? (
          <KeyboardAvoidingView style={styles.keyboardArea} behavior="padding">
            <View style={[styles.content, compact && styles.contentCompact]}>
              <View style={[styles.titleBlock, compact && styles.titleBlockCompact]}>
                <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>{eyebrow}</Text>
                <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
                {!!subtitle && (
                  <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={compact ? 1 : 2}>
                    {subtitle}
                  </Text>
                )}
              </View>
              <View style={[styles.surface, compact && styles.surfaceCompact]}>{children}</View>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.keyboardArea}>
          <View style={[styles.content, compact && styles.contentCompact]}>
            <View style={[styles.titleBlock, compact && styles.titleBlockCompact]}>
              <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>{eyebrow}</Text>
              <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
              {!!subtitle && (
                <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={compact ? 1 : 2}>
                  {subtitle}
                </Text>
              )}
            </View>
            <View style={[styles.surface, compact && styles.surfaceCompact]}>{children}</View>
          </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: authTheme.colors.background },
  screen: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 16 },
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
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
  backPlaceholder: { width: 42, height: 42 },
  logo: { width: 130, height: 94 },
  keyboardArea: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingBottom: 8 },
  contentCompact: { justifyContent: "flex-start", paddingTop: 2, paddingBottom: 4 },
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
  surface: {
    backgroundColor: "rgba(255,255,255,0.94)",
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
});
