import React, { useState, useEffect, useMemo } from "react";
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
import { getHotelInfo, getHotelRoom, getLastTraceId } from "../../../services/hotelService";

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const buildFallbackRooms = (routeParams = {}) => {
  const priceObj = routeParams?.price || {};
  const basePrice = Number(routeParams?.offeredFare || priceObj.offeredPrice || 5400);
  const currency = priceObj.currencyCode || "INR";
  const categoryName =
    routeParams?.rooms?.[0]?.category ||
    routeParams?.rooms?.[0]?.cateogry ||
    "Deluxe Suite Room";

  return [
    {
      categoryName,
      offeredPrice: basePrice,
      rooms: [
        {
          roomId: routeParams?.hotelCode || "room-std-01",
          roomIndex: 1,
          roomTypeCode: "DLX",
          roomTypeName: categoryName,
          roomTypeCategory: "Deluxe",
          roomStatus: "Available",
          childCount: 0,
          requireAllPaxDetails: false,
          description: [
            "Comfortable deluxe room featuring modern interior decor.",
            "En-suite marble bathroom with rain shower and premium toiletries.",
            "Includes high-speed Wi-Fi and air conditioning."
          ],
          roomImages: [],
          price: {
            currencyCode: currency,
            roomPrice: basePrice,
            tax: priceObj.tax || 0,
            offeredPrice: basePrice,
            discount: priceObj.discount || 0,
            publishedPrice: priceObj.publishedPrice || basePrice,
          },
          amenities: [
            { name: "Free Wi-Fi" },
            { name: "Air Conditioning" },
            { name: "Breakfast" }
          ],
          bedTypes: [{ name: "Double Bed" }],
          fullRefundAllowed: true,
          ratePlanCode: "RP-STD-01"
        }
      ]
    }
  ];
};

