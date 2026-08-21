import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

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
  if (!flight) return null;

  const rawItem = flight.rawItem || flight;
  
  // 1. Flight information mapping
  const fareDataMultiple = rawItem.FareDataMultiple?.[0] || {};
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
          <TouchableOpacity onPress={() => onSelect(flight)} style={styles.selectBtn}>
            <Text style={styles.selectBtnText}>Select →</Text>
          </TouchableOpacity>
        </View>
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
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    marginBottom: 12,
  },
  airlineInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  airlineName: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  flightNumber: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  priceContainer: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  refundableText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
  timingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
    width: 50,
  },
  timeTextRight: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
    width: 50,
    textAlign: "right",
  },
  routeContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  routeCodeText: {
    fontSize: 13,
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
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: "left",
    flex: 1,
  },
  cityTextCenter: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: "center",
    flex: 1,
  },
  cityTextRight: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: "right",
    flex: 1,
  },
  summaryRow: {
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
  },
  cabinClassText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  detailsBtn: {
    paddingVertical: 6,
  },
  detailsBtnText: {
    fontSize: 13,
    color: PRIMARY_RED,
    fontWeight: "700",
  },
  selectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: PRIMARY_RED,
    borderRadius: 8,
  },
  selectBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
