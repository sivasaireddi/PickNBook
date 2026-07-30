import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Modal,
  ScrollView,
  Platform,
  PanResponder,
  ActivityIndicator,
  Animated,
  Share,
  TouchableOpacity,
  KeyboardAvoidingView,
  TextInput,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { cityCode, formatCurrency, toDateInputValue, getIstHour, formatTime, getDurationText, formatShortDate, flightSupportsClass, getFlightActiveDetails, getAirlineLogo } from "./utils/flightUtils";
import { writeFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { searchFlights, getFlightFareQuote } from "./services/flightBookingService";

const PRIMARY_RED = "#E53935";
const BACKGROUND_COLOR = "#F8F9FB";
const WHITE = "#FFFFFF";
const BORDER_COLOR = "#E5E7EB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

const TRAVEL_CLASSES = ["Economy", "Premium Economy", "Business", "Premium Business", "First Class"];

// Time slots categorization helpers
function getHourFromTime(timeStr) {
  if (!timeStr) return 12;
  try {
    if (timeStr.includes("T")) {
      const parts = timeStr.split("T")[1];
      if (parts) {
        const hour = parseInt(parts.slice(0, 2), 10);
        if (!isNaN(hour)) return hour;
      }
    }
    if (timeStr.includes(":")) {
      const hour = parseInt(timeStr.split(":")[0], 10);
      if (!isNaN(hour)) return hour;
    }
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d.getHours();
    return 12;
  } catch (e) {
    return 12;
  }
}

function getTimeSlot(timeStr) {
  const hour = getHourFromTime(timeStr);
  if (hour >= 0 && hour < 6) return "Early Morning";
  if (hour >= 6 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 18) return "Afternoon";
  return "Evening";
}

// Custom Dual Thumb Range Slider
function PriceRangeSlider({ min, max, value, onChange }) {
  const [width, setWidth] = useState(280);
  const minValue = value[0] ?? min;
  const maxValue = value[1] ?? max;

  const minPercent = max === min ? 0 : (minValue - min) / (max - min);
  const maxPercent = max === min ? 1 : (maxValue - min) / (max - min);

  const activeThumbRef = useRef(null);

  const handleTouch = (x) => {
    if (width <= 0) return;
    const pct = Math.max(0, Math.min(1, x / width));
    const val = Math.round(min + pct * (max - min));
    
    if (activeThumbRef.current === "min") {
      const nextMin = Math.min(val, maxValue);
      onChange([nextMin, maxValue]);
    } else if (activeThumbRef.current === "max") {
      const nextMax = Math.max(val, minValue);
      onChange([minValue, nextMax]);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const pct = Math.max(0, Math.min(1, x / width));
        const val = min + pct * (max - min);
        
        const distMin = Math.abs(val - minValue);
        const distMax = Math.abs(val - maxValue);
        
        if (distMin < distMax) {
          activeThumbRef.current = "min";
          onChange([Math.min(Math.round(val), maxValue), maxValue]);
        } else {
          activeThumbRef.current = "max";
          onChange([minValue, Math.max(Math.round(val), minValue)]);
        }
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        handleTouch(x);
      },
      onPanResponderRelease: () => {
        activeThumbRef.current = null;
      },
    })
  ).current;

  return (
    <View style={styles.sliderWrapper}>
      <View 
        style={styles.trackContainer} 
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBackground} pointerEvents="none" />
        <View 
          style={[
            styles.trackHighlight, 
            { 
              left: `${minPercent * 100}%`, 
              width: `${(maxPercent - minPercent) * 100}%` 
            }
          ]} 
          pointerEvents="none" 
        />
        <View 
          style={[
            styles.thumb, 
            { left: `${minPercent * 100}%`, marginLeft: -12 }
          ]} 
          pointerEvents="none" 
        />
        <View 
          style={[
            styles.thumb, 
            { left: `${maxPercent * 100}%`, marginLeft: -12 }
          ]} 
          pointerEvents="none" 
        />
      </View>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.sliderLabelText}>{formatCurrency(minValue)}</Text>
        <Text style={styles.sliderLabelText}>{formatCurrency(maxValue)}</Text>
      </View>
    </View>
  );
}

// Reusable custom items
function CheckboxRow({ label, checked, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.checkboxRow} onPress={onPress}>
      <Text style={styles.checkboxLabel}>{label}</Text>
      <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
}

function RadioRow({ label, selected, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.radioRow} onPress={onPress}>
      <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
      <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
        {selected && <View style={styles.radioInnerCircle} />}
      </View>
    </TouchableOpacity>
  );
}

