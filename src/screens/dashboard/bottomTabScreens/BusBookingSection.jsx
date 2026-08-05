import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Rect, G } from "react-native-svg";
import FeaturedOffers from "./FeaturedOffers";
import { searchCities } from "../../../services/busService";
import RedDatePickerModal from "../../../components/RedDatePickerModal";

const COLORS = {
  background: "#F8F9FC",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  border: "#ECECEC",
  borderStrong: "#CBD5E1",
  text: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  icon: "#64748B",
  primary: "#D11A2A",
  primaryLight: "#B91C1C",
  primaryGradient: ["#D11A2A", "#B91C1C"],
  shadow: "#0F172A",
};

const SPACING = {
  screen: 16,
  card: 20,
  fieldGap: 16,
  sectionGap: 24,
};

const RADII = {
  card: 28,
  field: 16,
  button: 16,
  dropdown: 16,
  swap: 22,
};

const SHADOWS = {
  card: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  soft: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  button: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
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
  showBorderBottom = true,
}) => {
  const isPressable = typeof onPress === "function";
  return (
    <View style={[styles.fieldGroup, showBorderBottom && styles.fieldBorderBottom]}>
      {isPressable ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.fieldSurface,
            pressed && styles.fieldPressed,
          ]}
        >
          <View style={styles.fieldLeft}>
            <Text style={styles.bookingMiniLabel}>{label}</Text>
            <View style={styles.bookingInputRow}>
              {icon ? <Ionicons name={icon} size={18} color={COLORS.primary} style={styles.bookingIcon} /> : null}
              <Text style={styles.bookingValueText} numberOfLines={1}>
                {value || placeholder}
              </Text>
            </View>
          </View>
          {rightAdornment}
        </Pressable>
      ) : (
        <View style={styles.fieldSurface}>
          <View style={styles.fieldLeft}>
            <Text style={styles.bookingMiniLabel}>{label}</Text>
            <View style={styles.bookingInputRow}>
              {icon ? <Ionicons name={icon} size={18} color={COLORS.primary} style={styles.bookingIcon} /> : null}
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
          </View>
          {rightAdornment}
        </View>
      )}
    </View>
  );
};

