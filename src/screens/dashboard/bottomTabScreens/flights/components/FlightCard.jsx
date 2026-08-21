import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../utils/flightUtils";

const PRIMARY_RED = "#E11D2E";
const PRIMARY_RED_DARK = "#B3121F";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

export default function FlightCard({ flight, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedFareIndex, setSelectedFareIndex] = useState(0);

  if (!flight) return null;

  const rawItem = flight.rawItem || flight;
  const fareDataMultiple = useMemo(() => {
    if (Array.isArray(rawItem?.FareDataMultiple) && rawItem.FareDataMultiple.length > 0) {
      return rawItem.FareDataMultiple;
    }
    if (Array.isArray(flight?.FareDataMultiple) && flight.FareDataMultiple.length > 0) {
      return flight.FareDataMultiple;
    }
    return [];
  }, [rawItem, flight]);

  const activeFareObj = useMemo(() => {
    if (fareDataMultiple.length > 0 && fareDataMultiple[selectedFareIndex]) {
      const item = fareDataMultiple[selectedFareIndex];
      const fareSegment = item.FareSegments?.[0] || {};
      const fareInfo = item.Fare || {};
      const offeredFare = Number(item.OfferedFare || fareInfo.OfferedFare || fareInfo.PublishedFare || flight.price || 0);
      const baseFare = Number(fareInfo.BaseFare || offeredFare);
      const tax = Number(fareInfo.Tax || 0);
      const label = String(item.Source || item.FareType || (selectedFareIndex === 0 ? "Standard" : `Option ${selectedFareIndex + 1}`)).toUpperCase();

      let badgeBg = item.ButtonColor || (label.includes("SME") ? "#FACC15" : label.includes("PUBLISH") ? "#2563EB" : label.includes("SPECIAL") ? "#16A34A" : "#475569");
      let badgeText = item.TextColor || (badgeBg === "#FACC15" ? "#000000" : "#FFFFFF");

      return {
        resultIndex: item.ResultIndex || flight.resultIndex,
        srdvIndex: item.SrdvIndex || flight.srdvIndex || "2",
        srdvType: item.SrdvType || flight.srdvType || "MixAPI",
        label,
        offeredFare,
        baseFare,
        tax,
        badgeBg,
        badgeText,
        cabinBaggage: fareSegment.CabinBaggage || rawItem?.Segments?.[0]?.[0]?.CabinBaggage || "7 Kg",
        checkInBaggage: fareSegment.Baggage || rawItem?.Segments?.[0]?.[0]?.Baggage || "15 Kg",
        isRefundable: Boolean(item.IsRefundable ?? rawItem?.IsRefundable ?? true),
        isLCC: item.IsLCC !== undefined ? Boolean(item.IsLCC) : Boolean(flight.isLCC),
        rawItem: item,
      };
    }

    return {
      resultIndex: flight.resultIndex,
      srdvIndex: flight.srdvIndex || "2",
      srdvType: flight.srdvType || "MixAPI",
      label: "STANDARD",
      offeredFare: Number(flight.price || flight.displayFare || 0),
      baseFare: Number(flight.baseFare || flight.price || 0),
      tax: Number(flight.tax || 0),
      badgeBg: "#2563EB",
      badgeText: "#FFFFFF",
      cabinBaggage: rawItem?.Segments?.[0]?.[0]?.CabinBaggage || "7 Kg",
      checkInBaggage: rawItem?.Segments?.[0]?.[0]?.Baggage || "15 Kg",
      isRefundable: Boolean(flight.isRefundable ?? true),
      isLCC: Boolean(flight.isLCC),
      rawItem: flight,
    };
  }, [fareDataMultiple, selectedFareIndex, flight, rawItem]);

  const activePrice = activeFareObj.offeredFare;

  const handleSelectCurrent = () => {
    const updatedFlight = {
      ...flight,
      price: activePrice,
      displayFare: activePrice,
      offeredFare: activePrice,
      baseFare: activeFareObj.baseFare,
      tax: activeFareObj.tax,
      resultIndex: activeFareObj.resultIndex,
      srdvIndex: activeFareObj.srdvIndex,
      srdvType: activeFareObj.srdvType,
      isLCC: activeFareObj.isLCC,
      isRefundable: activeFareObj.isRefundable,
      selectedFareType: activeFareObj.label,
    };
    onSelect(updatedFlight);
  };

  const {
    airlineName = "Airline",
    airlineCode = "AI",
    flightNumber = "",
    departureTime = "12:00",
    arrivalTime = "14:00",
    durationMinutes = 120,
    stops = 0,
    isCheapest = false,
  } = flight;

  const segmentsArr = rawItem?.Segments?.[0] || [];
  const firstSegment = segmentsArr[0] || {};
  const lastSegment = segmentsArr.length > 0 ? segmentsArr[segmentsArr.length - 1] : firstSegment;

  const originCode = firstSegment?.Origin?.AirportCode || rawItem?.fromCity || "DEL";
  const destinationCode = lastSegment?.Destination?.AirportCode || rawItem?.toCity || "BOM";

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
          <Text style={styles.priceText}>{formatCurrency(activePrice)}</Text>
          {fareDataMultiple.length > 1 && (
            <Text style={styles.fareTypePill}>{activeFareObj.label}</Text>
          )}
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

      {/* Inline Fare Types Horizontal Strip when fareDataMultiple available */}
      {fareDataMultiple.length > 1 && !expanded && (
        <View style={styles.inlineFareTypesBar}>
          <Text style={styles.inlineFareLabel}>Fare Types:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {fareDataMultiple.map((item, idx) => {
              const label = String(item.Source || item.FareType || `Opt ${idx + 1}`).toUpperCase();
              const priceVal = Number(item.OfferedFare || item.Fare?.OfferedFare || 0);
              const isSel = selectedFareIndex === idx;
              let bg = item.ButtonColor || (label.includes("SME") ? "#FACC15" : label.includes("PUBLISH") ? "#2563EB" : label.includes("SPECIAL") ? "#16A34A" : "#475569");
              let textClr = item.TextColor || (bg === "#FACC15" ? "#000000" : "#FFFFFF");
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => setSelectedFareIndex(idx)}
                  style={[styles.inlineFarePill, { backgroundColor: bg }, isSel && styles.activeInlineFarePill]}
                >
                  <Text style={[styles.inlineFarePillText, { color: textClr }]}>
                    {label}: {formatCurrency(priceVal)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Expandable Details / Full Fare Types Cards Section */}
      {expanded && (
        <View style={styles.expandedDetailsContainer}>
          <View style={styles.detailsDivider} />

          {fareDataMultiple.length > 0 ? (
            <View style={styles.fareTypesWrapper}>
              <View style={styles.fareTypesHeader}>
                <Text style={styles.fareTypesTitle}>Fare Types</Text>
                <Text style={styles.knowMoreText}>Select your fare option</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fareCardsScroll}
              >
                {fareDataMultiple.map((item, idx) => {
                  const fareSeg = item.FareSegments?.[0] || {};
                  const fareInfo = item.Fare || {};
                  const priceVal = Number(item.OfferedFare || fareInfo.OfferedFare || fareInfo.PublishedFare || 0);
                  const label = String(item.Source || item.FareType || `Option ${idx + 1}`).toUpperCase();

                  let bg = item.ButtonColor || (label.includes("SME") ? "#FACC15" : label.includes("PUBLISH") ? "#2563EB" : label.includes("SPECIAL") ? "#16A34A" : "#475569");
                  let textClr = item.TextColor || (bg === "#FACC15" ? "#000000" : "#FFFFFF");
                  const isSelected = selectedFareIndex === idx;

                  const cabinBag = fareSeg.CabinBaggage || "7 Kg";
                  const checkInBag = fareSeg.Baggage || "15 Kg";
                  const isRef = Boolean(item.IsRefundable ?? true);

                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.85}
                      onPress={() => setSelectedFareIndex(idx)}
                      style={[
                        styles.fareTypeCard,
                        isSelected && styles.selectedFareTypeCard,
                      ]}
                    >
                      {/* Top Badge Pill */}
                      <View style={[styles.fareTypeBadge, { backgroundColor: bg }]}>
                        <Text style={[styles.fareTypeBadgeText, { color: textClr }]}>
                          {label}
                        </Text>
                      </View>

                      {/* Large Price */}
                      <Text style={styles.fareTypePrice}>
                        {formatCurrency(priceVal)}
                      </Text>

                      <View style={styles.dottedDivider} />

                      {/* Baggage Info */}
                      <View style={styles.fareInfoRow}>
                        <Ionicons name="bag-handle-outline" size={13} color={TEXT_MUTED} />
                        <Text style={styles.fareInfoText} numberOfLines={1}>
                          {cabinBag} Cabin bag allowance
                        </Text>
                      </View>

                      <View style={styles.fareInfoRow}>
                        <Ionicons name="briefcase-outline" size={13} color={TEXT_MUTED} />
                        <Text style={styles.fareInfoText} numberOfLines={2}>
                          {checkInBag.includes("Not Provided") ? "-- Check-in bag allowance" : `${checkInBag} Check-in bag`}
                        </Text>
                      </View>

                      {/* Refundability */}
                      <View style={styles.fareInfoRow}>
                        <Ionicons name="refresh-outline" size={13} color={TEXT_MUTED} />
                        <Text style={styles.fareInfoText}>
                          Cancellation: {isRef ? "Refundable" : "Non-Refundable"}
                        </Text>
                      </View>

                      {isSelected && (
                        <View style={styles.selectedCheckCircle}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Cabin Baggage:</Text>
                <Text style={styles.detailsValue}>{activeFareObj.cabinBaggage}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Check-in Baggage:</Text>
                <Text style={styles.detailsValue}>{activeFareObj.checkInBaggage}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Refund Policy:</Text>
                <Text style={styles.detailsValue}>
                  {activeFareObj.isRefundable ? "Refundable (Charges Apply)" : "Non-Refundable"}
                </Text>
              </View>
            </>
          )}
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
          <Text style={styles.detailsBtnText}>
            {expanded ? "Hide Details" : "Fare Types & Details"}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={PRIMARY_RED}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSelectCurrent}
          accessibilityRole="button"
          accessibilityLabel={`Select flight ${airlineName} for ${formatCurrency(activePrice)}`}
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
  fareTypePill: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_MUTED,
    marginTop: 2,
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
  inlineFareTypesBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  inlineFareLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  inlineFarePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    opacity: 0.75,
  },
  activeInlineFarePill: {
    opacity: 1,
    borderWidth: 1.5,
    borderColor: PRIMARY_RED,
  },
  inlineFarePillText: {
    fontSize: 10,
    fontWeight: "900",
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
  fareTypesWrapper: {
    marginTop: 4,
  },
  fareTypesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fareTypesTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  knowMoreText: {
    fontSize: 11,
    color: PRIMARY_RED,
    fontWeight: "700",
  },
  fareCardsScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  fareTypeCard: {
    width: 210,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  selectedFareTypeCard: {
    borderColor: PRIMARY_RED,
    borderWidth: 2,
    backgroundColor: "#FEF2F2",
  },
  fareTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  fareTypeBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  fareTypePrice: {
    fontSize: 20,
    fontWeight: "900",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  dottedDivider: {
    borderStyle: "dashed",
    borderWidth: 0.5,
    borderColor: "#D1D5DB",
    marginVertical: 8,
  },
  fareInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  fareInfoText: {
    fontSize: 11,
    color: TEXT_DARK,
    fontWeight: "600",
    flex: 1,
  },
  selectedCheckCircle: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PRIMARY_RED,
    justifyContent: "center",
    alignItems: "center",
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
