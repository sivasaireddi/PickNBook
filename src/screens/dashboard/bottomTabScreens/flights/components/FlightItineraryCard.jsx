import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../utils/flightUtils";

const PRIMARY_RED = "#E11D2E";
const PRIMARY_RED_DARK = "#B3121F";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

function parseDateStr(dateStr) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatTime(dateStr) {
  if (!dateStr) return "--:--";
  let timeStr = "";
  if (dateStr.includes("T")) {
    timeStr = dateStr.split("T")[1].substring(0, 5);
  } else if (dateStr.length >= 5) {
    timeStr = dateStr.substring(0, 5);
  }
  return timeStr;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const d = parseDateStr(dateStr);
  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  return d.toLocaleDateString('en-GB', options); // e.g. Tue, 20 Oct
}

function calculateDuration(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const start = parseDateStr(startStr).getTime();
  const end = parseDateStr(endStr).getTime();
  if (isNaN(start) || isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 60000));
}

function formatDurationText(minutes) {
  if (!minutes || minutes < 0) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function isNextDay(startStr, endStr) {
  const start = parseDateStr(startStr);
  const end = parseDateStr(endStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  return endDay > startDay;
}

export default function FlightItineraryCard({ flight, onSelect }) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedFareIndex, setSelectedFareIndex] = useState(0);

  if (!flight) return null;

  const rawItem = flight.rawItem || flight;
  
  // Extract all journeys (e.g. Segments[0] = Outbound, Segments[1] = Return)
  let segmentsMatrix = rawItem?.Segments || (Array.isArray(flight?.Segments) ? flight.Segments : []);
  if (!segmentsMatrix || segmentsMatrix.length === 0) {
    // Fallback to FareSegments if Segments are missing
    const fareSegs = rawItem?.FareDataMultiple?.[0]?.FareSegments || flight?.FareDataMultiple?.[0]?.FareSegments || [];
    if (fareSegs.length > 0) {
      segmentsMatrix = fareSegs.map(fs => [fs]);
    }
  }
  
  if (!segmentsMatrix || segmentsMatrix.length === 0) return null;

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
        cabinBaggage: fareSegment.CabinBaggage || segmentsMatrix[0]?.[0]?.CabinBaggage || "7 Kg",
        checkInBaggage: fareSegment.Baggage || segmentsMatrix[0]?.[0]?.Baggage || "15 Kg",
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
      cabinBaggage: segmentsMatrix[0]?.[0]?.CabinBaggage || "7 Kg",
      checkInBaggage: segmentsMatrix[0]?.[0]?.Baggage || "15 Kg",
      isRefundable: Boolean(flight.isRefundable ?? true),
      isLCC: Boolean(flight.isLCC),
      rawItem: flight,
    };
  }, [fareDataMultiple, selectedFareIndex, flight, rawItem, segmentsMatrix]);

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

  const mainAirlineCode = segmentsMatrix[0]?.[0]?.Airline?.AirlineCode || flight.airlineCode || "AI";
  const mainAirlineName = segmentsMatrix[0]?.[0]?.Airline?.AirlineName || flight.airlineName || "Airline";
  const isCheapest = flight.isCheapest;

  const renderJourney = (segments, journeyIndex) => {
    if (!segments || segments.length === 0) return null;
    
    const journeyTitle = journeyIndex === 0 ? "OUTBOUND" : journeyIndex === 1 ? "RETURN" : `JOURNEY ${journeyIndex + 1}`;
    const journeyDateStr = segments[0].DepTime;
    
    const firstDep = segments[0].DepTime;
    const lastArr = segments[segments.length - 1].ArrTime;
    const totalJourneyDuration = calculateDuration(firstDep, lastArr);
    
    const stopsCount = Math.max(0, segments.length - 1);
    
    const connectionCities = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const city = segments[i].Destination?.CityName || segments[i].Destination?.AirportCode || segments[i].ToCity || segments[i].ToAirportCode;
      if (city) connectionCities.push(city);
    }
    
    const stopsStr = stopsCount === 0 
      ? "Non-stop" 
      : `${stopsCount} Stop${stopsCount > 1 ? "s" : ""} · ${connectionCities.join(", ")}`;

    return (
      <View key={`journey-${journeyIndex}`} style={styles.journeyContainer}>
        <View style={styles.journeyHeader}>
          <Text style={styles.journeyTitle}>{journeyTitle} · {formatDateDisplay(journeyDateStr)}</Text>
        </View>

        <View style={styles.timelineContainer}>
          {segments.map((segment, idx) => {
            const isLast = idx === segments.length - 1;
            
            const airlineCode = segment.Airline?.AirlineCode || mainAirlineCode;
            const airlineName = segment.Airline?.AirlineName || mainAirlineName;
            const flightNo = segment.Airline?.FlightNumber || "";
            
            const originCode = segment.Origin?.AirportCode || segment.FromAirportCode || "";
            const originCity = segment.Origin?.CityName || segment.FromCity || originCode;
            const originTerminal = segment.Origin?.Terminal ? ` · ${segment.Origin.Terminal}` : "";
            
            const destCode = segment.Destination?.AirportCode || segment.ToAirportCode || "";
            const destCity = segment.Destination?.CityName || segment.ToCity || destCode;
            const destTerminal = segment.Destination?.Terminal ? ` · ${segment.Destination.Terminal}` : "";
            
            // Format DepTime/ArrTime fallback for FareSegments which don't have them
            const depTimeRaw = segment.DepTime || "00:00:00";
            const arrTimeRaw = segment.ArrTime || "00:00:00";
            
            const depTimeStr = formatTime(depTimeRaw);
            const arrTimeStr = formatTime(arrTimeRaw);
            
            const showArrPlus1 = segment.DepTime ? isNextDay(segment.DepTime, segment.ArrTime) : false;
            
            let flightDuration = Number(segment.Duration || 0);
            if (!flightDuration) flightDuration = calculateDuration(segment.DepTime, segment.ArrTime);
            
            let layoverDuration = 0;
            if (!isLast) {
              const nextSegment = segments[idx + 1];
              if (segment.ArrTime && nextSegment.DepTime) {
                layoverDuration = calculateDuration(segment.ArrTime, nextSegment.DepTime);
              }
              if (!layoverDuration && segment.GroundTime) {
                layoverDuration = Number(segment.GroundTime);
              }
            }

            return (
              <View key={`seg-${idx}`} style={styles.segmentBlock}>
                {/* Departure Node */}
                <View style={styles.nodeRow}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeText}>{depTimeStr}</Text>
                  </View>
                  <View style={styles.timelineLineCol}>
                    <View style={styles.nodeDot} />
                    <View style={styles.lineVertical} />
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.airportCodeText}>{originCode}</Text>
                    <Text style={styles.airportNameText}>{originCity}{originTerminal}</Text>
                    <Text style={styles.flightNumberText}>{airlineCode} {flightNo}</Text>
                  </View>
                </View>

                {/* Duration Line */}
                <View style={styles.nodeRow}>
                  <View style={styles.timeCol} />
                  <View style={styles.timelineLineCol}>
                    <View style={[styles.lineVertical, styles.lineVerticalFlight]} />
                  </View>
                  <View style={styles.infoColCenter}>
                    <Text style={styles.durationText}>{formatDurationText(flightDuration)}</Text>
                  </View>
                </View>

                {/* Arrival Node */}
                <View style={styles.nodeRow}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeText}>
                      {arrTimeStr}
                      {showArrPlus1 && <Text style={styles.plusOne}> +1</Text>}
                    </Text>
                  </View>
                  <View style={styles.timelineLineCol}>
                    <View style={styles.nodeDotArrival} />
                    {!isLast && <View style={[styles.lineVertical, styles.lineVerticalTransparent]} />}
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.airportCodeText}>{destCode}</Text>
                    <Text style={styles.airportNameText}>{destCity}{destTerminal}</Text>
                  </View>
                </View>

                {/* Layover Node */}
                {!isLast && (
                  <View style={styles.layoverBox}>
                    <Text style={styles.layoverText}>
                      {formatDurationText(layoverDuration)} connection
                    </Text>
                    <Text style={styles.layoverCityText}>{destCity}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.journeyFooter}>
          <Text style={styles.journeyFooterText}>{stopsStr}</Text>
          <Text style={styles.journeyFooterTotalText}>Total: {formatDurationText(totalJourneyDuration)}</Text>
        </View>
        
        {journeyIndex < segmentsMatrix.length - 1 && <View style={styles.journeyDivider} />}
      </View>
    );
  };

  return (
    <>
      <View style={[styles.card, isCheapest && styles.bestFareCard]}>
        <View style={styles.topRow}>
          <View style={styles.airlineInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{mainAirlineCode.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.airlineName}>{mainAirlineName}</Text>
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

        <View style={styles.itineraryContainer}>
          {segmentsMatrix.map((segments, idx) => renderJourney(segments, idx))}
        </View>

        <View style={styles.baggageStrip}>
          <Text style={styles.baggageStripText}>
            {activeFareObj.isRefundable ? "Refundable" : "Non-Refundable"} · {activeFareObj.checkInBaggage} Check-in · {activeFareObj.cabinBaggage} Cabin
          </Text>
        </View>

        <View style={styles.footerDivider} />

        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={() => setDetailsVisible(true)}
            style={styles.detailsBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsBtnText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSelectCurrent}
          >
            <LinearGradient
              colors={[PRIMARY_RED, PRIMARY_RED_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.selectBtn}
            >
              <Text style={styles.selectBtnText}>Select Flight</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={detailsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailsVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Flight Details</Text>
            <TouchableOpacity onPress={() => setDetailsVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            
            {segmentsMatrix.map((segments, idx) => renderJourney(segments, idx))}

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Fare Information</Text>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Total Fare:</Text>
                <Text style={styles.detailsValue}>{formatCurrency(activePrice)}</Text>
              </View>
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
            </View>

          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
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
    marginBottom: 16,
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
    textTransform: "uppercase",
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
    fontSize: 22,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  fareTypePill: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  itineraryContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  journeyContainer: {
    marginBottom: 8,
  },
  journeyHeader: {
    marginBottom: 12,
  },
  journeyTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  segmentBlock: {
    marginBottom: 0,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timeCol: {
    width: 50,
    alignItems: "flex-end",
    paddingRight: 8,
    paddingTop: 2,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  plusOne: {
    fontSize: 10,
    color: PRIMARY_RED,
    fontWeight: "800",
  },
  timelineLineCol: {
    width: 20,
    alignItems: "center",
  },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_DARK,
    marginTop: 6,
    zIndex: 2,
  },
  nodeDotArrival: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_DARK,
    borderWidth: 2,
    borderColor: "#F9FAFB", // matches itineraryContainer bg
    marginTop: 6,
    zIndex: 2,
  },
  lineVertical: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 2,
    marginBottom: 2,
  },
  lineVerticalFlight: {
    backgroundColor: TEXT_DARK,
  },
  lineVerticalTransparent: {
    backgroundColor: "transparent",
  },
  infoCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  infoColCenter: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
    justifyContent: "center",
  },
  airportCodeText: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  airportNameText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "500",
    marginTop: 2,
  },
  flightNumberText: {
    fontSize: 12,
    color: TEXT_DARK,
    fontWeight: "700",
    marginTop: 4,
  },
  durationText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  layoverBox: {
    marginLeft: 70, // Align with infoCol
    marginVertical: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF", // contrast with itineraryContainer bg
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    alignSelf: "flex-start",
  },
  layoverText: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  layoverCityText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  journeyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  journeyFooterText: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  journeyFooterTotalText: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  journeyDivider: {
    height: 2,
    backgroundColor: "#E5E7EB",
    marginVertical: 20,
  },
  baggageStrip: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  baggageStripText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  footerDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginTop: 12,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailsBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_RED,
  },
  selectBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  selectBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  detailsLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  detailsValue: {
    fontSize: 13,
    color: TEXT_DARK,
    fontWeight: "700",
  },
});
