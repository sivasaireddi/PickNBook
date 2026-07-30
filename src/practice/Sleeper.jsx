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
  Share,
  StyleSheet,
  Text,
  View,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  moderateScale,
  scale,
  verticalScale,
} from "react-native-size-matters";

import {
  fetchSeatLayout,
  normalizeSeatLayoutPayload,
} from "../utils/seatLayout";

const DEFAULT_BUS_ID = 658;

/* ── Design Tokens ── */
const COLORS = {
  background: "#F5F5F5",
  white: "#FFFFFF",
  primary: "#E65B5B",
  border: "#D9D9D9",
  male: "#4A90E2",
  female: "#F06292",
  booked: "#C7C9CE",
  text: "#222222",
  muted: "#70757D",
  shadow: "#0F172A",
  chipSurface: "#FFFFFF",
  chipActiveSurface: "#FFF5F5",
  deckBg: "#FAFBFC",
  cabinBg: "#EEF0F3",
  divider: "#E2E4E8",
};

const SPACING = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 };

/* ── Vertical Coach Dimensions ── */
const SEATER_W = scale(44);
const SEATER_H = scale(44);
const SLEEPER_W = scale(44);
const SLEEPER_H = scale(88); // 2x seater height for tall vertical berths
const CELL_GAP = scale(6);   // gap between rows and columns
const DRIVER_CABIN_H = scale(46); // height of top steering cabin
const AISLE_W = scale(26);   // width of walking aisle between left & right lanes



