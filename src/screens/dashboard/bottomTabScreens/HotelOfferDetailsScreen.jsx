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
import BookingBottomBar from "./hotelDetailsComponents/BookingBottomBar";

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

  const galleryImages = Array.isArray(hotelDetails.images) && hotelDetails.images.length > 0
    ? hotelDetails.images.map(img => typeof img === "object" ? (img?.image || img?.url || "") : String(img)).filter(Boolean)
    : (hotelDetails.hotelPicture ? [hotelDetails.hotelPicture] : []);

  const facilities = Array.isArray(hotelDetails.hotelFacilities) ? hotelDetails.hotelFacilities : [];

  const totalPriceSum = selectedRoomSlots.reduce((sum, slot) => {
    const priceVal = slot?.price?.offeredPrice || slot?.offeredPrice || 0;
    return sum + Number(priceVal);
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

        <AmenitiesPreview 
          facilities={facilities} 
          onViewAllPress={() => setAmenitiesVisible(true)} 
        />

        {/* Room Inventory Selection Section */}
        <View style={styles.roomsSection}>
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
                    <RoomCategoryCard
                      key={`cat-${catIdx}`}
                      categoryName={cat.categoryName}
                      rooms={cat.rooms}
                      displayCurrency={displayCurrency}
                      selectedRoomId={currentSlot?.roomId}
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
          roomCount={requiredRoomCount}
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
        selectedRoomId={selectedRoomSlots[sheetConfig.slotIdx]?.roomId}
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
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
});

