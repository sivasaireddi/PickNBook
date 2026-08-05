import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../utils/flightUtils";

const PRIMARY_RED = "#E11D2E";
const PRIMARY_RED_DARK = "#B3121F";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

export default function FlightCard({ flight, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  if (!flight) return null;

  const {
    airlineName = "Airline",
    airlineCode = "AI",
    flightNumber = "",
    price = 0,
    departureTime = "12:00",
    arrivalTime = "14:00",
    durationMinutes = 120,
    stops = 0,
    isCheapest = false,
    rawItem,
  } = flight;

  const originCode = rawItem?.Segments?.[0]?.[0]?.Origin?.AirportCode || rawItem?.fromCity || "DEL";
  const destinationCode = rawItem?.Segments?.[0]?.[0]?.Destination?.AirportCode || rawItem?.toCity || "BOM";

  const durationHours = Math.floor(durationMinutes / 60);
  const remainingMins = durationMinutes % 60;
  const durationText = `${durationHours}h ${remainingMins}m`;

  const stopsText = stops === 0 ? "Non-stop" : stops === 1 ? "1 stop" : `${stops} stops`;

  return (
    <View style={[styles.card, isCheapest && styles.bestFareCard]}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.airlineInfo}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{airlineCode.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.airlineName}>{airlineName}</Text>
            {flightNumber ? <Text style={styles.flightNo}>{flightNumber}</Text> : null}
          </View>
        </View>

        <View style={styles.priceCol}>
          {isCheapest && (
            <View style={styles.cheapestBadge}>
              <Text style={styles.cheapestBadgeText}>+ CHEAPEST</Text>
            </View>
          )}
          <Text style={styles.priceText}>{formatCurrency(price)}</Text>
        </View>
      </View>

      {/* Flight Route & Timing Box */}
      <View style={styles.routeBox}>
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{departureTime}</Text>
          <Text style={styles.airportText}>{originCode}</Text>
        </View>

        <View style={styles.middleRoute}>
          <View style={styles.stopMetaRow}>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.stopText}>{stopsText}</Text>
            <Ionicons name="airplane" size={12} color={PRIMARY_RED} style={styles.planeIcon} />
            <Text style={styles.metaDot}>•</Text>
          </View>
          <Text style={styles.durationText}>{durationText}</Text>
        </View>

        <View style={[styles.timeCol, { alignItems: "flex-end" }]}>
          <Text style={styles.timeText}>{arrivalTime}</Text>
          <Text style={styles.airportText}>{destinationCode}</Text>
        </View>
      </View>

      {/* Expandable Flight Details Section */}
      {expanded && (
        <View style={styles.expandedDetailsContainer}>
          <View style={styles.detailsDivider} />
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Cabin Baggage:</Text>
            <Text style={styles.detailsValue}>
              {rawItem?.Segments?.[0]?.[0]?.CabinBaggage || "7 Kg"}
            </Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Check-in Baggage:</Text>
            <Text style={styles.detailsValue}>
              {rawItem?.Segments?.[0]?.[0]?.Baggage || "15 Kg"}
            </Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Refund Policy:</Text>
            <Text style={styles.detailsValue}>
              {rawItem?.IsRefundable ?? rawItem?.Segments?.[0]?.[0]?.IsRefundable ? "Refundable (Charges Apply)" : "Non-Refundable"}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footerDivider} />

      {/* Card Footer: Details (left) & Select CTA (right) */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={styles.detailsBtn}
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? "Collapse" : "Expand"} flight details`}
        >
          <Text style={styles.detailsBtnText}>Details</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={PRIMARY_RED}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelect(flight)}
          accessibilityRole="button"
          accessibilityLabel={`Select flight ${airlineName} for ${formatCurrency(price)}`}
        >
          <LinearGradient
            colors={[PRIMARY_RED, PRIMARY_RED_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.selectBtn}
          >
            <Text style={styles.selectBtnText}>Select</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bestFareCard: {
    borderColor: PRIMARY_RED,
    borderWidth: 1.5,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  airlineInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  airlineName: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  flightNo: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginTop: 1,
  },
  priceCol: {
    alignItems: "flex-end",
  },
  cheapestBadge: {
    backgroundColor: "#E6F7EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  cheapestBadgeText: {
    color: "#1E9E63",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  priceText: {
    fontSize: 20,
    fontWeight: "900",
    color: PRIMARY_RED,
  },
  routeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 4,
  },
  timeCol: {
    gap: 2,
  },
  timeText: {
    fontSize: 17,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  airportText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  middleRoute: {
    alignItems: "center",
    gap: 2,
  },
  stopMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaDot: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  stopText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  planeIcon: {
    marginHorizontal: 2,
  },
  durationText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  expandedDetailsContainer: {
    marginTop: 8,
    gap: 6,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailsLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  detailsValue: {
    fontSize: 12,
    color: TEXT_DARK,
    fontWeight: "700",
  },
  footerDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginTop: 12,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_RED,
  },
  selectBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  selectBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
