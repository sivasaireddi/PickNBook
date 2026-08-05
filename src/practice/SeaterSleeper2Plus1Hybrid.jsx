import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  fetchSeatLayout,
  normalizeSeatLayoutPayload,
} from "../utils/seatLayout";

const DEFAULT_BUS_ID = 658;

const COLORS = {
  screen: "#f3f2f5",
  card: "#ffffff",
  text: "#17181d",
  muted: "#7c828d",
  seatFill: "#ffffff",
  seatBorder: "#d7dae2",
  availableRail: "#d1d5df",
  femaleRail: "#e45a9a",
  maleRail: "#79bfff",
  bookedFill: "#d3d6de",
  bookedRail: "#868d99",
  selectedFill: "#cfd3dd",
  selectedBorder: "#79bfff",
  selectedRail: "#868d99",
  footerBorder: "#e5e7ed",
  nextButton: "#e7a7b8",
  nextButtonDisabled: "#f1ccd6",
};

const LEGEND_ITEMS = [
  {
    key: "available",
    label: "Available",
    fill: COLORS.seatFill,
    borderColor: COLORS.seatBorder,
    railColor: COLORS.availableRail,
  },
  {
    key: "female",
    label: "For Female",
    fill: COLORS.seatFill,
    borderColor: COLORS.femaleRail,
    railColor: COLORS.femaleRail,
  },
  {
    key: "male",
    label: "For Male",
    fill: COLORS.seatFill,
    borderColor: COLORS.maleRail,
    railColor: COLORS.maleRail,
  },
  {
    key: "femaleBooked",
    label: "Female booked",
    fill: COLORS.bookedFill,
    borderColor: COLORS.femaleRail,
    railColor: COLORS.femaleRail,
  },
  {
    key: "booked",
    label: "Booked",
    fill: COLORS.bookedFill,
    borderColor: COLORS.bookedRail,
    railColor: COLORS.bookedRail,
  },
];

const normalizeAmount = (value) => {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
};

