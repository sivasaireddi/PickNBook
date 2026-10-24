import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RedDatePickerModal from "../../../components/RedDatePickerModal";
import OffersCarousel from "../../../components/OffersCarousel";
import { AssuranceStrip, SearchPanelHeading, TravelPrimaryButton, TravelSearchHero } from "../../../components/travelSearch/TravelSearchChrome";
import { createBusSearchNavigationParams, formatBusDisplayDate } from "../../../utils/busSearchParams";
import { BUS_FLOW_COLORS } from "../../../constants/colors";
import { theme } from "../../../theme/tokens";
import { searchCities } from "../../../services/busService";
import { flattenBusLocationResults, normalizeBusLocationResults } from "../../../utils/busLocationResults";
import {
  addRecentBusLocation,
  getBusLocationIdentity,
  loadRecentBusLocations,
  removeRecentBusLocation,
} from "../../../utils/busRecentLocations";

const COLORS = BUS_FLOW_COLORS;

const TravelField = ({
  label,
  icon,
  value,
  placeholder,
  onChangeText,
  onPress,
  onFocus,
  inputRef,
  active = false,
  rightAdornment,
  editable = true,
  error = false,
  errorMessage = "",
}) => {
  const isPressable = typeof onPress === "function";
  const hasValue = Boolean(value && String(value).trim().length > 0);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.bookingMiniLabel}>{label}</Text>
      {isPressable ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.fieldSurfaceContainer,
            error && styles.fieldError,
            pressed && styles.fieldPressed,
          ]}
        >
          <View style={styles.fieldContentLeft}>
            {icon ? (
              <Ionicons name={icon} size={18} color={error ? "#DC2626" : COLORS.primary} style={styles.bookingIcon} />
            ) : null}
            <Text
              style={[
                styles.bookingValueText,
                !hasValue && styles.bookingPlaceholderText,
              ]}
              numberOfLines={1}
            >
              {value || placeholder}
            </Text>
          </View>
          {rightAdornment}
        </Pressable>
      ) : (
        <View style={[
          styles.fieldSurfaceContainer,
          active && styles.fieldActive,
          error && styles.fieldError,
        ]}>
          <View style={styles.fieldContentLeft}>
            {icon ? (
              <Ionicons name={icon} size={18} color={error ? "#DC2626" : COLORS.primary} style={styles.bookingIcon} />
            ) : null}
            <TextInput
              value={value}
              onChangeText={onChangeText}
              onFocus={onFocus}
              placeholder={placeholder}
              placeholderTextColor={COLORS.textMuted}
              style={styles.bookingTextInput}
              selectionColor={COLORS.primary}
              autoCapitalize="words"
              editable={editable}
              ref={inputRef}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
          {rightAdornment}
        </View>
      )}
      {error && errorMessage ? (
        <Text style={styles.fieldErrorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
};

const EMPTY_LOCATION = { cityId: "", cityName: "", label: "", stateName: "" };

const getLocationText = (location) => location?.label || location?.cityName || "";

const InlineLocationPanel = ({
  query,
  loading,
  error,
  suggestions,
  recents,
  onSelect,
  onDeleteRecent,
}) => {
  const trimmedQuery = query.trim();
  const showingRecents = trimmedQuery.length === 0;

  if (showingRecents && recents.length === 0) return null;

  return (
    <View style={styles.locationPanel}>
      {showingRecents ? (
        <>
          <Text style={styles.locationPanelHeading}>RECENT SEARCHES</Text>
          {recents.map((location, index) => (
            <Pressable
              key={getBusLocationIdentity(location)}
              onPress={() => onSelect(location)}
              style={({ pressed }) => [
                styles.locationRow,
                index < recents.length - 1 && styles.locationRowDivider,
                pressed && styles.locationRowPressed,
              ]}
            >
              <View style={styles.locationIconWrap}>
                <Ionicons name="time-outline" size={17} color={COLORS.primary} />
              </View>
              <View style={styles.locationRowText}>
                <Text style={styles.locationTitle} numberOfLines={1}>
                  {getLocationText(location)}
                </Text>
                {location.stateName ? (
                  <Text style={styles.locationSubtitle} numberOfLines={1}>
                    {location.stateName}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${getLocationText(location)} from recent searches`}
                hitSlop={10}
                onPress={(event) => {
                  event?.stopPropagation?.();
                  onDeleteRecent(location);
                }}
                style={({ pressed }) => [
                  styles.recentDeleteButton,
                  pressed && styles.recentDeleteButtonPressed,
                ]}
              >
                <Ionicons name="close" size={16} color={COLORS.textMuted} />
              </Pressable>
            </Pressable>
          ))}
        </>
      ) : loading ? (
        <View style={styles.locationStatusRow}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.locationStatusText}>Searching places...</Text>
        </View>
      ) : error ? (
        <View style={styles.locationStatusRow}>
          <Ionicons name="alert-circle-outline" size={17} color="#DC2626" />
          <Text style={[styles.locationStatusText, styles.locationErrorText]}>
            Unable to load places. Try again.
          </Text>
        </View>
      ) : suggestions.length === 0 ? (
        <View style={styles.locationStatusRow}>
          <Ionicons name="location-outline" size={17} color={COLORS.textMuted} />
          <Text style={styles.locationStatusText}>No matching places found</Text>
        </View>
      ) : (
        suggestions.map((item, index) => (
          <Pressable
            key={`${item.key}:${index}`}
            onPress={() => onSelect(item.payload)}
            style={({ pressed }) => [
              styles.locationRow,
              index < suggestions.length - 1 && styles.locationRowDivider,
              pressed && styles.locationRowPressed,
            ]}
          >
            <View style={styles.locationIconWrap}>
              <Ionicons
                name={item.kind === "city" ? "business-outline" : "return-down-forward-outline"}
                size={17}
                color={item.kind === "city" ? COLORS.primary : COLORS.textMuted}
              />
            </View>
            <View style={styles.locationRowText}>
              <Text style={styles.locationTitle} numberOfLines={1}>{item.title}</Text>
              {item.subtitle ? (
                <Text style={styles.locationSubtitle} numberOfLines={1}>{item.subtitle}</Text>
              ) : null}
            </View>
            <Ionicons name="arrow-forward" size={15} color="#A1A8B5" />
          </Pressable>
        ))
      )}
    </View>
  );
};

export default function BusBookingSection({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState(EMPTY_LOCATION);
  const [destination, setDestination] = useState(EMPTY_LOCATION);
  const [sourceQuery, setSourceQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [activeLocationField, setActiveLocationField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [recentSources, setRecentSources] = useState([]);
  const [recentDestinations, setRecentDestinations] = useState([]);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({ source: "", destination: "", date: "" });
  const swapMotion = useRef(new Animated.Value(0)).current;
  const swapRotation = useRef(new Animated.Value(0)).current;
  const swapScale = useRef(new Animated.Value(1)).current;
  const lastLocationSelection = useRef(null);
  const searchSequence = useRef(0);
  const sourceInputRef = useRef(null);
  const destinationInputRef = useRef(null);

  const activeQuery = activeLocationField === "source"
    ? sourceQuery
    : activeLocationField === "destination"
      ? destinationQuery
      : "";
  const activeRecents = activeLocationField === "source"
    ? recentSources
    : recentDestinations;
  const inlineSuggestions = useMemo(
    () => flattenBusLocationResults(suggestions, 8),
    [suggestions],
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadRecentBusLocations("source"),
      loadRecentBusLocations("destination"),
    ]).then(([sources, destinations]) => {
      if (!mounted) return;
      setRecentSources(sources);
      setRecentDestinations(destinations);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const requestId = ++searchSequence.current;
    const query = activeQuery.trim();

    if (!activeLocationField || query.length < 1) {
      setSuggestions([]);
      setSuggestionLoading(false);
      setSuggestionError("");
      return undefined;
    }

    setSuggestionLoading(true);
    setSuggestionError("");
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchCities(query, { throwOnError: true });
        if (requestId !== searchSequence.current) return;
        setSuggestions(normalizeBusLocationResults(results));
      } catch {
        if (requestId !== searchSequence.current) return;
        setSuggestions([]);
        setSuggestionError("Unable to load places. Try again.");
      } finally {
        if (requestId === searchSequence.current) setSuggestionLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [activeLocationField, activeQuery]);

  useEffect(() => {
    // Dismiss the keyboard whenever this screen loses focus (e.g. the user
    // taps the Home tab while a TextInput is focused). This is a
    // defence-in-depth layer: the tabPress listener in BottomTabNavigation
    // already calls Keyboard.dismiss(), but the blur event fires at the
    // precise moment the screen begins its exit transition, guaranteeing
    // the keyboard is gone before HomeScreen ever lays out.
    const unsubscribe = navigation.addListener('blur', () => {
      Keyboard.dismiss();
      setActiveLocationField(null);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const selectionId = route?.params?.busLocationSelectionRequestId;
    const selection = route?.params?.busLocationSelection;
    const selectionType = route?.params?.busLocationSelectionType;
    const returnedSource = route?.params?.busLocationSource;
    const returnedDestination = route?.params?.busLocationDestination;

    if (!selectionId || !selection || lastLocationSelection.current === selectionId) {
      return;
    }

    lastLocationSelection.current = selectionId;
    if (selectionType === "from") {
      const nextSource = selection || returnedSource || EMPTY_LOCATION;
      setSource(nextSource);
      setSourceQuery(getLocationText(nextSource));
      if (returnedDestination) {
        setDestination(returnedDestination);
        setDestinationQuery(getLocationText(returnedDestination));
      }
    } else if (selectionType === "to") {
      if (returnedSource) {
        setSource(returnedSource);
        setSourceQuery(getLocationText(returnedSource));
      }
      const nextDestination = selection || returnedDestination || EMPTY_LOCATION;
      setDestination(nextDestination);
      setDestinationQuery(getLocationText(nextDestination));
    }

    navigation.setParams({
      busLocationSelection: undefined,
      busLocationSelectionType: undefined,
      busLocationSelectionRequestId: undefined,
      busLocationSource: undefined,
      busLocationDestination: undefined,
    });
  }, [navigation, route?.params?.busLocationSelectionRequestId]);

  const mountFade = useRef(new Animated.Value(0)).current;
  const mountTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(mountTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Dynamic error clearing: source
  useEffect(() => {
    if (source.cityName.trim().length > 0) {
      setErrors((prev) => {
        // Also clear same-location error if source/destination are now different
        const sameLocError = "Source and destination cannot be the same.";
        const destErr = prev.destination === sameLocError &&
          source.cityName.trim().toLowerCase() !== destination.cityName.trim().toLowerCase()
          ? ""
          : prev.destination;
        const srcErr = prev.source === sameLocError &&
          source.cityName.trim().toLowerCase() !== destination.cityName.trim().toLowerCase()
          ? ""
          : "";
        return { ...prev, source: srcErr, destination: destErr };
      });
    }
  }, [source]);

  // Dynamic error clearing: destination
  useEffect(() => {
    if (destination.cityName.trim().length > 0) {
      setErrors((prev) => {
        const sameLocError = "Source and destination cannot be the same.";
        const srcErr = prev.source === sameLocError &&
          source.cityName.trim().toLowerCase() !== destination.cityName.trim().toLowerCase()
          ? ""
          : prev.source;
        const destErr = prev.destination === sameLocError &&
          source.cityName.trim().toLowerCase() !== destination.cityName.trim().toLowerCase()
          ? ""
          : "";
        return { ...prev, source: srcErr, destination: destErr };
      });
    }
  }, [destination]);

  // Dynamic error clearing: date
  useEffect(() => {
    if (date) {
      setErrors((prev) => ({ ...prev, date: "" }));
    }
  }, [date]);

  const rotateInterpolate = swapRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const fromTranslateY = swapMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 36] });
  const toTranslateY = swapMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -36] });
  const fieldFade = swapMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });

  const closeLocationPanel = useCallback(() => {
    searchSequence.current += 1;
    setActiveLocationField(null);
    setSuggestions([]);
    setSuggestionLoading(false);
    setSuggestionError("");
  }, []);

  const handleLocationChange = useCallback((field, text) => {
    if (field === "source") {
      setSourceQuery(text);
      setSource(EMPTY_LOCATION);
      setErrors((current) => ({ ...current, source: "" }));
    } else {
      setDestinationQuery(text);
      setDestination(EMPTY_LOCATION);
      setErrors((current) => ({ ...current, destination: "" }));
    }
  }, []);

  const handleLocationSelect = useCallback(async (field, location) => {
    const nextLocation = {
      cityId: String(location?.cityId || "").trim(),
      cityName: String(location?.cityName || "").trim(),
      label: String(location?.label || location?.cityName || "").trim(),
      stateName: String(location?.stateName || "").trim(),
    };

    closeLocationPanel();
    Keyboard.dismiss();

    if (field === "source") {
      setSource(nextLocation);
      setSourceQuery(getLocationText(nextLocation));
      setErrors((current) => ({ ...current, source: "" }));
      const nextRecents = await addRecentBusLocation("source", nextLocation, recentSources);
      setRecentSources(nextRecents);
    } else {
      setDestination(nextLocation);
      setDestinationQuery(getLocationText(nextLocation));
      setErrors((current) => ({ ...current, destination: "" }));
      const nextRecents = await addRecentBusLocation("destination", nextLocation, recentDestinations);
      setRecentDestinations(nextRecents);
    }

  }, [closeLocationPanel, recentDestinations, recentSources]);

  const handleDeleteRecent = useCallback(async (field, location) => {
    if (field === "source") {
      const nextRecents = recentSources.filter(
        (entry) => getBusLocationIdentity(entry) !== getBusLocationIdentity(location),
      );
      setRecentSources(nextRecents);
      await removeRecentBusLocation("source", location, recentSources);
    } else {
      const nextRecents = recentDestinations.filter(
        (entry) => getBusLocationIdentity(entry) !== getBusLocationIdentity(location),
      );
      setRecentDestinations(nextRecents);
      await removeRecentBusLocation("destination", location, recentDestinations);
    }
  }, [recentDestinations, recentSources]);

  const handleSwap = () => {
    if (isSwapping || (!source.cityName && !destination.cityName)) return;
    const nextFrom = destination;
    const nextTo = source;
    const nextSourceQuery = destinationQuery;
    const nextDestinationQuery = sourceQuery;
    closeLocationPanel();
    Keyboard.dismiss();
    setSource(nextFrom);
    setDestination(nextTo);
    setSourceQuery(nextSourceQuery);
    setDestinationQuery(nextDestinationQuery);
    // Clear same-location and field-specific errors on swap
    setErrors({ source: "", destination: "", date: errors.date });
    setIsSwapping(true);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(swapScale, { toValue: 0.92, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(swapScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      ]),
      Animated.timing(swapRotation, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]).start(() => swapRotation.setValue(0));
    Animated.timing(swapMotion, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) {
        setIsSwapping(false);
        swapMotion.setValue(0);
        return;
      }
      setSource(nextFrom);
      setDestination(nextTo);
      setSourceQuery(nextSourceQuery);
      setDestinationQuery(nextDestinationQuery);
      Animated.timing(swapMotion, { toValue: 0, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
        setIsSwapping(false);
      });
    });
  };

  const handleSearch = () => {
    if (isSubmitting) return;
    closeLocationPanel();
    Keyboard.dismiss();
    console.log("[BusFlow] SEARCH FORM SUBMITTED:", {
      from: source,
      to: destination,
      date: date?.toISOString?.() || date,
    });
    const newErrors = { source: "", destination: "", date: "" };
    let hasError = false;

    // 1. Source validation
    if (!source.cityName.trim()) {
      newErrors.source = "Please enter your source location";
      hasError = true;
    }

    // 2. Destination validation
    if (!destination.cityName.trim()) {
      newErrors.destination = "Please enter your destination";
      hasError = true;
    }

    // 3. Date validation
    if (!date) {
      newErrors.date = "Please select your journey date";
      hasError = true;
    }

    // 4. Same source and destination validation
    if (
      !newErrors.source &&
      !newErrors.destination &&
      source.cityName.trim().toLowerCase() === destination.cityName.trim().toLowerCase()
    ) {
      newErrors.source = "Source and destination cannot be the same.";
      newErrors.destination = "Source and destination cannot be the same.";
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) return;

    setIsSubmitting(true);
    navigation?.navigate?.("BusListScreen", createBusSearchNavigationParams({
      from: source,
      to: destination,
      date,
    }));
    setTimeout(() => setIsSubmitting(false), 900);
    console.log("[BusFlow] NAVIGATING TO BUS RESULTS");
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: (Platform.OS === "ios" ? 84 : 64) + insets.bottom + 24 },
        ]}
      >
        <TravelSearchHero
          image={require("../../../../assets/busBanner.jpg")}
          title="Where are you heading?"
          subtitle="Search trusted routes and choose the journey that fits your day."
          onBack={() => navigation.goBack()}
        />

        {/* COMPACT & RESPONSIVE FLOATING SEARCH CARD */}
        <Animated.View
          style={[
            styles.searchCard,
            {
              opacity: mountFade,
              transform: [{ translateY: mountTranslateY }],
            },
          ]}
        >
          <SearchPanelHeading title="Plan your bus journey" subtitle="Choose your cities and travel date." />
          <View style={styles.swapSection}>
            <View style={styles.routeGuide}>
              <View style={styles.routeGuideDot} />
              <View style={styles.routeGuideLine} />
              <View style={[styles.routeGuideDot, styles.routeGuideDotEnd]} />
            </View>
            <Animated.View style={[styles.animatedField, { opacity: fieldFade, transform: [{ translateY: fromTranslateY }] }]}>
              <TravelField
                label="FROM"
                icon="location-outline"
                value={sourceQuery}
                placeholder="Enter source"
                error={!!errors.source}
                errorMessage={errors.source}
                active={activeLocationField === "source"}
                inputRef={sourceInputRef}
                onFocus={() => setActiveLocationField("source")}
                onChangeText={(text) => handleLocationChange("source", text)}
                rightAdornment={sourceQuery ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear source"
                    hitSlop={10}
                    onPress={() => {
                      handleLocationChange("source", "");
                      setActiveLocationField("source");
                      sourceInputRef.current?.focus();
                    }}
                    style={styles.inputClearButton}
                  >
                    <Ionicons name="close-circle" size={19} color="#A1A8B5" />
                  </Pressable>
                ) : null}
              />
              {activeLocationField === "source" ? (
                <InlineLocationPanel
                  query={sourceQuery}
                  loading={suggestionLoading}
                  error={suggestionError}
                  suggestions={inlineSuggestions}
                  recents={activeRecents}
                  onSelect={(location) => handleLocationSelect("source", location)}
                  onDeleteRecent={(location) => handleDeleteRecent("source", location)}
                />
              ) : null}
            </Animated.View>

            <View style={styles.swapConnectorRow}>
              <View style={styles.swapConnectorLine} />
              <Animated.View style={[styles.swapButtonWrap, { transform: [{ scale: swapScale }, { rotate: rotateInterpolate }] }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Swap source and destination"
                  onPress={handleSwap}
                  disabled={isSwapping}
                  style={({ pressed }) => [styles.swapButton, pressed && styles.swapButtonPressed]}
                >
                  <Ionicons name="swap-vertical" size={17} color={COLORS.primary} />
                </Pressable>
              </Animated.View>
              <View style={styles.swapConnectorLine} />
            </View>

            <Animated.View style={[styles.animatedField, { opacity: fieldFade, transform: [{ translateY: toTranslateY }] }]}>
              <TravelField
                label="TO"
                icon="location-outline"
                value={destinationQuery}
                placeholder="Enter destination"
                error={!!errors.destination}
                errorMessage={errors.destination}
                active={activeLocationField === "destination"}
                inputRef={destinationInputRef}
                onFocus={() => setActiveLocationField("destination")}
                onChangeText={(text) => handleLocationChange("destination", text)}
                rightAdornment={destinationQuery ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear destination"
                    hitSlop={10}
                    onPress={() => {
                      handleLocationChange("destination", "");
                      setActiveLocationField("destination");
                      destinationInputRef.current?.focus();
                    }}
                    style={styles.inputClearButton}
                  >
                    <Ionicons name="close-circle" size={19} color="#A1A8B5" />
                  </Pressable>
                ) : null}
              />
              {activeLocationField === "destination" ? (
                <InlineLocationPanel
                  query={destinationQuery}
                  loading={suggestionLoading}
                  error={suggestionError}
                  suggestions={inlineSuggestions}
                  recents={activeRecents}
                  onSelect={(location) => handleLocationSelect("destination", location)}
                  onDeleteRecent={(location) => handleDeleteRecent("destination", location)}
                />
              ) : null}
            </Animated.View>

          </View>

          {/* DATE FIELD */}
          <TravelField
            label="DATE OF JOURNEY"
            icon="calendar-outline"
            value={formatBusDisplayDate(date)}
            placeholder="Select date"
            error={!!errors.date}
            errorMessage={errors.date}
            onPress={() => {
              closeLocationPanel();
              Keyboard.dismiss();
              setShowPicker(true);
            }}
            rightAdornment={
              <View style={[styles.fieldRightBadge, errors.date ? styles.fieldRightBadgeError : null]}>
                <Ionicons name="calendar" size={16} color={errors.date ? "#DC2626" : COLORS.primary} />
              </View>
            }
          />
          <RedDatePickerModal
            visible={showPicker}
            value={date}
            minimumDate={new Date()}
            onConfirm={(selectedDate) => {
              setDate(selectedDate);
              setShowPicker(false);
            }}
            onCancel={() => setShowPicker(false)}
          />

          <TravelPrimaryButton label="Search Buses" onPress={handleSearch} loading={isSubmitting} disabled={isSubmitting} />
        </Animated.View>

        <AssuranceStrip items={["Clear journey details", "Secure booking", "Trips saved in My Bookings"]} />
        <OffersCarousel serviceType="bus" />

      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardAvoider: { flex: 1 },
  contentContainer: { paddingBottom: 32 },
  /* Compact Booking Container (15-20% height reduction) */
  searchCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: -32,
    backgroundColor: COLORS.surface,
    borderRadius: 26,
    padding: theme.spacing.lg,
    zIndex: 20,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  swapSection: { position: "relative", paddingLeft: 18 },
  routeGuide: { position: "absolute", left: 2, top: 34, bottom: 22, width: 10, alignItems: "center" },
  routeGuideDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.redDeep, borderWidth: 2, borderColor: "#FAD7DC", zIndex: 2 },
  routeGuideLine: { flex: 1, width: 1, marginVertical: 3, backgroundColor: "#E8B7BF" },
  routeGuideDotEnd: { backgroundColor: theme.colors.ink, borderColor: "#DDE1EB" },
  animatedField: { position: "relative" },
  fieldGroup: { position: "relative", marginBottom: 12 },
  fieldError: {
    borderColor: "#DC2626",
    borderWidth: 1.5,
    backgroundColor: "#FEF2F2",
  },
  fieldErrorText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    paddingLeft: 4,
  },
  fieldRightBadgeError: {
    backgroundColor: "#FEE2E2",
  },
  bookingMiniLabel: {
    fontFamily: theme.typography.fontFamily.body.semiBold,
    fontSize: 10,
    color: theme.colors.slate,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
    paddingLeft: 2,
  },
  fieldSurfaceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    backgroundColor: theme.colors.cloud,
    paddingHorizontal: 14,
  },
  fieldPressed: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  fieldActive: {
    borderColor: "#D11A2A",
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
  },
  fieldContentLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bookingIcon: {
    marginTop: 0,
  },
  bookingTextInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    padding: 0,
    height: 36,
  },
  bookingValueText: {
    flex: 1,
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily.body.semiBold,
    fontSize: 16,
    fontWeight: "700",
  },
  bookingPlaceholderText: {
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  inputClearButton: {
    width: 30,
    height: 36,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  locationPanel: {
    marginTop: -4,
    marginBottom: 12,
    marginHorizontal: 1,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  locationPanelHeading: {
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 6,
    color: theme.colors.slate,
    fontFamily: theme.typography.fontFamily.body.semiBold,
    fontSize: 9,
    letterSpacing: 0.7,
  },
  locationRow: {
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  locationRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8EAF0",
  },
  locationRowPressed: { backgroundColor: "#FFF6F7" },
  locationIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    backgroundColor: "#FFF1F3",
  },
  locationRowText: { flex: 1, minWidth: 0 },
  locationTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily.body.semiBold,
    fontSize: 13,
  },
  locationSubtitle: {
    color: COLORS.textMuted,
    fontFamily: theme.typography.fontFamily.body.regular,
    fontSize: 11,
    marginTop: 2,
  },
  recentDeleteButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    borderRadius: 17,
  },
  recentDeleteButtonPressed: { backgroundColor: "#F3F4F6" },
  locationStatusRow: {
    minHeight: 56,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  locationStatusText: {
    color: COLORS.textMuted,
    fontFamily: theme.typography.fontFamily.body.medium,
    fontSize: 12,
  },
  locationErrorText: { color: "#B91C1C" },
  fieldRightBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFE8EB",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Compact Swap Button */
  swapButtonWrap: {
    marginHorizontal: 9,
  },
  swapConnectorRow: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
    marginBottom: 6,
    paddingHorizontal: 26,
  },
  swapConnectorLine: { flex: 1, height: 1, backgroundColor: "#E8B7BF" },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 5,
  },
  swapButtonPressed: { opacity: 0.82 },

  /* Compact Search Button (48px Height) */
  buttonShadow: {
    borderRadius: 24,
    marginTop: 2,
    shadowColor: "#E52332",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressable: { borderRadius: 24, overflow: "hidden" },
  buttonPressed: { opacity: 0.92 },
  buttonGradient: {
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: "#E52332",
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  buttonArrow: { marginTop: 1 },

});
