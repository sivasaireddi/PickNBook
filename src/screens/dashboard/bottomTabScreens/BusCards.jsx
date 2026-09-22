import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Platform,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
} from "react-native";

import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { searchBuses, getSeatLayout } from "../../../services/busService";

import {
  createDefaultBusFilters,
  matchesBusFilters,
} from "../../../utils/busFilters";
import BusPoliciesModal from "./BusPoliciesModal";
import { API_BASE_URL } from "../../../constants/config";

const BusListDataLoaderAsset = require("../../../../assets/BusListDataLoader.jpg");

const BUS_BOOKINGS_API_BASE_URL = `${API_BASE_URL}/api/BusBookings`;
const PRIMARY_RED = "#D11A2A";
const BORDER_COLOR = "#F4A3A3";
const SURFACE_BG = "#F8F9FB";

// Fixed height of each BusCardItem container (Card height 170px + 6px vertical margin)
const CARD_ITEM_HEIGHT = 176;

/**
 * Requirement 5: Cache Search Results
 * Session-level in-memory cache keyed by 'from-to-date' (e.g. Hyderabad-Vijayawada-2026-08-05).
 */
const busSearchCache = new Map();

/**
 * Helpers for date and key normalization
 */
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

const getSeatScreenName = (layoutType, busType, variant) => {
  return "SeaterSleeper2Plus1Standard";
};

// Operator Initials Helper
const getOperatorInitials = (name) => {
  if (!name) return "PB";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Helper for extracting clean city name/code for cache keys
const getCityKey = (val) => {
  if (!val) return "";
  if (typeof val === "object") {
    return (val.cityName || val.city || val.name || val.cityId || val.code || "").trim();
  }
  return String(val).trim();
};

/**
 * Requirement 5: Constructs cache key format: `from-to-date`
 * Example: `Hyderabad-Vijayawada-2026-08-05`
 */
const getSearchCacheKey = (from, to, date) => {
  const fKey = getCityKey(from);
  const tKey = getCityKey(to);
  const dKey = getDateKey(date) || formatApiDate(date);
  return `${fKey}-${tKey}-${dKey}`;
};

// 12-Hour AM/PM Time Format Helper
const format12HourTime = (timeValue) => {
  if (!timeValue) return { timeStr: "--:--", period: "" };
  const str = String(timeValue);
  let dateObj;
  if (str.includes("T") || str.includes("Z") || str.includes("-")) {
    dateObj = new Date(str.endsWith("Z") ? str : `${str}Z`);
  } else if (str.includes(":")) {
    const parts = str.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    dateObj = new Date();
    dateObj.setHours(h, m, 0, 0);
  } else {
    dateObj = new Date(str);
  }

  if (Number.isNaN(dateObj.getTime())) {
    return { timeStr: "--:--", period: "" };
  }

  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12

  const hoursStr = String(hours).padStart(2, "0");
  const minutesStr = String(minutes).padStart(2, "0");

  return { timeStr: `${hoursStr}:${minutesStr}`, period };
};

/**
 * Requirement 8: Image Optimization Component
 * Lazy loads and memoizes operator logo images, caching sources and managing error states
 * without forcing parent bus cards to re-render.
 */
const OperatorLogo = React.memo(({ logoUrl, operatorName }) => {
  const [hasError, setHasError] = useState(false);
  const imageSource = useMemo(() => (logoUrl ? { uri: logoUrl } : null), [logoUrl]);

  if (!imageSource || hasError) {
    return null;
  }

  return (
    <Image
      source={imageSource}
      style={styles.operatorLogoImage}
      onError={() => setHasError(true)}
      resizeMode="contain"
    />
  );
});

// Animated Action Button Component with Press Scale Animation
const ActionButton = React.memo(({ onPress, style, children, activeOpacity = 0.8 }) => {
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 0.98,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ flex: 1 }, { transform: [{ scale: pressAnim }] }]}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
});

/**
 * Requirement 7: Custom memo comparison for BusCardItem.
 * Prevents re-rendering all items when one card's loading state (loadingBusId) updates.
 */
const areBusCardPropsEqual = (prevProps, nextProps) => {
  const wasLoadingThisBus = prevProps.loadingBusId === prevProps.busId;
  const isLoadingThisBus = nextProps.loadingBusId === nextProps.busId;

  // Re-render ONLY if the loading state for THIS specific bus card changed
  if (wasLoadingThisBus !== isLoadingThisBus) {
    return false;
  }

  // Compare item, busId, and memoized function references
  return (
    prevProps.busId === nextProps.busId &&
    prevProps.item === nextProps.item &&
    prevProps.onOpenBoardingDropping === nextProps.onOpenBoardingDropping &&
    prevProps.onOpenPolicies === nextProps.onOpenPolicies &&
    prevProps.onViewSeats === nextProps.onViewSeats &&
    prevProps.calculateDuration === nextProps.calculateDuration
  );
};

