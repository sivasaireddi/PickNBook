import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Callout } from "react-native-maps";
import BottomSheet, { BottomSheetFlatList, useBottomSheetSpringConfigs } from "@gorhom/bottom-sheet";
import { useHotelBooking } from "../../../context/HotelBookingContext";
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
  const category = item?.hotelCategory || "Premium Stay";
  const rating = Number(item?.starRating ?? item?.rating) || 4.0;
  const address = item?.hotelAddress || item?.address || "Address not available";
  const city = item?.city || "";
  const country = item?.country || "";

  const roomCategory = item?.rooms?.[0]?.category ?? item?.rooms?.[0]?.cateogry ?? "Standard Room";
  const facilitiesList = item?.facilities?.[0]?.facilitiesNames ?? [];

  const priceObj = item?.price || {};
  const currency = priceObj.currencyCode || "INR";
  const offeredPrice = getHotelDisplayPrice(item);
  const publishedPrice = priceObj.publishedPrice ?? offeredPrice;
  const discount = priceObj.discount ?? 0;

  return (
    <Pressable
      onPress={() => onSelect(item, name, imageUri, address, category, rating, offeredPrice, priceObj)}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={styles.noImageCardBox}>
          <Ionicons name="image-outline" size={32} color="#94A3B8" />
          <Text style={styles.noImageText}>No image available</Text>
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.cardCategory}>
              {category} · {city ? `${city}, ` : ""}{country || ""}
            </Text>
            <Text style={styles.cardAddress} numberOfLines={1}>
              {address}
            </Text>
          </View>

          <View style={styles.cardRating}>
            <Ionicons name="star" size={10} color="#FFB300" />
            <Text style={styles.cardRatingText}>
              {rating.toFixed(1)}
            </Text>
          </View>
        </View>

        {(roomCategory || facilitiesList.length > 0) ? (
          <Text style={styles.roomFacilitiesCombined} numberOfLines={1}>
            {roomCategory ? `Room: ${roomCategory}` : ""}
            {roomCategory && facilitiesList.length > 0 ? " · " : ""}
            {facilitiesList.length > 0 ? `Facilities: ${facilitiesList.join(", ")}` : ""}
          </Text>
        ) : null}

        <View style={styles.cardBottomRow}>
          <View>
            <View style={styles.priceRow}>
              <Text style={styles.cardPrice}>
                {formatCurrency(offeredPrice, currency)}
              </Text>
              {discount > 0 ? (
                <Text style={styles.cardPublishedPrice}>
                  {formatCurrency(publishedPrice, currency)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.cardNights}>per night</Text>
          </View>

          {discount > 0 ? (
            <View style={styles.discountPill}>
              <Text style={styles.discountText}>
                {formatCurrency(discount, currency)} OFF
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const HotelNativeMarker = React.memo(({ hotel, isSelected, onPress, onCalloutPress, markerRef }) => {
  const lat = Number(hotel?.latitude);
  const lon = Number(hotel?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const offeredPrice = getHotelDisplayPrice(hotel);
  const formattedPrice = `₹${offeredPrice.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const name = hotel?.hotelName || hotel?.name || "Hotel";
  const rating = Number(hotel?.starRating ?? hotel?.rating) || 0;
  const address = hotel?.hotelAddress || hotel?.address || "";

  return (
    <Marker
      ref={markerRef}
      coordinate={{ latitude: lat, longitude: lon }}
      pinColor={isSelected ? "#D32F2F" : "red"}
      onPress={onPress}
    >
      <Callout tooltip onPress={onCalloutPress}>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutHotelName} numberOfLines={1}>
            {name}
          </Text>

          <Text style={styles.calloutPrice}>{formattedPrice}</Text>

          {rating > 0 && (
            <Text style={styles.calloutRating}>
              ⭐ {rating.toFixed(1)}
            </Text>
          )}

          {address ? (
            <Text style={styles.calloutAddress} numberOfLines={2}>
              {address}
            </Text>
          ) : null}
        </View>
      </Callout>
    </Marker>
  );
});

const HotelClusterMarker = React.memo(({ cluster, onPress }) => {
  return (
    <Marker
      coordinate={cluster.coordinate}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.clusterMarker}>
        <Text style={styles.clusterMarkerText}>{cluster.count}</Text>
      </View>
    </Marker>
  );
});

const HotelSearchResultsScreen = ({ navigation, route }) => {
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
    filteredHotels[0]?.hotelCode ?? filteredHotels[0]?.hotelId ?? null
  );

  useEffect(() => {
    if (filteredHotels.length > 0) {
      const exists = filteredHotels.some(
        (h) => String(h?.hotelCode ?? h?.hotelId) === String(selectedHotelId)
      );
      if (!exists) {
        setSelectedHotelId(filteredHotels[0]?.hotelCode ?? filteredHotels[0]?.hotelId);
      }
    }
  }, [filteredHotels, selectedHotelId]);

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ["18%", "45%", "85%"], []);

  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 80,
    overshootClamping: true,
    restDisplacementThreshold: 0.1,
    restSpeedThreshold: 0.1,
    stiffness: 400,
  });

  const title = useMemo(() => {
    const code = String(searchParams.cityCode || searchParams.cityId || "").trim();
    return code ? `${code} Stays` : "Hotel Stays";
  }, [searchParams]);

  const subtitle = useMemo(() => {
    const parts = [];
    if (searchParams.checkInDate && searchParams.checkOutDate) {
      parts.push(`${searchParams.checkInDate} to ${searchParams.checkOutDate}`);
    }
    if (searchParams.noOfRooms || searchParams.rooms) {
      parts.push(`${searchParams.noOfRooms || searchParams.rooms || 1} Room(s)`);
    }
    return parts.join(" · ") || "Selected destination";
  }, [searchParams]);

  const mapRef = useRef(null);
  const listRef = useRef(null);
  const markerRefs = useRef({});

  useEffect(() => {
    if (selectedHotelId && markerRefs.current[selectedHotelId]) {
      const timer = setTimeout(() => {
        markerRefs.current[selectedHotelId]?.showCallout();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedHotelId]);

  const region = useMemo(() => getMapRegion(filteredHotels), [filteredHotels]);
  const mapClusters = useMemo(() => {
    const clusters = new Map();
    (Array.isArray(filteredHotels) ? filteredHotels : []).forEach((hotel, index) => {
      const latitude = Number(hotel?.latitude);
      const longitude = Number(hotel?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

      // Group nearby hotels into visual clusters so dense destinations stay readable.
      const key = `${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
      const existing = clusters.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        clusters.set(key, {
          count: 1,
          coordinate: { latitude, longitude },
          hotel,
          index,
        });
      }
    });
    return Array.from(clusters.values());
  }, [filteredHotels]);
  const selectedHotel =
    filteredHotels.find((hotel) => String(hotel?.hotelCode ?? hotel?.hotelId) === String(selectedHotelId)) ||
    filteredHotels[0] ||
    null;

  const handleMarkerPress = useCallback(
    (hotel, index) => {
      const hId = String(hotel?.hotelCode ?? hotel?.hotelId);
      setSelectedHotelId(hId);

      const lat = Number(hotel?.latitude);
      const lon = Number(hotel?.longitude);
      if (mapRef.current && Number.isFinite(lat) && Number.isFinite(lon)) {
        mapRef.current.animateToRegion(
          {
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          },
          400
        );
      }

      if (listRef.current && index >= 0) {
        try {
          listRef.current.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.2,
          });
        } catch (err) {
          // Fallback if list layout isn't measured yet
        }
      }
    },
    []
  );

  const handleSelectHotel = useCallback(
    (item, name, imageUri, address, category, rating, offeredPrice, priceObj) => {
      setSelectedHotelId(item?.hotelCode ?? item?.hotelId);
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
      const isSelected = String(item?.hotelCode ?? item?.hotelId) === String(selectedHotelId);
      return <HotelCard item={item} isSelected={isSelected} onSelect={handleSelectHotel} />;
    },
    [selectedHotelId, handleSelectHotel]
  );

  const keyExtractor = useCallback(
    (item, index) => String(item?.hotelCode ?? item?.hotelId ?? item?.hotelName ?? item?.name ?? index),
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
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>

        <View style={styles.searchPill}>
          <Text style={styles.searchTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.searchSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersContainer}>
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

      <View style={styles.mapWrap}>
        <MapView ref={mapRef} style={styles.map} initialRegion={region}>
          {mapClusters.map((cluster) => {
            const hotel = cluster.hotel;
            const hId = String(hotel?.hotelCode ?? hotel?.hotelId);
            if (cluster.count > 1) {
              return (
                <HotelClusterMarker
                  key={`cluster-${hId}-${cluster.count}`}
                  cluster={cluster}
                  onPress={() => handleMarkerPress(hotel, cluster.index)}
                />
              );
            }

            const isSelected = hId === String(selectedHotelId);
            return (
              <HotelNativeMarker
                key={hId}
                hotel={hotel}
                isSelected={isSelected}
                onPress={() => handleMarkerPress(hotel, cluster.index)}
                onCalloutPress={() =>
                  handleSelectHotel(
                    hotel,
                    hotel?.hotelName || hotel?.name || "Hotel",
                    hotel?.hotelPicture || (Array.isArray(hotel?.images) && hotel.images[0]) || null,
                    hotel?.hotelAddress || hotel?.address || "",
                    hotel?.hotelCategory || "Premium Stay",
                    Number(hotel?.starRating ?? hotel?.rating) || 4.0,
                    getHotelDisplayPrice(hotel),
                    hotel?.price
                  )
                }
                markerRef={(ref) => {
                  if (ref) {
                    markerRefs.current[hId] = ref;
                  }
                }}
              />
            );
          })}
        </MapView>

        <View style={styles.mapOverlay}>
          <View style={styles.mapChip}>
            <Ionicons name="business-outline" size={14} color="#fff" />
            <Text style={styles.mapChipText}>
              {filteredHotels.length} of {rawHotels.length} hotel{rawHotels.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        animationConfigs={animationConfigs}
        enablePanDownToClose={false}
        enableOverDrag={false}
        animateOnMount={true}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetFlatList
          ref={listRef}
          data={filteredHotels}
          keyExtractor={keyExtractor}
          renderItem={renderCard}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
          ListHeaderComponent={
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderTopRow}>
                <View style={styles.sheetTitleWrap}>
                  <Text style={styles.sheetTitle}>
                    {filteredHotels.length > 0
                      ? `${filteredHotels.length} Available Hotels`
                      : "No Matching Hotels"}
                  </Text>
                  {selectedHotel && filteredHotels.length > 0 ? (
                    <Text style={styles.sheetSubtitle} numberOfLines={1}>
                      Selected: {selectedHotel?.hotelName || selectedHotel?.name}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  style={[styles.filterTriggerBtn, activeFilterCount > 0 && styles.filterTriggerBtnActive]}
                  onPress={() => setFilterModalVisible(true)}
                >
                  <Ionicons
                    name="options-outline"
                    size={16}
                    color={activeFilterCount > 0 ? "#FFFFFF" : "#0F172A"}
                  />
                  <Text style={[styles.filterTriggerText, activeFilterCount > 0 && styles.filterTriggerTextActive]}>
                    Filter
                  </Text>
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
                        {star}★+
                      </Text>
                    </Pressable>
                  );
                })}

                {/* Quick Inclusion Filter */}
                {["Breakfast", "Room Only"].map((fac) => {
                  const selected = (filters.facilities || []).includes(fac);
                  return (
                    <Pressable
                      key={`quick-fac-${fac}`}
                      style={[styles.quickChip, selected && styles.quickChipActive]}
                      onPress={() => toggleQuickFacility(fac)}
                    >
                      <Text style={[styles.quickChipText, selected && styles.quickChipTextActive]}>
                        {fac}
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
    </SafeAreaView>
  );
};

export default HotelSearchResultsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: "#FFFFFF",
    zIndex: 2,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  searchPill: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  searchSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  activeFiltersContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 8,
    zIndex: 2,
  },
  activeFiltersScroll: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: "center",
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  activeChipText: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "600",
  },
  mapWrap: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    alignItems: "center",
    zIndex: 2,
  },
  mapChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  clusterMarker: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 8,
    borderRadius: 19,
    backgroundColor: "#0F172A",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  clusterMarkerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  mapChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  calloutContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    width: 190,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  calloutHotelName: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  calloutPrice: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  calloutRating: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 3,
  },
  calloutAddress: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 14,
  },
  sheetHandle: {
    backgroundColor: "#CBD5E1",
    width: 42,
  },
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sheetTitleWrap: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  filterTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterTriggerBtnActive: {
    backgroundColor: "#EF4444",
    borderColor: "#DC2626",
  },
  filterTriggerText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  filterTriggerTextActive: {
    color: "#FFFFFF",
  },
  badgePill: {
    backgroundColor: "#FFFFFF",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#EF4444",
  },
  quickFilterBar: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
    paddingRight: 24,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  quickChipActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  quickChipTextActive: {
    color: "#EF4444",
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    elevation: 1,
  },
  cardSelected: {
    borderColor: "#FCA5A5",
    borderWidth: 1.5,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardImage: {
    width: "100%",
    height: 136,
    backgroundColor: "#F1F5F9",
  },
  noImageCardBox: {
    width: "100%",
    height: 110,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  noImageText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  cardBody: {
    padding: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardCategory: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  cardAddress: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: "#64748B",
  },
  cardRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardRatingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
  },
  roomFacilitiesCombined: {
    marginTop: 4,
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  cardBottomRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#EF4444",
  },
  cardPublishedPrice: {
    fontSize: 12,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  cardNights: {
    marginTop: 1,
    fontSize: 10.5,
    fontWeight: "500",
    color: "#64748B",
  },
  discountPill: {
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  discountText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#EF4444",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#EF4444",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
});
