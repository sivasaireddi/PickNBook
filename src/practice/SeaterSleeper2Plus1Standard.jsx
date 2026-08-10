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
const SPACING = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 };

/* ── Standard Coach Dimensions (Moderately reduced for optimal fit without horizontal scrolling) ── */
const SEATER_W = 33;         // 33px seat width (moderately reduced from 38)
const SEATER_H = 35;         // 35px seat height (moderately reduced from 40)
const SLEEPER_W = 33;        // 33px sleeper width (moderately reduced from 38)
const SLEEPER_H = 79;        // 79px sleeper height (spans 2 seater rows: 35 + 9 + 35)
const CELL_GAP = 5;          // 5px gap between adjacent seats
const ROW_GAP = 9;           // 9px vertical gap between seat rows
const AISLE_W = 12;          // 12px walking aisle gap
const CARD_PADDING = 10;     // 10px internal padding

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
  if (seatType.includes("VERTICAL")) return false; // Vertical Sleeper has 40px height!
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
      title: deckKey === "UPPER" ? "Upper Deck" : "Lower Deck",
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
  return `${formatTripDate(dateValue)}, ${formatTripTime(timeValue)} | ${operator}`;
};

/* ── Price Chip Component ── */
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

/* ── Dynamic Symmetrical Deck Container Card (Equal Width & Equal Height) ── */
const DeckCardContainer = memo(
  ({
    deck,
    onPressSeat,
    seatMap,
    selectedSeatSet,
    selectedPrice,
    layoutPrice,
    cardCanvasHeight,
  }) => {
    const seats = deck.definitions;

    const { maxGridRow, hasAisle, aisleAfterRow, columnMap } = useMemo(() => {
      let mr = 0;
      seats.forEach((s) => {
        const gr = s.gridRow ?? 0;
        if (gr > mr) mr = gr;
      });

      // Standardize column index map (0, 1, 2, 3...)
      const uniqueGridRows = [...new Set(seats.map((s) => s.gridRow ?? 0))].sort((a, b) => a - b);
      const cMap = new Map();
      uniqueGridRows.forEach((rawRow, idx) => cMap.set(rawRow, idx));

      let aisleDetected = false;
      let aisleRow = deck.aisleAfterGridRow ?? -1;

      if (aisleRow !== -1 && aisleRow < mr) {
        aisleDetected = true;
      } else {
        const sortedRows = [...new Set(seats.map(s => Number(s.row) || 0))].sort((a, b) => a - b);
        for (let i = 1; i < sortedRows.length; i++) {
          if (sortedRows[i] - sortedRows[i - 1] > 1) {
            aisleDetected = true;
            aisleRow = i - 1;
            break;
          }
        }
      }

      if (!aisleDetected && mr >= 2) {
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

      const cellW = SEATER_W + CELL_GAP;
      const aisleOff = hasAisle && maxCol > 1 ? AISLE_W : 0;
      return CARD_PADDING + (maxCol + 1) * cellW - CELL_GAP + aisleOff + CARD_PADDING + 6;
    }, [seats, columnMap, hasAisle]);

    const cellW = SEATER_W + CELL_GAP;
    const cellH = SEATER_H + ROW_GAP; // 44px per row step

    return (
      <View style={[styles.deckCard, BUS_SEAT_SHADOWS.soft, { width: actualCardWidth }]}>
        {/* Deck Header Text Only (no icon) */}
        <DeckHeader title={deck.title} />

        {/* Steering Wheel inside Lower Deck only (positioned absolutely) */}
        {deck.isLower && <DriverIndicator />}

        <View style={styles.cabinDivider} />

        {/* Seat Grid Canvas (Equal Dynamic Width & Height for Millimeter-Perfect Equal Deck Bottoms) */}
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

            // Apply aisle offset cleanly if column is after aisle
            const aisleOff = hasAisle && mappedCol > 1 ? AISLE_W : 0;
            const isH = isHorizontalSleeper(seat);
            const seatWidthMult = Number(seat.width ?? seat.Width ?? 1);
            const baseW = isH ? SLEEPER_W : SEATER_W;
            const seatW =
              seatWidthMult > 1
                ? baseW * seatWidthMult + CELL_GAP * (seatWidthMult - 1)
                : baseW;
            const renderedHeight = isH ? SLEEPER_H : SEATER_H;

            // Use raw column index directly so horizontal sleepers align with seater row scale (0, 2, 4, 6, 8)
            const gridC = Number(seat.column ?? seat.gridCol ?? seat.ColumnNo ?? 0);

            const left = CARD_PADDING + mappedCol * cellW + aisleOff;
            const top = CARD_PADDING + gridC * cellH;

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
              />
            );
          })}
        </View>
      </View>
    );
  }
);

/* ══════════════════════════════════════════════════════════════
   ── Main Screen Component ──
   ══════════════════════════════════════════════════════════════ */
