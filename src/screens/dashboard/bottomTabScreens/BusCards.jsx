import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
} from "react-native";

import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { searchBuses, getSeatLayout } from "../../../services/busService";

import {
  createDefaultBusFilters,
  matchesBusFilters,
} from "../../../utils/busFilters";

const BUS_BOOKINGS_API_BASE_URL =
  "https://paycheck-baton-overfull.ngrok-free.dev/api/BusBookings";
const PRIMARY_RED = "#D11A2A";
const SURFACE_BG = "#F7F9FA";
const CARD_RADIUS = 17;

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const formatApiDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatHeaderDate = (value) => {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) return "";
  return parsedDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getSerializedDateValue = (value) => {
  const parsedDate = parseDateValue(value);
  return parsedDate ? parsedDate.toISOString() : undefined;
};

const getValues = (item, keys) =>
  keys.map((key) => normalizeText(item?.[key])).filter(Boolean);

const matchesText = (selected, values) => {
  const selectedText = normalizeText(selected);
  if (!selectedText || values.length === 0) return true;
  // If the query is a numeric city code, skip text filtering
  if (/^\d+$/.test(selectedText)) return true;
  return values.some(
    (value) =>
      value === selectedText ||
      value.includes(selectedText) ||
      selectedText.includes(value),
  );
};

const getDateKey = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getItemDateKey = (item) =>
  getDateKey(
    item?.travelDate ||
      item?.journeyDate ||
      item?.date ||
      item?.departureDate ||
      item?.departureTimeUtc ||
      item?.departureTime,
  );

const fromCityKeys = ["fromCity", "sourceCity", "source", "from", "origin"];
const toCityKeys = ["toCity", "destinationCity", "destination", "to"];
const fromPointKeys = ["boardingPoint", "boardingLocation", "boarding"];
const toPointKeys = ["droppingPoint", "dropPoint", "droppingLocation", "drop"];

const getSeatScreenName = (layoutType, busType, variant) => {
  return "SeaterSleeper2Plus1Standard";
};

