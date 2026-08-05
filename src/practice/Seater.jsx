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
import DriverIndicator from "../components/busSeats/DriverIndicator";
import SeatBottomSheet from "../components/busSeats/SeatBottomSheet";

const DEFAULT_BUS_ID = 49;
const SEATER_W = 38;
const SEATER_H = 40;
const CELL_GAP = 6;
const ROW_GAP = 10;
const AISLE_W = 16;
const CARD_PADDING = 12;

const normalizeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatPrice = (value = 0) =>
  `\u20B9${Math.round(normalizeAmount(value))}`;

const getSeatPrice = (seat, layoutPrice) =>
  normalizeAmount(seat?.priceInr ?? seat?.price ?? layoutPrice);

const Seater = ({ navigation, route }) => {
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

  const seats = useMemo(() => layout?.seats ?? [], [layout]);
  const seatMap = useMemo(
    () => new Map(seats.map((seat) => [seat?.seatCode, seat])),
    [seats],
  );

  const { columnMap, dynamicCardWidth } = useMemo(() => {
    const uniqueGridRows = [...new Set(seats.map((s) => s.gridRow ?? 0))].sort((a, b) => a - b);
    const cMap = new Map();
    uniqueGridRows.forEach((rawRow, idx) => cMap.set(rawRow, idx));

    const numCols = uniqueGridRows.length > 0 ? uniqueGridRows.length : 3;
    let dynCardWidth = 180;
    if (numCols >= 5) {
      dynCardWidth = 268;
    } else if (numCols >= 4) {
      dynCardWidth = 224;
    } else {
      dynCardWidth = 180;
    }

    return { columnMap: cMap, dynamicCardWidth: dynCardWidth };
  }, [seats]);

  const selectedSeatSet = useMemo(() => new Set(selectedSeats), [selectedSeats]);

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
          <Text style={styles.headerTitle}>Seater Bus</Text>
        </View>

        <SeatLegend />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.coachFloor, BUS_SEAT_SHADOWS.soft, { width: dynamicCardWidth }]}>
            <DriverIndicator />
            <View style={styles.cabinDivider} />

            <View style={styles.gridContainer}>
              {seats.map((seat) => {
                const isSelected = selectedSeatSet.has(seat.seatCode);
                const seatPrice = getSeatPrice(seat, layout?.priceInr);
                const isFilteredOut =
                  selectedPrice !== null &&
                  selectedPrice !== seatPrice &&
                  !seat.isBooked &&
                  !isSelected;

                const gr = seat.gridRow ?? 0;
                const mappedCol = columnMap.get(gr) ?? gr;
                const gc = seat.gridCol ?? 0;
                const aisleOff = mappedCol > 1 ? AISLE_W : 0;

                const left = CARD_PADDING + mappedCol * (SEATER_W + CELL_GAP) + aisleOff;
                const top = CARD_PADDING + gc * (SEATER_H + ROW_GAP);

                return (
                  <SeatItem
                    key={seat.seatCode}
                    seat={seat}
                    isSelected={isSelected}
                    isFilteredOut={isFilteredOut}
                    onPressSeat={handlePressSeat}
                    layoutPrice={layout?.priceInr}
                    width={SEATER_W}
                    height={SEATER_H}
                    left={left}
                    top={top}
                    isSleeper={false}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>

        <SeatBottomSheet selectedSeats={selectedSeats} totalPrice={totalPrice} onNext={handleNext} disabled={selectedSeats.length === 0} insets={insets} />
      </View>
    </SafeAreaView>
  );
};

export default Seater;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BUS_SEAT_COLORS.background },
  screen: { flex: 1, backgroundColor: BUS_SEAT_COLORS.background },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", backgroundColor: BUS_SEAT_COLORS.cardSurface, padding: 10 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: BUS_SEAT_COLORS.coachFloorBg, marginRight: 12 },
  headerTitle: { fontSize: moderateScale(18), fontWeight: "700", color: BUS_SEAT_COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 280, alignItems: "center" },
  coachFloor: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "rgba(240, 77, 77, 0.22)", marginTop: 8, minHeight: 380, padding: CARD_PADDING, position: "relative" },
  cabinDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 4 },
  gridContainer: { position: "relative", minHeight: 400 },
});
