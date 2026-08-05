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
  availableBorder: "#D9D9D9",
  availableStrip: "#9CA3AF",
  availablePriceBg: "#F8FAFC",
  availablePriceText: "#475569",

  // Female Seat (Available)
  femaleBg: "#FFFFFF",
  femaleBorder: "#EC4899",
  femaleStrip: "#EC4899",
  femalePriceBg: "#FDF2F8",
  femalePriceText: "#DB2777",

  // Male Seat (Available)
  maleBg: "#FFFFFF",
  maleBorder: "#3B82F6",
  maleStrip: "#3B82F6",
  malePriceBg: "#EFF6FF",
  malePriceText: "#2563EB",

  // Booked Seat
  bookedBg: "#E5E7EB",
  bookedBorder: "#D1D5DB",
  bookedStrip: "#6B7280",
  bookedText: "#9CA3AF",

  // Female Booked Seat
  femaleBookedBg: "#FCE7F3",
  femaleBookedBorder: "#FBCFE8",
  femaleBookedStrip: "#EC4899",
  femaleBookedText: "#DB2777",

  // Selected Seat
  selectedBg: "#FFF1F1",
  selectedBorder: "#E53935",
  selectedStrip: "#E53935",
  selectedGlow: "#E53935",
  selectedPriceBg: "#E53935",
  selectedPriceText: "#FFFFFF",

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
