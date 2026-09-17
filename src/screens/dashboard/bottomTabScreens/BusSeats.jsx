import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from '../../../theme/busSeatTheme';
import SeatLegend from '../../../components/busSeats/SeatLegend';
import SeatItem from '../../../components/busSeats/SeatItem';
import DeckHeader from '../../../components/busSeats/DeckHeader';
import DriverIndicator from '../../../components/busSeats/DriverIndicator';
import SeatBottomSheet from '../../../components/busSeats/SeatBottomSheet';
import { moderateScale } from 'react-native-size-matters';
import { API_BASE_URL } from '../../../constants/config';

const BUS_SEATS_API_BASE_URL = `${API_BASE_URL}/api/BusBookings`;

const SEAT_SIZE = 38;
const CELL_GAP = 6;
const ROW_GAP = 10;
const AISLE_W = 16;

const BusSeats = ({ route, navigation }) => {
  const busId = route?.params?.busId;
  const insets = useSafeAreaInsets();

  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);

  // API CALL
  const fetchSeats = async () => {
    if (busId === undefined || busId === null || busId === '') {
      setSeats([]);
      setError('Bus not selected.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const url = `${BUS_SEATS_API_BASE_URL}/${encodeURIComponent(String(busId))}/seats`;
      const response = await axios.get(url);

      const nextSeats = Array.isArray(response.data?.seats)
        ? response.data.seats
        : Array.isArray(response.data)
          ? response.data
          : [];

      setSeats(nextSeats);
    } catch (err) {
      console.log('Error fetching seats:', err);
      setError('Unable to load seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats();
  }, [busId]);

  // Separate decks
  const lowerDeck = seats.filter((s) => s?.seatCode?.startsWith('L'));
  const upperDeck = seats.filter((s) => s?.seatCode?.startsWith('U'));

  // Sort properly (L1, L2... not L1, L10)
  const sortSeats = (arr) =>
    [...arr].sort(
      (a, b) =>
        parseInt(a.seatCode.slice(1)) -
        parseInt(b.seatCode.slice(1))
    );

  const seatMap = useMemo(
    () => new Map(seats.map((s) => [s.seatCode, s])),
    [seats]
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

  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((acc, code) => {
      const s = seatMap.get(code);
      return acc + (s?.price || s?.priceInr || 500);
    }, 0);
  }, [selectedSeats, seatMap]);

  const handleNext = () => {
    if (selectedSeats.length === 0) return;
    if (navigation?.navigate) {
      navigation.navigate('BordingNDroppingPoints', {
        busId,
        selectedSeats,
        seatNumber: selectedSeats.join(', '),
      });
    }
  };

  const renderSeatGridContainer = (deckSeats, isUpper = false) => {
    const sorted = sortSeats(deckSeats);
    const rows = [];

    // Exact target width for 4-column 2+2 layout
    const cardWidth = 224;

    for (let i = 0; i < sorted.length; i += 4) {
      rows.push(
        <View key={`row-${i}`} style={styles.gridRow}>
          <View style={styles.seatPair}>
            {sorted[i] && (
              <View style={{ width: SEAT_SIZE, height: SEAT_SIZE }}>
                <SeatItem
                  seat={sorted[i]}
                  isSelected={selectedSeats.includes(sorted[i].seatCode)}
                  onPressSeat={handlePressSeat}
                  width={SEAT_SIZE}
                  height={SEAT_SIZE}
                />
              </View>
            )}
            {sorted[i + 1] && (
              <View style={{ width: SEAT_SIZE, height: SEAT_SIZE }}>
                <SeatItem
                  seat={sorted[i + 1]}
                  isSelected={selectedSeats.includes(sorted[i + 1].seatCode)}
                  onPressSeat={handlePressSeat}
                  width={SEAT_SIZE}
                  height={SEAT_SIZE}
                />
              </View>
            )}
          </View>

          <View style={{ width: AISLE_W }} />

          <View style={styles.seatPair}>
            {sorted[i + 2] && (
              <View style={{ width: SEAT_SIZE, height: SEAT_SIZE }}>
                <SeatItem
                  seat={sorted[i + 2]}
                  isSelected={selectedSeats.includes(sorted[i + 2].seatCode)}
                  onPressSeat={handlePressSeat}
                  width={SEAT_SIZE}
                  height={SEAT_SIZE}
                />
              </View>
            )}
            {sorted[i + 3] && (
              <View style={{ width: SEAT_SIZE, height: SEAT_SIZE }}>
                <SeatItem
                  seat={sorted[i + 3]}
                  isSelected={selectedSeats.includes(sorted[i + 3].seatCode)}
                  onPressSeat={handlePressSeat}
                  width={SEAT_SIZE}
                  height={SEAT_SIZE}
                />
              </View>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.deckCard, BUS_SEAT_SHADOWS.soft, { width: cardWidth }]}>
        <DeckHeader title={isUpper ? 'Upper Deck' : 'Lower Deck'} />
        {!isUpper && <DriverIndicator />}
        <View style={styles.cabinDivider} />
        <View style={styles.rowsPadding}>{rows}</View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={BUS_SEAT_COLORS.primaryRed} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loader}>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchSeats}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.screen}>
        {/* App Bar Header */}
        <View style={styles.header}>
          <Pressable
            hitSlop={10}
            onPress={() => navigation?.goBack?.()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={BUS_SEAT_COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Select Seats</Text>
        </View>

        {/* Sticky Legend Bar */}
        <SeatLegend />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {seats.length === 0 && (
            <Text style={styles.message}>No seats found for this bus.</Text>
          )}

          {/* Horizontal ScrollView wrapping Lower Deck & Upper Deck side-by-side */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalDecksContainer}
          >
            {lowerDeck.length > 0 && renderSeatGridContainer(lowerDeck, false)}
            {upperDeck.length > 0 && renderSeatGridContainer(upperDeck, true)}
          </ScrollView>
        </ScrollView>

        {/* Bottom Sheet Summary Bar */}
        <SeatBottomSheet
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

export default BusSeats;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BUS_SEAT_COLORS.background,
  },
  screen: {
    flex: 1,
    backgroundColor: BUS_SEAT_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BUS_SEAT_COLORS.cardSurface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BUS_SEAT_COLORS.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BUS_SEAT_COLORS.coachFloorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: BUS_SEAT_COLORS.textPrimary,
  },
  scrollContent: {
    paddingBottom: 280,
  },
  horizontalDecksContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
    gap: 16,
    alignItems: 'flex-start',
  },
  deckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(240, 77, 77, 0.22)',
    padding: 12,
    position: 'relative',
  },
  cabinDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  rowsPadding: {
    paddingVertical: 2,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ROW_GAP,
  },
  seatPair: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    color: BUS_SEAT_COLORS.textSecondary,
    fontSize: moderateScale(15),
    textAlign: 'center',
    marginVertical: 16,
  },
  retryBtn: {
    backgroundColor: BUS_SEAT_COLORS.primaryRed,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