const formatPrice = (value = 0) =>
  `\u20B9${normalizeAmount(value).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const sortDefinitions = (definitions = []) =>
  [...definitions].sort((firstSeat, secondSeat) => {
    const rowDifference =
      (Number(firstSeat?.row) || 0) - (Number(secondSeat?.row) || 0);

    if (rowDifference !== 0) {
      return rowDifference;
    }

    return (Number(firstSeat?.column) || 0) - (Number(secondSeat?.column) || 0);
  });

const isSleeperSeat = (definition) =>
  Boolean(
    definition?.isSleeper ||
      String(definition?.seatType ?? "").toUpperCase() === "SLEEPER",
  );

const isUpperDeckSeat = (definition) =>
  Boolean(
    definition?.isUpper ||
      String(definition?.deck ?? "").toUpperCase() === "UPPER",
  );

const buildSeatRows = (definitions, columnsPerRow) => {
  const rowMap = new Map();

  sortDefinitions(definitions).forEach((definition) => {
    const rowNumber = Math.max(1, Number(definition?.row) || 1);
    const columnIndex = Math.max(0, (Number(definition?.column) || 1) - 1);

    if (!rowMap.has(rowNumber)) {
      rowMap.set(
        rowNumber,
        Array.from({ length: columnsPerRow }, () => null),
      );
    }

    const rowSeats = rowMap.get(rowNumber);

    while (rowSeats.length <= columnIndex) {
      rowSeats.push(null);
    }

    rowSeats[columnIndex] = definition;
  });

  return [...rowMap.entries()]
    .sort((firstRow, secondRow) => firstRow[0] - secondRow[0])
    .map(([rowNumber, seats]) => ({
      rowNumber,
      seats: Array.from(
        { length: columnsPerRow },
        (_, seatIndex) => seats[seatIndex] ?? null,
      ),
    }));
};

const SeaterSleeper2Plus1Hybrid = ({ navigation, route }) => {
  const busId = route?.params?.busId ?? DEFAULT_BUS_ID;
  const seededLayout = normalizeSeatLayoutPayload(
    route?.params?.seatLayout ?? null,
  );

  const [layout, setLayout] = useState(seededLayout);
  const [loading, setLoading] = useState(!seededLayout);
  const [error, setError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const fetchSeats = async () => {
      try {
        setSelectedSeats([]);
        setError("");

        if (seededLayout) {
          setLayout(seededLayout);
          setLoading(false);
          return;
        }

        const data = await fetchSeatLayout(busId);
        if (!isCancelled) {
          setLayout(data);
        }
      } catch (fetchError) {
        console.log(
          "Failed to fetch 2+1 hybrid seat layout:",
          fetchError?.message || fetchError,
        );

        if (!isCancelled && !seededLayout) {
          setLayout(null);
          setError("Unable to load seat layout.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchSeats();

    return () => {
      isCancelled = true;
    };
  }, [busId, reloadToken, seededLayout]);

  const seatMap = useMemo(
    () => new Map((layout?.seats ?? []).map((seat) => [seat.seatCode, seat])),
    [layout],
  );

  const groupedLayout = useMemo(() => {
    const definitions = layout?.seatDefinitions ?? [];

    const lowerSleepers = sortDefinitions(
      definitions.filter(
        (definition) =>
          !isUpperDeckSeat(definition) && isSleeperSeat(definition),
      ),
    );

    const lowerSeaterRows = buildSeatRows(
      definitions.filter(
        (definition) =>
          !isUpperDeckSeat(definition) && !isSleeperSeat(definition),
      ),
      2,
    );

    const upperSleeperRows = buildSeatRows(
      definitions.filter((definition) => isUpperDeckSeat(definition)),
      3,
    );

    return {
      lowerSleepers,
      lowerSeaterRows,
      upperSleeperRows,
    };
  }, [layout]);

  const selectedSeatLabel = useMemo(
    () =>
      selectedSeats.length > 0 ? selectedSeats.join(", ") : "No seat selected",
    [selectedSeats],
  );

  const totalPrice = useMemo(
    () =>
      selectedSeats.reduce((total, seatCode) => {
        const seat = seatMap.get(seatCode);

        return total + normalizeAmount(seat?.priceInr ?? layout?.priceInr);
      }, 0),
    [layout?.priceInr, seatMap, selectedSeats],
  );

  const toggleSeatSelection = (seatCode) => {
    const seat = seatMap.get(seatCode);

    if (!seat || seat.isBooked) {
      return;
    }

    setSelectedSeats((currentSeats) =>
      currentSeats.includes(seatCode)
        ? currentSeats.filter((currentSeatCode) => currentSeatCode !== seatCode)
        : [...currentSeats, seatCode],
    );
  };

  const handleNext = () => {
    if (selectedSeats.length === 0 || !navigation?.navigate) {
      return;
    }

    navigation.navigate("BordingNDroppingPoints", {
      ...route?.params,
      busId,
      selectedSeats,
      selectedSeatDetails: selectedSeats.map((seatCode) => {
        const seat = seatMap.get(seatCode) || {};
        const rawPrice = normalizeAmount(seat?.priceInr ?? layout?.priceInr);
        const rawBase = seat.Price?.BaseFare ?? seat.Price?.baseFare ?? seat.BaseFare ?? seat.baseFare ?? seat.SeatFare ?? rawPrice ?? 0;
        const rawGst = seat.Price?.GSTAmount ?? seat.Price?.gstAmount ?? seat.GSTAmount ?? seat.gstAmount ?? 0;

        return {
          seatCode,
          priceInr: rawPrice,
          baseFare: Number(rawBase),
          seatType: seat.SeatType ?? seat.seatType ?? "Seater",
          externalGst: Number(rawGst),
        };
      }),
      seatNumber: selectedSeats.join(", "),
      boardingPoints:
        route?.params?.boardingPoints ??
        layout?.boardingPoints ??
        route?.params?.bus?.boardingPoints ??
        [],
      droppingPoints:
        route?.params?.droppingPoints ??
        layout?.droppingPoints ??
        route?.params?.bus?.droppingPoints ??
        [],
    });
  };

  const getSeatColors = (seat, isSelected) => {
    const gender = String(seat?.gender ?? "").toLowerCase();
    const isFemale = gender === "female";
    const isMale = gender === "male";

    if (isSelected) {
      return {
        backgroundColor: COLORS.selectedFill,
        borderColor: COLORS.selectedBorder,
        railColor: COLORS.selectedRail,
      };
    }

    if (seat?.isBooked) {
      return {
        backgroundColor: COLORS.bookedFill,
        borderColor: isFemale ? COLORS.femaleRail : COLORS.bookedRail,
        railColor: isFemale ? COLORS.femaleRail : COLORS.bookedRail,
      };
    }

    return {
      backgroundColor: COLORS.seatFill,
      borderColor: isFemale
        ? COLORS.femaleRail
        : isMale
          ? COLORS.maleRail
          : COLORS.seatBorder,
      railColor: isFemale
        ? COLORS.femaleRail
        : isMale
          ? COLORS.maleRail
          : COLORS.availableRail,
    };
  };

  const renderSeat = (definition, variant = "seater") => {
    const isSleeper = variant === "sleeper" || isSleeperSeat(definition);

    if (!definition) {
      return (
        <View
          style={isSleeper ? styles.emptySleeperSeat : styles.emptySeaterSeat}
        />
      );
    }

    const seat = seatMap.get(definition.seatCode);
    const isSelected = selectedSeats.includes(definition.seatCode);
    const seatPrice = normalizeAmount(seat?.priceInr ?? layout?.priceInr);
    const colors = getSeatColors(seat, isSelected);

    return (
      <TouchableOpacity
        key={definition.seatCode}
        activeOpacity={0.85}
        disabled={!seat || seat.isBooked}
        onPress={() => toggleSeatSelection(definition.seatCode)}
        style={[
          styles.seatShell,
          isSleeper ? styles.sleeperSeat : styles.seaterSeat,
          {
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        {!seat?.isBooked && !isSelected ? (
          <Text style={[styles.seatPrice, isSleeper && styles.sleeperSeatPrice]}>
            {formatPrice(seatPrice)}
          </Text>
        ) : null}

        <View style={[styles.seatRail, { backgroundColor: colors.railColor }]} />
      </TouchableOpacity>
    );
  };

  if (loading && !layout) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={COLORS.nextButton} />
        <Text style={styles.statusText}>Loading seat layout...</Text>
      </View>
    );
  }

  if (!layout) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.statusText}>{error || "Unable to load seat layout."}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setReloadToken((currentToken) => currentToken + 1)}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.legendContainer}>
            {LEGEND_ITEMS.map((item) => (
              <View key={item.key} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSeat,
                    {
                      backgroundColor: item.fill,
                      borderColor: item.borderColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.legendSeatRail,
                      { backgroundColor: item.railColor },
                    ]}
                  />
                </View>
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionsRow}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Lower</Text>
                <MaterialCommunityIcons
                  name="steering"
                  size={30}
                  color="#a4a9b2"
                />
              </View>

              <View style={styles.lowerDeckBody}>
                <View style={styles.lowerSleeperColumn}>
                  {groupedLayout.lowerSleepers.map((definition) => (
                    <View
                      key={`lower-sleeper-${definition.seatCode}`}
                      style={styles.lowerSleeperSlot}
                    >
                      {renderSeat(definition, "sleeper")}
                    </View>
                  ))}
                </View>

                <View style={styles.lowerSeaterColumn}>
                  {groupedLayout.lowerSeaterRows.map((row) => (
                    <View
                      key={`lower-seater-row-${row.rowNumber}`}
                      style={styles.lowerSeaterRow}
                    >
                      {row.seats.map((definition, seatIndex) => (
                        <React.Fragment
                          key={`lower-seater-${row.rowNumber}-${seatIndex}`}
                        >
                          {renderSeat(definition, "seater")}
                        </React.Fragment>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upper</Text>
              </View>

              <View style={styles.upperDeckBody}>
                {groupedLayout.upperSleeperRows.map((row) => (
                  <View
                    key={`upper-row-${row.rowNumber}`}
                    style={styles.upperSleeperRow}
                  >
                    {row.seats.map((definition, seatIndex) => (
                      <React.Fragment
                        key={`upper-seat-${row.rowNumber}-${seatIndex}`}
                      >
                        {renderSeat(definition, "sleeper")}
                      </React.Fragment>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text numberOfLines={1} style={styles.footerSelectedText}>
              {selectedSeatLabel}
            </Text>
            <Text style={styles.footerPriceText}>
              {formatPrice(totalPrice)} | {selectedSeats.length} Seat
              {selectedSeats.length !== 1 ? "s" : ""}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={selectedSeats.length === 0}
            onPress={handleNext}
            style={[
              styles.nextButton,
              selectedSeats.length === 0 && styles.nextButtonDisabled,
            ]}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SeaterSleeper2Plus1Hybrid;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.screen,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.screen,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 80,
    flexGrow: 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.screen,
  },
  statusText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.muted,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.nextButton,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginBottom: 18,
  },
  legendItem: {
    width: "19%",
    minWidth: 58,
    alignItems: "center",
    marginBottom: 14,
  },
  legendSeat: {
    width: 30,
    height: 30,
    borderRadius: 11,
    borderWidth: 1.2,
    backgroundColor: "#ffffff",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 8,
  },
  legendSeatRail: {
    width: "72%",
    height: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  legendText: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.text,
    textAlign: "center",
  },
  sectionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionCard: {
    width: "48.5%",
    backgroundColor: COLORS.card,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 18,
    shadowColor: "#20242d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  lowerDeckBody: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  lowerSleeperColumn: {
    marginRight: 10,
  },
  lowerSleeperSlot: {
    marginBottom: 12,
  },
  lowerSeaterColumn: {
    flex: 1,
  },
  lowerSeaterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  upperDeckBody: {
    width: "100%",
  },
  upperSleeperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  seatShell: {
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  sleeperSeat: {
    width: 40,
    height: 112,
    borderRadius: 14,
    paddingHorizontal: 4,
  },
  seaterSeat: {
    width: 38,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  emptySleeperSeat: {
    width: 40,
    height: 112,
  },
  emptySeaterSeat: {
    width: 38,
    height: 50,
  },
  seatPrice: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  sleeperSeatPrice: {
    fontSize: 10,
  },
  seatRail: {
    position: "absolute",
    bottom: 0,
    width: "74%",
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.footerBorder,
    backgroundColor: "#ffffff",
  },
  footerSummary: {
    flex: 1,
    marginRight: 12,
  },
  footerSelectedText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  footerPriceText: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  nextButton: {
    minWidth: 118,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: COLORS.nextButton,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.nextButtonDisabled,
  },
  nextButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
});