// Skeleton card
function LoadingSkeleton() {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <View style={styles.skeletonContainer}>
      <Text style={styles.skeletonStatusText}>Searching for the best flights...</Text>
      {[1, 2, 3].map((key) => (
        <Animated.View key={key} style={[styles.skeletonCard, { opacity: fadeAnim }]}>
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonCircle} />
            <View style={styles.skeletonTextLineLong} />
            <View style={styles.skeletonPriceBox} />
          </View>
          <View style={styles.skeletonRouteRow}>
            <View style={styles.skeletonRouteCol} />
            <View style={styles.skeletonRouteMid} />
            <View style={styles.skeletonRouteCol} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

// Flight card subcomponents
function FareOptionCard({ option, isSelected, onSelect }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onSelect} style={[styles.fareCard, isSelected && styles.fareCardSelected]}>
      <View style={styles.fareCardTop}>
        <View style={styles.fareLabelWrap}>
          <Text style={styles.fareLabel}>{option.label}</Text>
          {option.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.farePrice}>{formatCurrency(option.price)}</Text>
      </View>
      <View style={styles.fareInclusionsRow}>
        <Text style={styles.inclusionText}>Cabin: {option.cabinBag}</Text>
        <Text style={styles.inclusionText}>Check-in: {option.checkedBag}</Text>
        <Text style={styles.inclusionText}>{option.cancellation}</Text>
      </View>
    </TouchableOpacity>
  );
}

function TravelClassSelector({ classOptions, selectedClass, onSelectClass }) {
  return (
    <View style={styles.classSelectorWrap}>
      <Text style={styles.classSelectorTitle}>Change Travel Class</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classSelectorList}>
        {classOptions.map((option) => {
          const isActive = String(option.travelClass).toLowerCase() === String(selectedClass).toLowerCase();
          return (
            <TouchableOpacity
              key={option.travelClass}
              activeOpacity={0.8}
              onPress={() => onSelectClass(option.travelClass)}
              style={[styles.classChip, isActive && styles.classChipActive]}
            >
              <Text style={[styles.classChipText, isActive && styles.classChipTextActive]}>{option.travelClass}</Text>
              <Text style={[styles.classChipPrice, isActive && styles.classChipPriceActive]}>{formatCurrency(option.priceInr)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function PriceSummary({ breakdown }) {
  if (!breakdown) return null;
  const base = breakdown.supplierBaseFare || breakdown.supplierTotalFare || 5208;
  const tax = breakdown.supplierTaxAmount || 250;
  const markup = breakdown.markupAmount || 0;
  const discount = breakdown.promotionDiscount || 0;
  const fee = breakdown.convenienceFee || 150;
  const final = base + tax + markup + fee - discount;

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Fare Details</Text>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Base Fare</Text><Text style={styles.summaryValue}>{formatCurrency(base)}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Taxes & Fees</Text><Text style={styles.summaryValue}>{formatCurrency(tax)}</Text></View>
      {discount > 0 && (
        <View style={styles.summaryRow}><Text style={[styles.summaryLabel, styles.successText]}>Discount</Text><Text style={[styles.summaryValue, styles.successText]}>-{formatCurrency(discount)}</Text></View>
      )}
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Convenience Fee</Text><Text style={styles.summaryValue}>{formatCurrency(fee)}</Text></View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryRow}><Text style={styles.summaryGrandLabel}>Grand Total</Text><Text style={styles.summaryGrandValue}>{formatCurrency(final)}</Text></View>
    </View>
  );
}

const FlightCard = React.memo(({ flight, initialTravelClass, onSelect, cheapestPrice, isCompared, onCompareToggle, isWishlisted, onWishlistToggle }) => {
  const [activeClass, setActiveClass] = useState(initialTravelClass || flight.selectedTravelClass || "Economy");
  const [expanded, setExpanded] = useState(false);
  const [fareIndex, setFareIndex] = useState(0);

  const classDetails = useMemo(() => {
    if (flight.classOptions && Array.isArray(flight.classOptions)) {
      const match = flight.classOptions.find(o => String(o.travelClass).toLowerCase() === String(activeClass).toLowerCase());
      if (match) return { price: match.priceInr, seats: match.availableSeats, travelClass: match.travelClass };
    }
    return { price: flight.displayFare || 5208, seats: flight.selectedTravelClassAvailableSeats || 10, travelClass: flight.selectedTravelClass || "Economy" };
  }, [flight, activeClass]);

  const fareOptions = useMemo(() => {
    const base = classDetails.price;
    return [
      { label: "Saver Fare", price: base, cabinBag: "7 kg", checkedBag: "15 kg", cancellation: "Charges Apply" },
      { label: "Flexi Plus", price: base + 800, cabinBag: "7 kg", checkedBag: "25 kg", cancellation: "Free Change" }
    ];
  }, [classDetails.price]);

  const currentFare = fareOptions[fareIndex] || fareOptions[0];
  const isCheapest = cheapestPrice != null && classDetails.price === cheapestPrice;

  return (
    <View style={styles.fCard}>
      <View style={styles.badgeContainer}>
        {isCheapest && (
          <View style={[styles.cardBadge, styles.cheapestBadge]}>
            <Ionicons name="sparkles" size={10} color="#059669" />
            <Text style={styles.cheapestBadgeText}>Cheapest</Text>
          </View>
        )}
        {classDetails.seats < 10 && (
          <View style={[styles.cardBadge, styles.limitedBadge]}>
            <Text style={styles.limitedBadgeText}>Only {classDetails.seats} seats left</Text>
          </View>
        )}
      </View>

      <View style={styles.cardHeaderRow}>
        <View style={styles.airlineMeta}>
          <View style={styles.logoIndicator}><Text style={styles.logoIndicatorText}>{String(flight.airline || "").slice(0, 2).toUpperCase()}</Text></View>
          <View>
            <Text style={styles.airlineName}>{flight.airline}</Text>
            <Text style={styles.flightNum}>{flight.flightNumber}</Text>
          </View>
        </View>
        <Text style={styles.mainPrice}>{formatCurrency(currentFare.price)}</Text>
      </View>

      <View style={styles.timelineRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>{flight.departureTimeIst ? String(flight.departureTimeIst).slice(11, 16) : "06:20"}</Text>
          <Text style={styles.airportCode}>{cityCode(flight.fromCity, "DEL")}</Text>
        </View>
        <View style={styles.connectionBlock}>
          <Text style={styles.durationLabel}>Non-stop</Text>
          <View style={styles.timelineVisual}><View style={styles.timelineDot} /><View style={styles.timelineDivider} /><View style={styles.timelineDot} /></View>
          <Text style={styles.durationLabel}>2h 15m</Text>
        </View>
        <View style={[styles.timeBlock, { alignItems: "flex-end" }]}>
          <Text style={styles.timeLabel}>{flight.arrivalTimeIst ? String(flight.arrivalTimeIst).slice(11, 16) : "08:35"}</Text>
          <Text style={styles.airportCode}>{cityCode(flight.toCity, "BOM")}</Text>
        </View>
      </View>

      {flight.classOptions && flight.classOptions.length > 0 && (
        <TravelClassSelector classOptions={flight.classOptions} selectedClass={activeClass} onSelectClass={setActiveClass} />
      )}

      {expanded && (
        <View style={styles.expandedDetails}>
          {flight.promotionName && (
            <View style={styles.promoBanner}>
              <Text style={styles.promoTitle}>Deal: {flight.promotionName}</Text>
              {flight.savings > 0 && <Text style={styles.promoDesc}>Save {formatCurrency(flight.savings)}</Text>}
            </View>
          )}
          <Text style={styles.expansionSubTitle}>Choose Fare Option</Text>
          {fareOptions.map((opt, i) => (
            <FareOptionCard key={i} option={opt} isSelected={fareIndex === i} onSelect={() => setFareIndex(i)} />
          ))}
          <PriceSummary breakdown={flight.pricingBreakdown} />
        </View>
      )}

      <View style={styles.cardFooterRow}>
        <View style={styles.footerLeftActions}>
          <TouchableOpacity onPress={onCompareToggle} style={styles.actionIconBtn}>
            <Ionicons name={isCompared ? "checkbox" : "square-outline"} size={18} color={isCompared ? PRIMARY_RED : TEXT_MUTED} />
            <Text style={[styles.actionBtnLabel, isCompared && { color: PRIMARY_RED }]}>Compare</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Share.share({ message: `Flight ${flight.airline} for ${formatCurrency(currentFare.price)}` })} style={styles.actionIconBtn}>
            <Ionicons name="share-social-outline" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onWishlistToggle} style={styles.actionIconBtn}>
            <Ionicons name={isWishlisted ? "heart" : "heart-outline"} size={18} color={isWishlisted ? PRIMARY_RED : TEXT_MUTED} />
          </TouchableOpacity>
        </View>
        <View style={styles.footerRightActions}>
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.detailsToggleBtn}>
            <Text style={styles.detailsToggleText}>{expanded ? "Hide" : "Details"}</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={PRIMARY_RED} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onSelect({ ...flight, selectedTravelClass: classDetails.travelClass, selectedTravelClassPriceInr: currentFare.price, selectedTravelClassAvailableSeats: classDetails.seats })} style={styles.selectBtn}>
            <Text style={styles.selectBtnText}>Select</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// Master Screen
export default function FlightListingScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const searchParams = route?.params?.searchParams || {};
  const initialFlights = route?.params?.flights || [];

  const [flights, setFlights] = useState(initialFlights);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [comparedIds, setComparedIds] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);

  // Dynamic filter states
  const [filters, setFilters] = useState({
    priceRange: [null, null],
    selectedAirlines: [],
    selectedClass: "",
    selectedPromotions: [],
    selectedDiscounts: [],
    selectedDepartureSlots: [],
    selectedArrivalSlots: [],
    minSeats: null,
    searchQuery: "",
  });

  const [sortBy, setSortBy] = useState("price_asc");
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [isSortVisible, setIsSortVisible] = useState(false);

  // Temporary state for Bottom Sheet Apply/Reset
  const [tempFilters, setTempFilters] = useState(filters);

  // Load bookings list/cancellations trigger
  const handleReload = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await searchFlights({
        ...searchParams,
        from: searchParams.from,
        to: searchParams.to,
      });
      setFlights(response || []);
    } catch (err) {
      setError(err?.message || "Failed to load flights");
    } finally {
      setLoading(false);
    }
  };

  // Enrich flights models
  const enrichedFlights = useMemo(() => {
    return flights.map((f, idx) => {
      let updated = { ...f };
      // Inject pricingBreakdown and supportedTravelClasses if missing
      if (!updated.pricingBreakdown) {
        updated.pricingBreakdown = {
          supplierBaseFare: updated.displayFare || 5208,
          supplierTaxAmount: 250,
          promotionDiscount: idx === 0 ? 1000 : idx === 1 ? 500 : 0,
        };
      }
      if (!updated.supportedTravelClasses || updated.supportedTravelClasses.length === 0) {
        updated.supportedTravelClasses = ["Economy", "Business"];
      }
      if (!updated.classOptions || updated.classOptions.length === 0) {
        updated.classOptions = [
          { travelClass: "Economy", priceInr: updated.displayFare || 5208, availableSeats: updated.selectedTravelClassAvailableSeats || 12 },
          { travelClass: "Business", priceInr: (updated.displayFare || 5208) * 2, availableSeats: 4 }
        ];
      }
      return updated;
    });
  }, [flights]);

  // Compute filter options DYNAMICALLY from API response
  const filterConfig = useMemo(() => {
    if (enrichedFlights.length === 0) {
      return { minPrice: 0, maxPrice: 50000, airlines: [], classes: [], promotions: [], discounts: [] };
    }

    const prices = enrichedFlights.map(o => o.displayFare || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const airlines = Array.from(new Set(enrichedFlights.map(o => o.airline).filter(Boolean)));
    
    const classesSet = new Set();
    enrichedFlights.forEach(f => {
      if (f.supportedTravelClasses) f.supportedTravelClasses.forEach(c => classesSet.add(c));
    });
    const classes = Array.from(classesSet);

    const promotions = Array.from(new Set(enrichedFlights.map(o => o.promotionName).filter(Boolean)));
    
    const discounts = Array.from(new Set(enrichedFlights.map(o => o.pricingBreakdown?.promotionDiscount || 0).filter(d => d > 0)));

    return { minPrice, maxPrice, airlines, classes, promotions, discounts };
  }, [enrichedFlights]);

  // Client filtering calculations
  const filteredFlights = useMemo(() => {
    return enrichedFlights.filter((f) => {
      // 1. Search Query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase().trim();
        const fNum = String(f.flightNumber || "").toLowerCase();
        if (!fNum.includes(query)) return false;
      }

      // 2. Price Range
      const activeMin = filters.priceRange[0] ?? filterConfig.minPrice;
      const activeMax = filters.priceRange[1] ?? filterConfig.maxPrice;
      if (f.displayFare < activeMin || f.displayFare > activeMax) return false;

      // 3. Travel Class support
      if (filters.selectedClass) {
        const supports = f.supportedTravelClasses?.some(c => String(c).toLowerCase() === String(filters.selectedClass).toLowerCase());
        if (!supports) return false;
      }

      // 4. Unique Airlines
      if (filters.selectedAirlines.length > 0) {
        if (!filters.selectedAirlines.includes(f.airline)) return false;
      }

      // 5. Active Promotions
      if (filters.selectedPromotions.length > 0) {
        if (!f.promotionName || !filters.selectedPromotions.includes(f.promotionName)) return false;
      }

      // 6. Active Discounts
      if (filters.selectedDiscounts.length > 0) {
        const dVal = f.pricingBreakdown?.promotionDiscount || 0;
        if (!filters.selectedDiscounts.includes(dVal)) return false;
      }

      // 7. Departure time slots
      if (filters.selectedDepartureSlots.length > 0) {
        const slot = getTimeSlot(f.departureTimeIst);
        if (!filters.selectedDepartureSlots.includes(slot)) return false;
      }

      // 8. Arrival time slots
      if (filters.selectedArrivalSlots.length > 0) {
        const slot = getTimeSlot(f.arrivalTimeIst);
        if (!filters.selectedArrivalSlots.includes(slot)) return false;
      }

      // 9. Seats Availability
      if (filters.minSeats !== null) {
        const seats = f.selectedTravelClassAvailableSeats || 0;
        if (seats < filters.minSeats) return false;
      }

      return true;
    });
  }, [enrichedFlights, filters, filterConfig]);

  // Client sorting calculations
  const sortedFlights = useMemo(() => {
    const items = [...filteredFlights];
    items.sort((a, b) => {
      if (sortBy === "price_asc") return a.displayFare - b.displayFare;
      if (sortBy === "price_desc") return b.displayFare - a.displayFare;
      
      if (sortBy === "dep_asc") {
        return (a.departureTimeIst || "").localeCompare(b.departureTimeIst || "");
      }
      if (sortBy === "dep_desc") {
        return (b.departureTimeIst || "").localeCompare(a.departureTimeIst || "");
      }
      if (sortBy === "duration") {
        const aMs = new Date(a.arrivalTimeIst).getTime() - new Date(a.departureTimeIst).getTime();
        const bMs = new Date(b.arrivalTimeIst).getTime() - new Date(b.departureTimeIst).getTime();
        return aMs - bMs;
      }
      if (sortBy === "discount") {
        const aDisc = a.pricingBreakdown?.promotionDiscount || 0;
        const bDisc = b.pricingBreakdown?.promotionDiscount || 0;
        return bDisc - aDisc;
      }
      if (sortBy === "best_deal") {
        const aDeal = a.savings || 0;
        const bDeal = b.savings || 0;
        return bDeal - aDeal;
      }
      return 0;
    });
    return items;
  }, [filteredFlights, sortBy]);

  const cheapestPrice = useMemo(() => {
    if (filteredFlights.length === 0) return null;
    return Math.min(...filteredFlights.map(o => o.displayFare));
  }, [filteredFlights]);

  // Apply filters in bottom sheet
  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setIsFiltersVisible(false);
  };

  const handleResetFilters = () => {
    const empty = {
      priceRange: [null, null],
      selectedAirlines: [],
      selectedClass: "",
      selectedPromotions: [],
      selectedDiscounts: [],
      selectedDepartureSlots: [],
      selectedArrivalSlots: [],
      minSeats: null,
      searchQuery: "",
    };
    setFilters(empty);
    setTempFilters(empty);
  };

  // Quick chips row
  const quickChips = useMemo(() => {
    const list = [
      { label: "Cheapest", active: sortBy === "price_asc", onPress: () => setSortBy("price_asc") },
      { label: "With Deals", active: filters.selectedPromotions.length > 0, onPress: () => setFilters(prev => ({ ...prev, selectedPromotions: prev.selectedPromotions.length > 0 ? [] : (filterConfig.promotions || []) })) }
    ];
    // Dynamic Class chips
    filterConfig.classes.forEach(cls => {
      list.push({
        label: cls,
        active: filters.selectedClass === cls,
        onPress: () => setFilters(prev => ({ ...prev, selectedClass: prev.selectedClass === cls ? "" : cls }))
      });
    });
    return list;
  }, [sortBy, filters.selectedClass, filters.selectedPromotions, filterConfig]);

  const handleSelectFlight = async (flight) => {
    let fareQuoteRes = null;
    try {
      if (flight?.resultIndex && flight?.traceId) {
        fareQuoteRes = await getFlightFareQuote({
          traceId: flight.traceId,
          srdvType: "MixAPI",
          srdvIndex: flight.srdvIndex || "2",
          resultIndex: flight.resultIndex,
        });
      }
    } catch (e) {
      console.warn("[FlightListingScreen] FareQuote fetch error:", e?.message);
    }

    const activeFare = fareQuoteRes?.Results?.Fare?.OfferedFare || Number(flight.selectedTravelClassPriceInr || flight.fare || 1589);
    const baseFare = fareQuoteRes?.Results?.Fare?.BaseFare || Math.round(activeFare * 0.85);
    const tax = fareQuoteRes?.Results?.Fare?.Tax || Math.round(activeFare * 0.15);

    const payload = {
      flight,
      fareQuote: fareQuoteRes?.Results || null,
      searchContext: {
        ...searchParams,
        travelClass: flight.selectedTravelClass,
      },
      fareSummary: {
        baseFare,
        tax,
        convenienceFee: 150,
        discount: flight.savings || 0,
        totalFare: activeFare + 150 - (flight.savings || 0),
      },
    };
    await writeFlightBookingFlowState(payload);
    navigation.navigate("FlightPassengerDetailsScreen", payload);
  };

  const totalPaxCount = Number(searchParams.adults || 1) + Number(searchParams.children || 0) + Number(searchParams.infants || 0);

  const handleCompareToggle = useCallback((id) => {
    setComparedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleWishlistToggle = useCallback((id) => {
    setWishlistIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const renderFlightCard = useCallback(
    ({ item }) => (
      <FlightCard
        flight={item}
        initialTravelClass={filters.selectedClass || searchParams.travelClass || "Economy"}
        onSelect={handleSelectFlight}
        cheapestPrice={cheapestPrice}
        isCompared={comparedIds.includes(item.id)}
        onCompareToggle={() => handleCompareToggle(item.id)}
        isWishlisted={wishlistIds.includes(item.id)}
        onWishlistToggle={() => handleWishlistToggle(item.id)}
      />
    ),
    [filters.selectedClass, searchParams.travelClass, handleSelectFlight, cheapestPrice, comparedIds, wishlistIds, handleCompareToggle, handleWishlistToggle],
  );

  const flightKeyExtractor = useCallback((item, index) => `${item.id ?? index}-${index}`, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerRouteBlock}>
          <View style={styles.headerCitiesRow}>
            <Text style={styles.cityNameHeader}>{searchParams.from || "Delhi"}</Text>
            <Ionicons name="arrow-forward" size={14} color={PRIMARY_RED} style={{ marginHorizontal: 4 }} />
            <Text style={styles.cityNameHeader}>{searchParams.to || "Mumbai"}</Text>
          </View>
          <Text style={styles.headerMetaSubtitle}>
            {searchParams.date || "15 Jul 2026"} • {totalPaxCount} Pax • {filters.selectedClass || searchParams.travelClass || "Economy"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.modifyBtn}>
          <Text style={styles.modifyBtnText}>Modify</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic quick chips row */}
      <View style={styles.stickyFilterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollView}>
          <TouchableOpacity onPress={() => { setTempFilters(filters); setIsFiltersVisible(true); }} style={styles.filterChip}>
            <Ionicons name="options-outline" size={14} color={TEXT_MUTED} />
            <Text style={styles.filterChipText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSortVisible(true)} style={styles.filterChip}>
            <Text style={styles.filterChipText}>Sort By</Text>
            <Ionicons name="chevron-down" size={12} color={TEXT_MUTED} />
          </TouchableOpacity>
          {quickChips.map((chip, idx) => (
            <TouchableOpacity key={idx} onPress={chip.onPress} style={[styles.filterChip, chip.active && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, chip.active && styles.filterChipTextActive]}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={60} color={PRIMARY_RED} />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <TouchableOpacity onPress={handleReload} style={styles.retryBtn}><Text style={styles.retryBtnText}>Retry</Text></TouchableOpacity>
        </View>
      ) : sortedFlights.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="airplane-outline" size={60} color={TEXT_MUTED} />
          <Text style={styles.emptyTitle}>No Flights Found</Text>
          <TouchableOpacity onPress={handleResetFilters} style={styles.retryBtn}><Text style={styles.retryBtnText}>Clear Filters</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={styles.flex}>
          <FlatList
            data={sortedFlights}
            keyExtractor={flightKeyExtractor}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={handleReload}
            renderItem={renderFlightCard}
            initialNumToRender={5}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
          />
        </View>
      )}

      {/* Compare floating bar */}
      {comparedIds.length > 0 && (
        <View style={styles.compareDrawer}>
          <Text style={styles.compareDrawerText}>Comparing {comparedIds.length} flights</Text>
          <TouchableOpacity onPress={() => setComparedIds([])} style={styles.compareClearBtn}><Text style={styles.compareClearText}>Clear</Text></TouchableOpacity>
        </View>
      )}

      {/* MASTER REDESIGNED FILTER SHEET */}
      <Modal visible={isFiltersVisible} animationType="slide" transparent onRequestClose={() => setIsFiltersVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsFiltersVisible(false)} />
          <SafeAreaView style={styles.modalSheetSafe} edges={["bottom"]}>
            <View style={styles.sheetContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={() => setIsFiltersVisible(false)}><Ionicons name="close" size={24} color={TEXT_DARK} /></TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
                
                {/* 9. Search box flight number */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterBlockTitle}>Search Flight Number</Text>
                  <View style={styles.searchBoxWrap}>
                    <Ionicons name="search" size={16} color={TEXT_MUTED} />
                    <TextInput
                      style={styles.searchInput}
                      value={tempFilters.searchQuery}
                      onChangeText={(val) => setTempFilters(prev => ({ ...prev, searchQuery: val }))}
                      placeholder="e.g. AI-802"
                      placeholderTextColor={TEXT_MUTED}
                    />
                  </View>
                </View>

                {/* 1. Price Range Slider */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterBlockTitle}>Price Range</Text>
                  <PriceRangeSlider
                    min={filterConfig.minPrice}
                    max={filterConfig.maxPrice}
                    value={[tempFilters.priceRange[0] ?? filterConfig.minPrice, tempFilters.priceRange[1] ?? filterConfig.maxPrice]}
                    onChange={(val) => setTempFilters(prev => ({ ...prev, priceRange: val }))}
                  />
                </View>

                {/* 3. Travel Class Selector */}
                {filterConfig.classes.length > 0 && (
                  <View style={styles.filterBlock}>
                    <Text style={styles.filterBlockTitle}>Travel Class</Text>
                    <View style={styles.gridContainer}>
                      {filterConfig.classes.map((cls) => {
                        const isSelected = tempFilters.selectedClass === cls;
                        return (
                          <TouchableOpacity
                            key={cls}
                            onPress={() => setTempFilters(prev => ({ ...prev, selectedClass: isSelected ? "" : cls }))}
                            style={[styles.gridChip, isSelected && styles.gridChipActive]}
                          >
                            <Text style={[styles.gridChipText, isSelected && styles.gridChipTextActive]}>{cls}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* 2. Airlines Filter */}
                {filterConfig.airlines.length > 0 && (
                  <View style={styles.filterBlock}>
                    <Text style={styles.filterBlockTitle}>Airlines</Text>
                    {filterConfig.airlines.map((airline) => {
                      const isChecked = tempFilters.selectedAirlines.includes(airline);
                      return (
                        <CheckboxRow
                          key={airline}
                          label={airline}
                          checked={isChecked}
                          onPress={() => {
                            setTempFilters(prev => ({
                              ...prev,
                              selectedAirlines: isChecked ? prev.selectedAirlines.filter(x => x !== airline) : [...prev.selectedAirlines, airline]
                            }));
                          }}
                        />
                      );
                    })}
                  </View>
                )}

                {/* 6. Departure time slots */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterBlockTitle}>Departure Time</Text>
                  <View style={styles.gridContainer}>
                    {["Early Morning", "Morning", "Afternoon", "Evening"].map((slot) => {
                      const isSelected = tempFilters.selectedDepartureSlots.includes(slot);
                      return (
                        <TouchableOpacity
                          key={slot}
                          onPress={() => {
                            setTempFilters(prev => ({
                              ...prev,
                              selectedDepartureSlots: isSelected ? prev.selectedDepartureSlots.filter(x => x !== slot) : [...prev.selectedDepartureSlots, slot]
                            }));
                          }}
                          style={[styles.gridChip, isSelected && styles.gridChipActive]}
                        >
                          <Text style={[styles.gridChipText, isSelected && styles.gridChipTextActive]}>{slot}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 7. Arrival time slots */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterBlockTitle}>Arrival Time</Text>
                  <View style={styles.gridContainer}>
                    {["Early Morning", "Morning", "Afternoon", "Evening"].map((slot) => {
                      const isSelected = tempFilters.selectedArrivalSlots.includes(slot);
                      return (
                        <TouchableOpacity
                          key={slot}
                          onPress={() => {
                            setTempFilters(prev => ({
                              ...prev,
                              selectedArrivalSlots: isSelected ? prev.selectedArrivalSlots.filter(x => x !== slot) : [...prev.selectedArrivalSlots, slot]
                            }));
                          }}
                          style={[styles.gridChip, isSelected && styles.gridChipActive]}
                        >
                          <Text style={[styles.gridChipText, isSelected && styles.gridChipTextActive]}>{slot}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 8. Seat Availability */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterBlockTitle}>Seat Availability</Text>
                  <View style={styles.gridContainer}>
                    {[5, 10, 20].map((count) => {
                      const isSelected = tempFilters.minSeats === count;
                      return (
                        <TouchableOpacity
                          key={count}
                          onPress={() => setTempFilters(prev => ({ ...prev, minSeats: isSelected ? null : count }))}
                          style={[styles.gridChip, isSelected && styles.gridChipActive]}
                        >
                          <Text style={[styles.gridChipText, isSelected && styles.gridChipTextActive]}>{count}+ Seats</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 4. Promotion Filter */}
                {filterConfig.promotions.length > 0 && (
                  <View style={styles.filterBlock}>
                    <Text style={styles.filterBlockTitle}>Promotions</Text>
                    {filterConfig.promotions.map((promo) => {
                      const isChecked = tempFilters.selectedPromotions.includes(promo);
                      return (
                        <CheckboxRow
                          key={promo}
                          label={promo}
                          checked={isChecked}
                          onPress={() => {
                            setTempFilters(prev => ({
                              ...prev,
                              selectedPromotions: isChecked ? prev.selectedPromotions.filter(x => x !== promo) : [...prev.selectedPromotions, promo]
                            }));
                          }}
                        />
                      );
                    })}
                  </View>
                )}

                {/* 5. Discount Filter */}
                {filterConfig.discounts.length > 0 && (
                  <View style={styles.filterBlock}>
                    <Text style={styles.filterBlockTitle}>Discounts</Text>
                    {filterConfig.discounts.map((disc) => {
                      const isChecked = tempFilters.selectedDiscounts.includes(disc);
                      return (
                        <CheckboxRow
                          key={disc}
                          label={`₹${disc} Off`}
                          checked={isChecked}
                          onPress={() => {
                            setTempFilters(prev => ({
                              ...prev,
                              selectedDiscounts: isChecked ? prev.selectedDiscounts.filter(x => x !== disc) : [...prev.selectedDiscounts, disc]
                            }));
                          }}
                        />
                      );
                    })}
                  </View>
                )}

              </ScrollView>

              {/* 14. Bottom Buttons sticky footer */}
              <View style={styles.sheetFooter}>
                <TouchableOpacity onPress={handleResetFilters} style={styles.footerResetBtn}>
                  <Text style={styles.footerResetText}>Reset All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleApplyFilters} style={styles.footerApplyBtn}>
                  <Text style={styles.footerApplyText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* SORT MODAL */}
      <BottomSheet visible={isSortVisible} onClose={() => setIsSortVisible(false)} title="Sort By">
        <RadioRow label="Lowest Price" selected={sortBy === "price_asc"} onPress={() => { setSortBy("price_asc"); setIsSortVisible(false); }} />
        <RadioRow label="Highest Price" selected={sortBy === "price_desc"} onPress={() => { setSortBy("price_desc"); setIsSortVisible(false); }} />
        <RadioRow label="Earliest Departure" selected={sortBy === "dep_asc"} onPress={() => { setSortBy("dep_asc"); setIsSortVisible(false); }} />
        <RadioRow label="Latest Departure" selected={sortBy === "dep_desc"} onPress={() => { setSortBy("dep_desc"); setIsSortVisible(false); }} />
        <RadioRow label="Shortest Duration" selected={sortBy === "duration"} onPress={() => { setSortBy("duration"); setIsSortVisible(false); }} />
        <RadioRow label="Highest Discount" selected={sortBy === "discount"} onPress={() => { setSortBy("discount"); setIsSortVisible(false); }} />
        <RadioRow label="Best Deal" selected={sortBy === "best_deal"} onPress={() => { setSortBy("best_deal"); setIsSortVisible(false); }} />
      </BottomSheet>
    </SafeAreaView>
  );
}

// Bottom sheet helper component
function BottomSheet({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}><Ionicons name="close" size={24} color={TEXT_DARK} /></Pressable>
          </View>
          <View style={styles.modalBody}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  flex: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
  },
  backButton: {
    padding: 4,
  },
  headerRouteBlock: {
    flex: 1,
    paddingHorizontal: 14,
  },
  headerCitiesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cityNameHeader: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  headerMetaSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginTop: 2,
  },
  modifyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: PRIMARY_RED,
  },
  modifyBtnText: {
    color: PRIMARY_RED,
    fontSize: 11,
    fontWeight: "800",
  },
  stickyFilterBar: {
    backgroundColor: WHITE,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
  },
  filterScrollView: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  filterChipActive: {
    backgroundColor: PRIMARY_RED,
    borderColor: PRIMARY_RED,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "750",
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: WHITE,
  },
  listPadding: {
    padding: 16,
    paddingBottom: 80,
  },
  // Skeleton Loader
  skeletonContainer: {
    padding: 16,
    gap: 14,
  },
  skeletonStatusText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_MUTED,
    textAlign: "center",
  },
  skeletonCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 12,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skeletonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
  },
  skeletonTextLineLong: {
    flex: 1,
    height: 14,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
  },
  skeletonPriceBox: {
    width: 60,
    height: 18,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
  },
  skeletonRouteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonRouteCol: {
    width: "25%",
    height: 28,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
  },
  skeletonRouteMid: {
    width: "35%",
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
  },
  // Empty State
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT_DARK,
    marginTop: 10,
  },
  // Flight Card
  fCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  badgeContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 0,
    right: 16,
    gap: 6,
  },
  cardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cheapestBadge: {
    backgroundColor: "#E6F4EA",
  },
  cheapestBadgeText: {
    color: "#137333",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  limitedBadge: {
    backgroundColor: "#FCE8E6",
  },
  limitedBadgeText: {
    color: "#C5221F",
    fontSize: 9,
    fontWeight: "900",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingTop: 8,
  },
  airlineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  logoIndicatorText: {
    fontSize: 10,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  airlineName: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  flightNum: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  mainPrice: {
    fontSize: 18,
    fontWeight: "950",
    color: PRIMARY_RED,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  airportCode: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  connectionBlock: {
    flex: 1.5,
    alignItems: "center",
  },
  durationLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: "700",
  },
  timelineVisual: {
    flexDirection: "row",
    alignItems: "center",
    width: "70%",
    marginVertical: 4,
  },
  timelineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TEXT_MUTED,
  },
  timelineDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 2,
  },
  classSelectorWrap: {
    marginBottom: 12,
  },
  classSelectorTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  classSelectorList: {
    gap: 8,
  },
  classChip: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: WHITE,
    alignItems: "center",
  },
  classChipActive: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FFF5F5",
  },
  classChipText: {
    fontSize: 11,
    fontWeight: "750",
    color: "#4B5563",
  },
  classChipTextActive: {
    color: PRIMARY_RED,
  },
  classChipPrice: {
    fontSize: 10,
    fontWeight: "650",
    color: TEXT_MUTED,
  },
  classChipPriceActive: {
    color: PRIMARY_RED,
  },
  expandedDetails: {
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    paddingTop: 12,
    marginBottom: 12,
    gap: 10,
  },
  expansionSubTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_DARK,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  promoBanner: {
    backgroundColor: "#E6F4EA",
    borderRadius: 10,
    padding: 10,
  },
  promoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#137333",
  },
  promoDesc: {
    fontSize: 10,
    color: "#137333",
    fontWeight: "600",
  },
  fareCard: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: 10,
  },
  fareCardSelected: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FFF5F5",
  },
  fareCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fareLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fareLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  newBadge: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  newBadgeText: {
    color: WHITE,
    fontSize: 8,
    fontWeight: "900",
  },
  farePrice: {
    fontSize: 13,
    fontWeight: "900",
    color: PRIMARY_RED,
  },
  fareInclusionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  inclusionText: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: "650",
  },
  summaryCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 11,
    color: TEXT_DARK,
    fontWeight: "850",
  },
  successText: {
    color: "#137333",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: 6,
  },
  summaryGrandLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  summaryGrandValue: {
    fontSize: 13,
    fontWeight: "950",
    color: PRIMARY_RED,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    paddingTop: 10,
  },
  footerLeftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  footerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailsToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  detailsToggleText: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY_RED,
  },
  selectBtn: {
    backgroundColor: PRIMARY_RED,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectBtnText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "900",
  },
  // Error States
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT_DARK,
    marginTop: 10,
  },
  retryBtn: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  retryBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "850",
  },
  // Compare drawer
  compareDrawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1F2937",
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compareDrawerText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 13,
  },
  compareClearBtn: {
    borderWidth: 1,
    borderColor: WHITE,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  compareClearText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "750",
  },
  // Bottom Sheet Redesigned UI
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalSheetSafe: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  sheetContainer: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexGrow: 1,
    flexShrink: 1,
  },
  sheetScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  filterBlock: {
    marginTop: 18,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    paddingBottom: 16,
  },
  filterBlockTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  searchBoxWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT_DARK,
    fontSize: 13,
    fontWeight: "700",
    height: "100%",
    padding: 0,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridChip: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  gridChipActive: {
    backgroundColor: PRIMARY_RED,
    borderColor: PRIMARY_RED,
  },
  gridChipText: {
    fontSize: 12,
    fontWeight: "750",
    color: "#4B5563",
  },
  gridChipTextActive: {
    color: WHITE,
  },
  sheetFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: WHITE,
  },
  footerResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PRIMARY_RED,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  footerResetText: {
    fontSize: 13,
    color: PRIMARY_RED,
    fontWeight: "900",
  },
  footerApplyBtn: {
    flex: 2,
    backgroundColor: PRIMARY_RED,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  footerApplyText: {
    fontSize: 13,
    color: WHITE,
    fontWeight: "900",
  },
  // Slider layout
  sliderWrapper: {
    marginVertical: 8,
  },
  trackContainer: {
    height: 30,
    justifyContent: "center",
    position: "relative",
  },
  trackBackground: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  },
  trackHighlight: {
    height: 4,
    backgroundColor: PRIMARY_RED,
    position: "absolute",
    borderRadius: 2,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: WHITE,
    borderWidth: 2.5,
    borderColor: PRIMARY_RED,
    position: "absolute",
    top: "50%",
    marginTop: -11,
  },
  sliderLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  // Items styling
  checkboxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  checkboxLabel: {
    fontSize: 13,
    color: TEXT_DARK,
    fontWeight: "750",
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxChecked: {
    borderColor: PRIMARY_RED,
    backgroundColor: PRIMARY_RED,
  },
  radioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  radioLabel: {
    fontSize: 14,
    color: TEXT_DARK,
    fontWeight: "750",
  },
  radioLabelSelected: {
    color: PRIMARY_RED,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: PRIMARY_RED,
  },
  radioInnerCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_RED,
  },
  // Modal standard content
  modalContent: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    paddingBottom: 8,
  },
});
