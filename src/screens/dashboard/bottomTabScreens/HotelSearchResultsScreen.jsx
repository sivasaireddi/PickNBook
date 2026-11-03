import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView from "react-native-maps";
import BottomSheet, { BottomSheetFlatList, useBottomSheetSpringConfigs } from "@gorhom/bottom-sheet";
import { useHotelBooking } from "../../../context/HotelBookingContext";
import { theme } from "../../../theme/tokens";
import HotelFilterModal, { createDefaultHotelFilters } from "./HotelFilterModal";
import {
  getHotelPrice,
  getHotelPropertyType,
  getHotelMealPlans,
  getHotelRoomCategories,
  getHotelLocation,
  normalizePropertyType,
  normalizeMealPlan,
  normalizeRoomCategory,
  filterHotels,
  sortHotels,
} from "../../../utils/hotelFilters";

const getHotelDisplayPrice = (hotel) => getHotelPrice(hotel);
const HOTEL_COLORS = {
  red: theme.colors.redDeep,
  redBright: theme.colors.red,
  ink: "#1A1216",
  muted: "#6B6168",
  border: "#EBD5D7",
  blush: "#FBF6F6",
  white: theme.colors.card,
};

const getHotelId = (hotel) => {
  const providerIds = [hotel?.hotelCode, hotel?.hotelId, hotel?.resultIndex]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(String);
  if (providerIds.length > 0) return providerIds.join("|");
  return `${hotel?.hotelName || hotel?.name || "Hotel"}|${hotel?.hotelAddress || hotel?.address || ""}|${hotel?.latitude || ""}|${hotel?.longitude || ""}`.trim();
};

const getHotelName = (hotel) => hotel?.hotelName || hotel?.name || "Hotel";

const formatCompactMapPrice = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "View";
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
};

const parseApiDate = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatShortDate = (value) => {
  const date = parseApiDate(value);
  return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : "";
};

const formatCurrency = (value, currency = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const getMapRegion = (hotels) => {
  const points = (Array.isArray(hotels) ? hotels : []).filter(
    (item) =>
      Number.isFinite(Number(item?.latitude)) &&
      Number.isFinite(Number(item?.longitude))
  );

  if (points.length === 0) {
    return {
      latitude: 28.6139,
      longitude: 77.209,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  }

  const lats = points.map((item) => Number(item.latitude));
  const lons = points.map((item) => Number(item.longitude));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.04, (maxLat - minLat) * 1.6 || 0.08),
    longitudeDelta: Math.max(0.04, (maxLon - minLon) * 1.6 || 0.08),
  };
};

const HotelCard = React.memo(({ item, isSelected, onSelect }) => {
  const imageUri = item?.hotelPicture || (Array.isArray(item?.images) && item.images[0]) || null;
  const name = item?.hotelName || item?.name || "Hotel";
  const category = item?.hotelCategory || "Hotel";
  const rating = Number(item?.starRating ?? item?.rating);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const address = item?.hotelAddress || item?.address || "Address not available";
  const city = item?.city || item?.cityName || "";
  const country = item?.country || item?.countryName || "";
  const location = [city, country].filter(Boolean).join(", ");

  const roomCategory = item?.rooms?.[0]?.category ?? item?.rooms?.[0]?.cateogry ?? "";

  const priceObj = item?.price || {};
  const currency = priceObj.currencyCode || "INR";
  const offeredPrice = getHotelDisplayPrice(item);
  const hasPrice = Number.isFinite(Number(offeredPrice)) && Number(offeredPrice) > 0;

  return (
    <Pressable
      onPress={() => onSelect(
        item,
        name,
        imageUri,
        address,
        item?.hotelCategory || "Premium Stay",
        Number(item?.starRating ?? item?.rating) || 4.0,
        offeredPrice,
        priceObj
      )}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardImageWrap}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" /> : <View style={styles.noImageCardBox}><Ionicons name="image-outline" size={28} color="#AFA3A8" /><Text style={styles.noImageText}>No image</Text></View>}
        {isSelected && <View style={styles.onMapBadge}><Ionicons name="location-sharp" size={11} color="#FFFFFF" /><Text style={styles.onMapText}>ON MAP</Text></View>}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardName} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.cardCategory}>
              {category}{location ? ` · ${location}` : ""}
            </Text>
            <Text style={styles.cardAddress} numberOfLines={1}>
              {address}
            </Text>
          </View>

          {hasRating && <View style={styles.cardRating}>
            <Ionicons name="star" size={10} color="#FFB300" />
            <Text style={styles.cardRatingText}>{rating.toFixed(1)}</Text>
          </View>}
        </View>

        {!!roomCategory && <View style={styles.roomRow}><Ionicons name="bed-outline" size={12} color={HOTEL_COLORS.red} /><Text style={styles.roomFacilitiesCombined} numberOfLines={1}>{roomCategory}</Text></View>}

        <View style={styles.cardBottomRow}>
          <View>
            <View style={styles.priceRow}><Text style={styles.cardPrice}>{hasPrice ? formatCurrency(Math.round(Number(offeredPrice)), currency) : "Price unavailable"}</Text>{hasPrice && <Text style={styles.cardNights}>/ night</Text>}</View>
          </View>
          <View style={styles.cardArrow}><Ionicons name="chevron-forward" size={20} color="#FFFFFF" /></View>
        </View>
      </View>
    </Pressable>
  );
});