/* ── Helpers ── */
const normalizeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatPrice = (value = 0) =>
  `\u20B9${normalizeAmount(value).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

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

const getSeatGender = (seat) =>
  String(seat?.gender ?? seat?.seatGender ?? seat?.type ?? "").toLowerCase();

const getSeatDeckKey = (definition = {}) => {
  const explicitDeck = String(definition?.deck ?? "").toLowerCase();
  if (explicitDeck.includes("upper") || definition?.isUpper) return "UPPER";
  return "LOWER";
};

const getSeatKind = (definition = {}) => {
  const seatType = String(definition?.seatType ?? "").toUpperCase();
  if (definition?.isSleeper || seatType.includes("SLEEPER")) return "SLEEPER";
  if (seatType.includes("SEATER")) return "SEATER";
  return "SLEEPER"; // default to SLEEPER in Sleeper.jsx
};

const getSeatPrice = (seat, layoutPrice) =>
  normalizeAmount(
    seat?.priceInr ?? seat?.price ?? layoutPrice,
  );

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

/* ── Legend Components ── */
const LegendSeat = memo(({ borderColor, railColor, fillColor }) => (
  <View style={[styles.legendSeat, { borderColor, backgroundColor: fillColor }]}>
    <View style={[styles.legendSeatRail, { backgroundColor: railColor }]} />
  </View>
));

const LegendItem = memo(({ label, borderColor, railColor, fillColor }) => (
  <View style={styles.legendItem}>
    <LegendSeat borderColor={borderColor} railColor={railColor} fillColor={fillColor} />
    <Text numberOfLines={2} style={styles.legendLabel}>{label}</Text>
  </View>
));

const PriceChip = memo(({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.priceChip,
      active && styles.priceChipActive,
      pressed && styles.priceChipPressed,
    ]}
  >
    <Text style={[styles.priceChipText, active && styles.priceChipTextActive]}>{label}</Text>
  </Pressable>
));

/* ── SeatCell (Vertical Coach Architecture) ── */
const SeatCell = memo(
  ({ seat, isSelected, isFilteredOut, onPressSeat, layoutPrice, cellW, cellH, aisleOffset }) => {
    const gender = getSeatGender(seat);
    const isBooked = Boolean(seat?.isBooked);
    const seatPrice = getSeatPrice(seat, layoutPrice);
    const kind = getSeatKind(seat);
    const isSleeper = kind === "SLEEPER";

    const theme = useMemo(() => {
      if (isBooked) {
        return {
          borderColor: COLORS.booked,
          pillowColor: COLORS.booked,
          backgroundColor: COLORS.booked,
          borderWidth: 1,
          textColor: "#7B7F88",
        };
      }
      if (isSelected) {
        return {
          borderColor: COLORS.primary,
          pillowColor: COLORS.primary,
          backgroundColor: "#FFF0F0",
          borderWidth: 2,
          textColor: COLORS.primary,
        };
      }
      if (gender === "female") {
        return {
          borderColor: COLORS.female,
          pillowColor: COLORS.female,
          backgroundColor: COLORS.white,
          borderWidth: 1.5,
          textColor: COLORS.text,
        };
      }
      if (gender === "male") {
        return {
          borderColor: COLORS.male,
          pillowColor: COLORS.male,
          backgroundColor: COLORS.white,
          borderWidth: 1.5,
          textColor: COLORS.text,
        };
      }
      return {
        borderColor: COLORS.border,
        pillowColor: "#A8AEB8",
        backgroundColor: COLORS.white,
        borderWidth: 1,
        textColor: COLORS.text,
      };
    }, [gender, isBooked, isSelected]);

    // Position in Vertical Coach:
    // gridRow (lanes across bus width) -> X (horizontal left)
    // gridCol (rows along bus length) -> Y (vertical top)
    const seatW = isSleeper ? SLEEPER_W : SEATER_W;
    const seatH = isSleeper ? SLEEPER_H : SEATER_H;

    // Exact rendered height in vertical grid:
    const renderedHeight = isSleeper ? cellH * 2 - CELL_GAP : SEATER_H;
    const left = SPACING[16] + (seat.gridRow ?? 0) * cellW + aisleOffset + (cellW - seatW) / 2;
    // SeatCell renders inside a relative container directly below the cabin row, so top starts cleanly without adding DRIVER_CABIN_H:
    const top = SPACING[16] + (seat.gridCol ?? 0) * cellH + (isSleeper ? 0 : (cellH - SEATER_H) / 2);

    return (
      <Pressable
        disabled={isBooked}
        onPress={() => onPressSeat(seat?.seatCode)}
        style={({ pressed }) => [
          {
            position: "absolute",
            left,
            top,
            width: seatW,
            height: renderedHeight,
            borderRadius: isSleeper ? 10 : 8,
            borderColor: theme.borderColor,
            borderWidth: theme.borderWidth,
            backgroundColor: theme.backgroundColor,
            alignItems: "center",
            overflow: "hidden",
            paddingHorizontal: 2,
          },
          isFilteredOut && styles.filteredSeat,
          pressed && !isBooked && styles.seatPressed,
        ]}
      >
        {/* Pillow / Headrest at TOP (facing front of bus towards driver) */}
        <View
          style={{
            width: "70%",
            height: isSleeper ? 12 : 6,
            backgroundColor: theme.pillowColor,
            borderBottomLeftRadius: 5,
            borderBottomRightRadius: 5,
            marginTop: 0,
            marginBottom: isSleeper ? SPACING[4] : 2,
          }}
        />

        {/* Seat label & Price */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: isSleeper ? moderateScale(11) : moderateScale(10),
              fontWeight: "700",
              color: theme.textColor,
              textAlign: "center",
            }}
          >
            {seat.seatName}
          </Text>
          {isSleeper && (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontSize: moderateScale(9),
                color: theme.textColor,
                opacity: 0.75,
                marginTop: 2,
                fontWeight: "600",
              }}
            >
              {formatPrice(seatPrice)}
            </Text>
          )}
        </View>
      </Pressable>
    );
  },
);

/* ── DeckCard (Vertical Coach) ── */
const DeckCard = memo(
  ({
    deck,
    onPressSeat,
    seatMap,
    selectedSeatSet,
    selectedPrice,
    layoutPrice,
  }) => {
    const seats = deck.definitions;

    // Standard cells in vertical layout have equal lane width
    const cellW = SEATER_W + CELL_GAP;
    const cellH = SEATER_H + CELL_GAP;

    // Compute grid bounds & aisle spacing
    const { maxGridRow, maxGridCol, hasAisle, aisleAfterRow } = useMemo(() => {
      let mr = 0, mc = 0;
      const gridRows = new Set();
      seats.forEach((s) => {
        const gr = s.gridRow ?? 0;
        const gc = s.gridCol ?? 0;
        const isS = getSeatKind(s) === "SLEEPER";
        if (gr > mr) mr = gr;
        if (gc + (isS ? 1 : 0) > mc) mc = gc + (isS ? 1 : 0);
        gridRows.add(gr);
      });

      // Detect aisle: check if API told us, or inspect differences in sorted rows
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

      // Default fallback for 2+1 layout if 3 columns total (0, 1 on left, 2 on right)
      if (!aisleDetected && mr === 2) {
        aisleDetected = true;
        aisleRow = 1; // aisle between column 1 and column 2
      }

      return { maxGridRow: mr, maxGridCol: mc, hasAisle: aisleDetected, aisleAfterRow: aisleRow };
    }, [seats, deck.aisleAfterGridRow]);

    const totalCols = maxGridRow + 1; // lanes across bus width

    const maxSeatBottom = useMemo(() => {
      let mb = scale(60);
      seats.forEach((s) => {
        const gc = s.gridCol ?? 0;
        const isS = getSeatKind(s) === "SLEEPER";
        const topPos = SPACING[16] + gc * cellH + (isS ? 0 : (cellH - SEATER_H) / 2);
        const hPos = isS ? cellH * 2 - CELL_GAP : SEATER_H;
        const bottomPos = topPos + hPos;
        if (bottomPos > mb) mb = bottomPos;
      });
      return mb;
    }, [seats, cellH]);

    // Dimensions for vertical coach card (no fixed height, auto-expanding minHeight!)
    const contentWidth = SPACING[16] * 2 + totalCols * cellW + (hasAisle ? AISLE_W : 0) - CELL_GAP;
    const floorMinHeight = DRIVER_CABIN_H + 2 + maxSeatBottom + scale(24);

    return (
      <View style={styles.deckCardWrapper}>
        <Text style={styles.deckHeaderTitle}>{deck.title}</Text>
        
        <View style={[styles.coachFloor, { width: Math.max(contentWidth, scale(230)), minHeight: floorMinHeight }]}>
          {/* Driver Cabin Area at TOP of coach floor */}
          <View style={[styles.driverCabinRow, { height: DRIVER_CABIN_H }]}>
            <Text style={styles.frontLabel}>{deck.isLower ? "FRONT" : "UPPER FRONT"}</Text>
            {deck.isLower ? (
              <View style={styles.steeringWrapper}>
                <MaterialCommunityIcons name="steering" size={scale(22)} color="#70757D" />
              </View>
            ) : (
              <View style={[styles.steeringWrapper, { opacity: 0.2 }]}>
                <MaterialCommunityIcons name="shield-check" size={scale(18)} color="#70757D" />
              </View>
            )}
          </View>
          <View style={styles.cabinDivider} />

          {/* Seats placed absolutely on vertical grid */}
          <View style={{ flex: 1, position: "relative" }}>
            {seats.map((seat) => {
              const isSelected = selectedSeatSet.has(seat.seatCode);
              const seatPrice = getSeatPrice(seat, layoutPrice);
              const isFilteredOut =
                selectedPrice !== null &&
                selectedPrice !== seatPrice &&
                !seat.isBooked &&
                !isSelected;

              const aisleOff = hasAisle && (seat.gridRow ?? 0) > aisleAfterRow ? AISLE_W : 0;

              return (
                <SeatCell
                  key={seat.seatCode}
                  seat={seat}
                  isSelected={isSelected}
                  isFilteredOut={isFilteredOut}
                  onPressSeat={onPressSeat}
                  layoutPrice={layoutPrice}
                  cellW={cellW}
                  cellH={cellH}
                  aisleOffset={aisleOff}
                />
              );
            })}
          </View>
        </View>
      </View>
    );
  },
);

/* ── Footer ── */
const Footer = memo(({ selectedSeats, totalPrice, onNext, disabled, insets }) => (
  <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING[12] }]}>
    <View style={styles.footerTextBlock}>
      <Text style={styles.footerLabel}>Selected Seats</Text>
      <Text numberOfLines={1} style={styles.footerSeats}>
        {selectedSeats.length > 0 ? selectedSeats.join(", ") : "No seat selected"}
      </Text>
    </View>
    <View style={styles.footerActions}>
      <Text style={styles.footerTotal}>{formatPrice(totalPrice)}</Text>
      <Pressable
        disabled={disabled}
        onPress={onNext}
        style={({ pressed }) => [
          styles.nextButton,
          disabled && styles.nextButtonDisabled,
          pressed && !disabled && styles.nextButtonPressed,
        ]}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </Pressable>
    </View>
  </View>
));

/* ══════════════════════════════════════════════════════════════
   ── Main Component ──
   ══════════════════════════════════════════════════════════════ */
const Sleeper = ({ navigation, route }) => {
  const busId = route?.params?.busId ?? DEFAULT_BUS_ID;
  const seededLayout = normalizeSeatLayoutPayload(route?.params?.seatLayout ?? null);
  const { width } = useWindowDimensions();
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
          "Failed to load sleeper seat layout:",
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
          seatType: seat.SeatType ?? seat.seatType ?? "Sleeper",
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

  const handleShare = useCallback(() => {
    Share.share({ message: `${title} | ${subtitle} | ${operatorName}` }).catch(() => {});
  }, [operatorName, subtitle, title]);

  const contentBottomPadding = insets.bottom + SPACING[32] + 130;

  const legendItems = useMemo(
    () => [
      { key: "available", label: "Available", borderColor: COLORS.border, railColor: "#A8AEB8", fillColor: COLORS.white },
      { key: "female", label: "Female", borderColor: COLORS.female, railColor: COLORS.female, fillColor: COLORS.white },
      { key: "male", label: "Male", borderColor: COLORS.male, railColor: COLORS.male, fillColor: COLORS.white },
      { key: "female-booked", label: "Female\nBooked", borderColor: COLORS.booked, railColor: COLORS.female, fillColor: COLORS.booked },
      { key: "booked", label: "Booked", borderColor: COLORS.booked, railColor: "#8D939C", fillColor: COLORS.booked },
    ],
    [],
  );

  /* ── Render States ── */
  if (loading && !layout) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              hitSlop={12}
              onPress={() => navigation?.goBack?.()}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-back" size={28} color={COLORS.text} />
            </Pressable>

            <View style={styles.headerTextBlock}>
              <Text numberOfLines={2} style={styles.headerTitle}>{title}</Text>
              <Text numberOfLines={2} style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: contentBottomPadding }]}
        >
          {/* Legend */}
          <View style={styles.legendRow}>
            {legendItems.map((item) => (
              <LegendItem
                key={item.key}
                label={item.label}
                borderColor={item.borderColor}
                railColor={item.railColor}
                fillColor={item.fillColor}
              />
            ))}
          </View>

          {/* Price Filter */}
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

          {/* Decks — centered vertically stacked coach floors */}
          <View style={styles.deckStack}>
            {deckCards.map((deck) => (
              <DeckCard
                key={deck.key}
                deck={deck}
                onPressSeat={handlePressSeat}
                seatMap={seatMap}
                selectedSeatSet={selectedSeatSet}
                selectedPrice={selectedPrice}
                layoutPrice={layout?.priceInr}
              />
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <Footer
          selectedSeats={selectedSeats}
          totalPrice={totalPrice}
          onNext={handleNext}
          disabled={selectedSeats.length === 0}
          insets={insets}
        />
      </View>
    </SafeAreaView>
  );
};

export default Sleeper;

/* ══════════════════════════════════════════════════════════════
   ── Styles ──
   ══════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING[24],
    backgroundColor: COLORS.background,
  },
  statusText: {
    marginTop: SPACING[12],
    color: COLORS.muted,
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
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: moderateScale(15),
    fontWeight: "700",
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[16],
    paddingTop: SPACING[8],
    paddingBottom: SPACING[16],
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: {
    flex: 1,
    flexShrink: 1,
    paddingHorizontal: SPACING[8],
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: moderateScale(20),
    lineHeight: moderateScale(26),
    fontWeight: "700",
    flexWrap: "wrap",
  },
  headerSubtitle: {
    marginTop: SPACING[4],
    color: COLORS.muted,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(17),
    flexWrap: "wrap",
  },
  scrollContent: {
    paddingBottom: SPACING[32],
  },
  scrollView: {
    flex: 1,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingHorizontal: SPACING[8],
    paddingTop: SPACING[16],
    paddingBottom: SPACING[12],
    backgroundColor: COLORS.white,
  },
  legendItem: {
    alignItems: "center",
    justifyContent: "flex-start",
    width: 68,
  },
  legendSeat: {
    width: scale(26),
    height: scale(28),
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: COLORS.white,
    paddingTop: 2,
  },
  legendSeatRail: {
    width: "72%",
    height: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  legendLabel: {
    marginTop: SPACING[8],
    color: COLORS.text,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(14),
    textAlign: "center",
  },
  filterBar: {
    paddingTop: SPACING[12],
    paddingBottom: SPACING[8],
  },
  filterRow: {
    paddingHorizontal: SPACING[16],
    paddingRight: SPACING[32],
    alignItems: "center",
  },
  priceChip: {
    minWidth: 76,
    height: 44,
    marginRight: SPACING[12],
    paddingHorizontal: SPACING[16],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.chipSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  priceChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.chipActiveSurface,
  },
  priceChipPressed: {
    opacity: 0.9,
  },
  priceChipText: {
    color: COLORS.text,
    fontSize: moderateScale(14),
    fontWeight: "700",
  },
  priceChipTextActive: {
    color: COLORS.text,
  },

  /* ── Vertical Deck Coach Floor ── */
  deckStack: {
    alignItems: "center",
    paddingHorizontal: SPACING[16],
    paddingTop: SPACING[12],
  },
  deckCardWrapper: {
    alignItems: "center",
    marginBottom: SPACING[24],
    width: "100%",
  },
  deckHeaderTitle: {
    color: COLORS.text,
    fontSize: moderateScale(16),
    fontWeight: "700",
    marginBottom: SPACING[12],
    alignSelf: "center",
    letterSpacing: 0.5,
  },
  coachFloor: {
    backgroundColor: COLORS.deckBg,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#D8DCE2",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  driverCabinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.cabinBg,
    paddingHorizontal: SPACING[16],
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  frontLabel: {
    color: COLORS.muted,
    fontSize: moderateScale(10),
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  steeringWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D0D5DB",
  },
  cabinDivider: {
    height: 2,
    backgroundColor: COLORS.divider,
    width: "100%",
  },

  /* ── Seat States ── */
  filteredSeat: {
    opacity: 0.28,
  },
  seatPressed: {
    transform: [{ scale: 0.96 }],
  },

  /* ── Footer ── */
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING[16],
    paddingTop: SPACING[12],
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: "#E6E8EE",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 16,
  },
  footerTextBlock: {
    flex: 1,
    paddingRight: SPACING[12],
  },
  footerLabel: {
    color: COLORS.muted,
    fontSize: moderateScale(12),
    lineHeight: moderateScale(15),
    marginBottom: SPACING[4],
  },
  footerSeats: {
    color: COLORS.text,
    fontSize: moderateScale(15),
    lineHeight: moderateScale(19),
    fontWeight: "700",
  },
  footerActions: {
    alignItems: "flex-end",
  },
  footerTotal: {
    color: COLORS.text,
    fontSize: moderateScale(18),
    lineHeight: moderateScale(22),
    fontWeight: "700",
    marginBottom: SPACING[8],
  },
  nextButton: {
    minWidth: 96,
    height: 48,
    paddingHorizontal: SPACING[20],
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#E3A4A4",
  },
  nextButtonPressed: {
    opacity: 0.92,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: moderateScale(15),
    fontWeight: "700",
  },
});
