import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import BottomSheet, { BottomSheetFlatList, useBottomSheetSpringConfigs } from "@gorhom/bottom-sheet";
import { useHotelBooking } from "../../../context/HotelBookingContext";

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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
  const offeredPrice = priceObj.offeredPrice ?? item?.offeredFare ?? 0;
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

const HotelPriceMarker = React.memo(({ hotel, isSelected, onPress }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    if (Platform.OS === "android") {
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const lat = Number(hotel?.latitude);
  const lon = Number(hotel?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const offeredPrice = hotel?.price?.offeredPrice ?? hotel?.offeredFare ?? 0;
  const currency = hotel?.price?.currencyCode || "INR";
  const priceText =
    offeredPrice > 0
      ? formatCurrency(offeredPrice, currency).replace(".00", "")
      : "View";

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lon }}
      title={hotel?.hotelName || hotel?.name || "Hotel"}
      description={hotel?.hotelAddress || hotel?.address || ""}
      onPress={onPress}
      tracksViewChanges={Platform.OS === "android" ? tracksViewChanges : false}
    >
      <View style={[styles.priceMarker, isSelected && styles.priceMarkerSelected]}>
        <Text
          style={[styles.priceMarkerText, isSelected && styles.priceMarkerTextSelected]}
          numberOfLines={1}
        >
          {priceText}
        </Text>
      </View>
    </Marker>
  );
});

const HotelSearchResultsScreen = ({ navigation, route }) => {
  const { setSelectedHotel, session, searchParams: contextSearchParams } = useHotelBooking();
  const hotels = Array.isArray(route?.params?.hotels) ? route.params.hotels : [];
  const searchParams = route?.params?.searchParams || contextSearchParams || {};

  const [selectedHotelId, setSelectedHotelId] = useState(
    hotels[0]?.hotelCode ?? hotels[0]?.hotelId ?? null
  );

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

  const region = useMemo(() => getMapRegion(hotels), [hotels]);
  const mapHotels = useMemo(() => (Array.isArray(hotels) ? hotels : []).slice(0, 30), [hotels]);
  const selectedHotel =
    hotels.find((hotel) => String(hotel?.hotelCode ?? hotel?.hotelId) === String(selectedHotelId)) ||
    hotels[0] ||
    null;

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

      // Set selected hotel in context
      setSelectedHotel(hotelObj);

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

      <View style={styles.mapWrap}>
        <MapView style={styles.map} initialRegion={region}>
          {mapHotels.map((hotel) => {
            const hId = String(hotel?.hotelCode ?? hotel?.hotelId);
            const isSelected = hId === String(selectedHotelId);
            return (
              <HotelPriceMarker
                key={hId}
                hotel={hotel}
                isSelected={isSelected}
                onPress={() => setSelectedHotelId(hId)}
              />
            );
          })}
        </MapView>

        <View style={styles.mapOverlay}>
          <View style={styles.mapChip}>
            <Ionicons name="business-outline" size={14} color="#fff" />
            <Text style={styles.mapChipText}>
              {hotels.length} hotel{hotels.length === 1 ? "" : "s"} found
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
          data={hotels}
          keyExtractor={keyExtractor}
          renderItem={renderCard}
          ListHeaderComponent={
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {hotels.length > 0 ? `${hotels.length} Available Hotels` : "No Hotels Found"}
              </Text>
              {selectedHotel ? (
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  Selected: {selectedHotel?.hotelName || selectedHotel?.name}
                </Text>
              ) : null}
            </View>
          }
          initialNumToRender={5}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bed-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Hotels Found</Text>
              <Text style={styles.emptyText}>
                No live hotel inventory available for the selected dates and city. Please try modifying your search parameters.
              </Text>
              <Pressable style={styles.retryBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.retryBtnText}>Modify Search</Text>
              </Pressable>
            </View>
          }
        />
      </BottomSheet>
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
    paddingVertical: 10,
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
    borderRadius: 12,
    paddingVertical: 8,
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
  mapChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  priceMarker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    minWidth: 64,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  priceMarkerSelected: {
    backgroundColor: "#EF4444",
    borderColor: "#B91C1C",
  },
  priceMarkerText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#EF4444",
    textAlign: "center",
    includeFontPadding: false,
  },
  priceMarkerTextSelected: {
    color: "#FFFFFF",
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
    paddingBottom: 10,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 44,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    elevation: 1,
  },
  cardSelected: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#F1F5F9",
  },
  noImageCardBox: {
    width: "100%",
    height: 120,
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
