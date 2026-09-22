import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBannerHeight } from "../../../utils/responsive";
import {
  Building2,
  CalendarDays,
  Search,
  ArrowRight,
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
import * as SecureStore from "expo-secure-store";
import { searchHotelOffers, resolveCityId, searchCities } from "../../../services/hotelService";
import { useHotelBooking } from "../../../context/HotelBookingContext";
import { scale } from "../../../utils/responsive";

const LAST_HOTEL_SEARCH_KEY = "LAST_HOTEL_SEARCH";

const CITY_HINTS = [
  { label: "New Delhi", value: "725862" },
  { label: "Mumbai", value: "130443" },
  { label: "Hyderabad", value: "118488" },
  { label: "Bengaluru", value: "111124" },
];

const formatDisplayDate = (date) => {
  if (!date) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatApiDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
  const { width, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [destinationInput, setDestinationInput] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const suggestionTimer = useRef(null);

  // Animation values
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
  
  const ctaArrowTranslateX = useRef(new Animated.Value(0)).current;
  const destinationIconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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

  useEffect(() => {
    const restoreLastSearch = async () => {
      try {
        const raw = await SecureStore.getItemAsync(LAST_HOTEL_SEARCH_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved?.destinationInput && saved?.selectedCityId) {
          setDestinationInput(saved.destinationInput);
          setSelectedCityId(saved.selectedCityId);
        }
        if (saved?.checkInDate && saved?.checkOutDate) {
          const savedIn = new Date(saved.checkInDate);
          const savedOut = new Date(saved.checkOutDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (!isNaN(savedIn.getTime()) && !isNaN(savedOut.getTime()) && savedIn >= today) {
            setCheckInDate(savedIn);
            setCheckOutDate(savedOut);
          }
        }
        if (Array.isArray(saved?.roomGuests) && saved.roomGuests.length > 0) {
          setRoomGuests(saved.roomGuests);
        }
      } catch (e) {
        console.log("[HotelsScreen] Error restoring last search:", e?.message);
      }
    };
    restoreLastSearch();
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

  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);

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

    if (!destinationInput.trim() || !selectedCityId) {
      setError("Please select a destination city.");
      return;
    }

    if (!checkInDate) {
      setError("Please select a check-in date.");
      return;
    }

    if (!checkOutDate) {
      setError("Please select a check-out date.");
      return;
    }

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
      console.log("[HotelsScreen] searchHotelOffers result:", JSON.stringify(searchResult, null, 2));

      const hotels = searchResult?.hotels || [];
      console.log("[HotelsScreen] hotels received:", hotels.length);
      const sessionData = {
        traceId: searchResult?.traceId || "",
        srdvType: searchResult?.srdvType || "MixAPI",
        srdvIndex: searchResult?.srdvIndex || "15",
      };

      // Save to context
      setSearchSession(searchParams, sessionData);

      // Save search params to SecureStore for future search restoration
      try {
        await SecureStore.setItemAsync(
          LAST_HOTEL_SEARCH_KEY,
          JSON.stringify({
            destinationInput,
            selectedCityId,
            checkInDate: checkInDate.toISOString(),
            checkOutDate: checkOutDate.toISOString(),
            roomGuests,
          })
        );
      } catch (saveErr) {
        console.log("[HotelsScreen] Error saving last search:", saveErr?.message);
      }

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
          <ImageBackground
            source={require("../../../../assets/HotelBanner1.jsx.jpg")}
            style={[styles.headerBackground, { height: getBannerHeight(screenHeight) }]}
            imageStyle={styles.headerBackgroundImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["rgba(15,23,42,0.18)", "rgba(15,23,42,0.42)"]}
              style={styles.headerGradient}
            >
              <View style={[styles.headerRow, { paddingTop: Math.max(scale(12), insets.top + scale(8)) }]}>
                  <AnimatedPressable
                    style={styles.backButton}
                    activeScale={0.9}
                    onPress={() => {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      } else {
                        navigation.navigate("DashBoard");
                      }
                    }}
                  >
                    <Ionicons name="chevron-back" size={22} color="#1F2937" />
                  </AnimatedPressable>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Search Card */}
        <View style={styles.cardContainer}>
          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }, { scale: cardScale }] }]}>
            <Text style={styles.label}>DESTINATION CITY</Text>
            <View style={[styles.inputContainer, showSuggestions && styles.inputContainerActive]}>
              <Animated.View style={[styles.inputIconChip, { transform: [{ scale: destinationIconScale }] }]}>
                <Building2 size={scale(16)} color="#C0272D" />
              </Animated.View>
              <TextInput
                placeholder="Select destination"
                placeholderTextColor="#6B7280"
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
                <AnimatedPressable
                  onPress={() => { setDestinationInput(""); setSelectedCityId(""); setCitySuggestions([]); setShowSuggestions(false); }}
                  style={styles.clearButton}
                  activeScale={0.82}
                >
                  <X size={scale(22)} color="#6B7280" strokeWidth={2.75} />
                </AnimatedPressable>
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
                  <ScrollView
                    style={styles.dropdownScroll}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {citySuggestions.map((item, index) => (
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
                    ))}
                  </ScrollView>
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
                  <CalendarDays size={scale(18)} color="#C0272D" />
                  <Text style={[styles.dateText, !checkInDate && styles.datePlaceholderText]}>
                    {checkInDate ? formatDisplayDate(checkInDate) : "Select Check-in"}
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
                  <CalendarDays size={scale(18)} color="#C0272D" />
                  <Text style={[styles.dateText, !checkOutDate && styles.datePlaceholderText]}>
                    {checkOutDate ? formatDisplayDate(checkOutDate) : "Select Check-out"}
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
                        <Trash2 size={scale(16)} color="#6B7280" strokeWidth={2.25} />
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
                          <Minus size={scale(16)} color="#C0272D" strokeWidth={2.5} />
                        </AnimatedPressable>
                        <Text style={styles.stepperValue}>{room.NoOfAdults}</Text>
                        <AnimatedPressable
                          style={styles.stepperBtn}
                          activeScale={0.8}
                          onPress={() => handleUpdateAdults(rIdx, 1)}
                        >
                          <Plus size={scale(16)} color="#C0272D" strokeWidth={2.5} />
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
                          <Minus size={scale(16)} color="#C0272D" strokeWidth={2.5} />
                        </AnimatedPressable>
                        <Text style={styles.stepperValue}>{room.NoOfChild}</Text>
                        <AnimatedPressable
                          style={styles.stepperBtn}
                          activeScale={0.8}
                          onPress={() => handleUpdateChildren(rIdx, 1)}
                        >
                          <Plus size={scale(16)} color="#C0272D" strokeWidth={2.5} />
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
          value={checkInDate || new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowCheckInPicker(false);
            if (selectedDate) {
              setCheckInDate(selectedDate);
              if (!checkOutDate || checkOutDate <= selectedDate) {
                setCheckOutDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
              }
            }
          }}
        />
      )}

      {showCheckOutPicker && (
        <DateTimePicker
          value={checkOutDate || (checkInDate ? new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000))}
          mode="date"
          minimumDate={checkInDate ? new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000) : new Date()}
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
  headerBackground: {
    width: "100%",
  },
  headerBackgroundImage: {
    resizeMode: "cover",
  },
  headerGradient: {
    flex: 1,
    paddingBottom: scale(24),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContainer: {
    marginHorizontal: scale(16),
    marginTop: -scale(24),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    paddingTop: scale(12),
    paddingBottom: scale(12),
    shadowColor: "rgba(0, 0, 0, 0.04)",
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 1,
    shadowRadius: scale(16),
    elevation: 2,
  },
  label: {
    fontSize: scale(11),
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.8,
    marginBottom: scale(6),
    textTransform: "uppercase",
  },
  inputContainer: {
    minHeight: scale(52),
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D9DEE7",
    borderRadius: scale(16),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(14),
    marginBottom: scale(12),
  },
  inputContainerActive: {
    borderColor: "#C0272D",
    backgroundColor: "#FFFFFF",
  },
  inputIconChip: {
    width: scale(32),
    height: scale(32),
    backgroundColor: "#FEE2E2",
    borderRadius: scale(10),
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    marginLeft: scale(10),
    fontSize: scale(16),
    color: "#1F2937",
    fontWeight: "600",
  },
  clearButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: "center",
    alignItems: "center",
    marginRight: -scale(6),
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: -scale(10),
    marginBottom: scale(16),
    maxHeight: scale(230),
    overflow: "hidden",
    shadowColor: "rgba(0, 0, 0, 0.08)",
    shadowOpacity: 1,
    shadowRadius: scale(12),
    shadowOffset: { width: 0, height: scale(4) },
    elevation: 4,
    zIndex: 10,
  },
  dropdownScroll: {
    maxHeight: scale(230),
    backgroundColor: "#FFFFFF",
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
    color: "#6B7280",
    fontWeight: "500",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: scale(12),
  },
  dropdownItemTextContainer: {
    flex: 1,
  },
  dropdownText: {
    fontSize: scale(15),
    fontWeight: "600",
    color: "#1F2937",
  },
  dropdownSubtext: {
    fontSize: scale(12),
    color: "#6B7280",
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
    gap: scale(12),
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
    minHeight: scale(52),
    borderWidth: 1,
    borderColor: "#D9DEE7",
    borderRadius: scale(16),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(14),
    backgroundColor: "#F9FAFB",
  },
  dateText: {
    flexShrink: 1,
    marginLeft: scale(10),
    fontSize: scale(15),
    color: "#1F2937",
    fontWeight: "600",
  },
  datePlaceholderText: {
    color: "#9CA3AF",
    fontWeight: "500",
  },
  roomsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(10),
  },
  roomsTitle: {
    flexShrink: 1,
    fontSize: scale(17),
    fontWeight: "700",
    color: "#1F2937",
  },
  roomsTitleCount: {
    color: "#6B7280",
    fontWeight: "500",
  },
  addRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    flexShrink: 0,
    paddingVertical: scale(8),
    paddingHorizontal: scale(10),
    backgroundColor: "#FEE2E2",
    borderRadius: scale(12),
  },
  addRoomText: {
    color: "#C0272D",
    fontWeight: "600",
    fontSize: scale(13),
  },
  roomCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: scale(14),
    marginBottom: scale(12),
  },
  roomTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(10),
  },
  roomTitle: {
    fontSize: scale(14),
    fontWeight: "600",
    color: "#1F2937",
  },
  removeRoomBtn: {
    padding: scale(4),
  },
  guestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(12),
  },
  guestControlBox: {
    flex: 1,
  },
  guestSubLabel: {
    fontSize: scale(13),
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: scale(6),
  },
  stepper: {
    height: scale(44),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: scale(12),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(8),
    backgroundColor: "#FFFFFF",
  },
  stepperBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: scale(17),
    fontWeight: "600",
    color: "#1F2937",
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
    borderColor: "#E5E7EB",
    borderRadius: scale(12),
    paddingHorizontal: scale(10),
    gap: scale(6),
    height: scale(44),
  },
  childAgeTag: {
    fontSize: scale(12),
    color: "#6B7280",
    fontWeight: "500",
  },
  childAgeInput: {
    width: scale(32),
    height: scale(32),
    textAlign: "center",
    fontWeight: "600",
    fontSize: scale(15),
    color: "#1F2937",
  },
  errorText: {
    color: "#C0272D",
    fontWeight: "500",
    marginVertical: scale(8),
    fontSize: scale(13),
  },
  searchButtonWrapper: {
    marginTop: scale(2),
    shadowColor: "rgba(192, 39, 45, 0.25)",
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 1,
    shadowRadius: scale(12),
    elevation: 4,
  },
  searchButtonGradient: {
    borderRadius: scale(22),
    height: scale(44),
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(6),
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: scale(15),
    fontWeight: "700",
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
