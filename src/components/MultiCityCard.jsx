import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Search } from "lucide-react-native";

const PRIMARY_RED = "#E53935";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#0F172A";
const TEXT_MUTED = "#64748B";
const LABEL_MUTED = "#94A3B8";
const BORDER_COLOR = "#F1F5F9";

function formatDateFull(dateVal) {
  if (!dateVal) return "Select Departure Date";
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return "Select Departure Date";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MultiCityCard({
  segments = [],
  onPressSegmentOrigin,
  onPressSegmentDestination,
  onPressSegmentDate,
  onAddSegment,
  onRemoveSegment,
  travellers,
  cabinClass,
  onPressTravellers,
  onPressCabin,
  onSearch,
  searching = false,
}) {
  const adultCount = travellers?.adults || 1;
  const totalTravellers = adultCount + (travellers?.children || 0) + (travellers?.infants || 0);
  const travellerLabel = totalTravellers === 1 ? "1 ADULT" : `${totalTravellers} TRAVELLERS`;

  return (
    <View style={styles.wrapper}>
      {/* Flight Cards List */}
      {segments.map((seg, idx) => {
        const originObj = seg.origin || seg.from;
        const destObj = seg.destination || seg.to;

        const originCode = originObj?.airportCode || originObj?.cityCode || "Select";
        const originCity = originObj?.cityName || originObj?.airportName || "";

        const destCode = destObj?.airportCode || destObj?.cityCode || "Select";
        const destCity = destObj?.cityName || destObj?.airportName || "";

        const dateStr = formatDateFull(seg.date || seg.departureDate);

        return (
          <View key={seg.id || idx} style={styles.flightCard}>
            {/* Header Badge & Delete Trash Icon */}
            <View style={styles.cardHeader}>
              <View style={styles.flightBadge}>
                <Text style={styles.flightBadgeText}>FLIGHT {idx + 1}</Text>
              </View>

              {segments.length > 2 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onRemoveSegment(idx)}
                  style={styles.deleteIconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* FROM ➔ TO Route Row */}
            <View style={styles.routeRow}>
              {/* FROM */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onPressSegmentOrigin(idx)}
                style={styles.airportCol}
              >
                <Text style={styles.fieldLabel}>FROM</Text>
                <View style={styles.airportCodeRow}>
                  <Text style={styles.airportCodeText}>{originCode}</Text>
                  <Text style={styles.cityNameText} numberOfLines={1} ellipsizeMode="tail">
                    {originCity}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Arrow Icon */}
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward-outline" size={16} color={PRIMARY_RED} />
              </View>

              {/* TO */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onPressSegmentDestination(idx)}
                style={[styles.airportCol, { alignItems: "flex-end" }]}
              >
                <Text style={styles.fieldLabel}>TO</Text>
                <View style={[styles.airportCodeRow, { justifyContent: "flex-end" }]}>
                  <Text style={styles.cityNameText} numberOfLines={1} ellipsizeMode="tail">
                    {destCity}
                  </Text>
                  <Text style={styles.airportCodeText}>{destCode}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Inner Divider */}
            <View style={styles.innerDivider} />

            {/* DEPARTURE DATE Row */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onPressSegmentDate(idx)}
              style={styles.dateRow}
            >
              <View style={styles.dateRowLeft}>
                <Ionicons name="calendar-outline" size={17} color={PRIMARY_RED} style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.fieldLabel}>DEPARTURE DATE</Text>
                  <Text style={styles.dateValText}>{dateStr}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Add Another Flight Leg Button */}
      {segments.length < 6 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAddSegment}
          style={styles.addLegBtn}
        >
          <Ionicons name="add" size={16} color={PRIMARY_RED} style={{ marginRight: 5 }} />
          <Text style={styles.addLegBtnText}>+ Add Another Flight Leg</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Option Cards (TRAVELLERS & CLASS) */}
      <View style={styles.bottomSelectorsRow}>
        {/* TRAVELLERS */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressTravellers}
          style={styles.selectorBox}
        >
          <Ionicons name="people-outline" size={18} color={PRIMARY_RED} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.selectorLabel}>TRAVELLERS</Text>
            <Text style={styles.selectorText}>{travellerLabel}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#94A3B8" />
        </TouchableOpacity>

        {/* CLASS */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressCabin}
          style={styles.selectorBox}
        >
          <Ionicons name="airplane-outline" size={18} color={PRIMARY_RED} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.selectorLabel}>CLASS</Text>
            <Text style={styles.selectorText}>{String(cabinClass || "Economy").toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* SEARCH FLIGHTS Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onSearch}
        disabled={searching}
        style={styles.searchButtonWrapper}
      >
        <LinearGradient colors={["#CB2E33", "#B0242A"]} style={styles.searchButtonGradient}>
          {searching ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.searchButtonContent}>
              <Search size={16} color="#FFFFFF" />
              <Text style={styles.searchButtonText}>Search flights</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  flightCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 10,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  flightBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  flightBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: PRIMARY_RED,
    letterSpacing: 0.5,
  },
  deleteIconBtn: {
    padding: 4,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  airportCol: {
    flex: 1,
  },
  arrowContainer: {
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: LABEL_MUTED,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  airportCodeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  airportCodeText: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  cityNameText: {
    fontSize: 10,
    fontWeight: "600",
    color: TEXT_MUTED,
    maxWidth: 90,
  },
  innerDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateValText: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 1,
  },
  addLegBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  addLegBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY_RED,
  },
  bottomSelectorsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 9,
  },
  selectorBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#D9DEE7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  selectorLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: LABEL_MUTED,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  searchButtonWrapper: {
    marginTop: 1,
    shadowColor: "rgba(192,39,45,0.25)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 9,
    elevation: 3,
  },
  searchButtonGradient: {
    width: "100%",
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
