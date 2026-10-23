import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";

import {
  fetchSeatLayout,
  normalizeSeatLayoutPayload,
} from "../utils/seatLayout";

import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from "../theme/busSeatTheme";
import SeatLegend from "../components/busSeats/SeatLegend";
import SeatItem from "../components/busSeats/SeatItem";
import ExitIndicator from "../components/busSeats/ExitIndicator";
import DriverIndicator from "../components/busSeats/DriverIndicator";
import SeatBottomSheet from "../components/busSeats/SeatBottomSheet";
import SeatLayoutHeader from "../components/busSeats/SeatLayoutHeader";
import SeatPriceFilters from "../components/busSeats/SeatPriceFilters";

const DEFAULT_BUS_ID = 658;
const CELL_GAP = 4;
const ROW_GAP = 6;
const AISLE_W = 18;
const CARD_PADDING = 8;

/* ── Vertical Coach Helpers ── */
const normalizeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatPrice = (value = 0) =>
  `\u20B9${Math.round(normalizeAmount(value))}`;

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTripDate = (value) => {
  const parsed = parseDateValue(value);
  if (parsed) {
    return parsed.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return "Thu 11 Jun 2026";
};

const formatTripTime = (value) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  const parsed = parseDateValue(value);
  if (parsed) {
    return parsed.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return "21:40";
};

const getSeatDeckKey = (definition = {}) => {
  const explicitDeck = String(definition?.deck ?? "").toLowerCase();
  if (explicitDeck.includes("upper") || definition?.isUpper) return "UPPER";
  return "LOWER";
};

const isHorizontalSleeper = (definition = {}) => {
  const seatType = String(definition?.seatType ?? definition?.SeatType ?? "").toUpperCase();
  if (seatType.includes("VERTICAL")) return false;
  if (definition?.isSleeper || seatType.includes("HORIZONTAL") || (seatType.includes("SLEEPER") && !seatType.includes("SEATER"))) {
    return true;
  }
  return false;
};

const getSeatPrice = (seat, layoutPrice) =>
  normalizeAmount(seat?.priceInr ?? seat?.price ?? layoutPrice);

/* ── Build Deck Data ── */
const buildDeckData = (layout) => {
  const seatDefinitions = Array.isArray(layout?.seatDefinitions) &&
    layout.seatDefinitions.length > 0
    ? layout.seatDefinitions
    : Array.isArray(layout?.seats)
      ? layout.seats
      : [];

  const grouped = seatDefinitions.reduce((acc, def) => {
    const deckKey = getSeatDeckKey(def);
    if (!acc[deckKey]) acc[deckKey] = [];
    acc[deckKey].push(def);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([deckKey, definitions], index) => ({
      key: `${deckKey.toLowerCase()}-${index}`,
      title: deckKey === "UPPER" ? "Upper" : "Lower",
      isLower: deckKey !== "UPPER",
      definitions,
      aisleAfterGridRow: definitions[0]?.aisleAfterGridRow ?? layout?.aisleAfterGridRow ?? -1,
    }))
    .sort((a, b) => (a.isLower === b.isLower ? 0 : a.isLower ? -1 : 1));
};

const buildTitleFromRoute = (route) => {
  const from = route?.params?.from || route?.params?.sourceCity || "Hyderabad";
  const to = route?.params?.to || route?.params?.destinationCity || "Kadapa";
  return `${from} \u2192 ${to}`;
};

const buildSubtitleFromRoute = (route) => {
  const dateValue =
    route?.params?.dateValue || route?.params?.date ||
    route?.params?.travelDate || route?.params?.journeyDate ||
    route?.params?.departureDate;
  const timeValue =
    route?.params?.time || route?.params?.departureTime ||
    route?.params?.departureTimeUtc || route?.params?.departureHour;
  const operator =
    route?.params?.operatorName || route?.params?.bus?.operatorName || "CMR Express";
  return `${formatTripDate(dateValue)} \u2022 ${formatTripTime(timeValue)}\n${operator}`;
};



/* ── Deck Header Component ── */
const CompactDeckHeader = memo(({ title, isLower }) => (
  <View style={styles.deckHeader}>
    <Text style={styles.deckTitle}>{title}</Text>
    {isLower && <DriverIndicator inline style={{ marginLeft: 4 }} />}
  </View>
));

/* ── Dynamic Symmetrical Deck Container Card ── */
const DeckCardContainer = memo(
  ({
    deck,
    onPressSeat,
    seatMap,
    selectedSeatSet,
    selectedPrice,
    layoutPrice,
    availableCanvasHeight,
    availableCanvasWidth,
    showDeckHeader = false,
  }) => {
    const seats = deck.definitions;

    const { maxGridRow, maxGridCol, hasAisle, aisleAfterRow, columnMap } = useMemo(() => {
      let mr = 0;
      let mc = 0;
      seats.forEach((s) => {
        const gr = s.gridRow ?? 0;
        if (!s.isRearRow && gr > mr) mr = gr;
        const gc = Number(s.gridCol ?? s.row ?? s.column ?? 0);
        const span = isHorizontalSleeper(s) ? 2 : 1;
        if (gc + span - 1 > mc) mc = gc + span - 1;
      });

      const uniqueGridRows = [...new Set(seats.filter(s => !s.isRearRow).map((s) => s.gridRow ?? 0))].sort((a, b) => a - b);
      const cMap = new Map();
      uniqueGridRows.forEach((rawRow, idx) => cMap.set(rawRow, idx));

      let aisleDetected = true;
      let aisleRow = deck.aisleAfterGridRow ?? 1;

      return {
        maxGridRow: Math.max(3, mr),
        maxGridCol: mc,
        hasAisle: aisleDetected,
        aisleAfterRow: aisleRow < 0 ? 1 : aisleRow,
        columnMap: cMap,
      };
    }, [seats, deck.aisleAfterGridRow]);

    const maxMappedCol = useMemo(() => {
      let m = 0;
      seats.forEach((s) => {
        if (!s.isRearRow) {
          const rawGridRow = s.gridRow ?? 0;
          const mappedCol = columnMap.get(rawGridRow) ?? rawGridRow;
          if (mappedCol > m) m = mappedCol;
        }
      });
      // A 2+1 deck has three lanes. Keeping a fourth forced lane leaves a
      // large unused strip on the right side of both deck cards.
      return Math.max(2, m);
    }, [seats, columnMap]);

    const totalCols = maxMappedCol + 1;
    const totalRows = maxGridCol + 1;
    const passengerSeats = seats.filter((seat) => !seat.isSpecial);
    const isSeaterOnlyDeck =
      passengerSeats.length > 0 &&
      passengerSeats.every((seat) => !isHorizontalSleeper(seat));

    // Responsive Dimension Calculations
    const CARD_PADDING = 8;
    const AISLE_W = 16;
    const CELL_GAP = isSeaterOnlyDeck ? 6 : 4;
    const ROW_GAP = isSeaterOnlyDeck ? 10 : 5;
    const seatCanvasTop = 18;

    // Keep the original seat scale while allowing a 2+1 deck to use only
    // three lanes. Otherwise the three lanes expand to fill the old width.
    const sizingCols = Math.max(totalCols, 4);
    const rawCellW = (availableCanvasWidth - CARD_PADDING * 2 - (hasAisle && sizingCols > 1 ? AISLE_W : 0)) / sizingCols;
    // Keep mixed seater/sleeper decks on their established responsive width.
    // Pure-seater decks use the proven compact Seater geometry instead of
    // stretching each seat to consume all available card width.
    const seaterOnlyWidth = Math.min(38, Math.max(28, rawCellW - CELL_GAP));
    const cellW = isSeaterOnlyDeck
      ? seaterOnlyWidth + CELL_GAP
      : Math.max(28, rawCellW);

    const gridTotalW = cellW * totalCols + (hasAisle && totalCols > 1 ? AISLE_W : 0);
    const offsetX = Math.max(0, (availableCanvasWidth - CARD_PADDING * 2 - gridTotalW) / 2);

    // Match the dedicated Seater component's 38:40 seat ratio and spacing on
    // pure-seater decks. Preserve the existing mixed-layout vertical rhythm.
    const SEATER_W_DYN = isSeaterOnlyDeck
      ? seaterOnlyWidth
      : cellW - CELL_GAP;
    const SEATER_H_DYN = isSeaterOnlyDeck
      ? Math.round(SEATER_W_DYN * (40 / 38))
      : 27;
    const cellH = isSeaterOnlyDeck ? SEATER_H_DYN + ROW_GAP : 32;
    const SLEEPER_W_DYN = SEATER_W_DYN;
    const SLEEPER_H_DYN = SEATER_H_DYN * 2 + ROW_GAP;

    // Lower-deck sleepers occupy two physical vertical slots. Resolve the
    // required top per lane first, then share the greatest top for every
    // physical row so seats across the same row stay horizontally aligned.
    const lowerRowTopMap = useMemo(() => {
      if (!deck.isLower) return null;

      const laneRows = new Map();
      // Exits are part of the physical lane layout. Include them while
      // resolving lower-deck tops so sleepers are placed below the roof exit
      // instead of being allowed to occupy the same vertical space.
      seats.forEach((seat) => {
        const lane = columnMap.get(seat.gridRow ?? 0) ?? seat.gridRow ?? 0;
        const row = Number(seat.gridCol ?? seat.row ?? 0);
        if (!laneRows.has(lane)) laneRows.set(lane, []);
        laneRows.get(lane).push({ seat, row });
      });

      const laneTops = new Map();
      const rowTops = new Map();
      laneRows.forEach((laneSeats) => {
        let previousBottom = -Infinity;
        laneSeats.sort((a, b) => a.row - b.row).forEach(({ seat, row }) => {
          if (seat.isSpecial) {
            previousBottom = Math.max(previousBottom, row * cellH + cellH);
            return;
          }
          const height = isHorizontalSleeper(seat) ? SLEEPER_H_DYN : SEATER_H_DYN;
          const top = Math.max(row * cellH, previousBottom + ROW_GAP);
          laneTops.set(seat.seatCode, { row, top });
          rowTops.set(row, Math.max(rowTops.get(row) ?? 0, top));
          previousBottom = top + height;
        });
      });

      const tops = new Map();
      laneTops.forEach(({ row }, seatCode) => {
        tops.set(seatCode, rowTops.get(row) ?? row * cellH);
      });
      return tops;
    }, [deck.isLower, seats, columnMap, cellH, ROW_GAP, SEATER_H_DYN, SLEEPER_H_DYN]);

    const getSeatTop = useCallback(
      (seat, gridC) => lowerRowTopMap?.get(seat.seatCode) ?? gridC * cellH,
      [lowerRowTopMap, cellH],
    );

    const actualCanvasHeight = useMemo(() => {
      let bottom = cellH * totalRows;
      seats.filter((seat) => !seat.isSpecial).forEach((seat) => {
        const gridC = Number(seat.gridCol ?? seat.row ?? 0);
        const height = isHorizontalSleeper(seat) ? SLEEPER_H_DYN : SEATER_H_DYN;
        bottom = Math.max(bottom, getSeatTop(seat, gridC) + height);
      });
      return bottom;
    }, [cellH, totalRows, seats, SLEEPER_H_DYN, SEATER_H_DYN, getSeatTop]);

    const getGridLeft = useCallback((seat, itemWidth) => {
      const isRear = Boolean(seat.isRearRow || (Number(seat.gridCol ?? seat.row ?? 0) === totalRows - 1 && seat.gridRow === 4));
      if (isRear) {
        const rearStep = (gridTotalW - itemWidth) / 4;
        const rearColIndex = Math.min(4, Math.max(0, seat.gridRow ?? seat.normalizedColumn ?? 0));
        return offsetX + rearColIndex * rearStep;
      }

      const rawGridRow = seat.gridRow ?? 0;
      const mappedCol = columnMap.get(rawGridRow) ?? rawGridRow;
      const effectiveCol = Math.max(0, Math.min(mappedCol, totalCols - 1));
      const aisleOff = hasAisle && effectiveCol > aisleAfterRow ? AISLE_W : 0;
      return offsetX + effectiveCol * cellW + aisleOff;
    }, [aisleAfterRow, cellW, columnMap, gridTotalW, hasAisle, offsetX, totalCols, totalRows]);

    const deckOpacity = useSharedValue(0);
    const deckTranslateY = useSharedValue(8);
    const seatsOpacity = useSharedValue(0);

    useEffect(() => {
      deckOpacity.value = withTiming(1, { duration: 250 });
      deckTranslateY.value = withTiming(0, { duration: 250 });
      seatsOpacity.value = withDelay(120, withTiming(1, { duration: 250 }));
    }, []);

    const deckAnimatedStyle = useAnimatedStyle(() => ({
      opacity: deckOpacity.value,
      transform: [{ translateY: deckTranslateY.value }],
    }));

    const seatsAnimatedStyle = useAnimatedStyle(() => ({
      opacity: seatsOpacity.value,
    }));

    return (
      <Animated.View style={[styles.deckCard, { width: availableCanvasWidth }, BUS_SEAT_SHADOWS.soft, deckAnimatedStyle]}>
        {showDeckHeader && <CompactDeckHeader title={deck.title} isLower={deck.isLower} />}
        <View style={styles.cabinDivider} />
        <Animated.View style={[styles.deckCanvasWrapper, { height: actualCanvasHeight + seatCanvasTop }, seatsAnimatedStyle]}>
          {seats.map((seat) => {
            if (seat.isSpecial) return null;

            const isSelected = selectedSeatSet.has(seat.seatCode);
            const seatPrice = getSeatPrice(seat, layoutPrice);
            const isFilteredOut =
              selectedPrice !== null &&
              selectedPrice !== seatPrice &&
              !seat.isBooked &&
              !isSelected;

            const gridC = Number(seat.gridCol ?? seat.row ?? 0);
            const isH = isHorizontalSleeper(seat);
            const seatWidthMult = Number(seat.width ?? seat.Width ?? 1);

            const baseW = isH ? SLEEPER_W_DYN : SEATER_W_DYN;
            const seatW = seatWidthMult > 1
              ? baseW * seatWidthMult + CELL_GAP * (seatWidthMult - 1)
              : baseW;
            const renderedHeight = isH ? SLEEPER_H_DYN : SEATER_H_DYN;

            const left = getGridLeft(seat, seatW);

            const top = seatCanvasTop + getSeatTop(seat, gridC);

            return (
              <SeatItem
                key={seat.seatCode}
                seat={seat}
                isSelected={isSelected}
                isFilteredOut={isFilteredOut}
                onPressSeat={onPressSeat}
                layoutPrice={layoutPrice}
                width={seatW}
                height={renderedHeight}
                left={left}
                top={top}
                isSleeper={isH}
                staggerIndex={gridC}
              />
            );
          })}
          {seats
            .filter((seat) => seat.isExit && seat.exitType === "BACK_EXIT")
            .sort(
              (a, b) =>
                Number(b.gridCol ?? b.column ?? 0) -
                Number(a.gridCol ?? a.column ?? 0),
            )
            .slice(0, 1)
            .map((exit) => {
            // Keep the marker wide enough for the complete label, but anchor
            // its center to the actual API slot (RowNo/ColumnNo, represented
            // here by the normalized gridRow/gridCol values).
            const markerWidth = 78;
            const gridC = Number(exit.gridCol ?? exit.column ?? 0);
            const markerLaneLeft = getGridLeft(exit, cellW);
            return (
              <ExitIndicator
                key={`exit-${exit.seatCode}`}
                type={exit.exitType}
                seatName={exit.seatName}
                deck={deck.title}
                row={exit.row}
                column={exit.column}
                anchor={{ gridRow: exit.gridRow, gridCol: exit.gridCol }}
                width={markerWidth}
                height={cellH}
                containerHeight={actualCanvasHeight + seatCanvasTop}
                left={markerLaneLeft + (cellW - markerWidth) / 2}
                top={seatCanvasTop + gridC * cellH}
              />
            );
          })}
        </Animated.View>
      </Animated.View>
    );
  }
);

/* ══════════════════════════════════════════════════════════════
   ── Main Screen Component ──
   ══════════════════════════════════════════════════════════════ */
const SeaterSleeper2Plus1Standard = ({ navigation, route }) => {
  const { width: screenWidth } = Dimensions.get("window");
  const busId = route?.params?.busId ?? DEFAULT_BUS_ID;
  const seededLayout = normalizeSeatLayoutPayload(route?.params?.seatLayout ?? null);
  const insets = useSafeAreaInsets();

  const [layout, setLayout] = useState(seededLayout);
  const [loading, setLoading] = useState(!seededLayout);
  const [error, setError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const layoutRef = useRef(layout);

  const [seatAreaSize, setSeatAreaSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const handleSeatAreaLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    if (Math.abs(width - seatAreaSize.width) > 5 || Math.abs(height - seatAreaSize.height) > 5) {
      setSeatAreaSize({ width, height });
    }
  };

  const fetchSeats = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        setError("");
        const data = await fetchSeatLayout(busId);
        setLayout(data);
      } catch (fetchError) {
        console.log(
          "Failed to load standard seat layout:",
          fetchError?.message || fetchError,
        );
        if (!layoutRef.current) {
          setLayout(null);
          setError("Unable to load seat layout.");
        }
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [busId],
  );

  useEffect(() => {
    setSelectedSeats([]);
    if (seededLayout) {
      setLayout(seededLayout);
      setLoading(false);
      return;
    }
    fetchSeats(true);
  }, [busId, fetchSeats, seededLayout]);

  const seatMap = useMemo(
    () => new Map((layout?.seats ?? []).map((seat) => [seat?.seatCode, seat])),
    [layout],
  );

  const deckCards = useMemo(() => buildDeckData(layout), [layout]);
  const selectedSeatSet = useMemo(() => new Set(selectedSeats), [selectedSeats]);

  const lowerDeckData = useMemo(() => deckCards.find(d => d.isLower), [deckCards]);
  const upperDeckData = useMemo(() => deckCards.find(d => !d.isLower), [deckCards]);

  const priceFilters = useMemo(() => {
    const seatPrices = Array.from(
      new Set(
        (layout?.seats ?? [])
          .filter((seat) => !seat?.isSpecial)
          .map((seat) => getSeatPrice(seat, layout?.priceInr))
          .filter((price) => price > 0),
      ),
    );
    return seatPrices.sort((a, b) => a - b);
  }, [layout]);

  useEffect(() => {
    if (selectedPrice !== null && !priceFilters.includes(selectedPrice)) {
      setSelectedPrice(null);
    }
  }, [priceFilters, selectedPrice]);

  const totalPrice = useMemo(
    () =>
      selectedSeats.reduce((total, seatCode) => {
        const seat = seatMap.get(seatCode);
        return total + getSeatPrice(seat, layout?.priceInr);
      }, 0),
    [layout?.priceInr, seatMap, selectedSeats],
  );

  const title = useMemo(() => buildTitleFromRoute(route), [route]);
  const subtitle = useMemo(() => buildSubtitleFromRoute(route), [route]);
  const operatorName = useMemo(
    () => route?.params?.operatorName || route?.params?.bus?.operatorName || "CMR Express",
    [route],
  );
  const busRating = useMemo(
    () =>
      route?.params?.bus?.rating ??
      route?.params?.bus?.Rating ??
      route?.params?.bus?.starRating ??
      route?.params?.bus?.StarRating ??
      route?.params?.rating ??
      null,
    [route],
  );

  const handlePressSeat = useCallback((seatCode) => {
    if (!seatCode) return;
    setSelectedSeats((current) => {
      const seat = seatMap.get(seatCode);
      if (!seat || Boolean(seat?.isBooked)) return current;
      if (current.includes(seatCode)) {
        return current.filter((c) => c !== seatCode);
      }
      return [...current, seatCode];
    });
  }, [seatMap]);

  const handleNext = useCallback(() => {
    if (selectedSeats.length === 0 || !navigation?.navigate) return;
    navigation.navigate("BordingNDroppingPoints", {
      ...route?.params,
      busId,
      selectedSeats,
      selectedSeatDetails: selectedSeats.map((seatCode) => {
        const seat = seatMap.get(seatCode) || {};
        const rawPrice = getSeatPrice(seat, layout?.priceInr);
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
        route?.params?.boardingPoints ?? layout?.boardingPoints ?? route?.params?.bus?.boardingPoints ?? [],
      droppingPoints:
        route?.params?.droppingPoints ?? layout?.droppingPoints ?? route?.params?.bus?.droppingPoints ?? [],
    });
  }, [busId, layout?.boardingPoints, layout?.droppingPoints, layout?.priceInr, navigation, route?.params, seatMap, selectedSeats]);

  const numDecks = (lowerDeckData ? 1 : 0) + (upperDeckData ? 1 : 0);
  // Keep both deck cards in the viewport. The deck renderer scales its three
  // lanes to this width, while the outer seat area still scrolls vertically.
  const deckGap = 6;
  const deckOuterPadding = 24;
  const availableDeckWidth = numDecks === 2
    ? Math.max(138, (seatAreaSize.width - deckOuterPadding - deckGap) / 2)
    : Math.min(360, Math.max(0, seatAreaSize.width - 24));

  /* ── Render States ── */
  if (loading && !layout) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={BUS_SEAT_COLORS.primaryRed} />
          <Text style={styles.statusText}>Loading seat layout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!layout) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.centerContent}>
          <Text style={styles.statusText}>{error || "Unable to load seat layout."}</Text>
          <Pressable onPress={() => fetchSeats(true)} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.screen}>
        {/* Fixed Top Content (Header, Legend, Filters) */}
        <View style={styles.fixedTopContent}>
          <SeatLayoutHeader
            title={title}
            subtitle={subtitle}
            onBackPress={() => navigation?.goBack?.()}
          />

          <SeatLegend />

          <View style={styles.legendDivider} />

          <SeatPriceFilters
            priceFilters={priceFilters}
            selectedPrice={selectedPrice}
            onSelectPrice={setSelectedPrice}
          />
        </View>

        {/* Flexible Seat Content Area */}
        <View style={styles.seatContent} onLayout={handleSeatAreaLayout}>
          {seatAreaSize.height > 0 && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 8, alignItems: "center" }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.decksRowContainer}>
                {lowerDeckData && (
                  <DeckCardContainer
                    deck={lowerDeckData}
                    onPressSeat={handlePressSeat}
                    seatMap={seatMap}
                    selectedSeatSet={selectedSeatSet}
                    selectedPrice={selectedPrice}
                    layoutPrice={layout?.priceInr}
                    availableCanvasHeight={seatAreaSize.height}
                    availableCanvasWidth={availableDeckWidth}
                    showDeckHeader={numDecks > 1}
                  />
                )}

                {upperDeckData && (
                  <DeckCardContainer
                    deck={upperDeckData}
                    onPressSeat={handlePressSeat}
                    seatMap={seatMap}
                    selectedSeatSet={selectedSeatSet}
                    selectedPrice={selectedPrice}
                    layoutPrice={layout?.priceInr}
                    availableCanvasHeight={seatAreaSize.height}
                    availableCanvasWidth={availableDeckWidth}
                    showDeckHeader={numDecks > 1}
                  />
                )}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Flex Booking Footer */}
        <View>
          <SeatBottomSheet
            selectedSeats={selectedSeats}
            totalPrice={totalPrice}
            onNext={handleNext}
            disabled={selectedSeats.length === 0}
            insets={insets}
            operatorName={operatorName}
            rating={busRating}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SeaterSleeper2Plus1Standard;

/* ══════════════════════════════════════════════════════════════
   ── Styles ──
   ══════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BUS_SEAT_COLORS.background,
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fixedTopContent: {
    flexShrink: 0,
  },
  seatContent: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: BUS_SEAT_COLORS.background,
  },
  statusText: {
    marginTop: 12,
    color: BUS_SEAT_COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: BUS_SEAT_COLORS.primaryRed,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  legendDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    width: "100%",
  },

  /* ── Responsive Decks Row Container ── */
  decksRowContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
    width: "100%",
  },

  /* ── Deck Card Base Style ── */
  deckCard: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 77, 77, 0.22)",
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 4,
    alignSelf: "center",
  },
  deckHeader: {
    height: 28,
    flexDirection: "row",
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  deckTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BUS_SEAT_COLORS.textPrimary,
  },
  driverRow: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },
  cabinDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginTop: 1,
    marginBottom: 3,
    width: "100%",
  },
  deckCanvasWrapper: {
    position: "relative",
    width: "100%",
  },
});
