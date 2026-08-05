export const COLORS = {
  // Brand & Gradients
  primaryRed: "#E53935",
  primaryGradientStart: "#FF5A5F",
  primaryGradientEnd: "#E53935",
  accentGlow: "rgba(229, 57, 53, 0.15)",

  // Backgrounds
  background: "#F8FAFC",
  cardBg: "rgba(255, 255, 255, 0.95)",
  cardBgGlass: "rgba(255, 255, 255, 0.88)",
  white: "#FFFFFF",
  inputBg: "#F8FAFC",
  inputBgFocused: "#FFFFFF",
  badgeBg: "rgba(229, 57, 53, 0.08)",

  // Text
  textDark: "#0F172A",
  textMedium: "#334155",
  textMuted: "#64748B",
  textSubtle: "#94A3B8",
  textWhite: "#FFFFFF",

  // Borders & Dividers
  borderLight: "rgba(226, 232, 240, 0.8)",
  borderMedium: "#E2E8F0",
  borderFocused: "#FF5A5F",

  // Status & Alerts
  errorRed: "#EF4444",
  errorBg: "#FEF2F2",
  successGreen: "#10B981",
};

export const SHADOWS = {
  glassCard: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  glowButton: {
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  focusedInput: {
    shadowColor: "#FF5A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const RADII = {
  card: 26,
  cardSmall: 18,
  input: 16,
  pill: 999,
  badge: 12,
};
