import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import AircraftBody from "./AircraftBody";
import Seat from "./Seat";

const SeatMap = memo(function SeatMap({ seatMap = [], onSeatPress }) {
  const rows = useMemo(() => {
    const grouped = new Map();
    (seatMap || []).forEach((seat) => {
      if (!grouped.has(seat.row)) grouped.set(seat.row, []);
      grouped.get(seat.row).push(seat);
    });
    return Array.from(grouped.entries()).map(([row, seats]) => ({ row, seats }));
  }, [seatMap]);

  const ColumnHeaders = ({ seats = [] }) => {
    const half = Math.ceil(seats.length / 2);
    const leftSeats = seats.slice(0, half);
    const rightSeats = seats.slice(half);

    return (
      <View style={styles.columnHeaders}>
        <View style={styles.headerGroup}>
          {leftSeats.map((s, i) => (
            <Text key={i} style={styles.columnText}>{s.seatLetter && s.seatLetter.length === 1 ? s.seatLetter : ""}</Text>
          ))}
        </View>
        <View style={styles.aisleHeaderSpacer} />
        <View style={styles.headerGroup}>
          {rightSeats.map((s, i) => (
            <Text key={i} style={styles.columnText}>{s.seatLetter && s.seatLetter.length === 1 ? s.seatLetter : ""}</Text>
          ))}
        </View>
      </View>
    );
  };

  if (rows.length === 0) {
    return null;
  }

  return (
    <AircraftBody>
      <View style={styles.cabin}>
        {rows.map(({ row, seats }) => {
          const isBusinessStart = row === 1;
          const isPremiumStart = row === 4;
          const isEconomyStart = row === 8;

          const isExitRowBefore = seats.some((s) => s.isExit);

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
                  <ColumnHeaders seats={seats} />
                </View>
              )}
              {isPremiumStart && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>PREMIUM ECONOMY</Text>
                  <ColumnHeaders seats={seats} />
                </View>
              )}
              {isEconomyStart && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>ECONOMY CLASS</Text>
                  <ColumnHeaders seats={seats} />
                </View>
              )}

              {/* Seat Row */}
              <View style={styles.row}>
                {/* Left Side Seats */}
                <View style={styles.seatGroup}>
                  {seats.slice(0, Math.ceil(seats.length / 2)).map((seat) => (
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

                {/* Right Side Seats */}
                <View style={styles.seatGroup}>
                  {seats.slice(Math.ceil(seats.length / 2)).map((seat) => (
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
    gap: 4,
    justifyContent: "space-between",
  },
  columnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    width: 38,
    textAlign: "center",
  },
  aisleHeaderSpacer: {
    width: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  seatGroup: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-between",
  },
  aisle: {
    width: 28,
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
    color: "#475569",
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