const BusCardItem = ({
  item,
  busId,
  loadingBusId,
  onOpenBoardingDropping,
  onViewSeats,
  formatTime,
  calculateDuration,
  animatedValues,
}) => {
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedValues.opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValues.scale, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animatedValues]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: animatedValues.opacity,
          transform: [{ scale: animatedValues.scale }],
        },
      ]}
    >
      <View style={styles.cardInner}>
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={styles.operator} numberOfLines={1}>
              {item?.operatorName || "Operator"}
            </Text>
            <Text style={styles.busType} numberOfLines={1}>
              {item?.busType || "Bus"}
            </Text>
          </View>

          <View style={styles.topRight}>
            <Text style={styles.priceLabel}>Fare</Text>
            <Text style={styles.price}>₹ {item?.priceInr ?? "--"}</Text>
          </View>
        </View>

        <View style={styles.timelineRow}>
          <View style={styles.timelineBlock}>
            <Text style={styles.time}>{formatTime(item?.departureTimeUtc)}</Text>
            <Text style={styles.city} numberOfLines={1}>
              {item?.boardingPoint || "Boarding point"}
            </Text>
          </View>

          <View style={styles.durationPill}>
            <Text style={styles.duration}>
              {calculateDuration(item?.departureTimeUtc, item?.arrivalTimeUtc)}
            </Text>
            <Text style={styles.durationHint}>journey</Text>
          </View>

          <View style={[styles.timelineBlock, styles.timelineRight]}>
            <Text style={styles.time}>{formatTime(item?.arrivalTimeUtc)}</Text>
            <Text style={styles.city} numberOfLines={1}>
              {item?.droppingPoint || "Dropping point"}
            </Text>
          </View>
        </View>

        <View style={styles.seatRow}>
          <View style={styles.seatBadge}>
            <Text style={styles.seats}>
              {item?.availableSeats ?? "--"} Seats Available
            </Text>
          </View>
          <Text style={styles.total}>Total {item?.totalSeats ?? "--"}</Text>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.btnSecondary,
              pressed && styles.btnPressed,
            ]}
            onPress={() => onOpenBoardingDropping(item)}
          >
            <Text style={styles.btnSecondaryText}>Boarding & Dropping</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btnSecondary,
              pressed && styles.btnPressed,
            ]}
            onPress={() => {}}
          >
            <Text style={styles.btnSecondaryText}>Policies</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPrimaryPressed,
            ]}
            onPress={() => onViewSeats(item)}
          >
            {loadingBusId === busId ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>View Seats</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const BusLoadingState = ({ loading }) => {
  const busMotion = useRef(new Animated.Value(0)).current;
  const wheelSpin = useRef(new Animated.Value(0)).current;
  const dotValues = useRef(
    [new Animated.Value(0.2), new Animated.Value(0.2), new Animated.Value(0.2)],
  ).current;

  useEffect(() => {
    if (!loading) return undefined;

    const busLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(busMotion, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(busMotion, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    const wheelLoop = Animated.loop(
      Animated.timing(wheelSpin, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );

    const dotsLoop = Animated.loop(
      Animated.stagger(
        180,
        dotValues.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 240,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.2,
              duration: 240,
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );

    busLoop.start();
    wheelLoop.start();
    dotsLoop.start();

    return () => {
      busLoop.stop();
      wheelLoop.stop();
      dotsLoop.stop();
    };
  }, [busMotion, wheelSpin, dotValues, loading]);

  const busTranslateX = busMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  const wheelRotate = wheelSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.loadingWrap}>
      <View style={styles.loadingCard}>
        <View style={styles.loadingScene}>
          <View style={styles.skylineRow}>
            <View style={[styles.skyScraper, styles.skyScraperSm]} />
            <View style={[styles.skyScraper, styles.skyScraperMd]} />
            <View style={[styles.skyScraper, styles.skyScraperLg]} />
            <View style={[styles.skyScraper, styles.skyScraperSm]} />
            <View style={[styles.skyScraper, styles.skyScraperMd]} />
          </View>

          <Animated.View
            style={[
              styles.busIllustration,
              { transform: [{ translateX: busTranslateX }] },
            ]}
          >
            <View style={styles.busOutline}>
              <View style={styles.busTopBar} />
              <View style={styles.busWindowsRow}>
                <View style={styles.busWindow} />
                <View style={styles.busWindow} />
                <View style={styles.busWindow} />
                <View style={styles.busWindow} />
              </View>
              <View style={styles.busDoor} />
              <View style={styles.busBaseLine} />
              <View style={styles.busWheelsRow}>
                <View style={styles.busWheel}>
                  <Animated.View
                    style={[
                      styles.busWheelInner,
                      { transform: [{ rotate: wheelRotate }] },
                    ]}
                  />
                </View>
                <View style={styles.busWheel}>
                  <Animated.View
                    style={[
                      styles.busWheelInner,
                      { transform: [{ rotate: wheelRotate }] },
                    ]}
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          <View style={styles.loadingDotsRow}>
            {dotValues.map((dot, index) => (
              <Animated.View
                key={`loading-dot-${index}`}
                style={[styles.loadingDot, { opacity: dot }]}
              />
            ))}
          </View>

          <Text style={styles.loadingTitle}>Finding buses</Text>
          <Text style={styles.loadingSubtitle}>
            India has over 1.7 million buses!
          </Text>
        </View>
      </View>
    </View>
  );
};

const BusCards = ({
  from,
  to,
  date,
  filters = createDefaultBusFilters(),
  sortBy = "arrival",
  sortDirection = "asc",
  onDataChange,
  onResultsCountChange,
}) => {
  const navigation = useNavigation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBusId, setLoadingBusId] = useState(null);
  const animatedValuesRef = useRef(new Map());

  const getBusId = (item) =>
    item?.busId ??
    item?.busID ??
    item?.BusId ??
    item?.id ??
    item?.Id ??
    item?.busBookingId;

  const getAnimatedValues = (key) => {
    if (!animatedValuesRef.current.has(key)) {
      animatedValuesRef.current.set(key, {
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.96),
      });
    }

    return animatedValuesRef.current.get(key);
  };

  const uniqueData = useMemo(() => {
    const map = new Map();

    data.forEach((item, index) => {
      const key = getBusId(item) ?? `row-${index}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return Array.from(map.values());
  }, [data]);

  useEffect(() => {
    if (typeof onDataChange === "function") {
      onDataChange(uniqueData);
    }
  }, [onDataChange, uniqueData]);

  const getCityName = (val) => (val && typeof val === "object" ? (val.cityName || val.name) : String(val || ""));

  const handleViewSeats = async (item) => {
    const busId = getBusId(item);

    if (!busId) {
      console.log("Bus id missing:", item);
      return;
    }

    setLoadingBusId(busId);

    try {
      const seatLayout = await getSeatLayout({
        traceId: item?.traceId,
        resultIndex: item?.resultIndex,
        srdvIndex: item?.srdvIndex,
      });

      navigation.navigate(
        getSeatScreenName(
          seatLayout?.layoutType,
          item?.busType,
          seatLayout?.variant,
        ),
        {
          busId,
          busType: item?.busType,
          layoutType: seatLayout?.layoutType,
          variant: seatLayout?.variant,
          seatLayout: seatLayout,
          from: getCityName(from),
          to: getCityName(to),
          date: formatHeaderDate(date),
          dateValue: getSerializedDateValue(date),
          operatorName: item?.operatorName,
          bus: item,
          boardingPoint: item?.boardingPoint,
          droppingPoint: item?.droppingPoint,
          boardingPoints: seatLayout?.boardingPoints ?? item?.boardingPoints,
          droppingPoints: seatLayout?.droppingPoints ?? item?.droppingPoints,
        },
      );
    } catch (error) {
      console.log("Error fetching seat layout:", error);

      navigation.navigate(getSeatScreenName("", item?.busType, ""), {
        busId,
        busType: item?.busType,
        from: getCityName(from),
        to: getCityName(to),
        date: formatHeaderDate(date),
        dateValue: getSerializedDateValue(date),
        operatorName: item?.operatorName,
        bus: item,
        boardingPoint: item?.boardingPoint,
        droppingPoint: item?.droppingPoint,
        boardingPoints: item?.boardingPoints,
        droppingPoints: item?.droppingPoints,
      });
    } finally {
      setLoadingBusId((current) => (current === busId ? null : current));
    }
  };

  const handleOpenBoardingDropping = (item) => {
    const busId = getBusId(item);

    navigation.navigate("BordingNDroppingPoints", {
      busId,
      from: getCityName(from),
      to: getCityName(to),
      date: formatHeaderDate(date),
      dateValue: getSerializedDateValue(date),
      operatorName: item?.operatorName,
      bus: item,
      boardingPoint: item?.boardingPoint,
      droppingPoint: item?.droppingPoint,
      boardingPoints: item?.boardingPoints,
      droppingPoints: item?.droppingPoints,
    });
  };

  const fetchBusData = async () => {
    try {
      setLoading(true);

      const formattedDate = formatApiDate(date);
      const mappedBuses = await searchBuses({
        fromCityCode: from,
        toCityCode: to,
        departDate: formattedDate,
      });

      setData(mappedBuses);
    } catch (error) {
      console.log(
        "Error fetching buses:",
        error.response?.status,
        error.response?.data,
      );
    } finally {
      setLoading(false);
    }
  };

  const fromKey = typeof from === "object" ? (from?.cityId || from?.code) : String(from || "");
  const toKey = typeof to === "object" ? (to?.cityId || to?.code) : String(to || "");
  const dateKey = date ? new Date(date).getTime() : 0;

  useEffect(() => {
    fetchBusData();
  }, [fromKey, toKey, dateKey]);

  const filteredData = useMemo(() => {
    const selectedDateKey = getDateKey(date);

    return uniqueData.filter((item) => {
      const itemDateKey = getItemDateKey(item);

      return (
        (!selectedDateKey || !itemDateKey || itemDateKey === selectedDateKey) &&
        matchesBusFilters(item, filters)
      );
    });
  }, [uniqueData, date, filters]);

  const sortedData = useMemo(() => {
    const items = [...filteredData];

    const getPrice = (item) => {
      const raw = item?.priceInr ?? item?.price ?? item?.fare;
      const parsed = Number(String(raw ?? "").replace(/[^0-9.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
    };

    const getDeparture = (item) => {
      const value = item?.departureTimeUtc ?? item?.departureTime ?? "";
      const time = new Date(`${value}Z`).getTime();
      return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
    };

    const getArrival = (item) => {
      const value = item?.arrivalTimeUtc ?? item?.arrivalTime ?? "";
      const time = new Date(`${value}Z`).getTime();
      return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
    };

    const getDuration = (item) => {
      const start = new Date(`${item?.departureTimeUtc ?? item?.departureTime ?? ""}Z`);
      const end = new Date(`${item?.arrivalTimeUtc ?? item?.arrivalTime ?? ""}Z`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return Number.POSITIVE_INFINITY;
      }

      return end - start;
    };

    const getSeats = (item) => {
      const raw =
        item?.availableSeats ?? item?.seatsAvailable ?? item?.seatAvailable;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
    };

    const compare = (ascValue, descValue) =>
      sortDirection === "desc" ? descValue - ascValue : ascValue - descValue;

    switch (sortBy) {
      case "departure":
        return items.sort((a, b) => compare(getDeparture(a), getDeparture(b)));
      case "duration":
        return items.sort((a, b) => compare(getDuration(a), getDuration(b)));
      case "fare":
        return items.sort((a, b) => compare(getPrice(a), getPrice(b)));
      case "seats":
        return items.sort((a, b) => compare(getSeats(a), getSeats(b)));
      case "arrival":
      default:
        return items.sort((a, b) => compare(getArrival(a), getArrival(b)));
    }
  }, [filteredData, sortBy, sortDirection]);

  useEffect(() => {
    if (typeof onResultsCountChange !== "function") return;

    if (loading) {
      onResultsCountChange(null);
      return;
    }

    onResultsCountChange(sortedData.length);
  }, [loading, onResultsCountChange, sortedData.length]);

  const formatTime = (time) => {
    if (!time) return "--";
    const dateObj = new Date(`${time}Z`);
    if (Number.isNaN(dateObj.getTime())) return "--";
    return dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return "--";
    const startDate = new Date(`${start}Z`);
    const endDate = new Date(`${end}Z`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return "--";
    }
    const diff = endDate - startDate;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `${hours}h ${minutes}m`;
  };

  const renderItem = useCallback(
    ({ item, index }) => {
      const busId = getBusId(item) ?? item?.id ?? item?.busBookingId ?? index;
      const animatedValues = getAnimatedValues(busId);

      return (
        <BusCardItem
          item={item}
          busId={busId}
          loadingBusId={loadingBusId}
          onOpenBoardingDropping={handleOpenBoardingDropping}
          onViewSeats={handleViewSeats}
          formatTime={formatTime}
          calculateDuration={calculateDuration}
          animatedValues={animatedValues}
        />
      );
    },
    [loadingBusId, handleOpenBoardingDropping, handleViewSeats],
  );

  const keyExtractor = useCallback(
    (item, index) => String(getBusId(item) ?? item?.id ?? index),
    [],
  );

  return (
    <FlatList
      style={styles.list}
      data={sortedData}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      initialNumToRender={5}
      maxToRenderPerBatch={8}
      windowSize={5}
      removeClippedSubviews={Platform.OS === "android"}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.listContent,
        sortedData.length === 0 && styles.emptyList,
      ]}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          {loading ? (
            <BusLoadingState loading={loading} />
          ) : (
            <>
              <Text style={styles.emptyText}>
                No buses found for this route.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.retryBtn,
                  pressed && styles.btnPrimaryPressed,
                ]}
                onPress={fetchBusData}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </>
          )}
        </View>
      }
    />
  );
};

export default BusCards;

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: SURFACE_BG,
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingBottom: 100,
    backgroundColor: SURFACE_BG,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
  },
  // loadingCard: {
  //   width: "100%",
  //   maxWidth: 300,
  //   backgroundColor: "#FFFFFF",
  //   borderRadius: 20,
  //   paddingVertical: 18,
  //   paddingHorizontal: 14,
  //   alignItems: "center",
  //   shadowColor: "#0F172A",
  //   shadowOffset: { width: 0, height: 6 },
  //   shadowOpacity: 0.06,
  //   shadowRadius: 14,
  //   elevation: 3,
  // },
  loadingScene: {
    width: "100%",
    alignItems: "center",
  },
  skylineRow: {
    width: "100%",
    height: 86,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  // skyScraper: {
  //   width: 12,
  //   backgroundColor: "#E7E7E7",
  //   borderRadius: 2,
  //   borderWidth: 1,
  //   borderColor: "#D8D8D8",
  // },
  skyScraperSm: {
    height: 34,
  },
  skyScraperMd: {
    height: 52,
  },
  skyScraperLg: {
    height: 64,
  },
  busIllustration: {
    width: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  busOutline: {
    width: 220,
    height: 82,
    borderWidth: 1.8,
    borderColor: "#111111",
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  busTopBar: {
    width: 72,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#111111",
    alignSelf: "center",
    marginBottom: 6,
  },
  busWindowsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  busWindow: {
    width: 32,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#111111",
  },
  busDoor: {
    position: "absolute",
    left: 14,
    bottom: 14,
    width: 14,
    height: 30,
    borderWidth: 1.6,
    borderColor: "#111111",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  busBaseLine: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 22,
    height: 2,
    backgroundColor: "#111111",
  },
  busWheelsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -13,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 34,
  },
  busWheel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  busWheelInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  loadingDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_RED,
    marginHorizontal: 4,
  },
  loadingTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  loadingSubtitle: {
    marginTop: 4,
    color: "#667085",
    fontSize: 11,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: CARD_RADIUS,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardInner: {
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topLeft: {
    flex: 1,
    paddingRight: 12,
  },
  topRight: {
    alignItems: "flex-end",
  },
  operator: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  busType: {
    color: "#6B7280",
    marginTop: 3,
    fontSize: 13,
  },
  priceLabel: {
    fontSize: 11,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  price: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  timelineBlock: {
    flex: 1,
  },
  timelineRight: {
    alignItems: "flex-end",
  },
  time: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  city: {
    color: "#667085",
    marginTop: 4,
    fontSize: 12,
  },
  durationPill: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginHorizontal: 10,
  },
  duration: {
    color: "#344054",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  durationHint: {
    color: "#667085",
    fontSize: 10,
    marginTop: 2,
  },
  seatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  seatBadge: {
    backgroundColor: "#ECFDF3",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  seats: {
    color: "#027A48",
    fontWeight: "700",
    fontSize: 11,
  },
  total: {
    color: "#667085",
    fontSize: 11,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 6,                  // Slightly tighter gap between horizontal buttons
    marginTop: 12,           // Decreased from 14
  },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    minHeight: 36,           // Decreased from 42 to flatten the action buttons significantly
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  btnSecondaryText: {
    textAlign: "center",
    fontSize: 11,            // Downsized from 12 for clean button alignment
    color: "#344054",
    fontWeight: "600",
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: PRIMARY_RED,
    borderRadius: 12,
    minHeight: 36,           // Decreased from 42 to make the main action button flatter
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 11,            // Downsized from 12
    fontWeight: "800",
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  btnPrimaryPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});
