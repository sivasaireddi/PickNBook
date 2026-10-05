import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  ImageBackground,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RedDatePickerModal from "../../../components/RedDatePickerModal";
import OffersCarousel from "../../../components/OffersCarousel";
import { getBannerHeight } from "../../../utils/responsive";
import { BUS_FLOW_COLORS } from "../../../constants/colors";

const COLORS = BUS_FLOW_COLORS;

const SHADOWS = {
  soft: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
};

const TravelField = ({
  label,
  icon,
  value,
  placeholder,
  onChangeText,
  onPress,
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
        <View style={[styles.fieldSurfaceContainer, error && styles.fieldError]}>
          <View style={styles.fieldContentLeft}>
            {icon ? (
              <Ionicons name={icon} size={18} color={error ? "#DC2626" : COLORS.primary} style={styles.bookingIcon} />
            ) : null}
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={COLORS.textMuted}
              style={styles.bookingTextInput}
              selectionColor={COLORS.primary}
              autoCapitalize="words"
              editable={editable}
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

export default function BusBookingSection({ navigation, route }) {
  const { height: screenHeight } = useWindowDimensions();
  const [source, setSource] = useState({ cityId: "", cityName: "", label: "", stateName: "" });
  const [destination, setDestination] = useState({ cityId: "", cityName: "", label: "", stateName: "" });
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [errors, setErrors] = useState({ source: "", destination: "", date: "" });
  const swapMotion = useRef(new Animated.Value(0)).current;
  const swapRotation = useRef(new Animated.Value(0)).current;
  const swapScale = useRef(new Animated.Value(1)).current;
  const searchScale = useRef(new Animated.Value(1)).current;
  const lastLocationSelection = useRef(null);

  useEffect(() => {
    // Dismiss the keyboard whenever this screen loses focus (e.g. the user
    // taps the Home tab while a TextInput is focused). This is a
    // defence-in-depth layer: the tabPress listener in BottomTabNavigation
    // already calls Keyboard.dismiss(), but the blur event fires at the
    // precise moment the screen begins its exit transition, guaranteeing
    // the keyboard is gone before HomeScreen ever lays out.
    const unsubscribe = navigation.addListener('blur', () => {
      Keyboard.dismiss();
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
      setSource(selection || returnedSource || { cityId: "", cityName: "", label: "", stateName: "" });
      if (returnedDestination) setDestination(returnedDestination);
    } else if (selectionType === "to") {
      if (returnedSource) setSource(returnedSource);
      setDestination(selection || returnedDestination || { cityId: "", cityName: "", label: "", stateName: "" });
    }

    navigation.setParams({
      busLocationSelection: undefined,
      busLocationSelectionType: undefined,
      busLocationSelectionRequestId: undefined,
      busLocationSource: undefined,
      busLocationDestination: undefined,
    });
  }, [navigation, route?.params?.busLocationSelectionRequestId]);

  const handleSearchPressIn = () => {
    Animated.spring(searchScale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handleSearchPressOut = () => {
    Animated.spring(searchScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

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

  const formatDate = (value) =>
    value.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const canSearch = source.cityName.trim().length > 0 && destination.cityName.trim().length > 0;

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

  const handleSwap = () => {
    if (isSwapping || (!source.cityName && !destination.cityName)) return;
    const nextFrom = destination;
    const nextTo = source;
    setSource(nextFrom);
    setDestination(nextTo);
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
      Animated.timing(swapMotion, { toValue: 0, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
        setIsSwapping(false);
      });
    });
  };

  const handleSearch = () => {
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

    navigation?.navigate?.("BusListScreen", {
      from: source,
      to: destination,
      date: formatDate(date),
      dateValue: date.toISOString(),
      passengers: 1,
    });
    console.log("[BusFlow] NAVIGATING TO BUS RESULTS");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* HERO IMAGE BACKGROUND */}
        <ImageBackground
          source={require("../../../../assets/busBanner.jpg")}
          style={[
            styles.heroContainer,
            { height: getBannerHeight(screenHeight) },
          ]}
          resizeMode="cover"
        >
          {/* Top Back Button */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={22} color="#1F2937" />
            </Pressable>
          </View>

        </ImageBackground>

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
          <View style={styles.swapSection}>
            <Animated.View style={[styles.animatedField, { opacity: fieldFade, transform: [{ translateY: fromTranslateY }] }]}>
              <TravelField
                label="FROM"
                icon="location-outline"
                value={source.label || source.cityName}
                placeholder="Enter source"
                error={!!errors.source}
                errorMessage={errors.source}
                onPress={() => {
                  navigation.navigate("BusLocationSearchScreen", {
                    type: "from",
                    currentValue: source.cityName,
                    currentSource: source,
                    currentDestination: destination,
                    returnTo: route?.name || "TravelScreen",
                    selectionRequestId: String(Date.now()),
                  });
                }}
              />
            </Animated.View>

            <Animated.View style={[styles.animatedField, { opacity: fieldFade, transform: [{ translateY: toTranslateY }] }]}>
              <TravelField
                label="TO"
                icon="location-outline"
                value={destination.label || destination.cityName}
                placeholder="Enter destination"
                error={!!errors.destination}
                errorMessage={errors.destination}
                onPress={() => {
                  navigation.navigate("BusLocationSearchScreen", {
                    type: "to",
                    currentValue: destination.cityName,
                    currentSource: source,
                    currentDestination: destination,
                    returnTo: route?.name || "TravelScreen",
                    selectionRequestId: String(Date.now()),
                  });
                }}
              />
            </Animated.View>

            {/* FLOATING SWAP BUTTON (COMPACT) */}
            <Animated.View style={[styles.swapButtonWrap, { transform: [{ scale: swapScale }, { rotate: rotateInterpolate }] }]}>
              <Pressable onPress={handleSwap} disabled={isSwapping} style={({ pressed }) => [styles.swapButton, pressed && styles.swapButtonPressed]}>
                <Ionicons name="swap-vertical" size={17} color={COLORS.primary} />
              </Pressable>
            </Animated.View>
          </View>

          {/* DATE FIELD */}
          <TravelField
            label="DATE OF JOURNEY"
            icon="calendar-outline"
            value={formatDate(date)}
            placeholder="Select date"
            error={!!errors.date}
            errorMessage={errors.date}
            onPress={() => setShowPicker(true)}
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

          {/* SEARCH BUTTON (COMPACT 48PX HEIGHT) */}
          <Animated.View style={[styles.buttonShadow, { transform: [{ scale: searchScale }] }]}>
            <Pressable
              onPress={handleSearch}
              onPressIn={handleSearchPressIn}
              onPressOut={handleSearchPressOut}
              style={({ pressed }) => [
                styles.buttonPressable,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.buttonGradient}>
                <Text style={styles.buttonText}>Search Buses</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.buttonArrow} />
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <OffersCarousel serviceType="bus" />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { paddingBottom: 24, flexGrow: 0 },

  heroContainer: {
    width: "100%",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 48,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.soft,
  },
  /* Compact Booking Container (15-20% height reduction) */
  searchCard: {
    marginHorizontal: 16,
    marginTop: -24,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    zIndex: 20,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  swapSection: { position: "relative", gap: 0 },
  animatedField: { position: "relative" },
  fieldGroup: { position: "relative", marginBottom: 8 },
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
    fontSize: 10,
    fontWeight: "800",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
    paddingLeft: 2,
  },
  fieldSurfaceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    backgroundColor: "#FAFBFD",
    paddingHorizontal: 12,
  },
  fieldPressed: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
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
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "700",
  },
  bookingPlaceholderText: {
    color: COLORS.textMuted,
    fontWeight: "600",
  },
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
    position: "absolute",
    right: 12,
    top: 43,
    zIndex: 30,
    elevation: 30,
  },
  swapButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFE8EB",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
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
