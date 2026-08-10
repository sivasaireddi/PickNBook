import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "react-native-size-matters";

import {
  fetchSeatLayout,
  normalizeSeatLayoutPayload,
} from "../utils/seatLayout";

import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from "../theme/busSeatTheme";
import SeatLegend from "../components/busSeats/SeatLegend";
import SeatItem from "../components/busSeats/SeatItem";
import DeckHeader from "../components/busSeats/DeckHeader";
import DriverIndicator from "../components/busSeats/DriverIndicator";
import SeatBottomSheet from "../components/busSeats/SeatBottomSheet";

const DEFAULT_BUS_ID = 658;
const SLEEPER_W = 33;
const SLEEPER_H = 79;
const SEATER_H = 35;
const CELL_GAP = 5;
const ROW_GAP = 9;
const AISLE_W = 12;
const CARD_PADDING = 10;

const normalizeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatPrice = (value = 0) =>
  `\u20B9${Math.round(normalizeAmount(value))}`;

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
      title: deckKey === "UPPER" ? "Upper Deck" : "Lower Deck",
      isLower: deckKey !== "UPPER",
      definitions,
      aisleAfterGridRow: definitions[0]?.aisleAfterGridRow ?? layout?.aisleAfterGridRow ?? -1,
    }))
    .sort((a, b) => (a.isLower === b.isLower ? 0 : a.isLower ? -1 : 1));
};

const PriceChip = memo(({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.priceChip,
      BUS_SEAT_SHADOWS.card,
      active && styles.priceChipActive,
      pressed && styles.priceChipPressed,
    ]}
  >
    <Text style={[styles.priceChipText, active && styles.priceChipTextActive]}>
      {label}
    </Text>
  </Pressable>
));

const DeckCard = memo(
  ({
    deck,
    onPressSeat,
    seatMap,
    selectedSeatSet,
    selectedPrice,
    layoutPrice,
    cardWidth,
    cardCanvasHeight,
  }) => {
    const seats = deck.definitions;

    const { maxGridRow, hasAisle, aisleAfterRow, columnMap } = useMemo(() => {
      let mr = 0;
      seats.forEach((s) => {
        const gr = s.gridRow ?? 0;
        if (gr > mr) mr = gr;
      });

      const uniqueGridRows = [...new Set(seats.map((s) => s.gridRow ?? 0))].sort((a, b) => a - b);
      const cMap = new Map();
      uniqueGridRows.forEach((rawRow, idx) => cMap.set(rawRow, idx));

      let aisleDetected = false;
      let aisleRow = deck.aisleAfterGridRow ?? -1;

      if (aisleRow !== -1 && aisleRow < mr) {
        aisleDetected = true;
      } else if (mr >= 2) {
        aisleDetected = true;
        aisleRow = 1;
      }

      return {
        maxGridRow: mr,
        hasAisle: aisleDetected,
        aisleAfterRow: aisleRow,
        columnMap: cMap,
      };
    }, [seats, deck.aisleAfterGridRow]);

    const actualCardWidth = useMemo(() => {
      let maxCol = 0;
      seats.forEach((s) => {
        const rawGridRow = s.gridRow ?? 0;
        const mappedCol = columnMap.get(rawGridRow) ?? rawGridRow;
        if (mappedCol > maxCol) maxCol = mappedCol;
      });

      const cellW = SLEEPER_W + CELL_GAP;
      const aisleOff = hasAisle && maxCol > 1 ? AISLE_W : 0;
      return CARD_PADDING + (maxCol + 1) * cellW - CELL_GAP + aisleOff + CARD_PADDING + 6;
    }, [seats, columnMap, hasAisle]);

    const cellW = SLEEPER_W + CELL_GAP;
    const cellH = SEATER_H + ROW_GAP;

    return (
      <View style={[styles.deckCard, BUS_SEAT_SHADOWS.soft, { width: actualCardWidth }]}>
        <DeckHeader title={deck.title} />
        {deck.isLower && <DriverIndicator />}
        <View style={styles.cabinDivider} />

        <View style={{ height: cardCanvasHeight, position: "relative", width: "100%" }}>
          {seats.map((seat) => {
            const isSelected = selectedSeatSet.has(seat.seatCode);
            const seatPrice = getSeatPrice(seat, layoutPrice);
            const isFilteredOut =
              selectedPrice !== null &&
              selectedPrice !== seatPrice &&
              !seat.isBooked &&
              !isSelected;

            const rawGridRow = seat.gridRow ?? 0;
            const mappedCol = columnMap.get(rawGridRow) ?? rawGridRow;
            const aisleOff = hasAisle && mappedCol > 1 ? AISLE_W : 0;

            const left = CARD_PADDING + mappedCol * cellW + aisleOff;
            const gridC = Number(seat.column ?? seat.gridCol ?? seat.ColumnNo ?? 0);
            const top = CARD_PADDING + gridC * cellH;

            const isH = isHorizontalSleeper(seat);
            const renderedHeight = isH ? SLEEPER_H : SEATER_H;

            return (
              <SeatItem
                key={seat.seatCode}
                seat={seat}
                isSelected={isSelected}
                isFilteredOut={isFilteredOut}
                onPressSeat={onPressSeat}
                layoutPrice={layoutPrice}
                width={SLEEPER_W}
                height={renderedHeight}
                left={left}
                top={top}
                isSleeper={isH}
              />
            );
          })}
        </View>
      </View>
    );
  },
);

