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

import HotelHeader from "./hotelDetailsComponents/HotelHeader";
import HotelHero from "./hotelDetailsComponents/HotelHero";
import AmenitiesPreview from "./hotelDetailsComponents/AmenitiesPreview";
import AmenitiesBottomSheet from "./hotelDetailsComponents/AmenitiesBottomSheet";
import RoomCategoryCard from "./hotelDetailsComponents/RoomCategoryCard";
import RoomSelectionSheet from "./hotelDetailsComponents/RoomSelectionSheet";
import { getRatePlanKey } from "./hotelDetailsComponents/RoomRateOption";
import BookingBottomBar from "./hotelDetailsComponents/BookingBottomBar";
import { getHotelRoomFinalPrice } from "./hotelDetailsComponents/hotelPrice";
import AttractionsPreview from "./hotelDetailsComponents/AttractionsPreview";
import AboutHotelCard from "./hotelDetailsComponents/AboutHotelCard";
import {
  HotelInformationSection,
  HotelPoliciesSection,
} from "./hotelDetailsComponents/HotelInfoSections";

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

  const targetTraceId = String(routeParams.traceId || activeHotel.traceId || session.traceId || "");
  const targetSrdvType = String(routeParams.srdvType || activeHotel.srdvType || session.srdvType || "MixAPI");
  const targetSrdvIndex = String(routeParams.srdvIndex || activeHotel.srdvIndex || session.srdvIndex || "15");
  const targetResultIndex = String(routeParams.resultIndex || activeHotel.resultIndex || activeHotel.hotelCode || "");
  const targetHotelCode = String(routeParams.hotelCode || activeHotel.hotelCode || activeHotel.resultIndex || "");

  const requiredRoomCount = Number(searchParams?.noOfRooms || searchParams?.rooms || 1);

  const [hotelDetails, setHotelDetails] = useState(null);
  const [roomsList, setRoomsList] = useState([]);
  const [selectedRoomSlots, setSelectedRoomSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomError, setRoomError] = useState("");

  const [amenitiesVisible, setAmenitiesVisible] = useState(false);
  const [sheetConfig, setSheetConfig] = useState({
    visible: false,
    slotIdx: 0,
    categoryName: "",
    rooms: [],
  });

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
        console.log("[HotelOfferDetailsScreen] hotel info parsed:", JSON.stringify(fetchedDetails, null, 2));
        if (fetchedDetails) {
          setHotelDetails(fetchedDetails);
        } else {
          throw new Error("Hotel details missing in Info API response");
        }
      } catch (infoErr) {
        console.log("[HotelOfferDetailsScreen] getHotelInfo notice:", infoErr?.message);
        const fallbackPic = activeHotel.hotelPicture || routeParams.hotelPicture || "";
        const fallbackImgs = Array.isArray(activeHotel.images) && activeHotel.images.length > 0
          ? activeHotel.images
          : (fallbackPic ? [fallbackPic] : []);

        const fallbackFacilities = Array.isArray(activeHotel.facilities)
          ? activeHotel.facilities.flatMap(f => (f.facilitiesNames ? f.facilitiesNames.map(n => ({ name: n })) : (typeof f === "string" ? [{ name: f }] : [f])))
          : [];

        fetchedDetails = {
          hotelName: activeHotel.name || activeHotel.hotelName || routeParams.hotelName || "Hotel Details",
          hotelCode: targetHotelCode,
          starRating: activeHotel.rating || activeHotel.starRating || routeParams.starRating || 4,
          address: activeHotel.address || activeHotel.hotelAddress || routeParams.hotelAddress || "Address unavailable",
          city: activeHotel.city || activeHotel.cityName || searchParams?.cityCode || "",
          state: activeHotel.state || "",
          countryName: activeHotel.countryName || activeHotel.country || "India",
          pinCode: activeHotel.pinCode || "",
          hotelPicture: fallbackPic,
          images: fallbackImgs,
          hotelFacilities: fallbackFacilities,
        };
        setHotelDetails(fetchedDetails);
      }

      // Step 3: Call GetHotelRoom AFTER GetHotelInfo completes on supplier session
      let roomsData = [];
      try {
        const roomsRes = await getHotelRoom(payload);
        const roomResData = roomsRes?.getHotelRoomResult || {};
        roomsData = roomResData.hotelRoomsDetails || roomResData.HotelRoomDetails || [];
        console.log("[HotelOfferDetailsScreen] rooms parsed:", JSON.stringify(roomsData, null, 2));
      } catch (roomErr) {
        console.log("[HotelOfferDetailsScreen] getHotelRoom notice:", roomErr?.message);
      }

      // If live room API failed or returned empty, construct room offer from search results
      if (!Array.isArray(roomsData) || roomsData.length === 0) {
        if (activeHotel?.price || activeHotel?.offeredFare) {
          console.log("[HotelOfferDetailsScreen] Utilizing fallback room configuration from search results");
          const defaultPriceObj = activeHotel.price || {
            currencyCode: "INR",
            roomPrice: activeHotel.offeredFare || 0,
            offeredPrice: activeHotel.offeredFare || 0,
            publishedPrice: activeHotel.offeredFare || 0,
            tax: 0,
            extraGuestCharge: 0,
            childCharge: 0,
            otherCharges: 0,
            discount: 0,
            agentMarkUp: 50,
            b2CBasePrice: (activeHotel.offeredFare || 0) + 50,
            b2CTotalPrice: (activeHotel.offeredFare || 0) + 50,
          };

          const rawFacilities = Array.isArray(activeHotel.facilities)
            ? activeHotel.facilities.flatMap(f => f.facilitiesNames || (typeof f === "string" ? [f] : []))
            : ["Free Wi-Fi", "Air Conditioning", "Daily Housekeeping"];

          const roomPhoto = activeHotel.hotelPicture || routeParams.hotelPicture || (activeHotel.images && activeHotel.images[0]) || "";

          roomsData = [
            {
              categoryName: "Standard Room",
              rooms: [
                {
                  roomId: `room-${targetHotelCode || "std"}-1`,
                  roomTypeCode: "STD",
                  roomTypeName: "Standard Room - Best Available Rate",
                  ratePlanCode: "EP",
                  ratePlan: "Room Only",
                  price: defaultPriceObj,
                  offeredPrice: defaultPriceObj.offeredPrice || activeHotel.offeredFare || 0,
                  roomImages: roomPhoto ? [{ image: roomPhoto }] : [],
                  amenities: rawFacilities.length > 0 ? rawFacilities : ["Free Wi-Fi", "Air Conditioning"],
                  cancellationPolicy: "Standard refundable cancellation policy applies.",
                  bedTypes: "1 Double Bed or 2 Twin Beds",
                  smokingPreference: "NoPreference",
                },
              ],
            },
          ];
        }
      }

      if (Array.isArray(roomsData) && roomsData.length > 0) {
        console.log("[HotelOfferDetailsScreen] room categories available:", roomsData.length);
        setRoomsList(roomsData);
        setHotelDetailsData(fetchedDetails || {}, roomsData);

        // Only auto-select when the hotel exposes exactly one category with one rate plan.
        // When multiple rate plans exist, the guest must make the choice explicitly.
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

        const hasSingleRatePlan =
          roomsData.length === 1 &&
          Array.isArray(roomsData[0]?.rooms) &&
          roomsData[0].rooms.length === 1;

        if (hasSingleRatePlan && flatRoomItems.length > 0) {
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

  const handleOpenOptions = (slotIdx, categoryName, rooms) => {
    setSheetConfig({
      visible: true,
      slotIdx,
      categoryName,
      rooms,
    });
  };

  const handleSelectRoomFromSheet = (roomObj) => {
    handleSelectRoomForSlot(sheetConfig.slotIdx, roomObj, sheetConfig.categoryName);
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

  const galleryImages = (Array.isArray(hotelDetails.images) && hotelDetails.images.length > 0
    ? hotelDetails.images.map(img => typeof img === "object" ? (img?.image || img?.url || "") : String(img)).filter(Boolean)
    : [])
    .concat(
      hotelDetails.hotelPicture ? [hotelDetails.hotelPicture] : (activeHotel.hotelPicture ? [activeHotel.hotelPicture] : (routeParams.hotelPicture ? [routeParams.hotelPicture] : []))
    )
    .filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  const facilities = Array.isArray(hotelDetails.hotelFacilities) ? hotelDetails.hotelFacilities : [];

  const totalPriceSum = selectedRoomSlots.reduce((sum, slot) => {
    return sum + getHotelRoomFinalPrice(slot);
  }, 0);

  const displayCurrency = selectedRoomSlots[0]?.price?.currencyCode || "INR";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <HotelHeader 
        hotelName={hotelDetails.hotelName} 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <HotelHero 
          images={galleryImages}
          hotelName={hotelDetails.hotelName}
          starRating={hotelDetails.starRating}
          address={hotelDetails.address}
          city={hotelDetails.city}
          state={hotelDetails.state}
          countryName={hotelDetails.countryName}
          pinCode={hotelDetails.pinCode}
        />

        <AboutHotelCard description={hotelDetails.description} />

        <AmenitiesPreview 
          facilities={facilities} 
          onViewAllPress={() => setAmenitiesVisible(true)} 
        />

        <HotelPoliciesSection hotel={hotelDetails} />
        <HotelInformationSection hotel={hotelDetails} />
        <AttractionsPreview attractions={hotelDetails.attractions} />

        {/* Room Inventory Selection Section */}
        <View style={styles.roomsSection}>
          <Text style={styles.sectionTitle}>AVAILABLE ROOMS ({requiredRoomCount} Requested)</Text>

          {roomError ? (
            <View style={styles.roomErrorContainer}>
              <Ionicons name="calendar-outline" size={36} color="#DC2626" />
              <Text style={styles.roomErrorTitle}>No Rooms Currently Available</Text>
              <Text style={styles.roomErrorSub}>{roomError}</Text>

              <View style={styles.roomErrorActionRow}>
                <Pressable
                  style={styles.retryRoomBtn}
                  onPress={fetchHotelDetailsAndRooms}
                >
                  <Ionicons name="reload-outline" size={15} color="#0F172A" style={{ marginRight: 4 }} />
                  <Text style={styles.retryRoomBtnText}>Retry</Text>
                </Pressable>

                <Pressable
                  style={styles.newSearchBtn}
                  onPress={() => navigation.navigate("Hotels")}
                >
                  <Text style={styles.newSearchBtnText}>Start New Search</Text>
                </Pressable>
              </View>
            </View>
          ) : roomsList.length > 0 ? (
            Array.from({ length: requiredRoomCount }).map((_, slotIdx) => {
              const currentSlot = selectedRoomSlots[slotIdx];

              return (
                <View key={`slot-${slotIdx}`} style={styles.slotBlock}>
                  <Text style={styles.slotTitle}>Room {slotIdx + 1} Choice</Text>

                  {roomsList.map((cat, catIdx) => (
                    <RoomCategoryCard
                      key={`cat-${catIdx}`}
                      categoryName={cat.categoryName}
                      rooms={cat.rooms}
                      displayCurrency={displayCurrency}
                      selectedRatePlanKey={getRatePlanKey(currentSlot)}
                      onViewOptions={(categoryName, rooms) => handleOpenOptions(slotIdx, categoryName, rooms)}
                    />
                  ))}
                </View>
              );
            })
          ) : null}
        </View>
      </ScrollView>

      {!roomError && roomsList.length > 0 && (
        <BookingBottomBar 
          totalPrice={totalPriceSum}
          roomCount={selectedRoomSlots.length}
          requiredRoomCount={requiredRoomCount}
          displayCurrency={displayCurrency}
          onContinue={handleContinue}
          disabled={selectedRoomSlots.length < requiredRoomCount}
        />
      )}

      {/* Modals */}
      <AmenitiesBottomSheet 
        visible={amenitiesVisible}
        onClose={() => setAmenitiesVisible(false)}
        facilities={facilities}
      />

      <RoomSelectionSheet
        visible={sheetConfig.visible}
        onClose={() => setSheetConfig({ ...sheetConfig, visible: false })}
        categoryName={sheetConfig.categoryName}
        rooms={sheetConfig.rooms}
        selectedRatePlanKey={getRatePlanKey(selectedRoomSlots[sheetConfig.slotIdx])}
        onSelectRoom={handleSelectRoomFromSheet}
        displayCurrency={displayCurrency}
      />
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
  scrollContent: {
    paddingBottom: 32,
  },
  roomsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  roomErrorContainer: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    maxWidth: "90%",
  },
  roomErrorActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  retryRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryRoomBtnText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 13,
  },
  newSearchBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 18,
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
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
});