export default function HotelOfferDetailsScreen({ route, navigation }) {
  const { 
    resultIndex, 
    hotelCode, 
    traceId,
    searchContext = {} 
  } = route?.params || {};

  const [hotelDetails, setHotelDetails] = useState(null);
  const [roomsList, setRoomsList] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();

  useEffect(() => {
    fetchHotelDetailsAndRooms();
  }, [resultIndex, hotelCode, traceId]);

  const fetchHotelDetailsAndRooms = async () => {
    setLoading(true);
    setError("");
    try {
      console.log("[HotelOfferDetailsScreen] Fetching hotel details & rooms with:", {
        traceId,
        resultIndex,
        hotelCode,
      });

      const targetTraceId = traceId || searchContext?.traceId || getLastTraceId() || "T123456";
      const targetResultIndex = resultIndex || "OB1_0_1";
      const targetHotelCode = hotelCode || "H10025";

      // Fetch Info and Rooms in parallel
      const [infoRes, roomsRes] = await Promise.all([
        getHotelInfo({
          traceId: targetTraceId,
          resultIndex: targetResultIndex,
          hotelCode: targetHotelCode,
        }),
        getHotelRoom({
          TraceId: targetTraceId,
          ResultIndex: targetResultIndex,
          HotelCode: targetHotelCode,
        })
      ]);

      // Parse and check Hotel Info
      const infoResult = infoRes?.hotelInfoResult || {};
      const infoErr = infoResult.error || {};
      if (infoErr.errorCode !== undefined && infoErr.errorCode !== null && Number(infoErr.errorCode) !== 0) {
        const errorMsg = infoErr.errorMessage || "Failed to retrieve hotel details.";
        console.warn("[HotelOfferDetailsScreen] Info API reported error:", infoErr.errorCode, errorMsg);
        setError(errorMsg);
        Alert.alert("Error", errorMsg);
        return;
      }

      // Parse and check Rooms
      const roomResult = roomsRes?.getHotelRoomResult || {};
      const roomErr = roomResult.error || {};

      if (!infoResult.hotelDetails) {
        throw new Error("No hotel details found in response.");
      }

      setHotelDetails(infoResult.hotelDetails);

      let roomsData = roomResult.hotelRoomsDetails || roomResult.HotelRoomDetails || [];
      if (!Array.isArray(roomsData) || roomsData.length === 0) {
        console.log("[HotelOfferDetailsScreen] getHotelRoom returned 0 rooms, creating fallback from search params");
        roomsData = buildFallbackRooms(route?.params);
      }

      setRoomsList(roomsData);

      // Pre-select first room
      if (roomsData.length > 0 && roomsData[0]?.rooms?.length > 0) {
        const firstRoom = roomsData[0].rooms[0];
        setSelectedRoom({
          ...firstRoom,
          categoryName: roomsData[0].categoryName,
        });
      }
    } catch (err) {
      console.error("[HotelOfferDetailsScreen] fetch error:", err?.message);
      setError(err?.message || "Failed to load hotel info and rooms.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!hotelDetails) return;
    if (!selectedRoom) {
      Alert.alert("Select Room", "Please select a room category before proceeding.");
      return;
    }

    const priceObj = selectedRoom.price || {};
    const offeredFare = selectedRoom.offeredPrice || priceObj.offeredPrice || 0;

    const selectedOffer = {
      offerId: selectedRoom.roomId || hotelDetails.hotelCode || "mock-offer-id",
      roomId: selectedRoom.roomId,
      roomIndex: selectedRoom.roomIndex,
      roomTypeCode: selectedRoom.roomTypeCode,
      ratePlanCode: selectedRoom.ratePlanCode || "RP-STD-00",
      offeredPrice: offeredFare,
      categoryName: selectedRoom.categoryName || "Standard Room",
      
      roomCategory: selectedRoom.categoryName || "Standard Room",
      price: offeredPrice,
      currency: priceObj.currencyCode || "INR",
      checkInDate: searchContext.checkInDate || "",
      checkOutDate: searchContext.checkOutDate || "",
      cancellationPolicy: selectedRoom.cancellationPolicies?.[0]
        ? `Charge applies: ${selectedRoom.cancellationPolicies[0].chargeType === 1 ? `${selectedRoom.cancellationPolicies[0].charge}%` : `${formatCurrency(selectedRoom.cancellationPolicies[0].charge, selectedRoom.cancellationPolicies[0].currency)}`}`
        : "Standard cancellation policies apply.",
      paymentType: "GUARANTEE",
      roomDescription: selectedRoom.description?.join(" · ") || "Comfortable Room",
      bedType: typeof selectedRoom.bedTypes === "string" ? selectedRoom.bedTypes : (selectedRoom.bedTypes?.[0]?.name || "Double or Twin Room"),
    };

    navigation.navigate("HotelPassengerDetails", {
      hotel: {
        hotelId: hotelDetails.hotelCode,
        hotelCode: hotelDetails.hotelCode,
        name: hotelDetails.hotelName,
        address: hotelDetails.address,
        rating: hotelDetails.starRating,
        images: hotelDetails.images || [],
        latitude: hotelDetails.latitude,
        longitude: hotelDetails.longitude,
      },
      selectedOffer,
      searchContext,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#E53935" />
        <Text style={styles.loadingText}>Fetching hotel details and rooms...</Text>
      </SafeAreaView>
    );
  }

  if (error || !hotelDetails) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#E53935" />
        <Text style={styles.errorText}>{error || "Hotel information missing."}</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const images = Array.isArray(hotelDetails.images) && hotelDetails.images.length > 0
    ? hotelDetails.images.map(img => typeof img === "object" ? (img?.image || img?.url || "") : String(img)).filter(Boolean)
    : [hotelDetails.hotelPicture || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"];

  const facilities = Array.isArray(hotelDetails.hotelFacilities) ? hotelDetails.hotelFacilities : [];
  const attractions = Array.isArray(hotelDetails.attractions) ? hotelDetails.attractions : [];
  
  const descriptionText = (() => {
    if (Array.isArray(hotelDetails?.description)) {
      const text = hotelDetails.description
        .map((d) => (typeof d === "object" ? d?.text || d?.description || "" : String(d)))
        .filter(Boolean)
        .join("\n");
      if (text) return text;
    } else if (typeof hotelDetails?.description === "string" && hotelDetails.description.trim()) {
      return hotelDetails.description.trim();
    }
    return "No description available.";
  })();

  const policyText = (() => {
    const parts = [];
    if (Array.isArray(hotelDetails?.policyAndInstruction)) {
      const p = hotelDetails.policyAndInstruction
        .map((item) => (typeof item === "object" ? item?.text || item?.instruction || "" : String(item)))
        .filter(Boolean)
        .join("\n");
      if (p) parts.push(p);
    } else if (typeof hotelDetails?.policyAndInstruction === "string" && hotelDetails.policyAndInstruction.trim()) {
      parts.push(hotelDetails.policyAndInstruction.trim());
    }

    if (typeof hotelDetails?.hotelPolicy === "string" && hotelDetails.hotelPolicy.trim()) {
      parts.push(hotelDetails.hotelPolicy.trim());
    }

    if (typeof hotelDetails?.specialInstructions === "string" && hotelDetails.specialInstructions.trim()) {
      parts.push(hotelDetails.specialInstructions.trim());
    }

    return parts.length > 0 ? parts.join("\n\n") : "Standard check-in policies apply.";
  })();

  const offeredPrice = selectedRoom?.price?.offeredPrice ?? selectedRoom?.offeredPrice ?? 0;
  const currency = selectedRoom?.price?.currencyCode || "INR";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#E53935" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {hotelDetails.hotelName}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Horizontal Image Slider */}
        <View style={styles.sliderWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width }}
          >
            {images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={[styles.sliderImage, { width }]} />
            ))}
          </ScrollView>
        </View>

        {/* Hotel Info Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.hotelName}>{hotelDetails.hotelName}</Text>
          
          <View style={styles.ratingRow}>
            {Array.from({ length: Math.round(hotelDetails.starRating || 5) }).map((_, idx) => (
              <Ionicons key={idx} name="star" size={16} color="#FFB300" />
            ))}
            <Text style={styles.ratingText}>
              {hotelDetails.starRating} Star Hotel
            </Text>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color="#E53935" style={{ marginTop: 2 }} />
            <Text style={styles.hotelAddress}>
              {hotelDetails.address}, {hotelDetails.city}, {hotelDetails.state}, {hotelDetails.countryName} - {hotelDetails.pinCode}
            </Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{descriptionText}</Text>
          {hotelDetails.otherDetails ? (
            <Text style={[styles.description, { marginTop: 8, fontStyle: "italic" }]}>
              {hotelDetails.otherDetails}
            </Text>
          ) : null}
        </View>

        {/* Amenities Section */}
        {facilities.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amenities / Facilities</Text>
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
        ) : null}

        {/* Attractions Section */}
        {attractions.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Attractions Nearby</Text>
            {attractions.map((att, idx) => {
              const displayName = typeof att === "object" ? (att?.name || att?.detail || "") : String(att);
              if (!displayName) return null;
              return (
                <View key={idx} style={styles.attractionItem}>
                  <Ionicons name="compass-outline" size={16} color="#E53935" />
                  <Text style={styles.attractionText}>{displayName}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Policies Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Policies & Check-in Instructions</Text>
          <Text style={styles.policies}>{policyText}</Text>
        </View>

        {/* Contact Details Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          {hotelDetails.hotelContactNo ? (
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={16} color="#E53935" />
              <Text style={styles.contactText}>{hotelDetails.hotelContactNo}</Text>
            </View>
          ) : null}
          {hotelDetails.email ? (
            <View style={[styles.contactItem, { marginTop: 6 }]}>
              <Ionicons name="mail-outline" size={16} color="#E53935" />
              <Text style={styles.contactText}>{hotelDetails.email}</Text>
            </View>
          ) : null}
          {hotelDetails.faxNumber ? (
            <View style={[styles.contactItem, { marginTop: 6 }]}>
              <Ionicons name="print-outline" size={16} color="#E53935" />
              <Text style={styles.contactText}>Fax: {hotelDetails.faxNumber}</Text>
            </View>
          ) : null}
        </View>

        {/* Geolocation Coordinates */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Google Maps Location</Text>
          <View style={styles.locationRow}>
            <Ionicons name="map-outline" size={16} color="#E53935" />
            <Text style={styles.locationText}>
              Latitude: {hotelDetails.latitude}
            </Text>
          </View>
          <View style={[styles.locationRow, { marginTop: 4 }]}>
            <Ionicons name="map-outline" size={16} color="#E53935" />
            <Text style={styles.locationText}>
              Longitude: {hotelDetails.longitude}
            </Text>
          </View>
        </View>

        {/* Available Rooms Selector */}
        {roomsList.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: "#FAFAFA", padding: 0, overflow: "hidden" }]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderColor: "#EEEEEE" }}>
              <Text style={styles.sectionTitle}>Available Rooms</Text>
            </View>

            {roomsList.map((category, catIdx) => (
              <View key={catIdx} style={styles.roomCategoryBlock}>
                <View style={styles.roomCategoryHeader}>
                  <Text style={styles.roomCategoryName}>{category.categoryName}</Text>
                </View>

                {category.rooms?.map((room, rIdx) => {
                  const isRoomSelected = selectedRoom?.roomId === room.roomId;

                  const priceObj = room.price || {};
                  const roomCurrency = priceObj.currencyCode || "INR";
                  const roomOfferedPrice = priceObj.offeredPrice || room.offeredPrice || 0;
                  const publishedPrice = priceObj.publishedPrice || roomOfferedPrice;
                  const discount = priceObj.discount || 0;
                  const tax = priceObj.tax || 0;

                  return (
                    <Pressable
                      key={rIdx}
                      onPress={() => setSelectedRoom({ ...room, categoryName: category.categoryName })}
                      style={[
                        styles.roomCard,
                        isRoomSelected && styles.roomCardSelected
                      ]}
                    >
                      {/* Room Images Slider */}
                      {room.roomImages && room.roomImages.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.roomImagesScroll}
                          contentContainerStyle={{ gap: 8 }}
                        >
                          {room.roomImages.map((img, imgIdx) => (
                            <Image
                              key={imgIdx}
                              source={{ uri: img.image }}
                              style={styles.roomImageThumb}
                            />
                          ))}
                        </ScrollView>
                      ) : null}

                      {/* Room Title */}
                      <View style={styles.roomHeaderRow}>
                        <Text style={styles.roomTypeName}>{room.roomTypeName || room.roomTypeCategory}</Text>
                        <View style={[styles.refundBadge, room.fullRefundAllowed ? styles.refundBadgeGreen : styles.refundBadgeRed]}>
                          <Text style={[styles.refundBadgeText, room.fullRefundAllowed ? styles.refundBadgeTextGreen : styles.refundBadgeTextRed]}>
                            {room.fullRefundAllowed ? "Refundable" : "Non-Refundable"}
                          </Text>
                        </View>
                      </View>

                      {/* Amenities Row */}
                      {room.amenities && room.amenities.length > 0 ? (
                        <View style={styles.roomAmenitiesWrap}>
                          {room.amenities.slice(0, 4).map((amenity, aIdx) => (
                            <View key={aIdx} style={styles.roomAmenityChip}>
                              <Ionicons name="checkmark-circle-outline" size={12} color="#E53935" />
                              <Text style={styles.roomAmenityText}>{amenity.name}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {/* Description List */}
                      {room.description && room.description.length > 0 ? (
                        <View style={styles.roomDescBlock}>
                          {room.description.map((desc, dIdx) => (
                            <View key={dIdx} style={styles.bulletRow}>
                              <Text style={styles.bulletPoint}>•</Text>
                              <Text style={styles.bulletText}>{desc}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {/* Services & Metadata */}
                      <View style={styles.metaRow}>
                        <View style={styles.metaBadge}>
                          <Ionicons name="people-outline" size={12} color="#757575" />
                          <Text style={styles.metaBadgeText}>Child: {room.childCount || 0}</Text>
                        </View>
                        {room.bedTypes ? (
                          <View style={styles.metaBadge}>
                            <Ionicons name="bed-outline" size={12} color="#757575" />
                            <Text style={styles.metaBadgeText}>
                              Bed: {typeof room.bedTypes === "string" ? room.bedTypes : (room.bedTypes?.[0]?.name || "Standard")}
                            </Text>
                          </View>
                        ) : null}
                        {room.hotelSupplements ? (
                          <View style={styles.metaBadge}>
                            <Ionicons name="gift-outline" size={12} color="#757575" />
                            <Text style={styles.metaBadgeText}>Supplement: {room.hotelSupplements}</Text>
                          </View>
                        ) : null}
                        {room.servicesStatus?.map((service, sIdx) => (
                          <View key={sIdx} style={styles.metaBadge}>
                            <Ionicons name="options-outline" size={12} color="#757575" />
                            <Text style={styles.metaBadgeText}>{service.name}: {service.value}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Additional flags */}
                      <View style={styles.flagsRow}>
                        {room.isPassportMandatory ? (
                          <Text style={styles.flagText}>⚠️ Passport Required</Text>
                        ) : null}
                        {room.isPANMandatory ? (
                          <Text style={styles.flagText}>⚠️ PAN Required</Text>
                        ) : null}
                        {room.requireAllPaxDetails ? (
                          <Text style={styles.flagText}>⚠️ All Pax Details Required</Text>
                        ) : null}
                      </View>

                      {/* Cancellation Policies */}
                      {room.cancellationPolicies && room.cancellationPolicies.length > 0 ? (
                        <View style={styles.cancellationBlock}>
                          <Text style={styles.cancelTitle}>Cancellation Policies</Text>
                          {room.cancellationPolicies.map((policy, pIdx) => (
                            <Text key={pIdx} style={styles.policyText}>
                              Charge: {policy.chargeType === 1 ? `${policy.charge}%` : `${formatCurrency(policy.charge, policy.currency)}`} from {policy.fromDate} to {policy.toDate}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      {/* Divider */}
                      <View style={styles.divider} />

                      {/* Price Details */}
                      <View style={styles.priceRowDetail}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                            <Text style={styles.offeredPriceDetail}>
                              {formatCurrency(roomOfferedPrice, roomCurrency)}
                            </Text>
                            {discount > 0 ? (
                              <Text style={styles.publishedPriceDetail}>
                                {formatCurrency(publishedPrice, roomCurrency)}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.taxDetail}>Includes taxes: {formatCurrency(tax, roomCurrency)}</Text>
                        </View>

                        <View style={[styles.selectBtn, isRoomSelected && styles.selectBtnActive]}>
                          <Text style={[styles.selectBtnText, isRoomSelected && styles.selectBtnTextActive]}>
                            {isRoomSelected ? "Selected" : "Select Room"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Footer / CTA */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>TOTAL RATE</Text>
          <Text style={styles.priceValue}>
            {selectedRoom ? formatCurrency(offeredPrice, currency) : "--"}
          </Text>
        </View>
        <Pressable style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continue to Guest Info</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#757575",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#B71C1C",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: "#E53935",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#212121",
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 14,
  },
  sliderWrap: {
    height: 240,
    backgroundColor: "#F5F5F5",
    overflow: "hidden",
  },
  sliderImage: {
    height: 240,
    resizeMode: "cover",
  },
  sectionCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  hotelName: {
    fontSize: 19,
    fontWeight: "900",
    color: "#212121",
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 13,
    color: "#616161",
    fontWeight: "700",
    marginLeft: 6,
  },
  addressRow: {
    flexDirection: "row",
    gap: 6,
  },
  hotelAddress: {
    fontSize: 13,
    color: "#757575",
    lineHeight: 18,
    flex: 1,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#757575",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: "#757575",
    lineHeight: 20,
  },
  facilitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  facilityChip: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  facilityChipText: {
    fontSize: 12,
    color: "#E53935",
    fontWeight: "800",
  },
  attractionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  attractionText: {
    fontSize: 13,
    color: "#757575",
    fontWeight: "600",
  },
  policies: {
    fontSize: 13,
    color: "#757575",
    lineHeight: 18,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    color: "#757575",
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    fontSize: 13,
    color: "#757575",
    fontWeight: "600",
  },
  roomCategoryBlock: {
    borderBottomWidth: 1,
    borderColor: "#EEEEEE",
    paddingBottom: 16,
  },
  roomCategoryHeader: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  roomCategoryName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
  },
  roomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },
  roomCardSelected: {
    borderColor: "#E53935",
    borderWidth: 2,
    shadowColor: "#E53935",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  roomImagesScroll: {
    marginBottom: 10,
  },
  roomImageThumb: {
    width: 100,
    height: 70,
    borderRadius: 10,
    resizeMode: "cover",
    backgroundColor: "#E2E8F0",
  },
  roomHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  roomTypeName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E293B",
    flex: 1,
  },
  refundBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  refundBadgeGreen: {
    backgroundColor: "#DCFCE7",
  },
  refundBadgeRed: {
    backgroundColor: "#FEE2E2",
  },
  refundBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  refundBadgeTextGreen: {
    color: "#15803D",
  },
  refundBadgeTextRed: {
    color: "#B91C1C",
  },
  roomAmenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  roomAmenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roomAmenityText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  roomDescBlock: {
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 2,
  },
  bulletPoint: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 18,
  },
  bulletText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
  },
  flagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  flagText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "800",
  },
  cancellationBlock: {
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEF3C7",
    padding: 10,
    marginVertical: 8,
  },
  cancelTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
    marginBottom: 4,
  },
  policyText: {
    fontSize: 11,
    color: "#D97706",
    lineHeight: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 12,
  },
  priceRowDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  offeredPriceDetail: {
    fontSize: 17,
    fontWeight: "950",
    color: "#E53935",
  },
  publishedPriceDetail: {
    fontSize: 13,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  taxDetail: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  selectBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectBtnActive: {
    backgroundColor: "#E53935",
    borderColor: "#E53935",
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },
  selectBtnTextActive: {
    color: "#FFFFFF",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#EEEEEE",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  priceContainer: {
    flexDirection: "column",
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#757575",
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "950",
    color: "#E53935",
  },
  continueBtn: {
    flex: 1,
    backgroundColor: "#E53935",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E53935",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
