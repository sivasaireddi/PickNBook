import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import AircraftBody from "./AircraftBody";
import Seat from "./Seat";
import { buildSeatMap } from "../utils/seatMapUtils";

const SeatMap = memo(function SeatMap({ selectedSeats, onSeatPress }) {
  const seatMap = useMemo(() => buildSeatMap(selectedSeats), [selectedSeats]);

  const rows = useMemo(() => {
    const grouped = new Map();
    seatMap.forEach((seat) => {
      if (!grouped.has(seat.row)) grouped.set(seat.row, []);
      grouped.get(seat.row).push(seat);
    });
    return Array.from(grouped.entries()).map(([row, seats]) => ({ row, seats }));
  }, [seatMap]);

  const ColumnHeaders = () => (
    <View style={styles.columnHeaders}>
      <View style={styles.headerGroup}>
        <Text style={styles.columnText}>A</Text>
        <Text style={styles.columnText}>B</Text>
      </View>
      <View style={styles.aisleHeaderSpacer} />
      <View style={styles.headerGroup}>
        <Text style={styles.columnText}>C</Text>
        <Text style={styles.columnText}>D</Text>
      </View>
    </View>
  );

  return (
    <AircraftBody>
      <View style={styles.cabin}>
        {rows.map(({ row, seats }) => {
          const isBusinessStart = row === 1;
          const isPremiumStart = row === 4;
          const isEconomyStart = row === 8;

          const isExitRowBefore = row === 3 || row === 12 || row === 22;

          return (
            <View key={row} style={styles.rowContainer}>
              {/* Exit Row Space / Divider Banner */}
              {isExitRowBefore && (
                <View style={styles.exitRowBanner}>
                  <View style={styles.exitLine} />
                  <Text style={styles.exitRowText}>EXIT ROW</Text>
                  <View style={styles.exitLine} />
                </View>
              )}

              {/* Section Header Badges */}
              {isBusinessStart && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>BUSINESS CLASS</Text>
                  <ColumnHeaders />
                </View>
              )}
              {isPremiumStart && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>PREMIUM ECONOMY</Text>
                  <ColumnHeaders />
                </View>
              )}
              {isEconomyStart && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>ECONOMY CLASS</Text>
                  <ColumnHeaders />
                </View>
              )}

              {/* Seat Row */}
              <View style={styles.row}>
                {/* Left Side Seats (A, B) */}
                <View style={styles.seatGroup}>
                  {seats.slice(0, 2).map((seat) => (
                    <Seat
                      key={seat.id}
                      seat={seat}
                      onPress={() => onSeatPress?.(seat)}
                      accessibleLabel={`${seat.seatNumber}, ${seat.type}, ${seat.status}`}
                    />
                  ))}
                </View>

                {/* Center Aisle with Row Number */}
                <View style={styles.aisle}>
                  <View style={styles.rowNumberCircle}>
                    <Text style={styles.rowNumberText}>{row}</Text>
                  </View>
                </View>

                {/* Right Side Seats (C, D) */}
                <View style={styles.seatGroup}>
                  {seats.slice(2, 4).map((seat) => (
                    <Seat
                      key={seat.id}
                      seat={seat}
                      onPress={() => onSeatPress?.(seat)}
                      accessibleLabel={`${seat.seatNumber}, ${seat.type}, ${seat.status}`}
                    />
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </AircraftBody>
  );
});

const styles = StyleSheet.create({
  cabin: {
    width: "100%",
    paddingBottom: 24,
  },
  rowContainer: {
    width: "100%",
    alignItems: "center",
  },
  sectionHeader: {
    width: "100%",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#475569",
    letterSpacing: 2,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    textAlign: "center",
  },
  columnHeaders: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  headerGroup: {
    flexDirection: "row",
    width: 110,
    justifyContent: "space-around",
  },
  columnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    width: 24,
    textAlign: "center",
  },
  aisleHeaderSpacer: {
    width: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
  },
  seatGroup: {
    flexDirection: "row",
    width: 110,
    justifyContent: "space-between",
  },
  aisle: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rowNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  rowNumberText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  exitRowBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginVertical: 12,
    gap: 8,
  },
  exitLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EF4444",
    opacity: 0.5,
  },
  exitRowText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#EF4444",
    letterSpacing: 1.5,
  },
});

export default SeatMap;