const HotelPriceMarker = React.memo(({ hotel, isSelected, onPress, point }) => {
  const name = getHotelName(hotel);
  const compactPrice = formatCompactMapPrice(getHotelDisplayPrice(hotel));

  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${compactPrice} per night`}
      style={[
        styles.mapPriceMarker,
        { left: point.x - 29, top: point.y - 40 },
        isSelected && styles.mapPriceMarkerSelectedLayer,
      ]}
    >
      {isSelected && (
        <View style={styles.mapHotelName} pointerEvents="none">
          <Text style={styles.mapHotelNameText} numberOfLines={2}>{name}</Text>
        </View>
      )}
      <View style={[styles.mapPriceBubble, isSelected && styles.mapPriceBubbleSelected]}>
        <Text style={[styles.mapPriceText, isSelected && styles.mapPriceTextSelected]} numberOfLines={1} allowFontScaling={false}>
          {compactPrice}
        </Text>
      </View>
      <Ionicons
        name="location-sharp"
        size={18}
        color={isSelected ? HOTEL_COLORS.redBright : HOTEL_COLORS.white}
        style={styles.mapPriceLocationIcon}
      />
    </Pressable>
  );
});

const HotelSearchResultsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { setSelectedHotel, session, searchParams: contextSearchParams } = useHotelBooking();
  const rawHotels = Array.isArray(route?.params?.hotels) ? route.params.hotels : [];
  const searchParams = route?.params?.searchParams || contextSearchParams || {};

  useEffect(() => {
    console.log("[HotelSearchResults] screen loaded:", {
      hotelCount: rawHotels.length,
      searchParams,
    });
  }, []);

  // Compute dynamic price bounds & options across all raw hotels
  const priceBounds = useMemo(() => {
    if (!rawHotels.length) return { min: 0, max: 100000 };
    const prices = rawHotels
      .map((h) => getHotelPrice(h))
      .filter((p) => Number.isFinite(p) && p > 0);
    if (!prices.length) return { min: 0, max: 100000 };
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [rawHotels]);

  const availableCategories = useMemo(() => {
    const set = new Set();
    rawHotels.forEach((h) => {
      const type = getHotelPropertyType(h);
      if (type) set.add(normalizePropertyType(type));
    });
    return Array.from(set);
  }, [rawHotels]);

  const availableFacilities = useMemo(() => {
    const set = new Set();
    rawHotels.forEach((h) => {
      getHotelMealPlans(h).forEach(f => set.add(normalizeMealPlan(f)));
    });
    return Array.from(set);
  }, [rawHotels]);

  const availableRoomTypes = useMemo(() => {
    const set = new Set();
    rawHotels.forEach((h) => {
      getHotelRoomCategories(h).forEach(r => set.add(normalizeRoomCategory(r)));
    });
    return Array.from(set);
  }, [rawHotels]);

  const availableLocations = useMemo(() => {
    const set = new Set();
    rawHotels.forEach((h) => {
      const loc = getHotelLocation(h);
      if (loc) set.add(loc);
    });
    return Array.from(set);
  }, [rawHotels]);

  // Filter & Sort State
  const [filters, setFilters] = useState(() => createDefaultHotelFilters(priceBounds));
  const [sortBy, setSortBy] = useState("DEFAULT"); // DEFAULT | PRICE_LOW | PRICE_HIGH | RATING_HIGH
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Sync price bounds when rawHotels changes
  useEffect(() => {
    setFilters(createDefaultHotelFilters(priceBounds));
  }, [priceBounds]);

  // Filtered & Sorted Hotels
  const filteredHotels = useMemo(() => {
    let result = filterHotels(rawHotels, filters);
    return sortHotels(result, sortBy);
  }, [rawHotels, filters, sortBy]);

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.priceMin > priceBounds.min || filters.priceMax < priceBounds.max) count++;
    count += (filters.starRatings || []).length;
    count += (filters.categories || []).length;
    count += (filters.facilities || []).length;
    count += (filters.roomTypes || []).length;
    count += (filters.locations || []).length;
    return count;
  }, [filters, priceBounds]);

  const [selectedHotelId, setSelectedHotelId] = useState(
    getHotelId(filteredHotels[0]) || null
  );

  useEffect(() => {
    if (filteredHotels.length === 0) {
      setSelectedHotelId(null);
      return;
    }
    const exists = filteredHotels.some((hotel) => getHotelId(hotel) === selectedHotelId);
    if (!exists) {
      setSelectedHotelId(getHotelId(filteredHotels[0]) || null);
    }
  }, [filteredHotels, selectedHotelId]);

  const bottomSheetRef = useRef(null);
  const [sheetIndex, setSheetIndex] = useState(1);
  const snapPoints = useMemo(() => ["18%", "62%", "88%"], []);

  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 80,
    overshootClamping: true,
    restDisplacementThreshold: 0.1,
    restSpeedThreshold: 0.1,
    stiffness: 400,
  });

  const title = useMemo(() => {
    const destinationHotel = rawHotels.find((hotel) => hotel?.city || hotel?.cityName);
    const hotelDestination = destinationHotel?.city || destinationHotel?.cityName;
    return String(searchParams.destinationName || hotelDestination || "Hotel Stays").trim();
  }, [rawHotels, searchParams.destinationName]);

  const subtitle = useMemo(() => {
    const checkIn = parseApiDate(searchParams.checkInDate);
    const checkOut = parseApiDate(searchParams.checkOutDate);
    const nights = checkIn && checkOut
      ? Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000))
      : 1;
    const rooms = Math.max(1, Number(searchParams.noOfRooms || searchParams.rooms || 1));
    const dateRange = [formatShortDate(searchParams.checkInDate), formatShortDate(searchParams.checkOutDate)]
      .filter(Boolean)
      .join(" – ");
    return `${dateRange || "Select dates"} · ${nights} ${nights === 1 ? "night" : "nights"} · ${rooms} ${rooms === 1 ? "room" : "rooms"}`;
  }, [searchParams]);

  const mapRef = useRef(null);
  const listRef = useRef(null);
  const [markerPoints, setMarkerPoints] = useState({});
  const markerScrollTimerRef = useRef(null);
  const markerScrollFrameRef = useRef(null);
  const markerScrollRetryRef = useRef(null);
  const latestSelectionRef = useRef({ selectedHotelId, filteredHotels });
  latestSelectionRef.current = { selectedHotelId, filteredHotels };

  const displayedHotels = useMemo(() => {
    if (!selectedHotelId) return filteredHotels;
    const selectedHotel = filteredHotels.find((hotel) => getHotelId(hotel) === selectedHotelId);
    if (!selectedHotel) return filteredHotels;
    return [selectedHotel, ...filteredHotels.filter((hotel) => getHotelId(hotel) !== selectedHotelId)];
  }, [filteredHotels, selectedHotelId]);

  const scrollToLatestSelectedCard = useCallback(() => {
    const latestSelection = latestSelectionRef.current;
    const selectedIndex = latestSelection.filteredHotels.findIndex(
      (hotel) => getHotelId(hotel) === latestSelection.selectedHotelId
    );
    if (selectedIndex < 0) return;
    listRef.current?.scrollToOffset({
      offset: 0,
      animated: true,
    });
  }, []);

  const region = useMemo(() => getMapRegion(filteredHotels), [filteredHotels]);
  const refreshMarkerPoints = useCallback(async () => {
    const activeMap = mapRef.current;
    if (!activeMap) return;

    const projected = await Promise.all(filteredHotels.map(async (hotel) => {
      const hotelId = getHotelId(hotel);
      const latitude = Number(hotel?.latitude);
      const longitude = Number(hotel?.longitude);
      if (!hotelId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      try {
        const point = await activeMap.pointForCoordinate({ latitude, longitude });
        return [hotelId, point];
      } catch {
        return null;
      }
    }));

    setMarkerPoints(Object.fromEntries(projected.filter(Boolean)));
  }, [filteredHotels]);

  useEffect(() => {
    const timer = setTimeout(refreshMarkerPoints, 250);
    return () => clearTimeout(timer);
  }, [refreshMarkerPoints]);

  const handleMarkerPress = useCallback(
    (hotel) => {
      const hId = getHotelId(hotel);
      if (!hId) return;
      setSelectedHotelId(hId);

      const lat = Number(hotel?.latitude);
      const lon = Number(hotel?.longitude);
      if (mapRef.current && Number.isFinite(lat) && Number.isFinite(lon)) {
        mapRef.current.animateToRegion(
          {
            latitude: lat - 0.0075,
            longitude: lon,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          },
          400
        );
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedHotelId) return undefined;
    const index = filteredHotels.findIndex((hotel) => getHotelId(hotel) === selectedHotelId);
    if (index < 0) return undefined;
    markerScrollRetryRef.current = null;

    bottomSheetRef.current?.snapToIndex(1);
    if (markerScrollFrameRef.current !== null) cancelAnimationFrame(markerScrollFrameRef.current);
    if (markerScrollTimerRef.current !== null) clearTimeout(markerScrollTimerRef.current);

    markerScrollFrameRef.current = requestAnimationFrame(() => {
      markerScrollFrameRef.current = null;
      markerScrollTimerRef.current = setTimeout(() => {
        markerScrollTimerRef.current = null;
        scrollToLatestSelectedCard();
      }, 850);
    });

    return () => {
      if (markerScrollFrameRef.current !== null) {
        cancelAnimationFrame(markerScrollFrameRef.current);
        markerScrollFrameRef.current = null;
      }
      if (markerScrollTimerRef.current !== null) {
        clearTimeout(markerScrollTimerRef.current);
        markerScrollTimerRef.current = null;
      }
    };
  }, [filteredHotels, scrollToLatestSelectedCard, selectedHotelId]);

  const handleSelectHotel = useCallback(
    (item, name, imageUri, address, category, rating, offeredPrice, priceObj) => {
      setSelectedHotelId(getHotelId(item) || null);
      const activeTraceId = String(item?.traceId || session?.traceId || searchParams?.traceId || "");
      const activeSrdvIndex = String(item?.srdvIndex || session?.srdvIndex || "15");
      const activeSrdvType = String(item?.srdvType || session?.srdvType || "MixAPI");
      const activeResultIndex = String(item?.resultIndex ?? item?.hotelCode ?? "");
      const activeHotelCode = String(item?.hotelCode ?? item?.resultIndex ?? "");

      console.log("[HotelSearchResults] hotel card tapped, selecting hotel:", {
        traceId: activeTraceId,
        srdvType: activeSrdvType,
        srdvIndex: activeSrdvIndex,
        resultIndex: activeResultIndex,
        hotelCode: activeHotelCode,
        hotelName: name,
      });

      const hotelObj = {
        ...item,
        name,
        rating,
        address,
        resultIndex: activeResultIndex,
        hotelCode: activeHotelCode,
        traceId: activeTraceId,
        srdvType: activeSrdvType,
        srdvIndex: activeSrdvIndex,
      };

      setSelectedHotel(hotelObj);
      console.log("[HotelSearchResults] navigating to hotel details:", {
        hotelCode: activeHotelCode,
        resultIndex: activeResultIndex,
        traceId: activeTraceId,
      });

      navigation.navigate("HotelOfferDetails", {
        traceId: activeTraceId,
        srdvType: activeSrdvType,
        srdvIndex: activeSrdvIndex,
        resultIndex: activeResultIndex,
        hotelCode: activeHotelCode,
        hotelName: name,
        hotelPicture: imageUri,
        hotelAddress: address,
        hotelCategory: category,
        starRating: rating,
        offeredFare: offeredPrice,
        price: priceObj,
        hotel: hotelObj,
      });
    },
    [navigation, searchParams, session, setSelectedHotel]
  );

  const renderCard = useCallback(
    ({ item }) => {
      const isSelected = getHotelId(item) === selectedHotelId;
      return <HotelCard item={item} isSelected={isSelected} onSelect={handleSelectHotel} />;
    },
    [selectedHotelId, handleSelectHotel]
  );

  const keyExtractor = useCallback(
    (item, index) => getHotelId(item) || String(index),
    []
  );

  const toggleQuickStar = (star) => {
    setFilters((prev) => {
      const current = prev.starRatings || [];
      const updated = current.includes(star)
        ? current.filter((s) => s !== star)
        : [...current, star];
      return { ...prev, starRatings: updated };
    });
  };

  const toggleQuickFacility = (fac) => {
    setFilters((prev) => {
      const current = prev.facilities || [];
      const updated = current.includes(fac)
        ? current.filter((f) => f !== fac)
        : [...current, fac];
      return { ...prev, facilities: updated };
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { top: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>

        <View style={styles.searchPill}>
          <View style={styles.searchCopy}>
            <Text style={styles.searchTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.searchSubtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
          <Pressable style={styles.editBtn} onPress={() => navigation.goBack()} accessibilityLabel="Edit hotel search">
            <Ionicons name="pencil" size={17} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <View style={[styles.activeFiltersContainer, { top: insets.top + 72 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
            {/* Price Filter */}
            {(filters.priceMin > priceBounds.min || filters.priceMax < priceBounds.max) && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>₹{filters.priceMin.toLocaleString()} - ₹{filters.priceMax.toLocaleString()}</Text>
                <Pressable onPress={() => setFilters(f => ({ ...f, priceMin: priceBounds.min, priceMax: priceBounds.max }))}>
                  <Ionicons name="close" size={14} color="#0F172A" />
                </Pressable>
              </View>
            )}
            
            {/* Star Ratings */}
            {(filters.starRatings || []).map(star => (
              <View key={`active-star-${star}`} style={styles.activeChip}>
                <Text style={styles.activeChipText}>{star} Star</Text>
                <Pressable onPress={() => toggleQuickStar(star)}>
                  <Ionicons name="close" size={14} color="#0F172A" />
                </Pressable>
              </View>
            ))}
            
            {/* Categories */}
            {(filters.categories || []).map(cat => (
              <View key={`active-cat-${cat}`} style={styles.activeChip}>
                <Text style={styles.activeChipText}>{cat}</Text>
                <Pressable onPress={() => setFilters(f => ({ ...f, categories: f.categories.filter(c => c !== cat) }))}>
                  <Ionicons name="close" size={14} color="#0F172A" />
                </Pressable>
              </View>
            ))}
            
            {/* Facilities */}
            {(filters.facilities || []).map(fac => (
              <View key={`active-fac-${fac}`} style={styles.activeChip}>
                <Text style={styles.activeChipText}>{fac}</Text>
                <Pressable onPress={() => toggleQuickFacility(fac)}>
                  <Ionicons name="close" size={14} color="#0F172A" />
                </Pressable>
              </View>
            ))}
            
            {/* Room Types */}
            {(filters.roomTypes || []).map(room => (
              <View key={`active-room-${room}`} style={styles.activeChip}>
                <Text style={styles.activeChipText}>{room}</Text>
                <Pressable onPress={() => setFilters(f => ({ ...f, roomTypes: f.roomTypes.filter(r => r !== room) }))}>
                  <Ionicons name="close" size={14} color="#0F172A" />
                </Pressable>
              </View>
            ))}

            {/* Locations */}
            {(filters.locations || []).map(loc => (
              <View key={`active-loc-${loc}`} style={styles.activeChip}>
                <Text style={styles.activeChipText}>{loc}</Text>
                <Pressable onPress={() => setFilters(f => ({ ...f, locations: f.locations.filter(l => l !== loc) }))}>
                  <Ionicons name="close" size={14} color="#0F172A" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onMapReady={refreshMarkerPoints}
        onRegionChangeComplete={refreshMarkerPoints}
      />
      <View
        pointerEvents="box-none"
        style={[
          styles.mapMarkerLayer,
          { height: sheetIndex === 0 ? "82%" : sheetIndex === 1 ? "38%" : "12%" },
        ]}
      >
        {filteredHotels.map((hotel, index) => {
          const hotelId = getHotelId(hotel);
          if (!hotelId) return null;
          const isSelected = hotelId === selectedHotelId;
          return (
            <HotelPriceMarker
              key={`${hotelId}-${index}`}
              hotel={hotel}
              isSelected={isSelected}
              point={markerPoints[hotelId]}
              onPress={() => handleMarkerPress(hotel)}
            />
          );
        })}
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        animationConfigs={animationConfigs}
        enablePanDownToClose={false}
        enableOverDrag={false}
        animateOnMount={true}
        onChange={(index) => {
          setSheetIndex(index);
          if (index !== 1) return;
          if (markerScrollTimerRef.current !== null) clearTimeout(markerScrollTimerRef.current);
          markerScrollTimerRef.current = setTimeout(() => {
            markerScrollTimerRef.current = null;
            scrollToLatestSelectedCard();
          }, 120);
        }}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetFlatList
          ref={listRef}
          data={displayedHotels}
          keyExtractor={keyExtractor}
          renderItem={renderCard}
          getItemLayout={(_, index) => ({ length: 162, offset: 162 * index, index })}
          onScrollToIndexFailed={(info) => {
            const currentSelection = latestSelectionRef.current;
            const selectedIndex = currentSelection.filteredHotels.findIndex(
              (hotel) => getHotelId(hotel) === currentSelection.selectedHotelId
            );
            if (selectedIndex < 0) return;
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * selectedIndex,
              animated: false,
            });
            if (markerScrollRetryRef.current === currentSelection.selectedHotelId) return;
            markerScrollRetryRef.current = currentSelection.selectedHotelId;
            if (markerScrollTimerRef.current !== null) clearTimeout(markerScrollTimerRef.current);
            markerScrollTimerRef.current = setTimeout(() => {
              markerScrollTimerRef.current = null;
              const latestSelection = latestSelectionRef.current;
              const latestIndex = latestSelection.filteredHotels.findIndex(
                (hotel) => getHotelId(hotel) === latestSelection.selectedHotelId
              );
              if (latestIndex < 0) return;
              listRef.current?.scrollToIndex({ index: latestIndex, animated: true, viewPosition: 0.15 });
            }, 150);
          }}
          ListHeaderComponent={
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderTopRow}>
                <View style={styles.sheetTitleWrap}>
                  {filteredHotels.length > 0 ? (
                    <Text style={styles.sheetTitle}>
                      <Text style={styles.sheetTitleCount}>{filteredHotels.length}</Text>
                      {` hotel${filteredHotels.length === 1 ? "" : "s"}`}
                    </Text>
                  ) : (
                    <Text style={styles.sheetTitle}>No Matching Hotels</Text>
                  )}
                  <Text style={styles.sheetSubtitle}>All available for your dates</Text>
                </View>

                <Pressable
                  style={styles.filterTriggerBtn}
                  onPress={() => setFilterModalVisible(true)}
                >
                  <Ionicons
                    name="options-outline"
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.filterTriggerText}>Filters</Text>
                  {activeFilterCount > 0 ? (
                    <View style={styles.badgePill}>
                      <Text style={styles.badgeText}>{activeFilterCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>

              {/* Quick Filters Horizontal Bar */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickFilterBar}
              >
                {/* Sort Pill */}
                <Pressable
                  style={[styles.quickChip, sortBy !== "DEFAULT" && styles.quickChipActive]}
                  onPress={() => {
                    if (sortBy === "DEFAULT") setSortBy("PRICE_LOW");
                    else if (sortBy === "PRICE_LOW") setSortBy("PRICE_HIGH");
                    else if (sortBy === "PRICE_HIGH") setSortBy("RATING_HIGH");
                    else setSortBy("DEFAULT");
                  }}
                >
                  <Ionicons
                    name="swap-vertical"
                    size={14}
                    color={sortBy !== "DEFAULT" ? "#EF4444" : "#475569"}
                  />
                  <Text style={[styles.quickChipText, sortBy !== "DEFAULT" && styles.quickChipTextActive]}>
                    {sortBy === "PRICE_LOW"
                      ? "Price: Low ➔ High"
                      : sortBy === "PRICE_HIGH"
                        ? "Price: High ➔ Low"
                        : sortBy === "RATING_HIGH"
                          ? "Rating: High ➔ Low"
                          : "Sort By"}
                  </Text>
                </Pressable>

                {/* Quick Star Filters */}
                {[5, 4, 3].map((star) => {
                  const selected = (filters.starRatings || []).includes(star);
                  return (
                    <Pressable
                      key={`quick-star-${star}`}
                      style={[styles.quickChip, selected && styles.quickChipActive]}
                      onPress={() => toggleQuickStar(star)}
                    >
                      <Ionicons name="star" size={12} color={selected ? "#EF4444" : "#FFB300"} />
                      <Text style={[styles.quickChipText, selected && styles.quickChipTextActive]}>
                        {star}+
                      </Text>
                    </Pressable>
                  );
                })}

              </ScrollView>
            </View>
          }
          extraData={selectedHotelId}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === "android"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bed-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Hotels Match Filters</Text>
              <Text style={styles.emptyText}>
                No hotels found matching your current filter criteria. Try resetting filters to see more available options.
              </Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  setFilters(createDefaultHotelFilters(priceBounds));
                  setSortBy("DEFAULT");
                }}
              >
                <Text style={styles.retryBtnText}>Reset All Filters</Text>
              </Pressable>
            </View>
          }
        />
      </BottomSheet>

      {/* Filter Modal */}
      <HotelFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        setFilters={setFilters}
        priceBounds={priceBounds}
        availableCategories={availableCategories}
        availableFacilities={availableFacilities}
        availableRoomTypes={availableRoomTypes}
        availableLocations={availableLocations}
        filteredCount={filteredHotels.length}
        onReset={() => {
          setFilters(createDefaultHotelFilters(priceBounds));
          setSortBy("DEFAULT");
        }}
      />
    </View>
  );
};

export default HotelSearchResultsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HOTEL_COLORS.blush,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 30,
    elevation: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HOTEL_COLORS.white,
    shadowColor: "#25151A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 7,
  },
  searchPill: {
    flex: 1,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    paddingLeft: 17,
    paddingRight: 6,
    backgroundColor: HOTEL_COLORS.white,
    shadowColor: "#25151A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 7,
  },
  searchCopy: {
    flex: 1,
    paddingRight: 8,
  },
  searchTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: HOTEL_COLORS.ink,
  },
  searchSubtitle: {
    marginTop: 1,
    fontSize: 11,
    color: HOTEL_COLORS.muted,
    fontWeight: "600",
  },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HOTEL_COLORS.redBright,
  },
  activeFiltersContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 25,
    elevation: 10,
  },
  activeFiltersScroll: {
    paddingHorizontal: 74,
    gap: 7,
    alignItems: "center",
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: HOTEL_COLORS.white,
    borderWidth: 1,
    borderColor: HOTEL_COLORS.border,
  },
  activeChipText: {
    fontSize: 11,
    color: HOTEL_COLORS.ink,
    fontWeight: "700",
  },
  mapMarkerLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  mapPriceMarker: {
    position: "absolute",
    width: 58,
    height: 40,
    alignItems: "center",
  },
  mapPriceMarkerSelectedLayer: {
    zIndex: 20,
  },
  mapPriceBubble: {
    minWidth: 52,
    height: 30,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: HOTEL_COLORS.white,
    borderWidth: 1,
    borderColor: HOTEL_COLORS.border,
    shadowColor: "#25151A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
  },
  mapPriceBubbleSelected: {
    minWidth: 58,
    height: 32,
    backgroundColor: HOTEL_COLORS.redBright,
    borderColor: HOTEL_COLORS.redBright,
    elevation: 7,
  },
  mapPriceText: {
    color: HOTEL_COLORS.ink,
    fontSize: 13,
    fontWeight: "800",
    includeFontPadding: false,
  },
  mapPriceTextSelected: {
    color: HOTEL_COLORS.white,
  },
  mapPriceLocationIcon: {
    marginTop: -6,
    textShadowColor: "rgba(37, 21, 26, 0.22)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mapHotelName: {
    position: "absolute",
    left: -66,
    bottom: 46,
    width: 190,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: HOTEL_COLORS.white,
    borderWidth: 1,
    borderColor: HOTEL_COLORS.border,
    elevation: 7,
  },
  mapHotelNameText: {
    color: HOTEL_COLORS.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
  sheetHandle: {
    width: 42,
    backgroundColor: "#E8C6C9",
  },
  sheetBackground: {
    backgroundColor: HOTEL_COLORS.blush,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sheetHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sheetTitleWrap: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: HOTEL_COLORS.ink,
  },
  sheetTitleCount: {
    color: HOTEL_COLORS.redBright,
  },
  sheetSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: HOTEL_COLORS.muted,
    fontWeight: "500",
  },
  filterTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: HOTEL_COLORS.redBright,
    shadowColor: HOTEL_COLORS.redBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    elevation: 4,
  },
  filterTriggerText: {
    fontSize: 12,
    fontWeight: "900",
    color: HOTEL_COLORS.white,
  },
  badgePill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HOTEL_COLORS.white,
  },
  badgeText: {
    color: HOTEL_COLORS.redBright,
    fontSize: 10,
    fontWeight: "900",
  },
  quickFilterBar: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    paddingRight: 24,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: HOTEL_COLORS.white,
    borderWidth: 1,
    borderColor: HOTEL_COLORS.border,
  },
  quickChipActive: {
    backgroundColor: "#FFF0F1",
    borderColor: HOTEL_COLORS.redBright,
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: HOTEL_COLORS.muted,
  },
  quickChipTextActive: {
    color: HOTEL_COLORS.redBright,
    fontWeight: "900",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  card: {
    minHeight: 150,
    flexDirection: "row",
    marginBottom: 12,
    padding: 9,
    borderRadius: 22,
    backgroundColor: HOTEL_COLORS.white,
    borderWidth: 1,
    borderColor: HOTEL_COLORS.border,
    shadowColor: "#32161D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: HOTEL_COLORS.redBright,
    shadowColor: HOTEL_COLORS.redBright,
    shadowOpacity: 0.13,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardImageWrap: {
    width: 104,
    height: 132,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F2ECEE",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  noImageCardBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  noImageText: {
    color: "#9B8F94",
    fontSize: 10,
    fontWeight: "600",
  },
  onMapBadge: {
    position: "absolute",
    top: 7,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: HOTEL_COLORS.redBright,
  },
  onMapText: {
    color: HOTEL_COLORS.white,
    fontSize: 8,
    fontWeight: "900",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 12,
    paddingVertical: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    color: HOTEL_COLORS.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  cardCategory: {
    marginTop: 3,
    color: HOTEL_COLORS.muted,
    fontSize: 10.5,
    fontWeight: "600",
  },
  cardAddress: {
    marginTop: 3,
    color: "#857A80",
    fontSize: 10,
  },
  cardRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#FFF1D2",
  },
  cardRatingText: {
    color: "#A66B00",
    fontSize: 10,
    fontWeight: "900",
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 7,
  },
  roomFacilitiesCombined: {
    flex: 1,
    color: HOTEL_COLORS.ink,
    fontSize: 10.5,
    fontWeight: "700",
  },
  cardBottomRow: {
    flex: 1,
    marginTop: 7,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  cardPrice: {
    maxWidth: 140,
    color: HOTEL_COLORS.redBright,
    fontSize: 18,
    fontWeight: "900",
  },
  cardNights: {
    color: HOTEL_COLORS.muted,
    fontSize: 9.5,
    fontWeight: "600",
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HOTEL_COLORS.redBright,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 12,
    color: HOTEL_COLORS.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    color: HOTEL_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: HOTEL_COLORS.redBright,
  },
  retryBtnText: {
    color: HOTEL_COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },
});
