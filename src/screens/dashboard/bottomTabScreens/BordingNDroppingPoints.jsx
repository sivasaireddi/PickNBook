import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Color tokens
const COLORS = {
  bg: '#F6F7FB',
  surface: '#FFFFFF',
  ink: '#1B1F3B',
  inkSoft: '#6B7280',
  primary: '#D11A2A',
  primaryDeep: '#B91C1C',
  accentAmber: '#FFB13D',
  accentAmberDeep: '#F59614',
  selectedFill: '#FDE7E7',
  divider: '#E7E9F5',
  outline: '#D1D5E2',
};

const MONOSPACE_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const normalizeText = (value) => String(value ?? '').trim();

const normalizeIdValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return null;
  }
  const numericValue = Number(trimmedValue);
  return Number.isFinite(numericValue) ? numericValue : trimmedValue;
};

const getObjectValue = (value) =>
  value && typeof value === 'object' ? value : null;

const normalizeSeatList = (value) => {
  if (Array.isArray(value)) {
    return value.map((seat) => normalizeText(seat)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((seat) => normalizeText(seat)).filter(Boolean);
  }
  return [];
};

const formatRouteDate = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  }
  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  }
  return normalizeText(value);
};

const formatDatePill = (label) => {
  if (!label) return 'MON, 03 AUG';
  return String(label)
    .replace(/,/g, '')
    .split(' ')
    .slice(0, 3)
    .join(' ')
    .toUpperCase();
};

const asCollection = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
};

const buildPointOption = (value, kind, fallbackLabel, index) => {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string' || typeof value === 'number') {
    const label = normalizeText(value) || fallbackLabel;
    return {
      id: `${kind}-${label}-${index}`,
      name: label,
      address: fallbackLabel && fallbackLabel !== label ? fallbackLabel : '',
      time: '',
    };
  }

  const raw = getObjectValue(value);
  if (!raw) return null;

  const label =
    normalizeText(
      raw.Name ??
        raw.name ??
        raw.pointName ??
        raw.PointName ??
        raw.title ??
        raw.Title ??
        raw.Location ??
        raw.location ??
        raw.stopName ??
        raw.boardingPoint ??
        raw.droppingPoint ??
        raw.label ??
        raw.Address ??
        raw.address ??
        fallbackLabel,
    ) || fallbackLabel;

  const address = normalizeText(
    raw.Address ??
      raw.address ??
      raw.Location ??
      raw.location ??
      raw.Landmark ??
      raw.landmark ??
      raw.description ??
      raw.stopAddress ??
      raw.pointAddress ??
      raw.city ??
      raw.station ??
      '',
  );

  const time = normalizeText(
    raw.Time ??
      raw.time ??
      raw.departureTime ??
      raw.departureTimeUtc ??
      raw.arrivalTime ??
      raw.arrivalTimeUtc ??
      raw.scheduleTime ??
      '',
  );

  const id =
    normalizeIdValue(
      raw.CityPointIndex ??
        raw.cityPointIndex ??
        raw.CityPointLocationIndex ??
        raw.Id ??
        raw.id ??
        raw.pointId ??
        raw.stopId ??
        raw.boardingPointId ??
        raw.droppingPointId ??
        raw.code ??
        raw.key ??
        `${kind}-${label}-${address}-${index}`,
    ) ?? `${kind}-${label}-${address}-${index}`;

  return {
    id,
    cityPointIndex: id,
    name: label,
    address,
    time,
  };
};

const buildPointOptions = (value, kind, fallbackLabel) => {
  const options = asCollection(value)
    .map((item, index) => buildPointOption(item, kind, fallbackLabel, index))
    .filter(Boolean);

  return Array.from(
    new Map(options.map((option) => [String(option.id), option])).values(),
  );
};