const SeaterSleeper2Plus1Standard = ({ navigation, route }) => {
  const busId = route?.params?.busId ?? DEFAULT_BUS_ID;
  const seededLayout = normalizeSeatLayoutPayload(route?.params?.seatLayout ?? null);
  const insets = useSafeAreaInsets();

  const [layout, setLayout] = useState(seededLayout);
  const [loading, setLoading] = useState(!seededLayout);
  const [error, setError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const layoutRef = useRef(layout);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

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

  // Calculate canvas height so Lower Deck and Upper Deck match 100% in height & alignment
  const unifiedCanvasHeight = useMemo(() => {
    let maxCanvasBottom = 260;

    deckCards.forEach((deck) => {
      deck.definitions.forEach((seat) => {
        const gc = Number(seat.column ?? seat.gridCol ?? seat.ColumnNo ?? 0);
        const isH = isHorizontalSleeper(seat);
        const cellH = SEATER_H + ROW_GAP; // 38px per row step
        const topPos = CARD_PADDING + gc * cellH;
        const hPos = isH ? SLEEPER_H : SEATER_H;
        const bottomPos = topPos + hPos;
        if (bottomPos > maxCanvasBottom) maxCanvasBottom = bottomPos;
      });
    });

    return maxCanvasBottom + CARD_PADDING;
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

  /* ── Render States ── */
  if (loading && !layout) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={BUS_SEAT_COLORS.primaryRed} />
          <Text style={styles.statusText}>Loading seat layout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!layout) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.screen}>
        {/* App Bar Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              hitSlop={12}
              onPress={() => navigation?.goBack?.()}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-back" size={24} color={BUS_SEAT_COLORS.textPrimary} />
            </Pressable>

            <View style={styles.headerTextBlock}>
              <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
              <Text numberOfLines={1} style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
          </View>
        </View>

        {/* Sticky Legend Bar */}
        <SeatLegend />

        {/* Scrollable Layout Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Price Filter Chips */}
          <View style={styles.filterBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <PriceChip
                label="All"
                active={selectedPrice === null}
                onPress={() => setSelectedPrice(null)}
              />
              {priceFilters.map((price) => (
                <PriceChip
                  key={price}
                  label={formatPrice(price)}
                  active={selectedPrice === price}
                  onPress={() =>
                    setSelectedPrice((current) => (current === price ? null : price))
                  }
                />
              ))}
            </ScrollView>
          </View>

          {/* Decks Row: Lower Deck (Left) & Upper Deck (Right) side-by-side fitting 100% within screen width without horizontal scroll */}
          <View style={styles.decksRowContainer}>
            {lowerDeckData && (
              <DeckCardContainer
                deck={lowerDeckData}
                onPressSeat={handlePressSeat}
                seatMap={seatMap}
                selectedSeatSet={selectedSeatSet}
                selectedPrice={selectedPrice}
                layoutPrice={layout?.priceInr}
                cardCanvasHeight={unifiedCanvasHeight}
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
                cardCanvasHeight={unifiedCanvasHeight}
              />
            )}
          </View>
        </ScrollView>

        {/* Fixed Bottom Sheet Summary Bar */}
        <SeatBottomSheet
          selectedSeats={selectedSeats}
          totalPrice={totalPrice}
          onNext={handleNext}
          disabled={selectedSeats.length === 0}
          insets={insets}
          operatorName={operatorName}
        />
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
    backgroundColor: BUS_SEAT_COLORS.background,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING[24],
    backgroundColor: BUS_SEAT_COLORS.background,
  },
  statusText: {
    marginTop: SPACING[12],
    color: BUS_SEAT_COLORS.textSecondary,
    fontSize: moderateScale(15),
    textAlign: "center",
  },
  retryButton: {
    marginTop: SPACING[16],
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING[12],
    paddingHorizontal: SPACING[20],
    borderRadius: 16,
    backgroundColor: BUS_SEAT_COLORS.primaryRed,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(15),
    fontWeight: "700",
  },
  header: {
    backgroundColor: BUS_SEAT_COLORS.cardSurface,
    paddingHorizontal: SPACING[16],
    paddingTop: SPACING[8],
    paddingBottom: SPACING[10],
    borderBottomWidth: 1,
    borderBottomColor: BUS_SEAT_COLORS.borderLight,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: BUS_SEAT_COLORS.coachFloorBg,
    marginRight: 10,
  },
  headerTextBlock: {
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    color: BUS_SEAT_COLORS.textPrimary,
    fontSize: moderateScale(18),
    fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 2,
    color: BUS_SEAT_COLORS.textSecondary,
    fontSize: moderateScale(12.5),
  },
  scrollContent: {
    paddingBottom: 280,
  },
  scrollView: {
    flex: 1,
  },
  filterBar: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  filterRow: {
    paddingHorizontal: SPACING[16],
    gap: 8,
    alignItems: "center",
  },
  priceChip: {
    minWidth: 60,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BUS_SEAT_COLORS.borderLight,
    backgroundColor: BUS_SEAT_COLORS.cardSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  priceChipActive: {
    borderColor: BUS_SEAT_COLORS.primaryRed,
    backgroundColor: BUS_SEAT_COLORS.selectedBg,
  },
  priceChipPressed: {
    opacity: 0.85,
  },
  priceChipText: {
    color: BUS_SEAT_COLORS.textSecondary,
    fontSize: moderateScale(11.5),
    fontWeight: "600",
  },
  priceChipTextActive: {
    color: BUS_SEAT_COLORS.primaryRed,
    fontWeight: "700",
  },

  /* ── Responsive Decks Row Container (Centered, Fits 100% within device width) ── */
  decksRowContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },

  /* ── Deck Card Base Style: Content-fitting Width, White BG, Thin Light Red Border ── */
  deckCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(240, 77, 77, 0.22)",
    padding: CARD_PADDING,
    position: "relative",
  },
  cabinDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
    width: "100%",
  },
});
