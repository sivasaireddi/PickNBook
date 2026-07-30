import React, { useEffect, useMemo, useState, useRef } from "react";
import { 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  useWindowDimensions, 
  View, 
  ImageBackground,
  TextInput, 
  Modal, 
  TouchableOpacity,
  ActivityIndicator,
  Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Keep existing utilities and services imports intact
import { addDays, formatCurrency, toDateInputValue, validateFlightSearch, normalizeCityName } from "./utils/flightUtils";
import { searchFlights, getPlaces, getHotRoutes, getFeaturedOffers } from "./services/flightBookingService";
import { writeFlightBookingFlowState } from "./services/flightBookingFlowStore";

const PRIMARY_RED = "#D11A2A";
const PRIMARY_LIGHT = "#E65A67";
const BACKGROUND = "#F4F7FB";
const WHITE = "#FFFFFF";
const BORDER = "#E2E8F0";
const TEXT_COLOR = "#0F172A";
const PLACEHOLDER = "#94A3B8";

const TRAVEL_CLASSES = ["Economy", "Premium Economy", "Business", "Premium Business", "First Class"];

export default function FlightSearchScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const today = useMemo(() => new Date(), []);
  
  // Keep all existing state variables
  const [from, setFrom] = useState("Delhi");
  const [to, setTo] = useState("Mumbai");
  const [departureDate, setDepartureDate] = useState(today);
  const [returnDate, setReturnDate] = useState(addDays(today, 1));
  const [tripType, setTripType] = useState("oneway");
  const [travelClass, setTravelClass] = useState("Economy");
  const [travellers, setTravellers] = useState({ adults: 1, children: 0, infants: 0 });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [showTravellers, setShowTravellers] = useState(false);
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState(null);

  // Hot Routes & Featured Offers states
  const [hotRoutes, setHotRoutes] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);

  // Additional UI states
  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused] = useState(false);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedFare, setSelectedFare] = useState("regular");
  const [freeCancellation, setFreeCancellation] = useState(false);

  const tripIndex = useRef(new Animated.Value(tripType === "oneway" ? 0 : 1)).current;
  const swapScale = useRef(new Animated.Value(1)).current;
  const swapRotation = useRef(new Animated.Value(0)).current;
  const searchFlightsScale = useRef(new Animated.Value(1)).current;
  const flightOffersScrollX = useRef(new Animated.Value(0)).current;
  const flightRoutesScrollX = useRef(new Animated.Value(0)).current;
  const mountFade = useRef(new Animated.Value(0)).current;
  const mountTranslateY = useRef(new Animated.Value(20)).current;
  const travellerScale = useRef(new Animated.Value(1)).current;
  const classScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(tripIndex, {
      toValue: tripType === "oneway" ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [tripType]);

  const handleSearchFlightsPressIn = () => {
    Animated.spring(searchFlightsScale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handleSearchFlightsPressOut = () => {
    Animated.spring(searchFlightsScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  const handleTravellerPressIn = () => {
    Animated.spring(travellerScale, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handleTravellerPressOut = () => {
    Animated.spring(travellerScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const handleClassPressIn = () => {
    Animated.spring(classScale, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handleClassPressOut = () => {
    Animated.spring(classScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const handleSwapCities = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(swapScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        Animated.spring(swapScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]),
      Animated.timing(swapRotation, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      swapRotation.setValue(0);
    });
    setFrom(to);
    setTo(from);
  };

  const rotateInterpolate = swapRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const tripIndicatorLeft = tripIndex.interpolate({
    inputRange: [0, 1],
    outputRange: ["1%", "50%"],
  });

  // Keep existing API call for places and load promotional content
  useEffect(() => {
    let active = true;
    const fetchPlacesData = async () => {
      setPlacesLoading(true);
      setPlacesError(null);
      try {
        const data = await getPlaces();
        if (active) {
          console.log("Flight Places:", data);
          setPlaces(data || []);
        }
      } catch (err) {
        if (active) {
          console.error("Places API Error:", err);
          setPlacesError(err);
        }
      } finally {
        if (active) {
          setPlacesLoading(false);
        }
      }
    };

    const fetchPromoContent = async () => {
      try {
        const routes = await getHotRoutes();
        if (active) setHotRoutes(routes || []);
      } catch (err) {
        console.warn("Hot routes fetch error:", err);
      }
      try {
        const offers = await getFeaturedOffers();
        if (active) setFeaturedOffers(offers || []);
      } catch (err) {
        console.warn("Offers fetch error:", err);
      }
    };

    fetchPlacesData();
    fetchPromoContent();

    Animated.parallel([
      Animated.timing(mountFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(mountTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      active = false;
    };
  }, []);

  // Keep searchSummary intact
  const searchSummary = `${travellers.adults} Adult${travellers.adults > 1 ? "s" : ""}${travellers.children ? `, ${travellers.children} Child${travellers.children > 1 ? "ren" : ""}` : ""}${travellers.infants ? `, ${travellers.infants} Infant${travellers.infants > 1 ? "s" : ""}` : ""}`;

  // Keep resolveCode intact
  const resolveCode = (city) => {
    const normalized = normalizeCityName(city);
    return String(normalized || city || "").slice(0, 3).toUpperCase();
  };

  // Keep swapCities intact
  const swapCities = () => {
    setFrom(to);
    setTo(from);
  };

  // Keep runSearch intact
  const runSearch = async () => {
    const payload = {
      from,
      to,
      date: toDateInputValue(departureDate),
      returnDate: tripType === "twoway" ? toDateInputValue(returnDate) : "",
      tripType,
      travelClass,
      cabinClass: travelClass,
      ...travellers,
      travellers: searchSummary,
    };
    const nextErrors = validateFlightSearch(payload);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const response = await searchFlights({
        ...payload,
        from: normalizeCityName(from),
        to: normalizeCityName(to),
        travelClass,
      });
      console.log("[FlightSearchScreen] search response", response);
      await writeFlightBookingFlowState({
        searchContext: payload,
      });
      navigation?.navigate?.("FlightListingScreen", {
        flights: response,
        searchParams: payload,
      });
    } catch (error) {
      const message = error?.response?.data || error?.message || "Failed to fetch flights.";
      Alert.alert("Flight search failed", String(message));
    } finally {
      setLoading(false);
    }
  };

  const handleAirportSearch = (text, field) => {
    if (field === "from") {
      setFrom(text);
      if (!text.trim()) {
        setFromSuggestions([]);
        setShowFromSuggestions(false);
        return;
      }
      const filtered = (places || []).filter((item) =>
        item?.cityName?.toLowerCase().includes(text.toLowerCase())
      );
      setFromSuggestions(filtered);
      setShowFromSuggestions(true);
    } else {
      setTo(text);
      if (!text.trim()) {
        setToSuggestions([]);
        setShowToSuggestions(false);
        return;
      }
      const filtered = (places || []).filter((item) =>
        item?.cityName?.toLowerCase().includes(text.toLowerCase())
      );
      setToSuggestions(filtered);
      setShowToSuggestions(true);
    }
  };

  const getTravellersTextDisplay = () => {
    const parts = [];
    if (travellers.adults > 0) {
      parts.push(`${travellers.adults} Adult${travellers.adults > 1 ? "s" : ""}`);
    }
    if (travellers.children > 0) {
      parts.push(`${travellers.children} Child${travellers.children > 1 ? "ren" : ""}`);
    }
    if (travellers.infants > 0) {
      parts.push(`${travellers.infants} Infant${travellers.infants > 1 ? "s" : ""}`);
    }
    return parts.join(" • ") || "Select travellers";
  };

  const formatDateDisplay = (date) => {
    if (!date) return "DD-MM-YYYY";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        style={styles.flex}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Flight Search Card Container matching MakeMyTrip / Ixigo grid layout */}
          <View style={styles.searchCardContainer}>
            <Animated.View style={[
              styles.searchCard,
              {
                opacity: mountFade,
                transform: [{ translateY: mountTranslateY }]
              }
            ]}>
              {/* Trip Type Segmented Control */}
              <View style={styles.tripTypeContainer}>
                <Animated.View style={[styles.tripActiveIndicator, { left: tripIndicatorLeft }]} />
                <TouchableOpacity 
                  activeOpacity={0.85} 
                  onPress={() => setTripType("oneway")}
                  style={styles.pillBtn}
                >
                  <Text style={[styles.pillText, tripType === "oneway" && styles.pillTextActive]}>
                    One Way
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  activeOpacity={0.85} 
                  onPress={() => setTripType("twoway")}
                  style={styles.pillBtn}
                >
                  <Text style={[styles.pillText, tripType === "twoway" && styles.pillTextActive]}>
                    Round Trip
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Source & Destination Stacked summaries with centered Swap Button */}
              <View style={styles.locationsCol}>
                {/* Source Input */}
                <View style={[styles.bookingField, fromFocused && styles.bookingFieldFocused]}>
                  <View style={styles.bookingLeft}>
                    <Text style={styles.bookingMiniLabel}>SOURCE</Text>
                    <View style={styles.bookingInputRow}>
                      <Ionicons name="airplane-outline" size={16} color={PRIMARY_RED} style={styles.bookingIcon} />
                      <TextInput
                        value={from}
                        onChangeText={(txt) => handleAirportSearch(txt, "from")}
                        onFocus={() => {
                          setFromFocused(true);
                          setShowFromSuggestions(true);
                          setToFocused(false);
                          setShowToSuggestions(false);
                        }}
                        onBlur={() => setTimeout(() => setFromFocused(false), 250)}
                        placeholder="Source Airport"
                        placeholderTextColor={PLACEHOLDER}
                        style={styles.bookingTextInput}
                      />
                    </View>
                  </View>
                  <Text style={styles.airportCodeText}>{resolveCode(from)}</Text>
                </View>

                {/* Centered Circular Swap Button */}
                <Animated.View style={[
                  styles.swapRoundBtnWrap,
                  { transform: [{ scale: swapScale }, { rotate: rotateInterpolate }] }
                ]}>
                  <Pressable 
                    onPress={handleSwapCities} 
                    style={({ pressed }) => [styles.swapRoundBtn, pressed && styles.swapButtonPressed]}
                  >
                    <LinearGradient
                      colors={[PRIMARY_LIGHT, PRIMARY_RED]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.swapGradient}
                    >
                      <Ionicons name="swap-vertical" size={16} color={WHITE} />
                    </LinearGradient>
                  </Pressable>
                </Animated.View>

                {/* Destination Input */}
                <View style={[styles.bookingField, toFocused && styles.bookingFieldFocused]}>
                  <View style={styles.bookingLeft}>
                    <Text style={styles.bookingMiniLabel}>DESTINATION</Text>
                    <View style={styles.bookingInputRow}>
                      <Ionicons name="location-outline" size={16} color={PRIMARY_RED} style={styles.bookingIcon} />
                      <TextInput
                        value={to}
                        onChangeText={(txt) => handleAirportSearch(txt, "to")}
                        onFocus={() => {
                          setToFocused(true);
                          setShowToSuggestions(true);
                          setFromFocused(false);
                          setShowFromSuggestions(false);
                        }}
                        onBlur={() => setTimeout(() => setToFocused(false), 250)}
                        placeholder="Destination Airport"
                        placeholderTextColor={PLACEHOLDER}
                        style={styles.bookingTextInput}
                      />
                    </View>
                  </View>
                  <Text style={styles.airportCodeText}>{resolveCode(to)}</Text>
                </View>
              </View>

              {/* Source Suggestions Floating Dropdown */}
              {showFromSuggestions && (fromSuggestions.length > 0 || placesLoading || placesError) ? (
                <View style={styles.floatingSuggestions}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {placesLoading ? (
                      <ActivityIndicator size="small" color={PRIMARY_RED} style={{ margin: 12 }} />
                    ) : placesError ? (
                      <Text style={styles.suggestError}>Error loading destinations</Text>
                    ) : (
                      fromSuggestions.map((item, index) => (
                        <TouchableOpacity
                           key={`from-sug-${index}`}
                           style={styles.suggestItem}
                           onPress={() => {
                             setFrom(item.cityName);
                             setShowFromSuggestions(false);
                           }}
                        >
                          <Ionicons name="location-outline" size={16} color={PLACEHOLDER} />
                          <Text style={styles.suggestText}>{item.cityName}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              ) : null}

              {/* Destination Suggestions Floating Dropdown */}
              {showToSuggestions && (toSuggestions.length > 0 || placesLoading || placesError) ? (
                <View style={styles.floatingSuggestions}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {placesLoading ? (
                      <ActivityIndicator size="small" color={PRIMARY_RED} style={{ margin: 12 }} />
                    ) : placesError ? (
                      <Text style={styles.suggestError}>Error loading destinations</Text>
                    ) : (
                      toSuggestions.map((item, index) => (
                        <TouchableOpacity
                           key={`to-sug-${index}`}
                           style={styles.suggestItem}
                           onPress={() => {
                             setTo(item.cityName);
                             setShowToSuggestions(false);
                           }}
                        >
                          <Ionicons name="location-outline" size={16} color={PLACEHOLDER} />
                          <Text style={styles.suggestText}>{item.cityName}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              ) : null}

              {errors.from ? <Text style={styles.errorLabel}>{errors.from}</Text> : null}
              {errors.to ? <Text style={styles.errorLabel}>{errors.to}</Text> : null}

              {/* Departure & Return Dates Row with vertical divider */}
              <View style={styles.datesRow}>
                <Pressable 
                  onPress={() => {
                    setShowDeparturePicker(true);
                    setShowFromSuggestions(false);
                    setShowToSuggestions(false);
                  }} 
                  style={[styles.dateBlock, styles.flex1]}
                >
                  <Text style={styles.dateBlockLabel}>DEPARTURE DATE</Text>
                  <Text style={styles.dateBlockValue}>
                    {departureDate ? departureDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "Select Date"}
                  </Text>
                </Pressable>

                <View style={styles.dateVerticalDivider} />

                {tripType === "oneway" ? (
                  <Pressable 
                    onPress={() => {
                      setTripType("twoway");
                      setShowReturnPicker(true);
                      setShowFromSuggestions(false);
                      setShowToSuggestions(false);
                    }} 
                    style={[styles.addReturnBlock, styles.flex1]}
                  >
                    <Text style={styles.addReturnLabel}>RETURN DATE</Text>
                    <Text style={styles.addReturnPlaceholder}>+ Add Return</Text>
                  </Pressable>
                ) : (
                  <Pressable 
                    onPress={() => {
                      setShowReturnPicker(true);
                      setShowFromSuggestions(false);
                      setShowToSuggestions(false);
                    }} 
                    style={[styles.dateBlock, styles.flex1]}
                  >
                    <Text style={styles.dateBlockLabel}>RETURN DATE</Text>
                    <Text style={styles.dateBlockValue}>
                      {returnDate ? returnDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "Select Date"}
                    </Text>
                  </Pressable>
                )}
              </View>
              {errors.date ? <Text style={styles.errorLabel}>{errors.date}</Text> : null}
              {errors.returnDate ? <Text style={styles.errorLabel}>{errors.returnDate}</Text> : null}

              {/* Travellers Selector card */}
              <Animated.View style={{ transform: [{ scale: travellerScale }] }}>
                <Pressable 
                  onPress={() => {
                    setShowTravellers(true);
                    setShowFromSuggestions(false);
                    setShowToSuggestions(false);
                  }} 
                  onPressIn={handleTravellerPressIn}
                  onPressOut={handleTravellerPressOut}
                  style={({ pressed }) => [
                    styles.modernPillBox, 
                    pressed && styles.modernPillBoxPressed
                  ]}
                >
                  <Ionicons name="person-outline" size={19} color={PRIMARY_RED} />
                  <View style={styles.pillBoxTextWrap}>
                    <Text style={styles.pillBoxMiniLabel}>TRAVELLERS</Text>
                    <Text style={styles.pillBoxValue} numberOfLines={1}>
                      {getTravellersTextDisplay()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#94A3B8" style={styles.chevronIcon} />
                </Pressable>
              </Animated.View>

              {/* Spacing between Travellers and Cabin Class (16px) */}
              <View style={{ height: 16 }} />

              {/* Cabin Class Selector card */}
              <Animated.View style={{ transform: [{ scale: classScale }] }}>
                <Pressable 
                  onPress={() => {
                    setShowClassModal(true);
                    setShowFromSuggestions(false);
                    setShowToSuggestions(false);
                  }} 
                  onPressIn={handleClassPressIn}
                  onPressOut={handleClassPressOut}
                  style={({ pressed }) => [
                    styles.modernPillBox, 
                    pressed && styles.modernPillBoxPressed
                  ]}
                >
                  <Ionicons name="briefcase-outline" size={19} color={PRIMARY_RED} />
                  <View style={styles.pillBoxTextWrap}>
                    <Text style={styles.pillBoxMiniLabel}>CABIN CLASS</Text>
                    <Text style={styles.pillBoxValue} numberOfLines={1}>{travelClass}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#94A3B8" style={styles.chevronIcon} />
                </Pressable>
              </Animated.View>
              {errors.adults ? <Text style={styles.errorLabel}>{errors.adults}</Text> : null}
              {errors.travelClass ? <Text style={styles.errorLabel}>{errors.travelClass}</Text> : null}



              {/* Submit Search Flights button */}
              <Animated.View style={[styles.buttonShadow, { transform: [{ scale: searchFlightsScale }] }]}>
                <Pressable 
                  onPress={runSearch} 
                  disabled={loading} 
                  onPressIn={handleSearchFlightsPressIn}
                  onPressOut={handleSearchFlightsPressOut}
                  style={({ pressed }) => [
                    styles.buttonPressable, 
                    (loading || pressed) && styles.buttonPressed
                  ]}
                >
                  <LinearGradient 
                    colors={[PRIMARY_LIGHT, PRIMARY_RED]} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={WHITE} />
                    ) : (
                      <View style={styles.searchButtonContent}>
                        <Text style={styles.buttonText}>SEARCH FLIGHTS</Text>
                        <Ionicons name="arrow-forward" size={18} color={WHITE} style={styles.buttonArrow} />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </Animated.View>
          </View>

          {/* Featured Offers */}
          {featuredOffers.length > 0 && (
            <View style={styles.promoSection}>
              <Text style={styles.sectionHeading}>Featured Offers</Text>
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promoScroll}
                snapToInterval={272}
                decelerationRate="fast"
                snapToAlignment="start"
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: flightOffersScrollX } } }],
                  { useNativeDriver: false }
                )}
              >
                {featuredOffers.map((item, index) => {
                  const scale = flightOffersScrollX.interpolate({
                    inputRange: [
                      (index - 1) * 272,
                      index * 272,
                      (index + 1) * 272
                    ],
                    outputRange: [0.94, 1.0, 0.94],
                    extrapolate: 'clamp'
                  });
                  return (
                    <Animated.View key={item.id || index} style={[styles.offerCard, { transform: [{ scale }] }]}>
                      <View style={styles.offerBadge}>
                        <Text style={styles.offerBadgeText}>{item.discount}</Text>
                      </View>
                      <Text style={styles.offerCardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.offerCardDesc} numberOfLines={2}>{item.desc}</Text>
                      <View style={styles.promoCodeRow}>
                        <Text style={styles.promoCodeLabel}>Use Code:</Text>
                        <Text style={styles.promoCodeVal}>{item.code}</Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </Animated.ScrollView>
            </View>
          )}

          {/* Popular Hot Routes */}
          {hotRoutes.length > 0 && (
            <View style={styles.promoSection}>
              <Text style={styles.sectionHeading}>Popular Hot Routes</Text>
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promoScroll}
                snapToInterval={212}
                decelerationRate="fast"
                snapToAlignment="start"
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: flightRoutesScrollX } } }],
                  { useNativeDriver: false }
                )}
              >
                {hotRoutes.map((route, index) => {
                  const scale = flightRoutesScrollX.interpolate({
                    inputRange: [
                      (index - 1) * 212,
                      index * 212,
                      (index + 1) * 212
                    ],
                    outputRange: [0.94, 1.0, 0.94],
                    extrapolate: 'clamp'
                  });
                  return (
                    <Animated.View
                      key={route.id || index}
                      style={{ transform: [{ scale }] }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.routeCard}
                        onPress={() => {
                          setFrom(route.from);
                          setTo(route.to);
                        }}
                      >
                        <ImageBackground source={{ uri: route.image }} style={styles.routeCardBg} imageStyle={{ borderRadius: 20 }}>
                          <View style={styles.routeCardOverlay}>
                            <Text style={styles.routeCardTitle}>{route.title}</Text>
                            <Text style={styles.routeCardPrice}>Fares from {formatCurrency(route.fare)}</Text>
                          </View>
                        </ImageBackground>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </Animated.ScrollView>
            </View>
          )}

          {/* Recent Searches */}
          <View style={styles.promoSection}>
            <Text style={styles.sectionHeading}>Recent Searches</Text>
            <View style={styles.recentSearchCard}>
              <View style={styles.recentIconBox}>
                <Ionicons name="time" size={18} color={PRIMARY_RED} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.recentTitleText}>Delhi to Mumbai</Text>
                <Text style={styles.recentSubtitleText}>Economy • One Way</Text>
              </View>
              <TouchableOpacity
                style={styles.recentSearchBtn}
                onPress={() => {
                  setFrom("Delhi");
                  setTo("Mumbai");
                }}
              >
                <Text style={styles.recentSearchBtnText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Popular Destinations */}
          <View style={styles.promoSection}>
            <Text style={styles.sectionHeading}>Popular Destinations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoScroll}>
              {[
                { name: "Goa", fare: 4200, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80" },
                { name: "Srinagar", fare: 6500, img: "https://images.unsplash.com/photo-1566228015668-4c45dbc4e2f5?w=300&q=80" },
                { name: "Kochi", fare: 3800, img: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=300&q=80" }
              ].map((dest, idx) => (
                <View key={idx} style={styles.destCard}>
                  <ImageBackground source={{ uri: dest.img }} style={styles.destCardBg} imageStyle={{ borderRadius: 14 }}>
                    <View style={styles.destOverlay}>
                      <Text style={styles.destNameText}>{dest.name}</Text>
                      <Text style={styles.destFareText}>Starts at {formatCurrency(dest.fare)}</Text>
                    </View>
                  </ImageBackground>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Departure Date Picker component */}
        {showDeparturePicker && (
          <DateTimePicker
            value={departureDate}
            mode="date"
            display="default"
            minimumDate={today}
            onChange={(_, selected) => {
              setShowDeparturePicker(false);
              if (selected) {
                setDepartureDate(selected);
                if (tripType === "twoway" && returnDate < selected) {
                  setReturnDate(addDays(selected, 1));
                }
              }
            }}
          />
        )}

        {/* Return Date Picker component */}
        {showReturnPicker && (
          <DateTimePicker
            value={returnDate}
            mode="date"
            display="default"
            minimumDate={departureDate}
            onChange={(_, selected) => {
              setShowReturnPicker(false);
              if (selected) setReturnDate(selected);
            }}
          />
        )}

        {/* Custom Traveller Count Modal */}
        <Modal 
          visible={showTravellers} 
          transparent 
          animationType="slide" 
          onRequestClose={() => setShowTravellers(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Travelers</Text>
                <TouchableOpacity onPress={() => setShowTravellers(false)}>
                  <Ionicons name="close" size={24} color={TEXT_COLOR} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalContent}>
                {/* Adults Row */}
                <View style={styles.counterRow}>
                  <View style={styles.counterMeta}>
                    <Text style={styles.counterLabel}>Adults</Text>
                    <Text style={styles.counterDesc}>12 Years and Above</Text>
                  </View>
                  <View style={styles.counterControls}>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => setTravellers((t) => ({ ...t, adults: Math.max(1, t.adults - 1) }))} 
                      style={styles.circleBtn}
                    >
                      <Ionicons name="remove" size={20} color={PRIMARY_RED} />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{travellers.adults}</Text>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => setTravellers((t) => ({ ...t, adults: Math.min(9, t.adults + 1) }))} 
                      style={styles.circleBtn}
                    >
                      <Ionicons name="add" size={20} color={PRIMARY_RED} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Children Row */}
                <View style={styles.counterRow}>
                  <View style={styles.counterMeta}>
                    <Text style={styles.counterLabel}>Child</Text>
                    <Text style={styles.counterDesc}>2 to 11 Years</Text>
                  </View>
                  <View style={styles.counterControls}>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => setTravellers((t) => ({ ...t, children: Math.max(0, t.children - 1) }))} 
                      style={styles.circleBtn}
                    >
                      <Ionicons name="remove" size={20} color={PRIMARY_RED} />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{travellers.children}</Text>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => setTravellers((t) => ({ ...t, children: Math.min(9, t.children + 1) }))} 
                      style={styles.circleBtn}
                    >
                      <Ionicons name="add" size={20} color={PRIMARY_RED} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Infants Row */}
                <View style={styles.counterRow}>
                  <View style={styles.counterMeta}>
                    <Text style={styles.counterLabel}>Infant</Text>
                    <Text style={styles.counterDesc}>Under 2 Years</Text>
                  </View>
                  <View style={styles.counterControls}>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => setTravellers((t) => ({ ...t, infants: Math.max(0, t.infants - 1) }))} 
                      style={styles.circleBtn}
                    >
                      <Ionicons name="remove" size={20} color={PRIMARY_RED} />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{travellers.infants}</Text>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => setTravellers((t) => ({ ...t, infants: Math.min(9, t.infants + 1) }))} 
                      style={styles.circleBtn}
                    >
                      <Ionicons name="add" size={20} color={PRIMARY_RED} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  activeOpacity={0.9} 
                  onPress={() => setShowTravellers(false)}
                  style={styles.modalDoneBtn}
                >
                  <Text style={styles.modalDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Custom Cabin Class Selector Modal */}
        <Modal 
          visible={showClassModal} 
          transparent 
          animationType="slide" 
          onRequestClose={() => setShowClassModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Cabin Class</Text>
                <TouchableOpacity onPress={() => setShowClassModal(false)}>
                  <Ionicons name="close" size={24} color={TEXT_COLOR} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.classOptionsList}>
                {TRAVEL_CLASSES.map((item) => {
                  const isSelected = item === travelClass;
                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.85}
                      onPress={() => {
                        setTravelClass(item);
                        setShowClassModal(false);
                      }}
                      style={[
                        styles.classOptionItem,
                        isSelected && styles.classOptionItemSelected
                      ]}
                    >
                      <Text style={[
                        styles.classOptionText,
                        isSelected && styles.classOptionTextSelected
                      ]}>
                        {item}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={PRIMARY_RED} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  flex: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 110,
  },
  searchCardContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchCard: {
    backgroundColor: WHITE,
    borderRadius: 28,
    marginTop: 0,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  tripTypeContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    padding: 3,
    marginBottom: 16,
    height: 42,
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tripActiveIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: "48.5%",
    backgroundColor: PRIMARY_RED,
    borderRadius: 18,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 2,
  },
  pillBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "transparent",
    zIndex: 2,
  },
  pillText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  pillTextActive: {
    color: WHITE,
    fontWeight: "800",
  },
  locationsCol: {
    position: "relative",
    gap: 16,
    zIndex: 10,
    marginBottom: 12,
  },
  bookingField: {
    height: 72,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookingLeft: {
    flex: 1,
    justifyContent: "center",
  },
  bookingFieldFocused: {
    borderColor: PRIMARY_RED,
    backgroundColor: WHITE,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  bookingMiniLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 0.8,
  },
  bookingInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -2,
  },
  bookingIcon: {
    marginTop: 1,
  },
  bookingTextInput: {
    flex: 1,
    color: TEXT_COLOR,
    fontSize: 18,
    fontWeight: "900",
    padding: 0,
    height: 28,
  },
  airportCodeText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#CBD5E1",
    marginLeft: 10,
  },
  swapRoundBtnWrap: {
    position: "absolute",
    alignSelf: "center",
    top: 58,
    zIndex: 15,
  },
  swapRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: WHITE,
    elevation: 3,
  },
  swapGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  swapButtonPressed: {
    opacity: 0.88,
  },
  datesRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 68,
  },
  dateBlock: {
    justifyContent: "center",
  },
  dateBlockLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  dateBlockValue: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT_COLOR,
  },
  dateBlockValuePlaceholder: {
    color: "#94A3B8",
    fontWeight: "700",
  },
  addReturnBlock: {
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 46,
  },
  addReturnLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    color: PRIMARY_RED,
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  addReturnPlaceholder: {
    fontSize: 13,
    fontWeight: "900",
    color: PRIMARY_RED,
  },
  dateVerticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },
  buttonShadow: {
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
    borderRadius: 18,
    marginTop: 20,
  },
  buttonPressable: {
    borderRadius: 18,
    overflow: "hidden",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonGradient: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  buttonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  modernPillBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    height: 62,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  modernPillBoxPressed: {
    borderColor: PRIMARY_RED,
    backgroundColor: WHITE,
    elevation: 2,
  },
  pillBoxTextWrap: {
    flex: 1,
    paddingRight: 6,
  },
  pillBoxMiniLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  pillBoxValue: {
    fontSize: 15,
    fontWeight: "750",
    color: TEXT_COLOR,
    lineHeight: 18,
  },
  chevronIcon: {
    marginRight: -4,
  },
  fareSection: {
    marginTop: 14,
    marginBottom: 12,
  },
  fareSectionTitle: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  fareChipsScroll: {
    gap: 8,
    paddingRight: 16,
  },
  fareChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fareChipActive: {
    backgroundColor: "#FFF5F5",
    borderColor: PRIMARY_RED,
  },
  fareChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  fareChipTextActive: {
    color: PRIMARY_RED,
    fontWeight: "900",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 14,
  },
  toggleRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  checkboxChecked: {
    borderColor: PRIMARY_RED,
    backgroundColor: PRIMARY_RED,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 12.5,
    fontWeight: "900",
    color: TEXT_COLOR,
  },
  toggleSubtitle: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  greenBadge: {
    backgroundColor: "#DCFCE7",
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: "#166534",
  },
  searchButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonArrow: {
    marginTop: 1,
  },
  errorLabel: {
    color: PRIMARY_RED,
    fontSize: 11,
    fontWeight: "700",
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  searchFlightsBtn: {
    backgroundColor: PRIMARY_RED,
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  searchFlightsBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: TEXT_COLOR,
  },
  modalContent: {
    padding: 16,
    gap: 16,
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FBFBFB",
  },
  counterMeta: {
    flex: 1,
  },
  counterLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_COLOR,
  },
  counterDesc: {
    fontSize: 11,
    color: PLACEHOLDER,
    fontWeight: "600",
    marginTop: 2,
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT_COLOR,
    minWidth: 20,
    textAlign: "center",
  },
  modalDoneBtn: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  modalDoneBtnText: {
    color: WHITE,
    fontWeight: "900",
    fontSize: 15,
  },
  classOptionsList: {
    padding: 16,
    gap: 10,
  },
  classOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: WHITE,
  },
  classOptionItemSelected: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FFF5F5",
  },
  classOptionText: {
    fontSize: 14,
    fontWeight: "750",
    color: "#4B5563",
  },
  classOptionTextSelected: {
    color: PRIMARY_RED,
    fontWeight: "850",
  },
  promoSection: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT_COLOR,
    marginBottom: 12,
  },
  promoScroll: {
    gap: 12,
    paddingRight: 16,
  },
  offerCard: {
    width: 260,
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  offerBadge: {
    backgroundColor: "#FFF5F5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  offerBadgeText: {
    color: PRIMARY_RED,
    fontSize: 10,
    fontWeight: "900",
  },
  offerCardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT_COLOR,
  },
  offerCardDesc: {
    fontSize: 11,
    color: PLACEHOLDER,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 15,
  },
  promoCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 4,
  },
  promoCodeLabel: {
    fontSize: 10,
    color: PLACEHOLDER,
    fontWeight: "700",
  },
  promoCodeVal: {
    fontSize: 11,
    fontWeight: "900",
    color: PRIMARY_RED,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  routeCard: {
    width: 200,
    height: 140,
    borderRadius: 20,
    overflow: "hidden",
  },
  routeCardBg: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  routeCardOverlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 12,
  },
  routeCardTitle: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
  },
  routeCardPrice: {
    color: "#E5E7EB",
    fontSize: 10,
    fontWeight: "750",
    marginTop: 2,
  },
  recentSearchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  recentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  recentTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_COLOR,
  },
  recentSubtitleText: {
    fontSize: 11,
    color: PLACEHOLDER,
    fontWeight: "600",
    marginTop: 1,
  },
  recentSearchBtn: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  recentSearchBtnText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
  },
  destCard: {
    width: 140,
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
  },
  destCardBg: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  destOverlay: {
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 10,
  },
  destNameText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
  },
  destFareText: {
    color: "#E5E7EB",
    fontSize: 10,
    fontWeight: "750",
    marginTop: 2,
  },
});
