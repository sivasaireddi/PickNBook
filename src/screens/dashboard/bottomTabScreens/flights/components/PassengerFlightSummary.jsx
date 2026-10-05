import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const RED = "#E11D2E";
const NAVY = "#102A43";
const MUTED = "#526581";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const cityCode = (value, fallback = "—") => {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value.airportCode || value.cityCode || value.cityName || fallback;
};

const cityName = (value, fallback = "Select city") => {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value.cityName || value.airportName || value.airportCode || fallback;
};

function FlightLegCard({ flight = {}, searchContext = {}, label, isReturn = false }) {
  // A return journey must always be displayed in the reverse direction of
  // the searched outbound journey. Keep the selected flight untouched for
  // supplier APIs; only normalize the presentation here.
  const fromValue = isReturn
    ? (searchContext.to || searchContext.destination || flight.from)
    : (flight.from || searchContext.from);
  const toValue = isReturn
    ? (searchContext.from || searchContext.origin || flight.to)
    : (flight.to || searchContext.to);
  const fromCode = cityCode(fromValue);
  const toCode = cityCode(toValue);
  const fromCity = isReturn
    ? cityName(searchContext.destination || fromValue, fromCode)
    : (flight.fromCity || cityName(flight.origin || searchContext.origin, fromCode));
  const toCity = isReturn
    ? cityName(searchContext.origin || toValue, toCode)
    : (flight.toCity || cityName(flight.destination || searchContext.destination, toCode));
  const date = flight.departureDate || (isReturn ? searchContext.returnDate : null) || searchContext.departureDate || searchContext.date;
  const dateLabel = date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Date not selected";
  const legFare = Number(
    flight.displayFare || flight.offeredFare || flight.price || flight.fare || flight.selectedTravelClassPriceInr || 0
  );

  return (
    <View style={styles.flightCard}>
        <Text style={styles.eyebrow}>{label || (isReturn ? "RETURN FLIGHT" : "DEPARTURE FLIGHT")}</Text>
        <View style={styles.routeRow}>
          <View>
            <Text style={styles.code}>{fromCode}</Text>
            <Text style={styles.city} numberOfLines={1}>{fromCity}</Text>
          </View>
          <View style={styles.routeMiddle}>
            <View style={styles.routeLine} />
            <Ionicons name="airplane" size={15} color={RED} />
            <Text style={styles.nonStop}>{flight.stops === 0 ? "Non-stop" : `${flight.stops || 1} stop`}</Text>
          </View>
          <View style={styles.toBlock}>
            <Text style={styles.code}>{toCode}</Text>
            <Text style={styles.city} numberOfLines={1}>{toCity}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>AIRLINE</Text>
            <Text style={styles.metaValue} numberOfLines={1}>{flight.airlineName || flight.airline || "Airline"} {flight.flightNumber || flight.flightNo || ""}</Text>
          </View>
          <View style={styles.metaBlockRight}>
            <Text style={styles.metaLabel}>DATE</Text>
            <Text style={styles.metaValue}>{dateLabel}</Text>
          </View>
        </View>
        <View style={styles.legFareRow}>
          <Text style={styles.legFareLabel}>FARE</Text>
          <Text style={styles.legFareValue}>{money(legFare)}</Text>
        </View>
    </View>
  );
}

export default function PassengerFlightSummary({ flight = {}, outboundFlight, returnFlight, searchContext = {}, fareSummary = {} }) {
  const outbound = outboundFlight || flight.outbound || flight;
  const inbound = returnFlight || flight.return;
  const legs = inbound ? [
    { flight: outbound, label: "DEPARTURE FLIGHT" },
    { flight: inbound, label: "RETURN FLIGHT", isReturn: true },
  ] : [{ flight: outbound }];
  const total = Number(fareSummary.totalFare || flight.displayFare || flight.price || flight.fare || 0);
  const base = Number(fareSummary.baseFare || flight.baseFare || 0);
  const tax = Number(fareSummary.tax || fareSummary.taxes || flight.tax || Math.max(0, total - base));

  return (
    <>
      {inbound ? (
        <View style={styles.flightCardsRow}>
          {legs.map((leg, index) => (
            <View style={styles.flightCardColumn} key={`${leg.label || "flight"}-${index}`}>
              <FlightLegCard {...leg} searchContext={searchContext} />
            </View>
          ))}
        </View>
      ) : (
        <FlightLegCard {...legs[0]} searchContext={searchContext} />
      )}
      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Fare Summary</Text>
          <Text style={styles.fareType}>{flight.isRefundable ? "Refundable" : "Fare details"}</Text>
        </View>
        <View style={styles.fareRow}><Text style={styles.fareLabel}>Base fare</Text><Text style={styles.fareValue}>{money(base)}</Text></View>
        <View style={styles.fareRow}><Text style={styles.fareLabel}>Taxes & fees</Text><Text style={styles.fareValue}>{money(tax)}</Text></View>
        <View style={styles.totalDivider} />
        <View style={styles.fareRow}><Text style={styles.totalLabel}>Total amount</Text><Text style={styles.totalValue}>{money(total)}</Text></View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#E1E7EF", marginBottom: 8, shadowColor: "#102A43", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  flightCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E1E7EF", marginBottom: 10, shadowColor: "#102A43", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  flightCardsRow: { flexDirection: "row", gap: 8 },
  flightCardColumn: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 0.6, color: MUTED, marginBottom: 8 },
  routeRow: { flexDirection: "row", alignItems: "center" },
  code: { color: NAVY, fontSize: 18, fontWeight: "900" },
  city: { color: MUTED, fontSize: 9, maxWidth: 76, marginTop: 1 },
  toBlock: { alignItems: "flex-end" },
  routeMiddle: { flex: 1, alignItems: "center", marginHorizontal: 5 },
  routeLine: { position: "absolute", top: 8, left: 0, right: 0, borderTopWidth: 1, borderTopColor: "#CBD5E1", borderStyle: "dashed" },
  nonStop: { color: MUTED, fontSize: 9, marginTop: 3 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#EEF2F6", marginTop: 8, paddingTop: 7 },
  metaBlock: { flex: 1 },
  metaBlockRight: { flex: 1, alignItems: "flex-end" },
  metaLabel: { color: MUTED, fontSize: 8, fontWeight: "800", letterSpacing: 0.4 },
  metaValue: { color: NAVY, fontSize: 10, fontWeight: "700", marginTop: 2 },
  legFareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: "#EEF2F6" },
  legFareLabel: { color: MUTED, fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  legFareValue: { color: RED, fontSize: 12, fontWeight: "900" },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  sectionTitle: { color: NAVY, fontSize: 14, fontWeight: "800" },
  fareType: { color: "#15803D", fontSize: 9, fontWeight: "800" },
  fareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 },
  fareLabel: { color: MUTED, fontSize: 10 },
  fareValue: { color: NAVY, fontSize: 10, fontWeight: "700" },
  totalDivider: { borderTopWidth: 1, borderTopColor: "#E2E8F0", marginVertical: 4 },
  totalLabel: { color: NAVY, fontSize: 12, fontWeight: "900" },
  totalValue: { color: RED, fontSize: 15, fontWeight: "900" },
});
