import { scale, moderateScale } from "react-native-size-matters";

export const BUS_SEAT_COLORS = {
  // Brand & General Surfaces
  background: "#F8FAFC",
  cardSurface: "#FFFFFF",
  coachFloorBg: "#F1F5F9",
  cabinBg: "#E2E8F0",
  divider: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  borderLight: "#E2E8F0",
  
  // Available Seat
  availableBg: "#FFFFFF",
  availableBorder: "#1F2937",
  availableStrip: "#D1D5DB",
  availablePriceBg: "#FFFFFF",
  availablePriceText: "#1F2937",
  availableText: "#1F2937",

  // Female Seat (Available)
  femaleBg: "#FCE7F3",
  femaleBorder: "#EC4899",
  femaleStrip: "#EC4899",
  femalePriceBg: "#FCE7F3",
  femalePriceText: "#9D174D",
  femaleText: "#9D174D",

  // Male Seat (Available)
  maleBg: "#EFF6FF",
  maleBorder: "#3B82F6",
  maleStrip: "#3B82F6",
  malePriceBg: "#EFF6FF",
  malePriceText: "#1D4ED8",
  maleText: "#1D4ED8",

  // Booked Seat
  bookedBg: "#B0B5BD",
  bookedBorder: "#6B7280",
  bookedStrip: "#6B7280",
  bookedText: "#4B5563",

  // Female Booked Seat
  femaleBookedBg: "#B0B5BD",
  femaleBookedBorder: "#6B7280",
  femaleBookedStrip: "#DB2777",
  femaleBookedText: "#4B5563",
  femaleBookedLegendBorder: "#6B7280",

  // Selected Seat
  selectedBg: "#FFFFFF",
  selectedBorder: "#16A34A",
  selectedStrip: "#22C55E",
  selectedGlow: "#16A34A",
  selectedPriceBg: "#FFFFFF",
  selectedPriceText: "#15803D",
  selectedText: "#15803D",

  // Brand Buttons & Accents
  primaryRed: "#E53935",
  primaryRedPressed: "#C62828",
  primaryRedDisabled: "#EF9A9A",

  // Women Zone Badge Gradient
  womenZoneGradientStart: "#FFF1F2",
  womenZoneGradientEnd: "#FCE7F3",
  womenZoneBorder: "#FBCFE8",
  womenZoneText: "#BE185D",

  // Rating Chip
  ratingBg: "#FEF3C7",
  ratingText: "#D97706",

  // Drag Handle
  dragHandle: "#CBD5E1",
};

export const BUS_SEAT_TYPOGRAPHY = {
  travelName: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: BUS_SEAT_COLORS.textPrimary,
  },
  seatPrice: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  legend: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: BUS_SEAT_COLORS.textSecondary,
  },
};

export const BUS_SEAT_SHADOWS = {
  soft: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedGlow: {
    shadowColor: BUS_SEAT_COLORS.selectedGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomSheet: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
};