// ─── Horizon Route Banner ──────────────────────────────────────────────────
const HorizonRouteBanner = ({ fromCity, toCity, selectedPoint }) => {
  const originLabel = (fromCity || 'KADAPA').toUpperCase();
  const destLabel = (toCity || 'HYDERABAD').toUpperCase();
  const selectedName = (selectedPoint?.name || 'SHAMSHABAD').toUpperCase();
  const selectedTime = selectedPoint?.time || '05:00';

  return (
    <LinearGradient
      colors={[COLORS.primaryDeep, COLORS.accentAmberDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.bannerContainer}
    >
      <View style={styles.bannerInner}>
        {/* Horizontal Dotted Track */}
        <View style={styles.dotsTrackRow}>
          {Array.from({ length: 18 }).map((_, i) => (
            <View key={`mini-dot-${i}`} style={styles.miniDot} />
          ))}
        </View>

        {/* Route Stops Container */}
        <View style={styles.stopsContainer}>
          {/* Origin Stop */}
          <View style={[styles.stopMarker, styles.stopMarkerLeft]}>
            <View style={styles.stopDotOutline}>
              <View style={styles.stopDotInner} />
            </View>
            <Text style={styles.stopNameText}>{originLabel}</Text>
          </View>

          {/* Active / Selected Stop (Middle) */}
          <View style={[styles.stopMarker, styles.stopMarkerCenter]}>
            {/* Floating Bus Badge */}
            <View style={styles.busBadge}>
              <MaterialCommunityIcons name="bus" size={16} color="#FFFFFF" />
            </View>

            {/* Concentric Glow Ring */}
            <View style={styles.glowRingOuter}>
              <View style={styles.glowRingInner} />
            </View>

            {/* Selected Stop Title & Time */}
            <Text style={styles.selectedStopTitle} numberOfLines={1}>
              {selectedName}
            </Text>
            <Text style={styles.selectedStopTimeText}>{selectedTime}</Text>
          </View>

          {/* Destination Stop */}
          <View style={[styles.stopMarker, styles.stopMarkerRight]}>
            <View style={styles.stopDotOutline}>
              <View style={styles.stopDotInner} />
            </View>
            <Text style={styles.stopNameText}>{destLabel}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const BordingNDroppingPoints = ({ navigation, route }) => {
  const routeParams = route?.params ?? {};
  const routeBus = getObjectValue(routeParams.bus) ?? {};

  const selectedSeats = useMemo(
    () =>
      normalizeSeatList(routeParams.selectedSeats).length > 0
        ? normalizeSeatList(routeParams.selectedSeats)
        : normalizeSeatList(routeParams.seatNumber),
    [routeParams.selectedSeats, routeParams.seatNumber],
  );

  const selectedSeatDetails = useMemo(
    () =>
      Array.isArray(routeParams.selectedSeatDetails)
        ? routeParams.selectedSeatDetails
        : [],
    [routeParams.selectedSeatDetails],
  );

  const fromCity =
    normalizeText(
      routeParams.from ??
        routeParams.fromCity ??
        routeBus.fromCity ??
        routeBus.sourceCity ??
        routeBus.source ??
        '',
    ) || '';

  const toCity =
    normalizeText(
      routeParams.to ??
        routeParams.toCity ??
        routeBus.toCity ??
        routeBus.destinationCity ??
        routeBus.destination ??
        '',
    ) || '';

  const operatorName =
    normalizeText(
      routeParams.operatorName ??
        routeBus.operatorName ??
        routeBus.travelName ??
        routeBus.busName,
    ) || 'AR & BCVR TRAVELS';

  const routeDateLabel =
    formatRouteDate(
      routeParams.date ?? routeParams.dateLabel ?? routeParams.dateValue,
    ) || 'Mon, 03 Aug';

  const datePillText = formatDatePill(routeDateLabel);

  const [boardingPointsList, setBoardingPointsList] = useState([]);
  const [droppingPointsList, setDroppingPointsList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isObjectList = (list) =>
      Array.isArray(list) &&
      list.length > 0 &&
      typeof list[0] === 'object' &&
      list[0] !== null;

    const rawBp = asCollection(
      routeParams.BoardingPoints ??
        routeBus.BoardingPoints ??
        routeParams.boardingPoints ??
        routeBus.boardingPoints ??
        routeParams.boardingStops ??
        routeBus.boardingStops ??
        [],
    );
    const rawDp = asCollection(
      routeParams.DroppingPoints ??
        routeBus.DroppingPoints ??
        routeParams.droppingPoints ??
        routeBus.droppingPoints ??
        routeParams.droppingStops ??
        routeBus.droppingStops ??
        [],
    );

    const validBp = isObjectList(rawBp) ? rawBp : [];
    const validDp = isObjectList(rawDp) ? rawDp : [];

    setBoardingPointsList(validBp);
    setDroppingPointsList(validDp);

    const traceId = routeParams.traceId ?? routeBus.traceId ?? '';
    const srdvIndex = routeParams.srdvIndex ?? routeBus.srdvIndex ?? '';
    const resultIndex = routeParams.resultIndex ?? routeBus.resultIndex ?? '';

    if (traceId && resultIndex) {
      if (validBp.length === 0 || validDp.length === 0) {
        setLoading(true);
      }
      import('../../../services/busService')
        .then(({ getBoardingPoints }) => {
          getBoardingPoints({
            traceId: String(traceId),
            srdvIndex: String(srdvIndex ?? ''),
            resultIndex: String(resultIndex),
          })
            .then((res) => {
              if (res) {
                const payload =
                  res?.Result ?? res?.result ?? res?.data ?? res ?? {};
                const bp =
                  payload.BoardingPoints ??
                  payload.BoardingPointsDetails ??
                  payload.boardingPointsDetails ??
                  payload.boardingPoints ??
                  res.BoardingPoints ??
                  res.BoardingPointsDetails ??
                  res.boardingPoints ??
                  [];
                const dp =
                  payload.DroppingPoints ??
                  payload.DroppingPointsDetails ??
                  payload.droppingPointsDetails ??
                  payload.droppingPoints ??
                  res.DroppingPoints ??
                  res.DroppingPointsDetails ??
                  res.droppingPoints ??
                  [];

                if (Array.isArray(bp) && bp.length > 0)
                  setBoardingPointsList(bp);
                if (Array.isArray(dp) && dp.length > 0)
                  setDroppingPointsList(dp);
              }
            })
            .catch((err) => {
              console.warn(
                '[BordingNDroppingPoints] Dynamic points fetch failed:',
                err?.message,
              );
            })
            .finally(() => {
              setLoading(false);
            });
        })
        .catch((err) => {
          console.error(
            '[BordingNDroppingPoints] Failed to load busService helper:',
            err,
          );
          setLoading(false);
        });
    }
  }, [routeParams, routeBus]);

  const boardingOptions = useMemo(
    () =>
      buildPointOptions(
        boardingPointsList,
        'boarding',
        fromCity || 'Boarding point',
      ),
    [boardingPointsList, fromCity],
  );

  const droppingOptions = useMemo(
    () =>
      buildPointOptions(
        droppingPointsList,
        'dropping',
        toCity || 'Dropping point',
      ),
    [droppingPointsList, toCity],
  );

  const [activeTab, setActiveTab] = useState('dropping');
  const [selectedBoardingId, setSelectedBoardingId] = useState(null);
  const [selectedDroppingId, setSelectedDroppingId] = useState(null);

  useEffect(() => {
    setSelectedBoardingId((currentId) => {
      if (
        currentId &&
        boardingOptions.some((option) => option.id === currentId)
      ) {
        return currentId;
      }
      return boardingOptions[0]?.id ?? null;
    });
  }, [boardingOptions]);

  useEffect(() => {
    setSelectedDroppingId((currentId) => {
      if (
        currentId &&
        droppingOptions.some((option) => option.id === currentId)
      ) {
        return currentId;
      }
      return droppingOptions[0]?.id ?? null;
    });
  }, [droppingOptions]);

  const selectedBoardingPoint =
    boardingOptions.find((option) => option.id === selectedBoardingId) ??
    boardingOptions[0] ??
    null;

  const selectedDroppingPoint =
    droppingOptions.find((option) => option.id === selectedDroppingId) ??
    droppingOptions[0] ??
    null;

  const activeOptions =
    activeTab === 'boarding' ? boardingOptions : droppingOptions;

  const selectedActivePoint =
    activeTab === 'boarding' ? selectedBoardingPoint : selectedDroppingPoint;

  const hasSeatSelection = selectedSeats.length > 0;

  const handleContinue = () => {
    if (hasSeatSelection) {
      if (!selectedBoardingPoint || !selectedDroppingPoint) {
        Alert.alert(
          'Select points',
          'Please choose both boarding and dropping points before continuing.',
        );
        return;
      }

      navigation.navigate('PostBusBooking', {
        ...routeParams,
        selectedSeats,
        selectedSeatDetails,
        seatNumber: routeParams.seatNumber ?? selectedSeats.join(', '),
        boardingPoint: selectedBoardingPoint.name,
        droppingPoint: selectedDroppingPoint.name,
        boardingPointId: selectedBoardingPoint.id,
        droppingPointId: selectedDroppingPoint.id,
        selectedBoardingPoint,
        selectedDroppingPoint,
      });
      return;
    }

    navigation.goBack();
  };

  const renderPoint = ({ item }) => {
    const isSelected =
      activeTab === 'boarding'
        ? selectedBoardingPoint?.id === item.id
        : selectedDroppingPoint?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.pointRow, isSelected && styles.pointRowSelected]}
        onPress={() => {
          if (activeTab === 'boarding') {
            setSelectedBoardingId(item.id);
          } else {
            setSelectedDroppingId(item.id);
          }
        }}
        activeOpacity={0.88}
      >
        {/* Selected Accent Bar on left edge */}
        {isSelected ? <View style={styles.selectedLeftBar} /> : null}

        <View style={styles.pointTextWrap}>
          <Text style={styles.pointName}>{item.name}</Text>
          {item.address ? (
            <Text style={styles.pointAddress}>{item.address}</Text>
          ) : null}
          {item.time ? (
            <Text style={styles.pointTime}>{item.time}</Text>
          ) : null}
        </View>

        {/* Custom Radio Button */}
        <View
          style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}
        >
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.scrollContent}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          {/* Back Button (Rounded Square 48x48) */}
          <TouchableOpacity
            style={styles.backButtonSquare}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
          </TouchableOpacity>

          {/* Date Pill Top-Right */}
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{datePillText}</Text>
          </View>
        </View>

        {/* Operator Title & Route Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.operatorTitle} numberOfLines={1}>
            {operatorName}
          </Text>

          <Text style={styles.routeSubtitle} numberOfLines={1}>
            {[fromCity || 'Kadapa', toCity || 'Hyderabad'].join('  →  ')}
          </Text>
        </View>

        {/* Horizon Route Banner */}
        <HorizonRouteBanner
          fromCity={fromCity}
          toCity={toCity}
          selectedPoint={selectedActivePoint}
        />

        {/* Selected Seat Chip */}
        <View style={styles.seatChipSection}>
          <Text style={styles.seatChipLabel}>SELECTED SEAT</Text>
          <View style={styles.seatChipBadge}>
            <Text style={styles.seatChipText}>
              {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'L1'}
            </Text>
          </View>
        </View>

        {/* Segmented Tabs */}
        <View style={styles.segmentedTabContainer}>
          <TouchableOpacity
            style={[
              styles.segmentedTab,
              activeTab === 'boarding' && styles.segmentedTabActive,
            ]}
            onPress={() => setActiveTab('boarding')}
            activeOpacity={0.88}
          >
            <Text
              style={[
                styles.segmentedTabText,
                activeTab === 'boarding' && styles.segmentedTabTextActive,
              ]}
            >
              Boarding points
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentedTab,
              activeTab === 'dropping' && styles.segmentedTabActive,
            ]}
            onPress={() => setActiveTab('dropping')}
            activeOpacity={0.88}
          >
            <Text
              style={[
                styles.segmentedTabText,
                activeTab === 'dropping' && styles.segmentedTabTextActive,
              ]}
            >
              Dropping points
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main List Card Container */}
        <View style={styles.listCard}>
          <Text style={styles.listCardTitle}>
            {activeTab === 'boarding'
              ? 'Select a boarding point'
              : 'Select a dropping point'}
          </Text>
          <View style={styles.dividerLine} />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading points...</Text>
            </View>
          ) : (
            <FlatList
              data={activeOptions}
              keyExtractor={(item, index) => `${item.id || index}`}
              renderItem={renderPoint}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.dividerLine} />}
              contentContainerStyle={
                activeOptions.length === 0
                  ? styles.emptyList
                  : styles.listContent
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No points available</Text>
                  <Text style={styles.emptyText}>
                    This bus does not currently expose {activeTab} points.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>

      {/* Sticky Bottom CTA Bar */}
      <View style={styles.bottomStickyBar}>
        <View style={styles.ctaTextWrap}>
          <Text style={styles.ctaSubLabel}>CONTINUE TO BOOKING</Text>
          <Text style={styles.ctaRouteSummary} numberOfLines={1}>
            {selectedBoardingPoint?.name || 'Boarding Point'} ➔{' '}
            {selectedDroppingPoint?.name || 'Dropping Point'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.ctaButtonTouch,
            hasSeatSelection &&
              (!selectedBoardingPoint || !selectedDroppingPoint) &&
              styles.ctaButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={
            hasSeatSelection &&
            (!selectedBoardingPoint || !selectedDroppingPoint)
          }
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.accentAmberDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradientBtn}
          >
            <Text style={styles.ctaButtonText}>
              {hasSeatSelection ? 'Next' : 'Done'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BordingNDroppingPoints;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  // ─── Header ──────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButtonSquare: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePill: {
    backgroundColor: COLORS.selectedFill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  titleSection: {
    marginBottom: 8,
  },
  operatorTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.ink,
    letterSpacing: -0.4,
  },
  routeSubtitle: {
    fontSize: 15,
    color: COLORS.inkSoft,
    marginTop: 2,
    fontWeight: '600',
  },

  // ─── Horizon Route Banner ────────────────────────────────────────────────
  bannerContainer: {
    borderRadius: 20,
    height: 110,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: COLORS.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  bannerInner: {
    flex: 1,
    justifyContent: 'center',
  },
  dotsTrackRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  stopsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  stopMarker: {
    alignItems: 'center',
  },
  stopMarkerLeft: {
    alignItems: 'flex-start',
    top: 18,
  },
  stopMarkerRight: {
    alignItems: 'flex-end',
    top: 18,
  },
  stopMarkerCenter: {
    alignItems: 'center',
    top: 0,
  },
  stopDotOutline: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  stopNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  busBadge: {
    width: 24,
    height: 20,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  glowRingOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRingInner: {
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  selectedStopTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  selectedStopTimeText: {
    fontSize: 18,
    fontFamily: MONOSPACE_FONT,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },

  // ─── Seat Chip Section ──────────────────────────────────────────────────
  seatChipSection: {
    marginBottom: 8,
  },
  seatChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.inkSoft,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  seatChipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.selectedFill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  seatChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ─── Segmented Tabs ──────────────────────────────────────────────────────
  segmentedTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.outline,
    padding: 3,
    marginBottom: 10,
    height: 44,
  },
  segmentedTab: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabActive: {
    backgroundColor: COLORS.primary,
  },
  segmentedTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // ─── Main List Card ──────────────────────────────────────────────────────
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  listCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.ink,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  listContent: {
    paddingBottom: 6,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  pointRowSelected: {
    backgroundColor: COLORS.selectedFill,
  },
  selectedLeftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: COLORS.accentAmberDeep,
  },
  pointTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  pointName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  pointAddress: {
    fontSize: 13,
    color: COLORS.inkSoft,
    marginTop: 2,
    fontWeight: '400',
  },
  pointTime: {
    fontSize: 13,
    fontFamily: MONOSPACE_FONT,
    fontWeight: '700',
    color: COLORS.ink,
    marginTop: 4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: COLORS.accentAmberDeep,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.inkSoft,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.inkSoft,
    textAlign: 'center',
  },

  // ─── Sticky Bottom CTA Bar ───────────────────────────────────────────────
  bottomStickyBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  ctaTextWrap: {
    flex: 1,
    paddingRight: 14,
  },
  ctaSubLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.inkSoft,
    letterSpacing: 0.6,
  },
  ctaRouteSummary: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 3,
  },
  ctaButtonTouch: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaGradientBtn: {
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
