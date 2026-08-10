import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getHotelInfo, getHotelRoom } from "../../../services/hotelService";
import { useHotelBooking } from "../../../context/HotelBookingContext";

const formatCurrency = (value, currency = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function HotelOfferDetailsScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const {
    session,
    searchParams,
    selectedHotel: contextSelectedHotel,
    setHotelDetailsData,
    setSelectedRooms,
  } = useHotelBooking();

  const routeParams = route?.params || {};
  const activeHotel = routeParams.hotel || contextSelectedHotel || {};

  const targetTraceId = String(routeParams.traceId || session.traceId || activeHotel.traceId || "");
  const targetSrdvType = String(routeParams.srdvType || session.srdvType || activeHotel.srdvType || "MixAPI");
  const targetSrdvIndex = String(routeParams.srdvIndex || session.srdvIndex || activeHotel.srdvIndex || "15");
  const targetResultIndex = String(routeParams.resultIndex || activeHotel.resultIndex || activeHotel.hotelCode || "");
  const targetHotelCode = String(routeParams.hotelCode || activeHotel.hotelCode || activeHotel.resultIndex || "");

  const requiredRoomCount = Number(searchParams?.noOfRooms || searchParams?.rooms || 1);

  const [hotelDetails, setHotelDetails] = useState(null);
  const [roomsList, setRoomsList] = useState([]);
  const [selectedRoomSlots, setSelectedRoomSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomError, setRoomError] = useState("");

  useEffect(() => {
    fetchHotelDetailsAndRooms();
  }, [targetResultIndex, targetHotelCode, targetTraceId]);

  const fetchHotelDetailsAndRooms = async () => {
    setLoading(true);
    setError("");
    setRoomError("");
    try {
      console.log("[HotelOfferDetailsScreen] Fetching live hotel info & rooms:", {
        TraceId: targetTraceId,
        SrdvType: targetSrdvType,
        SrdvIndex: targetSrdvIndex,
        ResultIndex: targetResultIndex,
        HotelCode: targetHotelCode,
      });

      const payload = {
        TraceId: targetTraceId,
        SrdvType: targetSrdvType,
        SrdvIndex: targetSrdvIndex,
        ResultIndex: targetResultIndex,
        HotelCode: targetHotelCode,
      };

      // Step 2: Call GetHotelInfo FIRST (required by supplier API session)
      let fetchedDetails = null;
      try {
        const infoRes = await getHotelInfo(payload);
        fetchedDetails = infoRes?.hotelInfoResult?.hotelDetails;
        if (fetchedDetails) {
          setHotelDetails(fetchedDetails);
        } else {
          throw new Error("Hotel details missing in Info API response");
        }
      } catch (infoErr) {
        console.log("[HotelOfferDetailsScreen] getHotelInfo notice:", infoErr?.message);
        fetchedDetails = {
          hotelName: activeHotel.name || activeHotel.hotelName || "Hotel Details",
          hotelCode: targetHotelCode,
          starRating: activeHotel.rating || 4,
          address: activeHotel.address || "Address unavailable",
          city: searchParams?.cityCode || "",
          images: activeHotel.images || [],
        };
        setHotelDetails(fetchedDetails);
      }

      // Step 3: Call GetHotelRoom AFTER GetHotelInfo completes on supplier session
      try {
        const roomsRes = await getHotelRoom(payload);
        const roomResData = roomsRes?.getHotelRoomResult || {};
        const roomsData = roomResData.hotelRoomsDetails || roomResData.HotelRoomDetails || [];

        if (Array.isArray(roomsData) && roomsData.length > 0) {
          setRoomsList(roomsData);
          setHotelDetailsData(fetchedDetails || {}, roomsData);

          // Auto pre-select initial room slots
          const initialSlots = [];
          let flatRoomItems = [];
          roomsData.forEach((cat) => {
            (cat.rooms || []).forEach((rm) => {
              flatRoomItems.push({
                ...rm,
                categoryName: cat.categoryName,
              });
            });
          });

          if (flatRoomItems.length > 0) {
            for (let i = 0; i < requiredRoomCount; i++) {
              const roomToPick = flatRoomItems[i] || flatRoomItems[0];
              initialSlots.push({
                ...roomToPick,
                slotIndex: i + 1,
                traceId: targetTraceId,
                srdvType: targetSrdvType,
                srdvIndex: targetSrdvIndex,
                resultIndex: targetResultIndex,
                hotelCode: targetHotelCode,
              });
            }
          }
          setSelectedRoomSlots(initialSlots);
        } else {
          setRoomError("No room inventory available for this hotel on your selected dates.");
        }
      } catch (roomErr) {
        const roomErrMsg = roomErr?.message || "Room inventory request failed.";
        console.log("[HotelOfferDetailsScreen] getHotelRoom error:", roomErrMsg);
        
        if (roomErrMsg.toLowerCase().includes("trace id")) {
          setRoomError("Your search session expired (Trace ID timeout). Please search again to get fresh live rates.");
        } else {
          setRoomError(roomErrMsg || "No room inventory available for this hotel.");
        }
      }
    } catch (err) {
      console.log("[HotelOfferDetailsScreen] General fetch error:", err?.message);
      setError(err?.message || "Unable to retrieve hotel details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoomForSlot = (slotIdx, roomObj, categoryName) => {
    setSelectedRoomSlots((prev) => {
      const nextSlots = [...prev];
      nextSlots[slotIdx] = {
        ...roomObj,
        categoryName,
        slotIndex: slotIdx + 1,
        traceId: targetTraceId,
        srdvType: targetSrdvType,
        srdvIndex: targetSrdvIndex,
        resultIndex: targetResultIndex,
        hotelCode: targetHotelCode,
      };
      return nextSlots;
    });
  };

  const handleContinue = () => {
    if (!hotelDetails) return;
    if (selectedRoomSlots.length < requiredRoomCount) {
      Alert.alert("Select Room", `Please select all ${requiredRoomCount} room(s) before proceeding.`);
      return;
    }

    setSelectedRooms(selectedRoomSlots);

    navigation.navigate("HotelPassengerDetails", {
      hotel: {
        hotelId: hotelDetails.hotelCode || targetHotelCode,
        hotelCode: hotelDetails.hotelCode || targetHotelCode,
        name: hotelDetails.hotelName || activeHotel.name || "Hotel",
        address: hotelDetails.address,
        rating: hotelDetails.starRating,
        images: hotelDetails.images || [],
        latitude: hotelDetails.latitude,
        longitude: hotelDetails.longitude,
        traceId: targetTraceId,
        srdvType: targetSrdvType,
        srdvIndex: targetSrdvIndex,
        resultIndex: targetResultIndex,
      },
      selectedRoomSlots,
      searchContext: {
        ...searchParams,
        traceId: targetTraceId,
        srdvType: targetSrdvType,
        srdvIndex: targetSrdvIndex,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Fetching live hotel details & room rates...</Text>
      </SafeAreaView>
    );
  }

  if (error || !hotelDetails) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error || "Hotel information is currently unavailable."}</Text>
        <Pressable style={styles.retryBtn} onPress={fetchHotelDetailsAndRooms}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Back to Search Results</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const galleryImages = Array.isArray(hotelDetails.images) && hotelDetails.images.length > 0
    ? hotelDetails.images.map(img => typeof img === "object" ? (img?.image || img?.url || "") : String(img)).filter(Boolean)
    : (hotelDetails.hotelPicture ? [hotelDetails.hotelPicture] : []);

  const facilities = Array.isArray(hotelDetails.hotelFacilities) ? hotelDetails.hotelFacilities : [];
  const attractions = Array.isArray(hotelDetails.attractions) ? hotelDetails.attractions : [];

  const descriptionText = (() => {
    if (Array.isArray(hotelDetails?.description) && hotelDetails.description.length > 0) {
      return hotelDetails.description
        .map((d) => (typeof d === "object" ? d?.text || d?.description || "" : String(d)))
        .filter(Boolean)
        .join("\n");
    } else if (typeof hotelDetails?.description === "string" && hotelDetails.description.trim()) {
      return hotelDetails.description.trim();
    }
    return "Hotel description not provided by supplier.";
  })();

  const totalPriceSum = selectedRoomSlots.reduce((sum, slot) => {
    const priceVal = slot?.price?.offeredPrice || slot?.offeredPrice || 0;
    return sum + Number(priceVal);
  }, 0);

  const displayCurrency = selectedRoomSlots[0]?.price?.currencyCode || "INR";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {hotelDetails.hotelName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Live Gallery Slider */}
        {galleryImages.length > 0 ? (
          <View style={styles.sliderWrap}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width }}>
              {galleryImages.map((img, idx) => (
                <Image key={idx} source={{ uri: img }} style={[styles.sliderImage, { width }]} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.noImageGalleryBox}>
            <Ionicons name="image-outline" size={40} color="#94A3B8" />
            <Text style={styles.noImageGalleryText}>No hotel images provided by supplier</Text>
          </View>
        )}

        {/* Hotel Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.hotelName}>{hotelDetails.hotelName}</Text>
          <View style={styles.ratingRow}>
            {Array.from({ length: Math.max(1, Math.round(hotelDetails.starRating || 4)) }).map((_, idx) => (
              <Ionicons key={idx} name="star" size={14} color="#F59E0B" />
            ))}
            <Text style={styles.ratingText}>{hotelDetails.starRating || 4} Star Hotel</Text>
          </View>
          {hotelDetails.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color="#EF4444" style={{ marginTop: 2 }} />
              <Text style={styles.hotelAddress}>
                {[hotelDetails.address, hotelDetails.city, hotelDetails.state, hotelDetails.countryName, hotelDetails.pinCode].filter(Boolean).join(", ")}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>DESCRIPTION</Text>
          <Text style={styles.description}>{descriptionText}</Text>
        </View>

        {/* Amenities */}
        {facilities.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>AMENITIES & FACILITIES</Text>
            <View style={styles.facilitiesRow}>
              {facilities.map((fac, idx) => {
                const displayName = typeof fac === "object" ? (fac?.name || fac?.detail || "") : String(fac);
                if (!displayName) return null;
                return (
                  <View key={idx} style={styles.facilityChip}>
                    <Text style={styles.facilityChipText}>{displayName}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Attractions */}
        {attractions.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>NEARBY ATTRACTIONS</Text>
            {attractions.map((att, idx) => {
              const displayName = typeof att === "object" ? (att?.name || att?.detail || "") : String(att);
              if (!displayName) return null;
              return (
                <View key={idx} style={styles.attractionItem}>
                  <Ionicons name="compass-outline" size={16} color="#EF4444" />
                  <Text style={styles.attractionText}>{displayName}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Room Inventory Selection Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>AVAILABLE ROOMS ({requiredRoomCount} Requested)</Text>

          {roomError ? (
            <View style={styles.roomErrorContainer}>
              <Ionicons name="calendar-outline" size={36} color="#DC2626" />
              <Text style={styles.roomErrorTitle}>No Rooms Currently Available</Text>
              <Text style={styles.roomErrorSub}>{roomError}</Text>

              <Pressable
                style={styles.newSearchBtn}
                onPress={() => navigation.navigate("DashBoard", { screen: "Hotels" })}
              >
                <Text style={styles.newSearchBtnText}>Start New Search</Text>
              </Pressable>
            </View>
          ) : roomsList.length > 0 ? (
            Array.from({ length: requiredRoomCount }).map((_, slotIdx) => {
              const currentSlot = selectedRoomSlots[slotIdx];

              return (
                <View key={`slot-${slotIdx}`} style={styles.slotBlock}>
                  <Text style={styles.slotTitle}>Room {slotIdx + 1} Choice</Text>

                  {roomsList.map((cat, catIdx) => (
                    <View key={`cat-${catIdx}`}>
                      <Text style={styles.categoryHeader}>{cat.categoryName}</Text>
                      {(cat.rooms || []).map((rm, rIdx) => {
                        const isSelected = currentSlot?.roomId === rm.roomId;
                        const rmPrice = rm.price?.offeredPrice || rm.offeredPrice || 0;

                        return (
                          <Pressable
                            key={`rm-${catIdx}-${rIdx}`}
                            style={[styles.roomOptionCard, isSelected && styles.roomOptionCardSelected]}
                            onPress={() => handleSelectRoomForSlot(slotIdx, rm, cat.categoryName)}
                          >
                            <View style={styles.roomOptionHeader}>
                              <Text style={styles.roomOptionName}>{rm.roomTypeName || rm.roomTypeCategory || cat.categoryName}</Text>
                              <Text style={styles.roomOptionPrice}>{formatCurrency(rmPrice, displayCurrency)}</Text>
                            </View>

                            {rm.description && rm.description.filter(d => Boolean(d && String(d).trim())).length > 0 ? (
                              <Text style={styles.roomOptionDesc} numberOfLines={2}>
                                {rm.description.filter(d => Boolean(d && String(d).trim())).join(" · ")}
                              </Text>
                            ) : null}

                            {Array.isArray(rm.amenities) && rm.amenities.length > 0 ? (
                              <View style={styles.roomAmenitiesRow}>
                                {rm.amenities.map((am, amIdx) => {
                                  const amName = typeof am === "object" ? (am?.name || am?.detail || "") : String(am);
                                  if (!amName) return null;
                                  return (
                                    <View key={amIdx} style={styles.roomAmenityChip}>
                                      <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
                                      <Text style={styles.roomAmenityChipText}>{amName}</Text>
                                    </View>
                                  );
                                })}
                              </View>
                            ) : null}

                            <View style={styles.roomOptionBottom}>
                              <View style={styles.flagRow}>
                                {rm.isPANMandatory ? <Text style={styles.flagBadge}>PAN Required</Text> : null}
                                {rm.isPassportMandatory ? <Text style={styles.flagBadge}>Passport Required</Text> : null}
                              </View>
                              <View style={[styles.selectRadio, isSelected && styles.selectRadioActive]}>
                                {isSelected && <View style={styles.selectRadioInner} />}
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              );
            })
          ) : null}
        </View>
      </ScrollView>

      {/* Footer */}
      {!roomError && roomsList.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>TOTAL PRICE</Text>
            <Text style={styles.priceValue}>{formatCurrency(totalPriceSum, displayCurrency)}</Text>
          </View>
          <Pressable style={styles.continueBtn} onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Proceed to Checkout</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 15,
    color: "#DC2626",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  retryBtn: {
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
  backLink: {
    marginTop: 12,
  },
  backLinkText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 13,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 12,
  },
  sliderWrap: {
    height: 220,
    backgroundColor: "#E2E8F0",
  },
  sliderImage: {
    height: 220,
  },
  noImageGalleryBox: {
    height: 160,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  noImageGalleryText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hotelName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "700",
    marginLeft: 6,
  },
  addressRow: {
    flexDirection: "row",
    gap: 6,
  },
  hotelAddress: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  facilitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  facilityChip: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  facilityChipText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "700",
  },
  attractionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  attractionText: {
    fontSize: 12,
    color: "#334155",
  },
  roomErrorContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  roomErrorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },
  roomErrorSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16,
  },
  newSearchBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newSearchBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  slotBlock: {
    marginBottom: 16,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  categoryHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 6,
    marginBottom: 4,
  },
  roomOptionCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 8,
  },
  roomOptionCardSelected: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  roomOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomOptionName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  roomOptionPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#EF4444",
  },
  roomOptionDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  roomAmenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  roomAmenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  roomAmenityChipText: {
    fontSize: 10,
    color: "#15803D",
    fontWeight: "700",
  },
  roomOptionBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  flagRow: {
    flexDirection: "row",
    gap: 6,
  },
  flagBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  selectRadioActive: {
    borderColor: "#EF4444",
  },
  selectRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#EF4444",
  },
  continueBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});
