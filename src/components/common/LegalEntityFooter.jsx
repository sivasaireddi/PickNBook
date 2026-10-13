import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme/tokens";

export const LEGAL_ENTITY_NAME = "PIRNAV SOFTWARE SOLUTIONS PRIVATE LIMITED";

export default function LegalEntityFooter({ variant = "light", style }) {
  const overlay = variant === "overlay";

  return (
    <View
      pointerEvents="none"
      style={[styles.container, style]}
      accessibilityLabel={`Operated by ${LEGAL_ENTITY_NAME}`}
    >
      <Text style={[styles.label, overlay && styles.overlayLabel]}>Operated by</Text>
      <Text style={[styles.entity, overlay && styles.overlayEntity]}>
        {LEGAL_ENTITY_NAME}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
  },
  label: {
    color: theme.colors.slate,
    fontFamily: theme.typography.fontFamily.body.medium,
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  entity: {
    color: theme.colors.inkSoft,
    fontFamily: theme.typography.fontFamily.body.semiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.15,
    textAlign: "center",
  },
  overlayLabel: {
    color: "rgba(28, 35, 64, 0.72)",
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlayEntity: {
    color: theme.colors.ink,
    textShadowColor: "rgba(255,255,255,0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