const Sleeper = ({ navigation, route }) => {
  const busId = route?.params?.busId ?? DEFAULT_BUS_ID;
  const seededLayout = normalizeSeatLayoutPayload(route?.params?.seatLayout ?? null);
  const insets = useSafeAreaInsets();

  const [layout, setLayout] = useState(seededLayout);
  const [loading, setLoading] = useState(!seededLayout);
  const [error, setError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState(null);

  const fetchSeats = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        setError("");
        const data = await fetchSeatLayout(busId);
        setLayout(data);
      } catch (fetchError) {
        setLayout(null);
        setError("Unable to load seat layout.");
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

  const { unifiedCardWidth, unifiedCanvasHeight } = useMemo(() => {
    let maxDeckCols = 3;
    let maxCanvasBottom = 380;

    deckCards.forEach((deck) => {
      const uniqueGridRows = [...new Set(deck.definitions.map((s) => s.gridRow ?? 0))];
      if (uniqueGridRows.length > maxDeckCols) maxDeckCols = uniqueGridRows.length;

      deck.definitions.forEach((seat) => {
        const gc = Number(seat.column ?? seat.gridCol ?? seat.ColumnNo ?? 0);
        const isH = isHorizontalSleeper(seat);
        const cellH = 50;
        const topPos = CARD_PADDING + gc * cellH;
        const hPos = isH ? SLEEPER_H : SEATER_H;
        const bottomPos = topPos + hPos;
        if (bottomPos > maxCanvasBottom) maxCanvasBottom = bottomPos;
      });
    });

    const dynWidth = maxDeckCols >= 5 ? 268 : maxDeckCols >= 4 ? 224 : 180;
    return {
      unifiedCardWidth: dynWidth,
      unifiedCanvasHeight: maxCanvasBottom + CARD_PADDING,
    };
  }, [deckCards]);

  const priceFilters = useMemo(() => {
    const seatPrices = Array.from(
      new Set(
        (layout?.seats ?? [])
          .map((seat) => getSeatPrice(seat, layout?.priceInr))
          .filter((price) => price > 0),
      ),
    );
    return seatPrices.sort((a, b) => a - b);
  }, [layout]);

  const totalPrice = useMemo(
    () =>
      selectedSeats.reduce((total, seatCode) => {
        const seat = seatMap.get(seatCode);
        return total + getSeatPrice(seat, layout?.priceInr);
      }, 0),
    [layout?.priceInr, seatMap, selectedSeats],
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
      seatNumber: selectedSeats.join(", "),
    });
  }, [busId, navigation, route?.params, selectedSeats]);

  if (loading && !layout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={BUS_SEAT_COLORS.primaryRed} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation?.goBack?.()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={BUS_SEAT_COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Sleeper Coach</Text>
        </View>

        <SeatLegend />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <PriceChip label="All" active={selectedPrice === null} onPress={() => setSelectedPrice(null)} />
              {priceFilters.map((price) => (
                <PriceChip key={price} label={formatPrice(price)} active={selectedPrice === price} onPress={() => setSelectedPrice((c) => (c === price ? null : price))} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.decksRowContainer}>
            {lowerDeckData && (
              <DeckCard deck={lowerDeckData} onPressSeat={handlePressSeat} seatMap={seatMap} selectedSeatSet={selectedSeatSet} selectedPrice={selectedPrice} layoutPrice={layout?.priceInr} cardCanvasHeight={unifiedCanvasHeight} />
            )}
            {upperDeckData && (
              <DeckCard deck={upperDeckData} onPressSeat={handlePressSeat} seatMap={seatMap} selectedSeatSet={selectedSeatSet} selectedPrice={selectedPrice} layoutPrice={layout?.priceInr} cardCanvasHeight={unifiedCanvasHeight} />
            )}
          </View>
        </ScrollView>

        <SeatBottomSheet selectedSeats={selectedSeats} totalPrice={totalPrice} onNext={handleNext} disabled={selectedSeats.length === 0} insets={insets} />
      </View>
    </SafeAreaView>
  );
};

export default Sleeper;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BUS_SEAT_COLORS.background },
  screen: { flex: 1, backgroundColor: BUS_SEAT_COLORS.background },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", backgroundColor: BUS_SEAT_COLORS.cardSurface, padding: 10 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: BUS_SEAT_COLORS.coachFloorBg, marginRight: 12 },
  headerTitle: { fontSize: moderateScale(18), fontWeight: "700", color: BUS_SEAT_COLORS.textPrimary },
  scrollContent: { paddingBottom: 280 },
  filterBar: { paddingVertical: 4 },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  priceChip: { minWidth: 60, height: 30, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: BUS_SEAT_COLORS.borderLight, backgroundColor: BUS_SEAT_COLORS.cardSurface, alignItems: "center", justifyContent: "center" },
  priceChipActive: { borderColor: BUS_SEAT_COLORS.primaryRed, backgroundColor: BUS_SEAT_COLORS.selectedBg },
  priceChipPressed: { opacity: 0.85 },
  priceChipText: { color: BUS_SEAT_COLORS.textSecondary, fontSize: moderateScale(11.5), fontWeight: "600" },
  priceChipTextActive: { color: BUS_SEAT_COLORS.primaryRed, fontWeight: "700" },
  decksRowContainer: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 4, paddingBottom: 16, gap: 12, width: "100%", justifyContent: "center" },
  deckCard: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240, 77, 77, 0.22)", padding: CARD_PADDING, position: "relative" },
  cabinDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 4 },
});
