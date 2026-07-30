import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';

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
    return value
      .map((seat) => normalizeText(seat))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((seat) => normalizeText(seat))
      .filter(Boolean);
  }

  return [];
};

const formatRouteDate = (value) => {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }

    return value.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  const parsedDate = new Date(value);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return normalizeText(value);
};

const asCollection = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [value];
};

const buildPointOption = (value, kind, fallbackLabel, index) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

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

  if (!raw) {
    return null;
  }

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
    name: label,
    address,
    time,
  };
};

const buildPointOptions = (value, kind, fallbackLabel) => {
  const options = asCollection(value)
    .map((item, index) =>
      buildPointOption(item, kind, fallbackLabel, index),
    )
    .filter(Boolean);

  return Array.from(
    new Map(options.map((option) => [String(option.id), option])).values(),
  );
};

const BordingNDroppingPoints = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

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
    ) || 'Select boarding and dropping points';

  const routeDateLabel =
    formatRouteDate(
      routeParams.date ??
        routeParams.dateLabel ??
        routeParams.dateValue,
    ) || '';

  const [boardingPointsList, setBoardingPointsList] = useState([]);
  const [droppingPointsList, setDroppingPointsList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isObjectList = (list) =>
      Array.isArray(list) && list.length > 0 && typeof list[0] === "object" && list[0] !== null;

    const rawBp = asCollection(
      routeParams.BoardingPoints ??
      routeBus.BoardingPoints ??
      routeParams.boardingPoints ??
      routeBus.boardingPoints ??
      routeParams.boardingStops ??
      routeBus.boardingStops ??
      []
    );
    const rawDp = asCollection(
      routeParams.DroppingPoints ??
      routeBus.DroppingPoints ??
      routeParams.droppingPoints ??
      routeBus.droppingPoints ??
      routeParams.droppingStops ??
      routeBus.droppingStops ??
      []
    );

    const validBp = isObjectList(rawBp) ? rawBp : [];
    const validDp = isObjectList(rawDp) ? rawDp : [];

    console.log("[BordingNDroppingPoints] Initial Route Boarding Points count:", validBp.length, validBp);
    console.log("[BordingNDroppingPoints] Initial Route Dropping Points count:", validDp.length, validDp);

    setBoardingPointsList(validBp);
    setDroppingPointsList(validDp);

    // Always fetch complete dynamic boarding & dropping stops from SRDV backend
    const traceId = routeParams.traceId ?? routeBus.traceId ?? "";
    const srdvIndex = routeParams.srdvIndex ?? routeBus.srdvIndex ?? "";
    const resultIndex = routeParams.resultIndex ?? routeBus.resultIndex ?? "";

    if (traceId && resultIndex) {
      if (validBp.length === 0 || validDp.length === 0) {
        setLoading(true);
      }
      console.log(`[BordingNDroppingPoints] Fetching dynamic points for traceId=${traceId}, resultIndex=${resultIndex}`);
      import("../../../services/busService")
        .then(({ getBoardingPoints }) => {
          getBoardingPoints({
            traceId: String(traceId),
            srdvIndex: String(srdvIndex ?? ""),
            resultIndex: String(resultIndex),
          })
            .then((res) => {
              if (res) {
                const payload = res?.Result ?? res?.result ?? res?.data ?? res ?? {};
                const bp = payload.BoardingPoints ?? payload.BoardingPointsDetails ?? payload.boardingPointsDetails ?? payload.boardingPoints ?? res.BoardingPoints ?? res.BoardingPointsDetails ?? res.boardingPoints ?? [];
                const dp = payload.DroppingPoints ?? payload.DroppingPointsDetails ?? payload.droppingPointsDetails ?? payload.droppingPoints ?? res.DroppingPoints ?? res.DroppingPointsDetails ?? res.droppingPoints ?? [];
                
                console.log("[BordingNDroppingPoints] Dynamic API returned Boarding Points:", JSON.stringify(bp, null, 2));
                console.log("[BordingNDroppingPoints] Dynamic API returned Dropping Points:", JSON.stringify(dp, null, 2));

                if (Array.isArray(bp) && bp.length > 0) setBoardingPointsList(bp);
                if (Array.isArray(dp) && dp.length > 0) setDroppingPointsList(dp);
              }
            })
            .catch((err) => {
              console.warn("[BordingNDroppingPoints] Dynamic points fetch failed:", err?.message);
            })
            .finally(() => {
              setLoading(false);
            });
        })
        .catch((err) => {
          console.error("[BordingNDroppingPoints] Failed to load busService helper:", err);
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

  useEffect(() => {
    console.log("[BordingNDroppingPoints] Normalized UI Boarding Options:", boardingOptions.length, JSON.stringify(boardingOptions, null, 2));
    console.log("[BordingNDroppingPoints] Normalized UI Dropping Options:", droppingOptions.length, JSON.stringify(droppingOptions, null, 2));
  }, [boardingOptions, droppingOptions]);

  const [activeTab, setActiveTab] = useState('boarding');
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
    boardingOptions.find(
      (option) => option.id === selectedBoardingId,
    ) ?? boardingOptions[0] ?? null;

  const selectedDroppingPoint =
    droppingOptions.find(
      (option) => option.id === selectedDroppingId,
    ) ?? droppingOptions[0] ?? null;

  const activeOptions =
    activeTab === 'boarding' ? boardingOptions : droppingOptions;

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
        style={[styles.pointCard, isSelected && styles.pointCardSelected]}
        onPress={() => {
          if (activeTab === 'boarding') {
            setSelectedBoardingId(item.id);
          } else {
            setSelectedDroppingId(item.id);
          }
        }}
        activeOpacity={0.86}
      >
        <View style={styles.pointTextWrap}>
          <Text style={styles.pointName}>{item.name}</Text>

          {item.address ? (
            <Text style={styles.pointSubtitle}>{item.address}</Text>
          ) : null}

          {item.time ? <Text style={styles.pointTime}>{item.time}</Text> : null}
        </View>

        <Icon
          name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
          size={28}
          color={isSelected ? '#E53935' : '#666'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="arrow-back" size={28} color="#111" />
          <View style={styles.headerTextWrap}>
            <Text
              style={[styles.headerTitle, isCompact && styles.headerTitleCompact]}
              numberOfLines={2}
            >
              {operatorName}
            </Text>

            {fromCity || toCity ? (
              <Text style={styles.routeText} numberOfLines={2}>
                {[fromCity, toCity].filter(Boolean).join(' -> ')}
              </Text>
            ) : null}

            {routeDateLabel ? (
              <Text style={styles.routeDate}>{routeDateLabel}</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {hasSeatSelection ? (
          <View style={styles.seatSummaryCard}>
            <Text style={styles.seatSummaryLabel}>Selected Seats</Text>
            <Text style={styles.seatSummaryValue}>
              {selectedSeats.join(', ')}
            </Text>
          </View>
        ) : (
          <Text style={styles.helperText}>
            Choose your boarding and dropping points.
          </Text>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('boarding')}
          activeOpacity={0.9}
        >
          <Text
            style={[
              styles.tabTitle,
              isCompact && styles.tabTitleCompact,
              activeTab === 'boarding' && styles.activeTabTitle,
            ]}
          >
            Boarding points
          </Text>

          {fromCity ? (
            <Text style={styles.tabCity} numberOfLines={1}>
              {fromCity}
            </Text>
          ) : null}

          {activeTab === 'boarding' ? <View style={styles.activeLine} /> : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('dropping')}
          activeOpacity={0.9}
        >
          <Text
            style={[
              styles.tabTitle,
              activeTab === 'dropping' && styles.activeTabTitle,
            ]}
          >
            Dropping points
          </Text>

          {toCity ? (
            <Text style={styles.tabCity} numberOfLines={1}>
              {toCity}
            </Text>
          ) : null}

          {activeTab === 'dropping' ? <View style={styles.activeLine} /> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>
          {activeTab === 'boarding'
            ? 'Select a boarding point'
            : 'Select a dropping point'}
        </Text>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#E31E24" />
            <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading points...</Text>
          </View>
        ) : (
          <FlatList
            data={activeOptions}
            keyExtractor={(item, index) => `${item.id || index}`}
            renderItem={renderPoint}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              activeOptions.length === 0 ? styles.emptyList : styles.listContent
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

      <View style={[styles.footer, isCompact && styles.footerCompact]}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>
            {hasSeatSelection ? 'Continue to booking' : 'Done'}
          </Text>

          {selectedBoardingPoint && selectedDroppingPoint ? (
            <Text style={styles.footerValue} numberOfLines={2}>
              {selectedBoardingPoint.name} -> {selectedDroppingPoint.name}
            </Text>
          ) : (
            <Text style={styles.footerHint}>
              Pick one boarding point and one dropping point.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            hasSeatSelection &&
              (!selectedBoardingPoint || !selectedDroppingPoint) &&
              styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={
            hasSeatSelection &&
            (!selectedBoardingPoint || !selectedDroppingPoint)
          }
          activeOpacity={0.88}
        >
          <Text style={styles.buttonText}>
            {hasSeatSelection ? 'Next' : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BordingNDroppingPoints;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F8',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  headerTitleCompact: {
    fontSize: 20,
  },
  routeText: {
    marginTop: 6,
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  routeDate: {
    marginTop: 4,
    color: '#888',
    fontSize: 13,
  },
  helperText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  seatSummaryCard: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
  },
  seatSummaryLabel: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  seatSummaryValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 10,
  },
  tabTitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  tabTitleCompact: {
    fontSize: 15,
  },
  activeTabTitle: {
    fontWeight: '700',
    color: '#000',
  },
  tabCity: {
    marginTop: 4,
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  activeLine: {
    height: 3,
    backgroundColor: '#E53935',
    width: '100%',
    marginTop: 12,
  },
  listContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  listHeader: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    color: '#222',
  },
  listContent: {
    paddingBottom: 12,
  },
  pointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#EEE',
    gap: 12,
  },
  pointCardSelected: {
    backgroundColor: '#FFF7F7',
  },
  pointTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  pointName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    lineHeight: 22,
  },
  pointSubtitle: {
    marginTop: 4,
    color: '#777',
    fontSize: 14,
    lineHeight: 20,
  },
  pointTime: {
    marginTop: 6,
    color: '#444',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerCompact: {
    paddingHorizontal: 14,
    gap: 10,
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  footerHint: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#E53935',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    minWidth: 92,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
