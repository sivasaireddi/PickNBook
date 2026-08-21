import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "./utils/flightUtils";

const PRIMARY_RED = "#E11D2E";
const PRIMARY_RED_DARK = "#B3121F";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";
const BACKGROUND_COLOR = "#F8F9FB";

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
  return d.toLocaleDateString('en-GB', options);
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

export default function FlightDetailsScreen({ route, navigation }) {
  const flight = route?.params?.flight;
  const onSelect = route?.params?.onSelect;

  if (!flight) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20 }}>Flight details not found.</Text>
      </SafeAreaView>
    );
  }

  const rawItem = flight.rawItem || flight;
  const segments = rawItem.normalizedSegments || rawItem.Segments?.[0] || rawItem.FareDataMultiple?.[0]?.FareSegments || [];
  const price = flight.displayFare || flight.price || flight.offeredFare || 0;
  const isRefundable = flight.isRefundable ?? true;
  const checkInBaggage = segments[0]?.Baggage || "15 Kg";
  const cabinBaggage = segments[0]?.CabinBaggage || "7 Kg";

  const handleSelect = () => {
    navigation.goBack();
    // Use setTimeout to allow the transition to finish if needed, or call immediately
    setTimeout(() => {
      if (onSelect) {
        onSelect(flight);
      }
    }, 100);
  };

  const mainAirlineCode = segments[0]?.Airline?.AirlineCode || flight.airlineCode || "AI";

  const renderTimeline = () => {
    if (!segments || segments.length === 0) return null;
    
    const journeyDateStr = segments[0].DepTime || flight.departureTime;
    const firstDep = segments[0].DepTime;
    const lastArr = segments[segments.length - 1].ArrTime;
    
    let totalJourneyDuration = flight.duration || 0;
    if (!totalJourneyDuration && firstDep && lastArr) {
      totalJourneyDuration = calculateDuration(firstDep, lastArr);
    }
    
    const stopsCount = Math.max(0, segments.length - 1);
    const connectionCities = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const city = segments[i].Destination?.CityName || segments[i].Destination?.AirportCode || segments[i].ToCity || segments[i].ToAirportCode;
      if (city) connectionCities.push(city);
    }
    const stopsStr = stopsCount === 0 ? "Non-stop" : `${stopsCount} Stop${stopsCount > 1 ? "s" : ""} · ${connectionCities.join(", ")}`;

    return (
      <View style={styles.itineraryContainer}>
        <View style={styles.journeyHeader}>
          <Text style={styles.journeyTitle}>FLIGHT ITINERARY · {formatDateDisplay(journeyDateStr)}</Text>
        </View>

        <View style={styles.timelineContainer}>
          {segments.map((segment, idx) => {
            const isLast = idx === segments.length - 1;
            
            const airlineCode = segment.Airline?.AirlineCode || mainAirlineCode;
            const airlineName = segment.Airline?.AirlineName || flight.airlineName;
            const flightNo = segment.Airline?.FlightNumber || "";
            
            const originCode = segment.Origin?.AirportCode || segment.FromAirportCode || "";
            const originCity = segment.Origin?.CityName || segment.FromCity || originCode;
            const originTerminal = segment.Origin?.Terminal ? ` · ${segment.Origin.Terminal}` : "";
            
            const destCode = segment.Destination?.AirportCode || segment.ToAirportCode || "";
            const destCity = segment.Destination?.CityName || segment.ToCity || destCode;
            const destTerminal = segment.Destination?.Terminal ? ` · ${segment.Destination.Terminal}` : "";
            
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
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flight Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {renderTimeline()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fare Information</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Total Fare:</Text>
            <Text style={styles.detailsValue}>{formatCurrency(price)}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Cabin Baggage:</Text>
            <Text style={styles.detailsValue}>{cabinBaggage}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Check-in Baggage:</Text>
            <Text style={styles.detailsValue}>{checkInBaggage}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Refund Policy:</Text>
            <Text style={styles.detailsValue}>
              {isRefundable ? "Refundable (Charges Apply)" : "Non-Refundable"}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomPriceLabel}>Total Fare</Text>
          <Text style={styles.bottomPrice}>{formatCurrency(price)}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={handleSelect}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  itineraryContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  journeyHeader: {
    marginBottom: 16,
  },
  journeyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: 0.5,
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
    borderColor: "#FFFFFF",
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
    marginLeft: 70,
    marginVertical: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
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
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
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
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  bottomPriceLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  selectBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  selectBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