const SuggestionsDropdown = ({ visible, items, loading, onSelect, query = "" }) => {
  if (!visible || query.trim().length < 2) return null;
  return (
    <View style={styles.dropdown}>
      {loading ? (
        <View style={styles.dropdownStatus}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.dropdownStatusText}>Searching cities...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.dropdownStatus}>
          <Text style={styles.dropdownStatusText}>No cities found</Text>
        </View>
      ) : (
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {items.map((item, index) => {
            const cityName = item && typeof item === "object" ? item.cityName : String(item);
            const stateName = item && typeof item === "object" ? item.stateName : "";
            const key = item && typeof item === "object" ? item.cityId : index;
            return (
              <Pressable
                key={`${key}-${index}`}
                onPress={() => onSelect(item)}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  index === items.length - 1 && styles.dropdownItemLast,
                  pressed && styles.dropdownItemPressed,
                ]}
              >
                <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                <View style={styles.dropdownItemTextContainer}>
                  <Text style={styles.dropdownText}>{cityName}</Text>
                  {stateName ? <Text style={styles.dropdownSubtext}>{stateName}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default function BusBookingSection({ navigation }) {
  const [source, setSource] = useState({ cityId: "", cityName: "", stateName: "" });
  const [destination, setDestination] = useState({ cityId: "", cityName: "", stateName: "" });
  const [date, setDate] = useState(new Date());
  const [passengersCount, setPassengersCount] = useState(1);
  const [showPicker, setShowPicker] = useState(false);
  const [fromPlaces, setFromPlaces] = useState([]);
  const [toPlaces, setToPlaces] = useState([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const suggestionTimers = useRef({ from: null, to: null });
  const requestIds = useRef({ from: 0, to: 0 });
  const swapMotion = useRef(new Animated.Value(0)).current;
  const swapRotation = useRef(new Animated.Value(0)).current;
  const swapScale = useRef(new Animated.Value(1)).current;
  const searchScale = useRef(new Animated.Value(1)).current;

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

    return () => {
      if (suggestionTimers.current.from) clearTimeout(suggestionTimers.current.from);
      if (suggestionTimers.current.to) clearTimeout(suggestionTimers.current.to);
    };
  }, []);

  const fetchPlaceSuggestions = async (query, field) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      requestIds.current[field] += 1;
      if (field === "from") setFromPlaces([]);
      else setToPlaces([]);
      return;
    }
    const requestId = requestIds.current[field] + 1;
    requestIds.current[field] = requestId;
    try {
      const data = await searchCities(trimmedQuery);
      if (requestIds.current[field] !== requestId) return;

      const suggestions = Array.isArray(data)
        ? data.map((item) => ({
            cityId: String(item?.cityId || item?.code || "").trim(),
            cityName: String(item?.cityName || item?.name || "").trim(),
            stateName: String(item?.stateName || item?.state || "").trim(),
          })).filter((item) => item.cityName && item.cityId)
        : [];

      const seen = new Set();
      const uniqueSuggestions = [];
      suggestions.forEach((item) => {
        const key = `${item.cityName}-${item.cityId}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSuggestions.push(item);
        }
      });

      if (field === "from") setFromPlaces(uniqueSuggestions);
      else setToPlaces(uniqueSuggestions);
    } catch {
      if (requestIds.current[field] !== requestId) return;
      if (field === "from") setFromPlaces([]);
      else setToPlaces([]);
    } finally {
      if (requestIds.current[field] === requestId) {
        if (field === "from") setLoadingFrom(false);
        else setLoadingTo(false);
      }
    }
  };

  const schedulePlaceSuggestions = (query, field) => {
    const timerRef = suggestionTimers.current[field];
    if (timerRef) clearTimeout(timerRef);
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      if (field === "from") {
        setFromPlaces([]);
        setShowFromSuggestions(false);
        setLoadingFrom(false);
      } else {
        setToPlaces([]);
        setShowToSuggestions(false);
        setLoadingTo(false);
      }
      return;
    }

    if (field === "from") setLoadingFrom(true);
    else setLoadingTo(true);

    suggestionTimers.current[field] = setTimeout(() => {
      suggestionTimers.current[field] = null;
      fetchPlaceSuggestions(trimmedQuery, field);
    }, 400);
  };

  const onChangeDate = (_, selectedDate) => {
    if (Platform.OS !== "ios") setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const formatDate = (value) =>
    value.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const canSearch = source.cityName.trim().length > 0 && destination.cityName.trim().length > 0;

  const rotateInterpolate = swapRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const fromTranslateY = swapMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const toTranslateY = swapMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const fieldFade = swapMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });

  const handleSwap = () => {
    if (isSwapping || (!source.cityName && !destination.cityName)) return;
    const nextFrom = destination;
    const nextTo = source;
    setShowFromSuggestions(false);
    setShowToSuggestions(false);
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
    if (!canSearch) return;

    if (!source.cityId) {
      Alert.alert("Validation Error", "Please select a valid From city from the suggestions.");
      return;
    }
    if (!destination.cityId) {
      Alert.alert("Validation Error", "Please select a valid To city from the suggestions.");
      return;
    }
    if (!date) {
      Alert.alert("Validation Error", "Departure date is required.");
      return;
    }

    setShowFromSuggestions(false);
    setShowToSuggestions(false);
    navigation?.navigate?.("BusListScreen", {
      from: source,
      to: destination,
      date: formatDate(date),
      dateValue: date.toISOString(),
      passengers: passengersCount,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* HERO GRADIENT HEADER */}
        <View style={styles.heroContainer}>
          <LinearGradient
            colors={COLORS.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={StyleSheet.absoluteFillObject}>
              <Svg height="100%" width="100%" viewBox="0 0 400 220" preserveAspectRatio="none">
                <Circle cx="360" cy="30" r="100" fill="rgba(255,255,255,0.08)" />
                <Circle cx="40" cy="180" r="60" fill="rgba(255,255,255,0.05)" />
                
                {/* Skyline Silhouette */}
                <Path
                  d="M0,150 L20,150 L20,125 L35,125 L35,150 L50,150 L50,100 L70,100 L70,150 L90,150 L90,130 L105,130 L105,150 L130,150 L130,115 L150,115 L150,150 L170,150 L170,130 L185,130 L185,150 L210,150 L210,95 L235,95 L235,150 L260,150 L260,120 L280,120 L280,150 L310,150 L310,130 L325,130 L325,150 L350,150 L350,105 L375,105 L375,150 L400,150 L400,220 L0,220 Z"
                  fill="rgba(255,255,255,0.06)"
                />

                {/* Road & Bus Silhouette */}
                <Path
                  d="M-20,185 Q200,165 420,185 L420,220 L-20,220 Z"
                  fill="rgba(0,0,0,0.12)"
                />
                <Path
                  d="M-20,185 Q200,165 420,185"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  fill="none"
                />

                {/* Bus graphic on the road */}
                <G transform="translate(255, 134) scale(0.65)">
                  <Rect x="0" y="10" width="72" height="32" rx="6" fill="#FFFFFF" opacity="0.9" />
                  <Rect x="8" y="16" width="12" height="10" rx="2" fill="#D11A2A" />
                  <Rect x="24" y="16" width="12" height="10" rx="2" fill="#D11A2A" />
                  <Rect x="40" y="16" width="12" height="10" rx="2" fill="#D11A2A" />
                  <Rect x="56" y="16" width="8" height="10" rx="2" fill="#D11A2A" />
                  <Circle cx="16" cy="42" r="6" fill="#1F2937" />
                  <Circle cx="56" cy="42" r="6" fill="#1F2937" />
                </G>
              </Svg>
            </View>

            {/* Header Content Bar */}
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <View style={styles.logoBadge}>
                  <Ionicons name="bus-outline" size={20} color="#D11A2A" />
                </View>
                <View>
                  <Text style={styles.brandTitle}>PickNBook</Text>
                  <Text style={styles.brandTagline}>Smart Travel. Easy Booking.</Text>
                </View>
              </View>

              <View style={styles.headerIconsRow}>
                <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
                  <Ionicons name="headset-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.iconButtonText}>Help</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.iconButtonCircle, pressed && styles.iconButtonPressed]}>
                  <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* FLOATING SEARCH CARD */}
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
            <Animated.View style={[styles.animatedField, { opacity: fieldFade, transform: [{ translateY: fromTranslateY }], zIndex: 4 }]}>
              <TravelField
                label="FROM"
                icon="location-outline"
                value={source.cityName}
                placeholder="Enter source"
                onChangeText={(text) => {
                  setSource({
                    cityId: "",
                    cityName: text,
                    stateName: "",
                  });
                  setShowFromSuggestions(true);
                  setShowToSuggestions(false);
                  schedulePlaceSuggestions(text, "from");
                }}
                editable={!isSwapping}
                showBorderBottom={true}
              />
              <SuggestionsDropdown
                visible={showFromSuggestions}
                items={fromPlaces}
                loading={loadingFrom}
                onSelect={(city) => {
                  setSource(city);
                  setShowFromSuggestions(false);
                }}
                query={source.cityName}
              />
            </Animated.View>

            <Animated.View style={[styles.animatedField, { opacity: fieldFade, transform: [{ translateY: toTranslateY }], zIndex: 3 }]}>
              <TravelField
                label="TO"
                icon="location-outline"
                value={destination.cityName}
                placeholder="Enter destination"
                onChangeText={(text) => {
                  setDestination({
                    cityId: "",
                    cityName: text,
                    stateName: "",
                  });
                  setShowToSuggestions(true);
                  setShowFromSuggestions(false);
                  schedulePlaceSuggestions(text, "to");
                }}
                editable={!isSwapping}
                showBorderBottom={true}
              />
              <SuggestionsDropdown
                visible={showToSuggestions}
                items={toPlaces}
                loading={loadingTo}
                onSelect={(city) => {
                  setDestination(city);
                  setShowToSuggestions(false);
                }}
                query={destination.cityName}
              />
            </Animated.View>

            {/* FLOATING SWAP BUTTON */}
            <Animated.View style={[styles.swapButtonWrap, { transform: [{ scale: swapScale }, { rotate: rotateInterpolate }] }]}>
              <Pressable onPress={handleSwap} disabled={isSwapping} style={({ pressed }) => [styles.swapButton, pressed && styles.swapButtonPressed]}>
                <LinearGradient
                  colors={COLORS.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.swapGradient}
                >
                  <Ionicons name="swap-vertical" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>

          {/* DATE FIELD */}
          <TravelField
            label="DATE OF JOURNEY"
            icon="calendar-outline"
            value={formatDate(date)}
            placeholder="Select date"
            onPress={() => {
              setShowFromSuggestions(false);
              setShowToSuggestions(false);
              setShowPicker(true);
            }}
            rightAdornment={
              <View style={styles.fieldRightBadge}>
                <Ionicons name="calendar" size={18} color={COLORS.primary} />
              </View>
            }
            showBorderBottom={false}
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

          {/* SEARCH BUTTON */}
          <Animated.View style={[styles.buttonShadow, { transform: [{ scale: searchScale }] }]}>
            <Pressable
              onPress={handleSearch}
              disabled={!canSearch}
              onPressIn={handleSearchPressIn}
              onPressOut={handleSearchPressOut}
              style={({ pressed }) => [
                styles.buttonPressable,
                (!canSearch || pressed) && styles.buttonPressed,
              ]}
            >
              <LinearGradient
                colors={COLORS.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Search Buses</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonArrow} />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* TRUST SECTION */}
        <View style={styles.trustSection}>
          <View style={styles.trustCard}>
            <View style={[styles.trustIconContainer, { backgroundColor: "#FFF0F2" }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#E53935" />
            </View>
            <View style={styles.trustContent}>
              <Text style={styles.trustTitle}>Safe & Secure</Text>
              <Text style={styles.trustSubtitle}>Your safety is our priority</Text>
            </View>
          </View>

          <View style={styles.trustCard}>
            <View style={[styles.trustIconContainer, { backgroundColor: "#FFF0F2" }]}>
              <Ionicons name="ticket-outline" size={20} color="#E53935" />
            </View>
            <View style={styles.trustContent}>
              <Text style={styles.trustTitle}>Easy Cancellation</Text>
              <Text style={styles.trustSubtitle}>Flexible cancellation options</Text>
            </View>
          </View>

          <View style={styles.trustCard}>
            <View style={[styles.trustIconContainer, { backgroundColor: "#FFF0F2" }]}>
              <Ionicons name="time-outline" size={20} color="#E53935" />
            </View>
            <View style={styles.trustContent}>
              <Text style={styles.trustTitle}>Real-time Updates</Text>
              <Text style={styles.trustSubtitle}>Live tracking & status updates</Text>
            </View>
          </View>
        </View>

        {/* OFFERS SECTION */}
        <View style={styles.featuredOffersWrap}>
          <FeaturedOffers />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { paddingBottom: 20, flexGrow: 0 },
  
  heroContainer: {
    width: "100%",
    height: 210,
  },
  heroGradient: {
    flex: 1,
    paddingHorizontal: SPACING.screen,
    paddingTop: Platform.OS === "ios" ? 12 : 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.soft,
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  brandTagline: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  headerIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  iconButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  iconButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  iconButtonPressed: {
    opacity: 0.75,
  },

  searchCard: {
    marginHorizontal: SPACING.screen,
    marginTop: -42,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.card,
    ...SHADOWS.card,
  },
  swapSection: { position: "relative", gap: 0 },
  animatedField: { position: "relative" },
  fieldGroup: { position: "relative", paddingVertical: 10 },
  fieldBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fieldSurface: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  fieldPressed: {
    backgroundColor: "#F8FAFC",
  },
  fieldLeft: { flex: 1, justifyContent: "center" },
  bookingMiniLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  bookingInputRow: {
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
    fontWeight: "800",
    padding: 0,
    height: 28,
  },
  bookingValueText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    paddingVertical: 2,
  },
  fieldRightBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF0F2",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdown: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    maxHeight: 188,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.dropdown,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    zIndex: 12,
    ...SHADOWS.soft,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFF3F8",
  },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownItemPressed: { backgroundColor: "#F8FAFC" },
  dropdownText: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: "700" },
  dropdownStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  dropdownStatusText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownItemTextContainer: {
    flex: 1,
    flexDirection: "column",
  },
  dropdownSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },

  swapButtonWrap: {
    position: "absolute",
    right: 12,
    top: 50,
    zIndex: 15,
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: RADII.swap,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: COLORS.surface,
    ...SHADOWS.soft,
  },
  swapGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  swapButtonPressed: { opacity: 0.88 },

  buttonShadow: {
    borderRadius: RADII.button,
    marginTop: 18,
    ...SHADOWS.button,
  },
  buttonPressable: { borderRadius: RADII.button, overflow: "hidden" },
  buttonPressed: { opacity: 0.9 },
  buttonGradient: {
    minHeight: 52,
    borderRadius: RADII.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", letterSpacing: 0.2 },
  buttonArrow: { marginTop: 1 },

  trustSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: SPACING.screen,
    marginTop: SPACING.sectionGap,
    gap: 8,
  },
  trustCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    textAlign: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  trustIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  trustContent: {
    alignItems: "center",
  },
  trustTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  trustSubtitle: {
    fontSize: 9,
    fontWeight: "500",
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 12,
  },

  featuredOffersWrap: {
    marginTop: SPACING.sectionGap,
    paddingHorizontal: SPACING.screen,
    marginBottom: 0,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    ...SHADOWS.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 18,
  },
  passengerOptionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  passengerPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  passengerPillActive: {
    backgroundColor: COLORS.primary,
  },
  passengerPillText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  passengerPillTextActive: {
    color: "#FFFFFF",
  },
});
