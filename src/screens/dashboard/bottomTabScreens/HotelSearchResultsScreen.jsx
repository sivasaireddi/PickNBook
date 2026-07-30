import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getHotelOfferDetails } from "../../../services/hotelService";
import MapView, { Marker } from "react-native-maps";
import BottomSheet, { BottomSheetFlatList, useBottomSheetSpringConfigs } from "@gorhom/bottom-sheet";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getHotelImage = (images) =>
  Array.isArray(images) && images.length > 0 ? images[0] : PLACEHOLDER_IMAGE;

const getBestPrice = (offers = []) => {
  const prices = offers
    .map((offer) => Number(offer?.price))
    .filter((value) => Number.isFinite(value));
  return prices.length ? Math.min(...prices) : null;
};

const getMapRegion = (hotels) => {
  const points = (Array.isArray(hotels) ? hotels : []).filter(
    (item) =>
      Number.isFinite(Number(item?.latitude)) &&
      Number.isFinite(Number(item?.longitude)),
  );

  if (points.length === 0) {
    return {
      latitude: 17.385,
      longitude: 78.4867,
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
  const imageUri = item?.hotelPicture || PLACEHOLDER_IMAGE;
  const name = item?.hotelName || item?.name || "Hotel";
  const category = item?.hotelCategory || "Premium Stay";
  const rating = Number(item?.starRating ?? item?.rating) || 4.5;
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
      <Image source={{ uri: imageUri }} style={styles.cardImage} />

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
            <Ionicons name="star" size={12} color="#FFB300" />
            <Text style={styles.cardRatingText}>
              {rating.toFixed(1)}
            </Text>
          </View>
        </View>

        <Text style={styles.roomCategoryText} numberOfLines={1}>
          Room: {roomCategory}
        </Text>

        {facilitiesList.length > 0 ? (
          <Text style={styles.facilitiesText} numberOfLines={1}>
            Facilities: {facilitiesList.join(" · ")}
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
            <Text style={styles.cardNights}>for 1 night</Text>
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

const HotelSearchResultsScreen = ({ navigation, route }) => {
  const hotels = Array.isArray(route?.params?.hotels) ? route.params.hotels : [];
  const searchParams = route?.params?.searchParams || {};
  const [selectedHotelId, setSelectedHotelId] = useState(
    hotels[0]?.hotelCode ?? hotels[0]?.hotelId ?? null,
  );
  const [selectedHotelForRoomModal, setSelectedHotelForRoomModal] = useState(null);
  const [fetchingOffer, setFetchingOffer] = useState(false);
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
    const code = String(searchParams.cityCode || "").trim();
    return code ? `${code} stays` : "Hotel stays";
  }, [searchParams.cityCode]);

  const subtitle = useMemo(() => {
    const parts = [];
    if (searchParams.checkInDate && searchParams.checkOutDate) {
      parts.push(`${searchParams.checkInDate} - ${searchParams.checkOutDate}`);
    }
    if (searchParams.adults || searchParams.rooms) {
      parts.push(
        `${searchParams.adults || 1} guest${Number(searchParams.adults) > 1 ? "s" : ""} · ${
          searchParams.rooms || 1
        } room${Number(searchParams.rooms) > 1 ? "s" : ""}`,
      );
    }
    return parts.join(" · ") || "Any weekend · Add guests";
  }, [searchParams]);

  const region = useMemo(() => getMapRegion(hotels), [hotels]);
  const mapHotels = useMemo(() => (Array.isArray(hotels) ? hotels : []).slice(0, 30), [hotels]);
  const selectedHotel =
    hotels.find((hotel) => String(hotel?.hotelCode ?? hotel?.hotelId) === String(selectedHotelId)) ||
    hotels[0] ||
    null;

  React.useEffect(() => {
    console.log("[HotelSearchResults] route params:", {
      hotelCount: hotels.length,
      searchParams,
    });
  }, [hotels.length, searchParams]);

  React.useEffect(() => {
    console.log("[HotelSearchResults] selected hotel changed:", selectedHotelId);
  }, [selectedHotelId]);

  const handleSelectHotel = useCallback(
    (item, name, imageUri, address, category, rating, offeredPrice, priceObj) => {
      setSelectedHotelId(item?.hotelCode ?? item?.hotelId);
      console.log("[HotelSearchResults] hotel card tapped, navigating to details screen:", {
        hotelCode: item?.hotelCode,
        hotelName: item?.hotelName,
        offeredFare: offeredPrice,
      });
      navigation.navigate("HotelOfferDetails", {
        resultIndex: item?.resultIndex,
        hotelCode: item?.hotelCode,
        hotelName: name,
        hotelPicture: imageUri,
        hotelAddress: address,
        hotelCategory: category,
        starRating: rating,
        offeredFare: offeredPrice,
        price: priceObj,
        rooms: item?.rooms,
        facilities: item?.facilities,
        latitude: Number(item?.latitude) || 0,
        longitude: Number(item?.longitude) || 0,
        hotel: {
          ...item,
          name,
          rating,
          address,
        },
        searchContext: searchParams,
      });
    },
    [navigation, searchParams],
  );

  const renderCard = useCallback(
    ({ item }) => {
      const isSelected = String(item?.hotelCode ?? item?.hotelId) === String(selectedHotelId);
      return <HotelCard item={item} isSelected={isSelected} onSelect={handleSelectHotel} />;
    },
    [selectedHotelId, handleSelectHotel],
  );

  const keyExtractor = useCallback(
    (item, index) => String(item?.hotelCode ?? item?.hotelId ?? item?.hotelName ?? item?.name ?? index),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#E53935" />
        </Pressable>

        <View style={styles.searchPill}>
          <Text style={styles.searchTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.searchSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <Pressable style={styles.iconBtn}>
          <Ionicons name="options-outline" size={24} color="#E53935" />
        </Pressable>
      </View>

      <View style={styles.mapWrap}>
        <MapView style={styles.map} initialRegion={region}>
          {mapHotels.map((hotel) => {
            const lat = Number(hotel?.latitude);
            const lon = Number(hotel?.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

            const offeredPrice = hotel?.price?.offeredPrice ?? hotel?.offeredFare ?? getBestPrice(hotel?.offers) ?? 0;
            const currency = hotel?.price?.currencyCode || "INR";

            return (
              <Marker
                key={String(hotel?.hotelCode ?? hotel?.hotelId)}
                coordinate={{ latitude: lat, longitude: lon }}
                title={hotel?.hotelName || hotel?.name || "Hotel"}
                description={hotel?.hotelAddress || hotel?.address || ""}
                onPress={() => setSelectedHotelId(hotel?.hotelCode ?? hotel?.hotelId)}
              >
                <View style={styles.priceMarker}>
                  <Text style={styles.priceMarkerText}>
                    {offeredPrice != null
                      ? formatCurrency(offeredPrice, currency).replace(".00", "")
                      : "--"}
                  </Text>
                </View>
              </Marker>
            );
          })}
        </MapView>

        <View style={styles.mapOverlay}>
          <View style={styles.mapChip}>
            <Ionicons name="map-outline" size={14} color="#fff" />
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
                {hotels.length > 0 ? `Over ${hotels.length} hotels` : "No hotels found"}
              </Text>
              {selectedHotel ? (
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {selectedHotel?.hotelName || selectedHotel?.name}
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
              <Ionicons name="bed-outline" size={36} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No hotels found</Text>
              <Text style={styles.emptyText}>
                Try another city code or date range.
              </Text>
            </View>
          }
        />
      </BottomSheet>

      <Modal
        visible={selectedHotelForRoomModal !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedHotelForRoomModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedHotelForRoomModal?.name || "Select a Room"}
              </Text>
              <Pressable
                onPress={() => setSelectedHotelForRoomModal(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#E53935" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {selectedHotelForRoomModal?.offers && selectedHotelForRoomModal.offers.length > 0 ? (
                selectedHotelForRoomModal.offers.map((offer, index) => (
                  <View key={offer.offerId || index} style={styles.modalOfferCard}>
                    <View style={styles.modalOfferInfo}>
                      <Text style={styles.modalRoomCategory}>
                        {offer.roomCategory || "Standard Room"}
                      </Text>
                      <Text style={styles.modalRoomDesc} numberOfLines={2}>
                        {offer.roomDescription || "Comfortable room with essential amenities."}
                      </Text>
                      <View style={styles.modalRoomMeta}>
                        <Ionicons name="bed-outline" size={14} color="#6B7280" />
                        <Text style={styles.modalRoomMetaText}>
                          {offer.bedType || "Double"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalOfferAction}>
                      <Text style={styles.modalOfferPrice}>
                        {formatCurrency(offer.price, offer.currency)}
                      </Text>
                      <Text style={styles.modalOfferNightText}>/ night</Text>
                      <Pressable
                        style={styles.modalSelectBtn}
                        onPress={async () => {
                          if (fetchingOffer) return;
                          setFetchingOffer(true);
                          try {
                            const details = await getHotelOfferDetails(offer.offerId);
                            setFetchingOffer(false);
                            const hotelPayload = selectedHotelForRoomModal;
                            setSelectedHotelForRoomModal(null);
                            navigation.navigate("HotelOfferDetails", {
                              hotel: hotelPayload,
                              offerId: offer.offerId,
                              offerDetails: details,
                              searchContext: searchParams,
                            });
                          } catch (err) {
                            setFetchingOffer(false);
                            Alert.alert("Error", err.message || "Failed to fetch room details.");
                          }
                        }}
                      >
                        {fetchingOffer ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.modalSelectBtnText}>Select</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.modalEmpty}>
                  <Ionicons name="alert-circle-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.modalEmptyText}>No offers available for this hotel.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HotelSearchResultsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: "#FFFFFF",
    zIndex: 2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  searchPill: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  searchTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#212121",
    textAlign: "center",
  },
  searchSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#757575",
    fontWeight: "600",
    textAlign: "center",
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
    gap: 8,
    backgroundColor: "#E53935",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    shadowColor: "#E53935",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mapChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  priceMarker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  priceMarkerText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#E53935",
  },
  sheetHandle: {
    backgroundColor: "#EEEEEE",
    width: 42,
  },
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#212121",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 44,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardSelected: {
    borderColor: "#E53935",
    borderWidth: 1.5,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  cardImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#EEEEEE",
  },
  cardBody: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 17,
    fontWeight: "900",
    color: "#212121",
  },
  cardAddress: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#757575",
  },
  cardRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardRatingText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#212121",
  },
  cardDetails: {
    marginTop: 8,
    fontSize: 13,
    color: "#757575",
  },
  cardBottomRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "950",
    color: "#E53935",
  },
  cardNights: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#757575",
  },
  cancelPill: {
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E53935",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "800",
    color: "#212121",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#757575",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "75%",
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: "#EEEEEE",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#212121",
    flex: 1,
    marginRight: 10,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScrollContent: {
    padding: 16,
    gap: 12,
  },
  modalOfferCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FAFAFA",
    justifyContent: "space-between",
    gap: 12,
  },
  modalOfferInfo: {
    flex: 1.3,
    justifyContent: "space-between",
  },
  modalRoomCategory: {
    fontSize: 16,
    fontWeight: "850",
    color: "#212121",
    marginBottom: 4,
  },
  modalRoomDesc: {
    fontSize: 12,
    color: "#757575",
    lineHeight: 16,
    marginBottom: 6,
  },
  modalRoomMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modalRoomMetaText: {
    fontSize: 12,
    color: "#757575",
    fontWeight: "600",
  },
  modalOfferAction: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  modalOfferPrice: {
    fontSize: 18,
    fontWeight: "950",
    color: "#E53935",
  },
  modalOfferNightText: {
    fontSize: 11,
    color: "#757575",
    fontWeight: "600",
    marginBottom: 6,
  },
  modalSelectBtn: {
    backgroundColor: "#E53935",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSelectBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  modalEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  modalEmptyText: {
    fontSize: 14,
    color: "#757575",
    fontWeight: "600",
  },
  cardCategory: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "750",
    color: "#E53935",
  },
  roomCategoryText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "750",
    color: "#424242",
  },
  facilitiesText: {
    marginTop: 3,
    fontSize: 12,
    color: "#616161",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  cardPublishedPrice: {
    fontSize: 14,
    color: "#757575",
    textDecorationLine: "line-through",
  },
  discountPill: {
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#2E7D32",
  },
});
