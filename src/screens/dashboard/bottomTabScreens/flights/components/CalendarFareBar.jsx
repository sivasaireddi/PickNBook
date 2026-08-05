import React, { useEffect, useState, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { getCalendarFare } from "../services/flightBookingService";

const PRIMARY_RED = "#E11D2E";
const SURFACE = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

const formatDayLabel = (dateObj) => {
  return dateObj.toLocaleDateString("en-US", { weekday: "short" });
};

const formatDateNum = (dateObj) => {
  return dateObj.getDate();
};

const formatMonthLabel = (dateObj) => {
  return dateObj.toLocaleDateString("en-US", { month: "short" });
};

export default function CalendarFareBar({
  origin = "DEL",
  destination = "BOM",
  selectedDate,
  onSelectDate,
  travelClass = "Economy",
}) {
  const [loading, setLoading] = useState(false);
  const [fareMap, setFareMap] = useState({});

  const dateList = useMemo(() => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    const list = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, [selectedDate]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getCalendarFare({
          from: origin,
          to: destination,
          date: selectedDate ? new Date(selectedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          travelClass,
        });

        if (!isMounted) return;

        const results =
          res?.SearchResults ||
          res?.Results ||
          res?.Response?.SearchResults ||
          res?.data ||
          (Array.isArray(res) ? res : []);

        const map = {};
        if (Array.isArray(results)) {
          results.forEach((item) => {
            const rawDate = item.DepartureDate || item.date || item.Date;
            const price = Number(item.Fare || item.BaseFare || item.Price || item.Amount || 0);
            if (rawDate && price > 0) {
              const key = new Date(rawDate).toISOString().slice(0, 10);
              map[key] = price;
            }
          });
        }
        setFareMap(map);
      } catch (err) {
        console.log("[CalendarFareBar] getCalendarFare error (using fallback fares):", err?.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [origin, destination, selectedDate, travelClass]);

  const activeDateKey = useMemo(() => {
    return selectedDate ? new Date(selectedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Cheapest Fares</Text>
        {loading ? <ActivityIndicator size="small" color={PRIMARY_RED} /> : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {dateList.map((dObj) => {
          const dateKey = dObj.toISOString().slice(0, 10);
          const isSelected = dateKey === activeDateKey;
          const price = fareMap[dateKey];
          const priceText = price ? `₹${Math.round(price)}` : "";

          return (
            <TouchableOpacity
              key={dateKey}
              activeOpacity={0.8}
              onPress={() => onSelectDate && onSelectDate(dObj)}
              style={[styles.dateChip, isSelected && styles.activeChip]}
            >
              <Text style={[styles.dayText, isSelected && styles.activeText]}>
                {formatDayLabel(dObj)}
              </Text>
              <Text style={[styles.dateNum, isSelected && styles.activeText]}>
                {formatDateNum(dObj)} {formatMonthLabel(dObj)}
              </Text>
              {priceText ? (
                <Text style={[styles.priceText, isSelected && styles.activePriceText]}>
                  {priceText}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  dateChip: {
    width: 72,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  activeChip: {
    backgroundColor: PRIMARY_RED,
    borderColor: PRIMARY_RED,
  },
  dayText: {
    fontSize: 11,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  dateNum: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 1,
  },
  priceText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
    marginTop: 2,
  },
  activeText: {
    color: "#FFFFFF",
  },
  activePriceText: {
    color: "#FEF08A",
  },
});