// Compact Floating Bus Card Item Component
const BusCardItemComponent = ({
  item,
  busId,
  loadingBusId,
  onOpenBoardingDropping,
  onOpenPolicies,
  onViewSeats,
  calculateDuration,
  animatedValues,
}) => {
  const pressScaleAnim = useRef(new Animated.Value(1)).current;

  // Entrance Animation: Fade in (0 -> 1), TranslateY (12 -> 0), Scale (0.98 -> 1) in 250ms
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedValues.opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues.translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues.scale, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animatedValues]);

  // Touch Feedback Animation for main card pressable
  const handleCardPressIn = () => {
    Animated.timing(pressScaleAnim, {
      toValue: 0.98,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleCardPressOut = () => {
    Animated.timing(pressScaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const deptTimeStr = item?.departureTime || "";
  const arrTimeStr = item?.arrivalTime || "";
  const durationStr = item?.duration || "";
  const operatorName = item?.operatorName || "Jagan Travels Elite";
  const availableSeats = item?.availableSeats ?? 17;
  const isLoadingThisCard = loadingBusId === busId;

  return (
    <Animated.View
      style={[
        styles.outerGlowContainer,
        {
          opacity: animatedValues.opacity,
          transform: [
            { translateY: animatedValues.translateY },
            { scale: Animated.multiply(animatedValues.scale, pressScaleAnim) },
          ],
        },
      ]}
    >
      <View style={styles.cardShadowLayer}>
        <Pressable
          onPressIn={handleCardPressIn}
          onPressOut={handleCardPressOut}
          style={styles.cardPressable}
        >
          <View style={styles.cardInner}>
            {/* Header Row: Operator Name + Bus Type (Left) | FARE + Price (Right) */}
            <View style={styles.headerRow}>
              <View style={styles.operatorWrap}>
                <OperatorLogo logoUrl={item?.operatorLogo || item?.logoUrl} operatorName={operatorName} />
                <Text style={styles.operatorNameText} numberOfLines={1}>
                  {operatorName}
                </Text>
                <Text style={styles.busTypeText} numberOfLines={1}>
                  {item?.busType || "Volvo 9600 SLX Multi-Axle AC"}
                </Text>
              </View>

              <View style={styles.fareWrap}>
                <Text style={styles.fareLabelText}>FARE</Text>
                <Text style={styles.farePriceText}>₹ {item?.priceInr ?? "1318.8"}</Text>
              </View>
            </View>

            {/* Departure Time | Journey Duration Pill | Arrival Time */}
            <View style={styles.journeyRow}>
              {/* Departure */}
              <View style={styles.timeBlockLeft}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeDigitsText}>{deptTimeStr}</Text>
                </View>
                <Text style={styles.locationText} numberOfLines={1}>
                  {item?.boardingPoint || "ITI CIRCLE"}
                </Text>
              </View>

              {/* Journey Duration Pill */}
              <View style={styles.durationPill}>
                <Text style={styles.durationTimeText}>{durationStr}</Text>
                <Text style={styles.durationSubText}>journey</Text>
              </View>

              {/* Arrival */}
              <View style={styles.timeBlockRight}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeDigitsText}>{arrTimeStr}</Text>
                </View>
                <Text style={styles.locationText} numberOfLines={1}>
                  {item?.droppingPoint || "Shamshabad"}
                </Text>
              </View>
            </View>

            {/* Seats Available Badge (Green) Row */}
            <View style={styles.seatsRow}>
              <View style={styles.seatsBadge}>
                <Text style={styles.seatsBadgeText}>
                  {availableSeats} Seats Available
                </Text>
              </View>
            </View>

            {/* Action Buttons Row: Boarding & Dropping | Policies | View Seats */}
            <View style={styles.actionsRow}>
              <ActionButton
                style={styles.actionBtnOutline}
                onPress={() => onOpenBoardingDropping(item)}
              >
                <Ionicons name="location-outline" size={12.5} color="#D11A2A" style={{ marginRight: 2 }} />
                <Text style={styles.actionBtnOutlineText} numberOfLines={2}>
                  Boarding &{"\n"}Dropping
                </Text>
              </ActionButton>

              <ActionButton
                style={styles.actionBtnOutline}
                onPress={() => onOpenPolicies(item)}
              >
                <Ionicons name="document-text-outline" size={12.5} color="#D11A2A" style={{ marginRight: 2 }} />
                <Text style={styles.actionBtnOutlineText}>Policies</Text>
              </ActionButton>

              <ActionButton
                style={styles.actionBtnPrimary}
                onPress={() => onViewSeats(item)}
              >
                {isLoadingThisCard ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionBtnPrimaryText}>View Seats</Text>
                )}
              </ActionButton>
            </View>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const BusCardItem = React.memo(BusCardItemComponent, areBusCardPropsEqual);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BUS_LOADER_WIDTH = 250;

// Bus List Loader Component using project's BusListDataLoader asset with forward motion
const BusLoadingState = React.memo(() => {
  const busTranslateXAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driveLoop = Animated.loop(
      Animated.timing(busTranslateXAnim, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    driveLoop.start();

    return () => {
      driveLoop.stop();
    };
  }, [busTranslateXAnim]);

  const busTranslateX = busTranslateXAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-BUS_LOADER_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View style={styles.loadingWrap}>
      <Animated.View
        style={[
          styles.busAnimContainer,
          { transform: [{ translateX: busTranslateX }] },
        ]}
      >
        <Image
          source={BusListDataLoaderAsset}
          style={styles.loaderImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
});

/**
 * Optimized Main BusCards Screen Component
 */
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
  const [navigatingBusId, setNavigatingBusId] = useState(null);
  const [policyModalBus, setPolicyModalBus] = useState(null);

  // Refs for tracking animation values, active AbortController, and request deduplication
  const animatedValuesRef = useRef(new Map());
  const activeAbortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const lastFetchedKeyRef = useRef("");

  const getBusId = useCallback((item) =>
    item?.busId ??
    item?.busID ??
    item?.BusId ??
    item?.id ??
    item?.Id ??
    item?.busBookingId,
    []);

  const getAnimatedValues = useCallback((key) => {
    if (!animatedValuesRef.current.has(key)) {
      animatedValuesRef.current.set(key, {
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(12),
        scale: new Animated.Value(0.98),
      });
    }

    return animatedValuesRef.current.get(key);
  }, []);

  const uniqueData = useMemo(() => {
    const map = new Map();

    data.forEach((item, index) => {
      const key = getBusId(item) ?? `row-${index}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return Array.from(map.values());
  }, [data, getBusId]);

  useEffect(() => {
    if (typeof onDataChange === "function") {
      onDataChange(uniqueData);
    }
  }, [onDataChange, uniqueData]);

  const getCityName = useCallback((val) => (val && typeof val === "object" ? (val.cityName || val.name) : String(val || "")), []);



  const handleViewSeats = useCallback(async (item) => {
    const busId = getBusId(item);

    console.log("[BusFlow] VIEW SEATS SELECTED:", {
      busId,
      operatorName: item?.operatorName,
      traceId: item?.traceId,
      resultIndex: item?.resultIndex,
      srdvIndex: item?.srdvIndex,
    });

    if (!busId || navigatingBusId) {
      console.log("Bus id missing or already navigating:", item);
      return;
    }

    setNavigatingBusId(busId);
    setLoadingBusId(busId);

    try {
      const seatLayout = await getSeatLayout({
        traceId: item?.traceId,
        resultIndex: item?.resultIndex,
        srdvIndex: item?.srdvIndex,
      });

      console.log("[BusFlow] NAVIGATING TO SEAT SELECTION:", {
        busId,
        seatCount: seatLayout?.seats?.length || 0,
        layoutType: seatLayout?.layoutType,
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
      console.log("[BusFlow] SEAT LAYOUT FALLBACK:", { busId, message: error?.message });
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
      setNavigatingBusId(null);
    }
  }, [getBusId, getCityName, from, to, date, navigation, navigatingBusId]);

  const handleOpenBoardingDropping = useCallback((item) => {
    const busId = getBusId(item);

    console.log("[BusFlow] BOARDING/DROPPING SCREEN:", {
      busId,
      operatorName: item?.operatorName,
      traceId: item?.traceId,
      resultIndex: item?.resultIndex,
    });

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
  }, [getBusId, getCityName, from, to, date, navigation]);

  const handleOpenPolicies = useCallback((item) => {
    console.log("[BusFlow] BUS POLICIES OPENED:", { operatorName: item?.operatorName });
    console.log("Policies clicked:", item?.operatorName || item?.TravelsName || item?.travelsName);
    console.log("CancellationPolicies:", item?.CancellationPolicies || item?.cancellationPolicies || item?.CancellationPolicy);
    setPolicyModalBus(item);
  }, []);

  const handleClosePolicies = useCallback(() => {
    setPolicyModalBus(null);
  }, []);

  /**
   * Requirement 1, 3, 5, 6, 10: Optimized Bus Data Fetching Method
   * - Checks session-level cache (Requirement 5)
   * - Aborts prior active requests via AbortController (Requirement 3)
   * - Deduplicates requests (Requirement 1 & 6)
   * - Performance logging with console.time & duration calculation (Requirement 10)
   */
  const fetchBusData = useCallback(async (forceRefresh = false) => {
    const cacheKey = getSearchCacheKey(from, to, date);

    if (!cacheKey || cacheKey === "--") {
      return;
    }

    // 1. Session Cache Lookup
    if (!forceRefresh && busSearchCache.has(cacheKey)) {
      const cachedData = busSearchCache.get(cacheKey);
      console.log(`[BusSearch Cache HIT] Key: ${cacheKey} | Instantly returning ${cachedData.length} cached buses.`);
      setData(cachedData);
      setLoading(false);
      return;
    }

    // 2. Avoid duplicate requests if same key request is currently pending
    if (!forceRefresh && isFetchingRef.current && lastFetchedKeyRef.current === cacheKey) {
      console.log(`[BusSearch] Request already in-flight for key: ${cacheKey}. Skipping duplicate trigger.`);
      return;
    }

    // 3. Removed AbortController to prevent React Native Axios hang issues
    isFetchingRef.current = true;
    lastFetchedKeyRef.current = cacheKey;

    // 4. Loading UI & Performance Logging Start
    setLoading(true);
    console.log(`[BusSearch API Request Start] Fetching buses for key: ${cacheKey}`);
    const requestStartTime = Date.now();

    try {
      const formattedDate = formatApiDate(date);
      const mappedBuses = await searchBuses(
        {
          fromCityCode: from,
          toCityCode: to,
          departDate: formattedDate,
        }
      );

      const durationMs = Date.now() - requestStartTime;
      console.log(`[BusSearch API Response Received] Duration: ${durationMs}ms | Buses found: ${mappedBuses.length}`);

      // Cache search results for session
      busSearchCache.set(cacheKey, mappedBuses);
      setData(mappedBuses);
    } catch (error) {
      if (axios.isCancel(error) || error.name === "CanceledError" || error.name === "AbortError") {
        console.log(`[BusSearch] Request aborted successfully for key: ${cacheKey}`);
      } else {
        console.error("[BusSearch API Error]:", error.response?.status, error.response?.data || error.message);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [from, to, date]);

  /**
   * Requirement 1 & 6: Clean useEffect Trigger
   * Optimized dependencies so state changes or re-renders do not fire duplicate API calls.
   */
  const fromKey = typeof from === "object" ? (from?.cityId || from?.code || from?.name) : String(from || "");
  const toKey = typeof to === "object" ? (to?.cityId || to?.code || to?.name) : String(to || "");
  const dateKey = date ? (date instanceof Date ? date.getTime() : String(date)) : 0;

  useEffect(() => {
    fetchBusData();

    return () => {
      // Cleanup if necessary
    };
  }, [fromKey, toKey, dateKey, fetchBusData]);

  // Measure and log render timing completion
  useEffect(() => {
    if (!loading && data.length > 0) {
      console.log(`[BusSearch Render Complete] Total rendered bus cards: ${data.length}`);
    }
  }, [loading, data.length]);

  const filteredData = useMemo(() => {
    const selectedDateKey = getDateKey(date);

    // Extract specific sub-location names from the selected `from` and `to` objects
    // The label is typically "Ameerpet, Hyderabad" for sub-locations
    const fromIsSub = from && from.label && from.label !== from.cityName;
    const toIsSub = to && to.label && to.label !== to.cityName;

    const selectedBoarding = fromIsSub ? from.label.split(',')[0].trim().toLowerCase() : null;
    const selectedDropping = toIsSub ? to.label.split(',')[0].trim().toLowerCase() : null;

    return uniqueData.filter((item) => {
      const itemDateKey = getItemDateKey(item);

      if (selectedDateKey && itemDateKey && itemDateKey !== selectedDateKey) {
        return false;
      }

      if (!matchesBusFilters(item, filters)) {
        return false;
      }

      // Filter by specific boarding point if selected
      if (selectedBoarding) {
        const hasMatchingBoarding = (item.boardingPoints || []).some(point => {
          const pointName = (point.Name || point.name || point.Location || "").toLowerCase();
          return pointName.includes(selectedBoarding) || selectedBoarding.includes(pointName);
        });
        if (!hasMatchingBoarding) return false;
      }

      // Filter by specific dropping point if selected
      if (selectedDropping) {
        const hasMatchingDropping = (item.droppingPoints || []).some(point => {
          const pointName = (point.Name || point.name || point.Location || "").toLowerCase();
          return pointName.includes(selectedDropping) || selectedDropping.includes(pointName);
        });
        if (!hasMatchingDropping) return false;
      }

      return true;
    });
  }, [uniqueData, date, filters, from, to]);

  const sortedData = useMemo(() => {
    const items = [...filteredData];

    const getPrice = (item) => {
      const raw = item?.priceInr ?? item?.price ?? item?.fare;
      const parsed = Number(String(raw ?? "").replace(/[^0-9.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
    };

    const getDeparture = (item) => {
      const value = item?.departureDateTime ?? item?.departureTimeUtc ?? item?.departureTime ?? "";
      const time = new Date(`${value}Z`).getTime();
      return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
    };

    const getArrival = (item) => {
      const value = item?.arrivalDateTime ?? item?.arrivalTimeUtc ?? item?.arrivalTime ?? "";
      const time = new Date(`${value}Z`).getTime();
      return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
    };

    const getDuration = (item) => {
      const start = new Date(`${item?.departureDateTime ?? item?.departureTimeUtc ?? item?.departureTime ?? ""}Z`);
      const end = new Date(`${item?.arrivalDateTime ?? item?.arrivalTimeUtc ?? item?.arrivalTime ?? ""}Z`);

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
          onOpenPolicies={handleOpenPolicies}
          onViewSeats={handleViewSeats}
          animatedValues={animatedValues}
        />
      );
    },
    [getBusId, getAnimatedValues, loadingBusId, handleOpenBoardingDropping, handleOpenPolicies, handleViewSeats],
  );

  const keyExtractor = useCallback(
    (item, index) => String(getBusId(item) ?? item?.id ?? index),
    [getBusId],
  );

  /**
   * Requirement 7: getItemLayout for FlatList
   * Optimization to skip dynamic height layout measurements.
   */
  const getItemLayout = useCallback(
    (dataArray, index) => ({
      length: CARD_ITEM_HEIGHT,
      offset: CARD_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const handleRetry = useCallback(() => {
    fetchBusData(true);
  }, [fetchBusData]);

  return (
    <>
      <View style={{ flex: 1 }}>
        <FlatList
          style={styles.list}
          data={sortedData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          updateCellsBatchingPeriod={50}
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
                    onPress={handleRetry}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </>
              )}
            </View>
          }
        />
      </View>

      <BusPoliciesModal
        visible={!!policyModalBus}
        bus={policyModalBus}
        onClose={handleClosePolicies}
      />
    </>
  );
};

export default BusCards;

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: SURFACE_BG,
  },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 0,
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
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  busAnimContainer: {
    width: BUS_LOADER_WIDTH,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderImage: {
    width: "100%",
    height: "100%",
  },
  outerGlowContainer: {
    marginHorizontal: 6,
    marginVertical: 3,
    borderRadius: 18,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  cardShadowLayer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F4A3A3",
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
  },
  cardPressable: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  cardInner: {
    padding: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  operatorWrap: {
    flex: 1,
    paddingRight: 6,
  },
  operatorLogoImage: {
    width: 32,
    height: 20,
    marginBottom: 2,
  },
  operatorNameText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  busTypeText: {
    fontSize: 10,
    fontWeight: "400",
    color: "#9CA3AF",
    marginTop: 1,
  },
  fareWrap: {
    alignItems: "flex-end",
  },
  fareLabelText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  farePriceText: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#111827",
    marginTop: 1,
  },
  journeyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timeBlockLeft: {
    flex: 1,
  },
  timeBlockRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  timeDigitsText: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#111827",
  },
  timePeriodText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9CA3AF",
    marginLeft: 2,
  },
  locationText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 1,
  },
  durationPill: {
    width: 56,
    height: 30,
    backgroundColor: "#F3F0FA",
    borderRadius: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  durationTimeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B52B6",
  },
  durationSubText: {
    fontSize: 8,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  seatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 4,
  },
  seatsBadge: {
    height: 22,
    backgroundColor: "#E6F4EA",
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  seatsBadgeText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#0D8A47",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
  },
  actionBtnOutline: {
    flex: 1,
    height: 32,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#F4A3A3",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionBtnOutlineText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    lineHeight: 11,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 32,
    backgroundColor: PRIMARY_RED,
    borderWidth: 0,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  actionBtnPrimaryText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#667085",
    fontWeight: "600",
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: PRIMARY_RED,
    borderRadius: 8,
  },
  btnPrimaryPressed: {
    opacity: 0.8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
