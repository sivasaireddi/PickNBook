import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Rect, Circle } from "react-native-svg";
import {
  Building2,
  CalendarDays,
  Search,
  ArrowRight,
  Headphones,
  Bell,
  ShieldCheck,
  Ticket,
  Clock,
  Plus,
  X,
  Minus,
  MapPin,
  Trash2,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { searchHotelOffers, resolveCityId, searchCities } from "../../../services/hotelService";
import { useHotelBooking } from "../../../context/HotelBookingContext";
import { scale } from "../../../utils/responsive";

const CITY_HINTS = [
  { label: "New Delhi", value: "725862" },
  { label: "Mumbai", value: "130443" },
  { label: "Hyderabad", value: "118488" },
  { label: "Bengaluru", value: "111124" },
];

const formatDisplayDate = (date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatApiDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const SkylineSVG = () => (
  <Svg width="120%" height={scale(56)} viewBox="0 0 380 56" preserveAspectRatio="none" style={{ left: '-10%' }}>
    <Circle cx="320" cy="16" r="8" fill="#FFFFFF" opacity="0.13" />
    <Rect x="20" y="26" width="16" height="30" fill="#FFFFFF" opacity="0.13" />
    <Rect x="40" y="16" width="22" height="40" fill="#FFFFFF" opacity="0.13" />
    <Rect x="66" y="32" width="14" height="24" fill="#FFFFFF" opacity="0.13" />
    <Rect x="120" y="20" width="20" height="36" fill="#FFFFFF" opacity="0.13" />
    <Rect x="145" y="12" width="16" height="44" fill="#FFFFFF" opacity="0.13" />
    <Rect x="165" y="28" width="18" height="28" fill="#FFFFFF" opacity="0.13" />
    <Rect x="220" y="24" width="22" height="32" fill="#FFFFFF" opacity="0.13" />
    <Rect x="246" y="14" width="18" height="42" fill="#FFFFFF" opacity="0.13" />
    <Rect x="268" y="30" width="16" height="26" fill="#FFFFFF" opacity="0.13" />
    <Rect x="340" y="22" width="20" height="34" fill="#FFFFFF" opacity="0.13" />
  </Svg>
);

const AnimatedPressable = ({ children, style, onPress, disabled, activeScale = 0.95, wrapperStyle }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      style={wrapperStyle}
      onPressIn={() => {
        if (disabled) return;
        Animated.spring(scale, { toValue: activeScale, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        if (disabled) return;
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      }}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};


const HotelsScreen = () => {
  const navigation = useNavigation();
  const { setSearchSession } = useHotelBooking();
  const { width } = useWindowDimensions();

  const [destinationInput, setDestinationInput] = useState("New Delhi");
  const [selectedCityId, setSelectedCityId] = useState("725862");
  
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const suggestionTimer = useRef(null);

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const titleTranslateX = useRef(new Animated.Value(-15)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const actionsOpacity = useRef(new Animated.Value(0)).current;
  const actionsScale = useRef(new Animated.Value(0.9)).current;
  const cardTranslateY = useRef(new Animated.Value(35)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.98)).current;
  
  const badgesOpacity = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const badgesTranslateY = [
    useRef(new Animated.Value(15)).current,
    useRef(new Animated.Value(15)).current,
    useRef(new Animated.Value(15)).current,
  ];
  
  const skylineTranslateX = useRef(new Animated.Value(0)).current;
  const ctaArrowTranslateX = useRef(new Animated.Value(0)).current;
  const destinationIconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Skyline slow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(skylineTranslateX, { toValue: -20, duration: 25000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(skylineTranslateX, { toValue: 0, duration: 25000, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();

    // CTA Arrow idle loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaArrowTranslateX, { toValue: 4, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(ctaArrowTranslateX, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Entrance Animation Sequence
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(titleTranslateX, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.timing(actionsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(actionsScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(cardTranslateY, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      ]),
      Animated.stagger(100, badgesOpacity.map((op, i) => 
        Animated.parallel([
          Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(badgesTranslateY[i], { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
        ])
      ))
    ]).start();

    return () => {
      if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    };
  }, []);

  const handleCityInput = (text) => {
    setDestinationInput(text);
    if (text.trim().length < 2) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setShowSuggestions(true);
    setLoadingSuggestions(true);
    
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    
    suggestionTimer.current = setTimeout(async () => {
      try {
        const results = await searchCities(text.trim());
        setCitySuggestions(results || []);
      } catch (e) {
        setCitySuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
  };

  const [checkInDate, setCheckInDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  );

  // Multi-room guests state
  const [roomGuests, setRoomGuests] = useState([
    { NoOfAdults: "2", NoOfChild: "0", ChildAge: [] },
  ]);

  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resolvedCityId = selectedCityId;

  const handleAddRoom = () => {
    if (roomGuests.length >= 4) return;
    setRoomGuests((prev) => [
      ...prev,
      { NoOfAdults: "2", NoOfChild: "0", ChildAge: [] },
    ]);
  };

  const handleRemoveRoom = (index) => {
    if (roomGuests.length <= 1) return;
    setRoomGuests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAdults = (roomIdx, delta) => {
    setRoomGuests((prev) =>
      prev.map((r, idx) => {
        if (idx !== roomIdx) return r;
        const currentAdults = Math.max(1, (Number(r.NoOfAdults) || 1) + delta);
        return { ...r, NoOfAdults: String(currentAdults) };
      })
    );
  };

  const handleUpdateChildren = (roomIdx, delta) => {
    setRoomGuests((prev) =>
      prev.map((r, idx) => {
        if (idx !== roomIdx) return r;
        const currentChildren = Math.max(0, (Number(r.NoOfChild) || 0) + delta);
        let newAges = [...(r.ChildAge || [])];
        if (currentChildren > newAges.length) {
          while (newAges.length < currentChildren) newAges.push(5);
        } else if (currentChildren < newAges.length) {
          newAges = newAges.slice(0, currentChildren);
        }
        return { ...r, NoOfChild: String(currentChildren), ChildAge: newAges };
      })
    );
  };

  const handleUpdateChildAge = (roomIdx, childIdx, ageStr) => {
    const ageNum = Math.min(12, Math.max(1, Number(ageStr) || 5));
    setRoomGuests((prev) =>
      prev.map((r, idx) => {
        if (idx !== roomIdx) return r;
        const newAges = [...(r.ChildAge || [])];
        newAges[childIdx] = ageNum;
        return { ...r, ChildAge: newAges };
      })
    );
  };

  const handleSearch = async () => {
    setError("");

    // Validate dates
    if (!(checkOutDate > checkInDate)) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    // Validate ChildAge matching NoOfChild for every room
    for (let i = 0; i < roomGuests.length; i++) {
      const room = roomGuests[i];
      const childCount = Number(room.NoOfChild) || 0;
      if ((room.ChildAge || []).length !== childCount) {
        setError(`Room ${i + 1}: Please specify exact ages for all ${childCount} children.`);
        return;
      }
    }

    setLoading(true);

    try {
      const searchParams = {
        cityId: resolvedCityId,
        checkInDate: formatApiDate(checkInDate),
        checkOutDate: formatApiDate(checkOutDate),
        noOfRooms: roomGuests.length,
        roomGuests,
      };

      console.log("[HotelsScreen] executing searchHotelOffers:", searchParams);
      const searchResult = await searchHotelOffers(searchParams);

      const hotels = searchResult?.hotels || [];
      const sessionData = {
        traceId: searchResult?.traceId || "",
        srdvType: searchResult?.srdvType || "MixAPI",
        srdvIndex: searchResult?.srdvIndex || "15",
      };

      // Save to context
      setSearchSession(searchParams, sessionData);

      navigation.navigate("HotelSearchResultsScreen", {
        hotels,
        searchParams: {
          ...searchParams,
          ...sessionData,
        },
      });
    } catch (searchError) {
      console.log("[HotelsScreen] Search error:", searchError?.message);
      setError(
        searchError?.message || "Unable to search hotels. Please verify destination and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Header Banner */}
        <View style={styles.headerBannerContainer}>
          <LinearGradient
            colors={["#C42B31", "#B0242A"]}
            style={styles.headerGradient}
          >
            <SafeAreaView edges={["top"]} style={styles.safeArea}>
              <View style={styles.headerRow}>
                <View style={styles.logoTitleGroup}>
                  <Animated.View style={[styles.logoBox, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
                    <Building2 size={scale(20)} color="#C0272D" />
                  </Animated.View>
                  <View>
                    <Animated.Text style={[styles.appName, { opacity: titleOpacity, transform: [{ translateX: titleTranslateX }] }]}>PickNBook</Animated.Text>
                    <Animated.Text style={[styles.appSubtitle, { opacity: subtitleOpacity }]}>Smart travel. Easy booking.</Animated.Text>
                  </View>
                </View>
                <Animated.View style={[styles.headerActions, { opacity: actionsOpacity, transform: [{ scale: actionsScale }] }]}>
                  <AnimatedPressable style={styles.helpButton} activeScale={0.92}>
                    <Headphones size={scale(14)} color="#FFFFFF" />
                    <Text style={styles.helpText}>Help</Text>
                  </AnimatedPressable>
                  <AnimatedPressable style={styles.notificationButton} activeScale={0.92}>
                    <Bell size={scale(16)} color="#FFFFFF" />
                    <View style={styles.notificationDot} />
                  </AnimatedPressable>
                </Animated.View>
              </View>
              <View style={styles.skylineContainer}>
                <Animated.View style={{ transform: [{ translateX: skylineTranslateX }] }}>
                  <SkylineSVG />
                </Animated.View>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </View>

        {/* Search Card */}
        <View style={styles.cardContainer}>
          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }, { scale: cardScale }] }]}>
            <Text style={styles.label}>DESTINATION CITY</Text>
            <View style={[styles.inputContainer, showSuggestions && styles.inputContainerActive]}>
              <Animated.View style={[styles.inputIconChip, { transform: [{ scale: destinationIconScale }] }]}>
                <Building2 size={scale(14)} color="#C0272D" />
              </Animated.View>
              <TextInput
                placeholder="Search City (e.g. Delhi)"
                placeholderTextColor="#A5A29B"
                value={destinationInput}
                onChangeText={(text) => {
                  Animated.sequence([
                    Animated.timing(destinationIconScale, { toValue: 0.9, duration: 50, useNativeDriver: true }),
                    Animated.timing(destinationIconScale, { toValue: 1, duration: 150, useNativeDriver: true })
                  ]).start();
                  handleCityInput(text);
                }}
                style={styles.input}
                onFocus={() => {
                   if (destinationInput.trim().length >= 2) setShowSuggestions(true);
                }}
              />
              {destinationInput.length > 0 && (
                <Pressable onPress={() => { setDestinationInput(""); setCitySuggestions([]); setShowSuggestions(false); }} style={styles.clearButton}>
                  <X size={scale(16)} color="#A5A29B" />
                </Pressable>
              )}
            </View>
            
            {showSuggestions && (
              <View style={styles.dropdown}>
                {loadingSuggestions ? (
                  <View style={styles.dropdownStatus}>
                    <ActivityIndicator size="small" color="#C0272D" />
                    <Text style={styles.dropdownStatusText}>Searching cities...</Text>
                  </View>
                ) : citySuggestions.length === 0 ? (
                  <View style={styles.dropdownStatus}>
                    <Text style={styles.dropdownStatusText}>No cities found</Text>
                  </View>
                ) : (
                  citySuggestions.map((item, index) => (
                    <Pressable
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDestinationInput(item.cityName);
                        setSelectedCityId(item.cityId);
                        setShowSuggestions(false);
                      }}
                    >
                      <MapPin size={scale(16)} color="#C0272D" />
                      <View style={styles.dropdownItemTextContainer}>
                        <Text style={styles.dropdownText}>{item.cityName}</Text>
                        {item.countryName ? <Text style={styles.dropdownSubtext}>{item.countryName}</Text> : null}
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            <View style={[styles.dateRow, width < 340 && styles.dateRowStacked]}>
              <View style={styles.dateBox}>
                <Text style={styles.label}>CHECK-IN</Text>
                <AnimatedPressable
                  style={styles.dateInput}
                  activeScale={0.96}
                  onPress={() => setShowCheckInPicker(true)}
                >
                  <CalendarDays size={scale(16)} color="#C0272D" />
                  <Text style={styles.dateText}>
                    {formatDisplayDate(checkInDate)}
                  </Text>
                </AnimatedPressable>
              </View>

              <View style={styles.dateBox}>
                <Text style={styles.label}>CHECK-OUT</Text>
                <AnimatedPressable
                  style={styles.dateInput}
                  activeScale={0.96}
                  onPress={() => setShowCheckOutPicker(true)}
                >
                  <CalendarDays size={scale(16)} color="#C0272D" />
                  <Text style={styles.dateText}>
                    {formatDisplayDate(checkOutDate)}
                  </Text>
                </AnimatedPressable>
              </View>
            </View>

            {/* Rooms and Guests Configuration */}
            <View style={styles.roomsHeader}>
              <Text style={styles.roomsTitle}>Rooms and guests <Text style={styles.roomsTitleCount}>({roomGuests.length})</Text></Text>
              {roomGuests.length < 4 && (
                <AnimatedPressable style={styles.addRoomBtn} onPress={handleAddRoom} activeScale={0.9}>
                  <Plus size={scale(12)} color="#C0272D" />
                  <Text style={styles.addRoomText}>Add room</Text>
                </AnimatedPressable>
              )}
            </View>

            {roomGuests.map((room, rIdx) => {
              const childCount = Number(room.NoOfChild) || 0;
              return (
                <View key={`room-${rIdx}`} style={styles.roomCard}>
                  <View style={styles.roomTitleRow}>
                    <Text style={styles.roomTitle}>Room {rIdx + 1}</Text>
                    {roomGuests.length > 1 && (
                      <Pressable onPress={() => handleRemoveRoom(rIdx)} style={styles.removeRoomBtn}>
                        <Trash2 size={scale(14)} color="#A5A29B" />
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.guestRow}>
                    <View style={styles.guestControlBox}>
                      <Text style={styles.guestSubLabel}>Adults (12+)</Text>
                      <View style={styles.stepper}>
                        <AnimatedPressable
                          style={styles.stepperBtn}
                          activeScale={0.8}
                          onPress={() => handleUpdateAdults(rIdx, -1)}
                        >
                          <Minus size={scale(14)} color="#C0272D" />
                        </AnimatedPressable>
                        <Text style={styles.stepperValue}>{room.NoOfAdults}</Text>
                        <AnimatedPressable
                          style={styles.stepperBtn}
                          activeScale={0.8}
                          onPress={() => handleUpdateAdults(rIdx, 1)}
                        >
                          <Plus size={scale(14)} color="#C0272D" />
                        </AnimatedPressable>
                      </View>
                    </View>

                    <View style={styles.guestControlBox}>
                      <Text style={styles.guestSubLabel}>Children (0-11)</Text>
                      <View style={styles.stepper}>
                        <AnimatedPressable
                          style={styles.stepperBtn}
                          activeScale={0.8}
                          onPress={() => handleUpdateChildren(rIdx, -1)}
                        >
                          <Minus size={scale(14)} color="#C0272D" />
                        </AnimatedPressable>
                        <Text style={styles.stepperValue}>{room.NoOfChild}</Text>
                        <AnimatedPressable
                          style={styles.stepperBtn}
                          activeScale={0.8}
                          onPress={() => handleUpdateChildren(rIdx, 1)}
                        >
                          <Plus size={scale(14)} color="#C0272D" />
                        </AnimatedPressable>
                      </View>
                    </View>
                  </View>

                  {childCount > 0 && (
                    <View style={styles.childAgesContainer}>
                      <Text style={styles.guestSubLabel}>Child Ages (Years)</Text>
                      <View style={styles.childAgesRow}>
                        {(room.ChildAge || []).map((age, cIdx) => (
                          <View key={`child-${rIdx}-${cIdx}`} style={styles.childAgeInputBox}>
                            <Text style={styles.childAgeTag}>Child {cIdx + 1}</Text>
                            <TextInput
                              style={styles.childAgeInput}
                              keyboardType="number-pad"
                              maxLength={2}
                              value={String(age)}
                              onChangeText={(val) => handleUpdateChildAge(rIdx, cIdx, val)}
                            />
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <AnimatedPressable onPress={handleSearch} disabled={loading} wrapperStyle={styles.searchButtonWrapper} activeScale={0.97}>
              <LinearGradient
                colors={["#CB2E33", "#B0242A"]}
                style={styles.searchButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={styles.searchButtonContent}>
                    <Search size={scale(16)} color="#ffffff" />
                    <Text style={styles.searchButtonText}>Search hotels</Text>
                    <Animated.View style={{ transform: [{ translateX: ctaArrowTranslateX }] }}>
                      <ArrowRight size={scale(16)} color="#ffffff" />
                    </Animated.View>
                  </View>
                )}
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>

          {/* Trust Badges */}
          <View style={styles.trustBadgesRow}>
            <Animated.View style={[styles.trustBadge, { opacity: badgesOpacity[0], transform: [{ translateY: badgesTranslateY[0] }] }]}>
              <ShieldCheck size={scale(20)} color="#C0272D" />
              <Text style={styles.trustBadgeText}>Safe and secure</Text>
            </Animated.View>
            <Animated.View style={[styles.trustBadge, { opacity: badgesOpacity[1], transform: [{ translateY: badgesTranslateY[1] }] }]}>
              <Ticket size={scale(20)} color="#C0272D" />
              <Text style={styles.trustBadgeText}>Easy cancellation</Text>
            </Animated.View>
            <Animated.View style={[styles.trustBadge, { opacity: badgesOpacity[2], transform: [{ translateY: badgesTranslateY[2] }] }]}>
              <Clock size={scale(20)} color="#C0272D" />
              <Text style={styles.trustBadgeText}>Real-time rates</Text>
            </Animated.View>
          </View>
        </View>
      </ScrollView>

      {showCheckInPicker && (
        <DateTimePicker
          value={checkInDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowCheckInPicker(false);
            if (selectedDate) {
              setCheckInDate(selectedDate);
              if (checkOutDate <= selectedDate) {
                setCheckOutDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
              }
            }
          }}
        />
      )}

      {showCheckOutPicker && (
        <DateTimePicker
          value={checkOutDate}
          mode="date"
          minimumDate={new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000)}
          onChange={(event, selectedDate) => {
            setShowCheckOutPicker(false);
            if (selectedDate) setCheckOutDate(selectedDate);
          }}
        />
      )}
    </View>
  );
};

export default HotelsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F3F1",
  },
  scrollContent: {
    paddingBottom: scale(32),
  },
  headerBannerContainer: {
    overflow: "hidden",
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
  },
  headerGradient: {
    paddingHorizontal: scale(18),
    paddingTop: scale(18),
    paddingBottom: scale(22) + scale(58), // Accommodate the overlap margin
  },
  safeArea: {
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(16),
  },
  logoTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  logoBox: {
    width: scale(38),
    height: scale(38),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(11),
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    color: "#FFFFFF",
    fontSize: scale(17),
    fontWeight: "500",
  },
  appSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: scale(11.5),
    marginTop: scale(2),
  },
  headerActions: {
    flexDirection: "row",
    gap: scale(8),
    alignItems: "center",
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    gap: scale(4),
  },
  helpText: {
    color: "#FFFFFF",
    fontSize: scale(12),
    fontWeight: "500",
  },
  notificationButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationDot: {
    position: "absolute",
    top: scale(6),
    right: scale(6),
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#FFC107",
    borderWidth: 1,
    borderColor: "#C42B31",
  },
  skylineContainer: {
    marginTop: scale(4),
  },
  cardContainer: {
    marginHorizontal: scale(16),
    marginTop: -scale(58), // Floating overlap
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    paddingTop: scale(24),
    paddingHorizontal: scale(20),
    paddingBottom: scale(22),
    shadowColor: "rgba(30,20,20,0.08)",
    shadowOffset: { width: 0, height: scale(16) },
    shadowOpacity: 1,
    shadowRadius: scale(36),
    elevation: 12,
  },
  label: {
    fontSize: scale(12),
    fontWeight: "600",
    color: "#A5A29B",
    letterSpacing: 0.6,
    marginBottom: scale(6),
    textTransform: "uppercase",
  },
  inputContainer: {
    height: scale(48),
    backgroundColor: "#FBF7F6",
    borderWidth: 1,
    borderColor: "#F0E4E2",
    borderRadius: scale(12),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(14),
  },
  inputContainerActive: {
    borderColor: "#C0272D",
  },
  inputIconChip: {
    width: scale(26),
    height: scale(26),
    backgroundColor: "#FAECE7",
    borderRadius: scale(8),
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginLeft: scale(10),
    fontSize: scale(15),
    color: "#231F1F",
    fontWeight: "500",
  },
  clearButton: {
    padding: scale(4),
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: "#EDEAE6",
    marginTop: scale(4),
    marginBottom: scale(8),
    maxHeight: scale(200),
    shadowColor: "rgba(30,20,20,0.06)",
    shadowOpacity: 1,
    shadowRadius: scale(8),
    shadowOffset: { width: 0, height: scale(2) },
    elevation: 4,
    zIndex: 10,
  },
  dropdownStatus: {
    padding: scale(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  dropdownStatusText: {
    fontSize: scale(13),
    color: "#6B675F",
    fontWeight: "500",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F7F6F4",
    gap: scale(12),
  },
  dropdownItemTextContainer: {
    flex: 1,
  },
  dropdownText: {
    fontSize: scale(14),
    fontWeight: "500",
    color: "#231F1F",
  },
  dropdownSubtext: {
    fontSize: scale(11),
    color: "#A5A29B",
    marginTop: scale(2),
  },
  hintsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginTop: scale(10),
    marginBottom: scale(16),
  },
  hintChip: {
    paddingHorizontal: scale(13),
    paddingVertical: scale(7),
    backgroundColor: "#F7F6F4",
    borderWidth: 1,
    borderColor: "#EDEAE6",
    borderRadius: scale(16),
  },
  hintChipActive: {
    backgroundColor: "#FDF0EE",
    borderColor: "#F6D9D3",
  },
  hintChipText: {
    color: "#6B675F",
    fontWeight: "500",
    fontSize: scale(12.5),
  },
  hintChipTextActive: {
    color: "#A3341C",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(10),
    marginBottom: scale(16),
  },
  dateRowStacked: {
    flexDirection: "column",
    gap: scale(12),
  },
  dateBox: {
    flex: 1,
  },
  dateInput: {
    height: scale(48),
    borderWidth: 1,
    borderColor: "#EDEAE6",
    borderRadius: scale(12),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(12),
    backgroundColor: "#FFFFFF",
  },
  dateText: {
    marginLeft: scale(8),
    fontSize: scale(13.5),
    color: "#231F1F",
    fontWeight: "500",
  },
  roomsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(10),
  },
  roomsTitle: {
    fontSize: scale(13.5),
    fontWeight: "500",
    color: "#231F1F",
  },
  roomsTitleCount: {
    color: "#A5A29B",
  },
  addRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  addRoomText: {
    color: "#C0272D",
    fontWeight: "500",
    fontSize: scale(12.5),
  },
  roomCard: {
    backgroundColor: "#FBFAF9",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#EDEAE6",
    padding: scale(14),
    marginBottom: scale(12),
  },
  roomTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(12),
  },
  roomTitle: {
    fontSize: scale(12.5),
    fontWeight: "500",
    color: "#231F1F",
  },
  removeRoomBtn: {
    padding: scale(4),
  },
  guestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(10),
  },
  guestControlBox: {
    flex: 1,
  },
  guestSubLabel: {
    fontSize: scale(11),
    fontWeight: "500",
    color: "#A5A29B",
    marginBottom: scale(6),
  },
  stepper: {
    height: scale(44),
    borderWidth: 1,
    borderColor: "#EDEAE6",
    borderRadius: scale(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(6),
    backgroundColor: "#FFFFFF",
  },
  stepperBtn: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(7),
    backgroundColor: "#FDF0EE",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: scale(14),
    fontWeight: "500",
    color: "#231F1F",
  },
  childAgesContainer: {
    marginTop: scale(12),
  },
  childAgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  childAgeInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDEAE6",
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    gap: scale(6),
    height: scale(44),
  },
  childAgeTag: {
    fontSize: scale(12),
    color: "#6B675F",
    fontWeight: "500",
  },
  childAgeInput: {
    width: scale(32),
    height: scale(32),
    textAlign: "center",
    fontWeight: "500",
    fontSize: scale(14),
    color: "#231F1F",
  },
  errorText: {
    color: "#C0272D",
    fontWeight: "500",
    marginVertical: scale(8),
    fontSize: scale(12),
  },
  searchButtonWrapper: {
    marginTop: scale(4),
    shadowColor: "rgba(176,36,42,0.28)",
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 1,
    shadowRadius: scale(16),
    elevation: 4,
  },
  searchButtonGradient: {
    borderRadius: scale(14),
    paddingVertical: scale(15),
  },
  searchButtonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(8),
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: scale(16),
    fontWeight: "600",
  },
  trustBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginTop: scale(16),
  },
  trustBadge: {
    flex: 1,
    minWidth: scale(90),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDEAE6",
    borderRadius: scale(14),
    paddingVertical: scale(12),
    paddingHorizontal: scale(10),
    alignItems: "center",
    gap: scale(6),
  },
  trustBadgeText: {
    fontSize: scale(10.5),
    fontWeight: "500",
    color: "#231F1F",
    textAlign: "center",
  },
});
