import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY_RED = "#E11D2E";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

const formatINR = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return 'Price unavailable';
  }

  return `₹${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

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

function formatDurationText(minutes) {
  if (!minutes || minutes < 0) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function CompactFlightCard({ flight, onSelect, onViewDetails }) {
  const [fareListVisible, setFareListVisible] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  if (!flight) return null;

  const rawItem = flight.rawItem || flight;
  
  // 1. Flight information mapping
  const fareOptions = Array.isArray(rawItem.FareDataMultiple) ? rawItem.FareDataMultiple : [];
  const fareDataMultiple = fareOptions[0] || {};
  const fareSegments = fareDataMultiple.FareSegments || [];
  const firstFareSeg = fareSegments[0] || {};
  
  const airlineCode = firstFareSeg.AirlineCode || flight.airlineCode || rawItem.AirlineCode || "AI";
  const airlineName = firstFareSeg.AirlineName || flight.airlineName || rawItem.AirlineName || "Airline";
  const flightNumber = firstFareSeg.FlightNumber || flight.flightNumber || rawItem.FlightNumber || "";
  
  const baggage = firstFareSeg.Baggage;
  const cabinBaggage = firstFareSeg.CabinBaggage;
  const cabinClassName = firstFareSeg.CabinClassName || flight.travelClass || "Economy";
  
  // 2. Itinerary mapping
  const segments = rawItem.Segments?.[0] || [];
  if (!segments || segments.length === 0) return null;
  
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  const depTimeStr = formatTime(firstSeg.DepTime || flight.departureTime);
  const arrTimeStr = formatTime(lastSeg.ArrTime || flight.arrivalTime);
  
  const originCode = firstSeg.Origin?.AirportCode || firstSeg.Origin?.CityCode || flight.originCode || flight.fromCityCode || flight.from || "";
  const destCode = lastSeg.Destination?.AirportCode || lastSeg.Destination?.CityCode || flight.destinationCode || flight.toCityCode || flight.to || "";
  
  const originCity = firstSeg.Origin?.CityName || originCode;
  const destCity = lastSeg.Destination?.CityName || destCode;

  const stops = Math.max(segments.length - 1, 0);
  const stopsStr = stops === 0 ? "Non-stop" : stops === 1 ? "1 stop" : `${stops} stops`;

  const connectionCities = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const city = segments[i].Destination?.CityName || segments[i].Destination?.AirportCode;
    if (city) connectionCities.push(city);
  }
  const routeDisplay = stops === 0 
    ? `${originCode} ───────── ${destCode}`
    : `${originCode} ── ${connectionCities.join(" ── ")} ── ${destCode}`;
    
  const cityDisplay = stops === 0 
    ? (
      <View style={styles.citiesRow}>
        <Text style={styles.cityTextLeft} numberOfLines={1}>{originCity}</Text>
        <Text style={styles.cityTextRight} numberOfLines={1}>{destCity}</Text>
      </View>
    ) : (
      <View style={styles.citiesRowCenter}>
        <Text style={styles.cityTextLeft} numberOfLines={1}>{originCity}</Text>
        {connectionCities.map((c, i) => (
           <Text key={i} style={styles.cityTextCenter} numberOfLines={1}>{c}</Text>
        ))}
        <Text style={styles.cityTextRight} numberOfLines={1}>{destCity}</Text>
      </View>
    );

  let totalDuration = rawItem.Duration || flight.duration || 0;
  if (!totalDuration) {
      const s = new Date(firstSeg.DepTime).getTime();
      const e = new Date(lastSeg.ArrTime).getTime();
      if (!isNaN(s) && !isNaN(e)) {
          totalDuration = Math.floor((e - s) / 60000);
      }
  }
  
  const baggageStrParts = [];
  if (baggage) baggageStrParts.push(`${baggage} check-in`);
  if (cabinBaggage) baggageStrParts.push(`${cabinBaggage} cabin`);
  const baggageText = baggageStrParts.length > 0 ? baggageStrParts.join(" + ") : "Baggage info unavailable";

  // 3. Price mapping
  let b2cFinalFare = null;
  if (rawItem.B2CFinalFare != null) {
      b2cFinalFare = rawItem.B2CFinalFare;
  } else if (rawItem.Fare?.B2CFinalFare != null) {
      b2cFinalFare = rawItem.Fare.B2CFinalFare;
  } else if (fareDataMultiple.Fare?.B2CFinalFare != null) {
      b2cFinalFare = fareDataMultiple.Fare.B2CFinalFare;
  }
  
  // Use B2CFinalFare if available, fallback to displayFare only if strictly missing
  const displayPrice = b2cFinalFare != null ? b2cFinalFare : (flight.displayFare || flight.price || 0);

  // 4. Refundability
  const isRefundable = rawItem.IsRefundable ?? flight.isRefundable ?? false;
  const selectFare = (fare) => {
    const fareInfo = fare?.Fare || {};
    const fareSegment = fare?.FareSegments?.[0] || firstFareSeg;
    const selectedPrice = Number(fare?.B2CFinalFare || fareInfo.B2CFinalFare || fareInfo.PublishedFare || fare?.OfferedFare || displayPrice);
    onSelect({
      ...flight,
      price: selectedPrice,
      displayFare: selectedPrice,
      offeredFare: Number(fare?.OfferedFare || fareInfo.OfferedFare || selectedPrice),
      baseFare: Number(fareInfo.BaseFare || selectedPrice),
      tax: Number(fareInfo.Tax || 0),
      resultIndex: fare?.ResultIndex || flight.resultIndex,
      srdvIndex: fare?.SrdvIndex || flight.srdvIndex || "2",
      selectedFareType: String(fare?.Source || fare?.FareType || "STANDARD").toUpperCase(),
      isRefundable: Boolean(fare?.IsRefundable ?? isRefundable),
      selectedFare: fare,
      selectedFareSegment: fareSegment,
    });
    setFareListVisible(false);
  };

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.airlineInfo}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{airlineCode.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.airlineName}>{airlineName}</Text>
            <Text style={styles.flightNumber}>{airlineCode} {flightNumber}</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>{formatINR(displayPrice)}</Text>
          {isRefundable && <Text style={styles.refundableText}>Refundable</Text>}
        </View>
      </View>

      {/* Flight Timing Row */}
      <View style={styles.timingRow}>
        <Text style={styles.timeText}>{depTimeStr}</Text>
        <View style={styles.routeContainer}>
           <Text style={styles.routeCodeText} numberOfLines={1}>{routeDisplay}</Text>
           {cityDisplay}
        </View>
        <Text style={styles.timeTextRight}>{arrTimeStr}</Text>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {formatDurationText(totalDuration)} • {stopsStr} • {baggageText}
        </Text>
      </View>

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        <Text style={styles.cabinClassText}>{cabinClassName}</Text>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={() => onViewDetails(flight)} style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => fareOptions.length > 1 ? setFareListVisible(true) : onSelect(flight)} style={styles.selectBtn}>
            <Text style={styles.selectBtnText}>{fareOptions.length > 1 ? `View fares (${fareOptions.length})` : "Select →"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={fareListVisible} animationType="slide" onRequestClose={() => setFareListVisible(false)}>
        <SafeAreaView style={styles.fareModal} edges={["top", "left", "right"]}>
          <View style={[styles.fareModalHeader, { paddingHorizontal: Math.max(14, Math.min(24, screenWidth * 0.05)) }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fareModalTitle} numberOfLines={1}>Flight Fare List</Text>
              <Text style={styles.fareModalSubtitle} numberOfLines={1}>{airlineName} {flightNumber} · {originCode} → {destCode}</Text>
            </View>
            <TouchableOpacity onPress={() => setFareListVisible(false)} style={styles.closeFareModal}>
              <Text style={styles.closeFareModalText}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.fareModalScroll}
            contentContainerStyle={[styles.fareModalContent, { paddingHorizontal: Math.max(18, Math.min(30, screenWidth * 0.07)) }]}
            showsVerticalScrollIndicator={false}
          >
            {fareOptions.map((fare, index) => {
              const fareInfo = fare.Fare || {};
              const fareSegment = fare.FareSegments?.[0] || firstFareSeg;
              const label = String(fare.Source || fare.FareType || `Option ${index + 1}`).toUpperCase();
              const price = Number(fare.B2CFinalFare || fareInfo.B2CFinalFare || fareInfo.PublishedFare || fare.OfferedFare || 0);
              const refundable = Boolean(fare.IsRefundable ?? isRefundable);
              return (
                <View key={`${fare.ResultIndex || label}-${index}`} style={styles.fareOptionCard}>
                  <View style={styles.fareOptionTop}>
                    <View style={styles.fareLabel}><Text style={styles.fareLabelText}>{label}</Text></View>
                    <Text style={styles.fareOptionPrice}>{formatINR(price)}</Text>
                  </View>
                  <View style={styles.fareOptionGrid}>
                    <View style={styles.fareOptionColumn}>
                      <Text style={styles.fareOptionHeading}>BAGGAGE</Text>
                      <Text style={styles.fareOptionValue}>{fareSegment.Baggage || "Not provided"} check-in</Text>
                      <Text style={styles.fareOptionMuted}>{fareSegment.CabinBaggage || "Not provided"} cabin</Text>
                    </View>
                    <View style={styles.fareOptionColumn}>
                      <Text style={styles.fareOptionHeading}>REFUND</Text>
                      <Text style={[styles.refundValue, { color: refundable ? "#15803D" : PRIMARY_RED }]}>{refundable ? "Refundable" : "Non-refundable"}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => selectFare(fare)} style={styles.fareSelectButton}>
                    <Text style={styles.fareSelectButtonText}>Select</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 7,
    width: "94%",
    alignSelf: "center",
    marginHorizontal: 0,
    marginVertical: 4,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  airlineInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  airlineName: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  flightNumber: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  priceContainer: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  refundableText: {
    fontSize: 9,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
  timingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT_DARK,
    width: 50,
  },
  timeTextRight: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT_DARK,
    width: 50,
    textAlign: "right",
  },
  routeContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  routeCodeText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_DARK,
    letterSpacing: 1,
  },
  citiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 2,
  },
  citiesRowCenter: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 2,
  },
  cityTextLeft: {
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: "left",
    flex: 1,
  },
  cityTextCenter: {
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: "center",
    flex: 1,
  },
  cityTextRight: {
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: "right",
    flex: 1,
  },
  summaryRow: {
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 4,
  },
  cabinClassText: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailsBtn: {
    paddingVertical: 3,
  },
  detailsBtnText: {
    fontSize: 11,
    color: PRIMARY_RED,
    fontWeight: "700",
  },
  selectBtn: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: PRIMARY_RED,
    borderRadius: 8,
  },
  selectBtnText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  fareModal: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  fareModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_RED,
    paddingTop: 10,
    paddingBottom: 12,
  },
  fareModalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    flexShrink: 1,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  fareModalSubtitle: {
    color: "#FFFFFF",
    opacity: 0.9,
    marginTop: 3,
    fontSize: 10,
    fontWeight: "700",
    flexShrink: 1,
  },
  closeFareModal: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  closeFareModalText: {
    color: "#FFFFFF",
    fontSize: 21,
    lineHeight: 23,
  },
  fareModalContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  fareModalScroll: {
    flex: 1,
  },
  fareOptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    padding: 7,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
  },
  fareOptionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  fareLabel: {
    backgroundColor: "#FEE2E2",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  fareLabelText: {
    color: PRIMARY_RED,
    fontSize: 10,
    fontWeight: "900",
  },
  fareOptionPrice: {
    color: TEXT_DARK,
    fontSize: 15,
    fontWeight: "900",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 10,
  },
  fareOptionGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 5,
    marginBottom: 6,
  },
  fareOptionColumn: {
    flex: 1,
  },
  fareOptionHeading: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: "900",
    marginBottom: 2,
  },
  fareOptionValue: {
    color: TEXT_DARK,
    fontSize: 11,
    fontWeight: "800",
  },
  fareOptionMuted: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginTop: 1,
  },
  refundValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  fareSelectButton: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 16,
    alignItems: "center",
    alignSelf: "center",
    width: "88%",
    paddingVertical: 4,
  },
  fareSelectButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
});
