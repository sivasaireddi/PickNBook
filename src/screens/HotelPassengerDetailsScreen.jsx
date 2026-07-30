import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { bookHotelOffer, blockHotelRoom, validateHotelCoupon } from "../services/hotelService";
import HotelGallery from "../components/HotelGallery";
import HotelInfoCard from "../components/HotelInfoCard";
import HostCard from "../components/HostCard";
import StayHighlights from "../components/StayHighlights";
import RoomCard from "../components/RoomCard";
import GuestDetailsForm from "../components/GuestDetailsForm";
import FareSummaryCard from "../components/FareSummaryCard";
import AmenitiesBottomSheet from "../components/AmenitiesBottomSheet";

const logDev = (...args) => {
  if (__DEV__) console.log(...args);
};

const formatCurrency = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const isValidPhone = (value) => /^\d{10}$/.test(String(value || "").trim());

export default function HotelPassengerDetailsScreen({ navigation, route }) {
  const hotel = route?.params?.hotel || {};
  const selectedOfferFromRoute = route?.params?.selectedOffer || null;
  const searchContext = route?.params?.searchContext || {};
  const sheetRef = useRef(null);

  // Retrieve the full list of available room types for this hotel
  const offers = useMemo(() => {
    if (hotel?.offers && hotel.offers.length > 0) {
      return hotel.offers;
    }
    return selectedOfferFromRoute ? [selectedOfferFromRoute] : [];
  }, [hotel, selectedOfferFromRoute]);

  const requestedRooms = Number(searchContext?.rooms || route?.params?.searchParams?.rooms || 1);

  // roomQuantities holds quantity for each offerId
  const [roomQuantities, setRoomQuantities] = useState(() => {
    if (selectedOfferFromRoute?.offerId) {
      return { [selectedOfferFromRoute.offerId]: 1 };
    }
    return {};
  });

  const totalSelectedRooms = Object.values(roomQuantities).reduce((acc, q) => acc + q, 0);

  const handleIncrementRoom = (offerId) => {
    if (requestedRooms === 1) {
      setRoomQuantities({ [offerId]: 1 });
      return;
    }

    if (totalSelectedRooms >= requestedRooms) {
      Alert.alert(
        "Room Limit Reached",
        `You requested ${requestedRooms} room(s) during search. Please reduce another selection first to choose this room type.`
      );
      return;
    }
    setRoomQuantities((prev) => ({
      ...prev,
      [offerId]: (prev[offerId] || 0) + 1,
    }));
  };

  const handleDecrementRoom = (offerId) => {
    setRoomQuantities((prev) => {
      const updated = { ...prev };
      const currentQty = updated[offerId] || 0;
      if (currentQty <= 1) {
        delete updated[offerId];
      } else {
        updated[offerId] = currentQty - 1;
      }
      return updated;
    });
  };

  // Build sequential list of selected rooms
  const selectedRoomSlots = useMemo(() => {
    const slots = [];
    offers.forEach((offer) => {
      const qty = roomQuantities[offer.offerId] || 0;
      for (let i = 0; i < qty; i++) {
        slots.push(offer);
      }
    });
    return slots;
  }, [offers, roomQuantities]);

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");

  const totalRoomsPrice = useMemo(() => {
    return offers.reduce((total, offer) => {
      const qty = roomQuantities[offer.offerId] || 0;
      return total + (offer.price || 0) * qty;
    }, 0);
  }, [offers, roomQuantities]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert("Input Code", "Please enter a coupon code.");
      return;
    }
    setValidatingCoupon(true);
    setCouponMessage("");
    try {
      const priceToValidate = totalRoomsPrice || 0;
      const res = await validateHotelCoupon(couponCode, priceToValidate);
      if (res && res.valid) {
        setCouponDiscount(res.discount || 0);
        setAppliedCoupon(res.couponCode || couponCode.toUpperCase());
        setCouponMessage(res.message || "Coupon applied successfully!");
      } else {
        throw new Error("Invalid coupon details.");
      }
    } catch (err) {
      setCouponDiscount(0);
      setAppliedCoupon("");
      setCouponMessage("");
      Alert.alert("Invalid Coupon", err?.message || "Coupon is invalid or expired.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const [guestMode, setGuestMode] = useState("new");
  
  // Track details for each room index
  const [guestNames, setGuestNames] = useState({});
  const [guestEmails, setGuestEmails] = useState({});
  const [guestPhones, setGuestPhones] = useState({});
  const [selectedTravelers, setSelectedTravelers] = useState({});

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const travelers = useMemo(
    () => [
      { label: "Rahul Sharma - 9876543210", value: "Rahul Sharma" },
      { label: "Priya Singh - 9123456780", value: "Priya Singh" },
    ],
    [],
  );

  const validationError = useMemo(() => {
    if (totalSelectedRooms === 0) return "Please select at least one room.";
    if (totalSelectedRooms !== requestedRooms) {
      return `Please select exactly ${requestedRooms} room(s) to match your requested count. Currently selected: ${totalSelectedRooms}.`;
    }

    for (let i = 0; i < requestedRooms; i++) {
      const roomLabel = `Room ${i + 1}`;
      if (guestMode === "new") {
        const name = (guestNames[i] || "").trim();
        const email = (guestEmails[i] || "").trim();
        const phone = (guestPhones[i] || "").trim();

        if (!name) return `Guest name is required for ${roomLabel}.`;
        if (!isValidEmail(email)) return `Enter a valid email address for ${roomLabel}.`;
        if (!isValidPhone(phone)) return `Enter a valid 10-digit mobile number for ${roomLabel}.`;
      } else {
        const traveler = selectedTravelers[i] || "";
        if (!traveler) return `Please select an existing traveler for ${roomLabel}.`;
      }
    }

    if (!agreedToTerms) return "Please accept the hotel booking policy.";
    return "";
  }, [
    agreedToTerms,
    guestNames,
    guestEmails,
    guestPhones,
    selectedTravelers,
    guestMode,
    roomQuantities,
    requestedRooms,
    totalSelectedRooms
  ]);

  React.useEffect(() => {
    logDev("[HotelPassengerDetails] mounted:", {
      hotelId: hotel?.hotelId,
      hotelName: hotel?.name,
      offerCount: offers.length,
      searchContext,
    });
  }, [hotel?.hotelId, hotel?.name, offers.length, searchContext]);

  const handleContinue = async () => {
    logDev("[HotelPassengerDetails] continue pressed:", {
      agreedToTerms,
      guestNames,
      guestEmails,
      guestPhones,
      roomQuantities,
      appliedCoupon,
    });

    if (validationError) {
      logDev("[HotelPassengerDetails] validation failed:", validationError);
      Alert.alert("Check details", validationError);
      return;
    }

    setLoading(true);
    try {
      // Call BlockRoom API before completing booking
      const blockRoomPayload = {
        TraceId: searchContext?.traceId || "12",
        ResultIndex: selectedRoomSlots[0]?.resultIndex || selectedRoomSlots[0]?.roomIndex || "",
        HotelCode: hotel?.hotelCode || hotel?.hotelId || "",
        HotelName: hotel?.name || "Hotel Stay",
        GuestNationality: "IN",
        NoOfRooms: selectedRoomSlots.length,
        HotelRoomsDetails: selectedRoomSlots.map((slot) => ({
          ChildCount: slot.childCount || 0,
          RequireAllPaxDetails: Boolean(slot.requireAllPaxDetails),
          RoomId: slot.roomId || slot.offerId || "",
          RoomStatus: "Active",
          RoomIndex: String(slot.roomIndex || ""),
          RoomTypeCode: String(slot.roomTypeCode || ""),
          RoomTypeName: slot.roomTypeName || slot.roomCategory || "Standard Room",
          RatePlan: slot.ratePlan || slot.ratePlanCode || "",
          RatePlanCode: slot.ratePlanCode || slot.ratePlan || "",
          SmokingPreference: "0",
        })),
      };

      logDev("[HotelPassengerDetails] calling blockHotelRoom:", blockRoomPayload);
      const blockRes = await blockHotelRoom(blockRoomPayload);
      logDev("[HotelPassengerDetails] blockHotelRoom response:", blockRes);

      const validOfferId =
        hotel?.resultIndex ||
        hotel?.hotelCode ||
        hotel?.hotelId ||
        searchContext?.resultIndex ||
        selectedRoomSlots[0]?.resultIndex ||
        selectedRoomSlots[0]?.hotelCode ||
        blockRes?.blockRoomResult?.offerId ||
        blockRes?.blockRoomResult?.resultIndex ||
        blockRes?.offerId ||
        "";

      logDev("[HotelPassengerDetails] stored offerId for booking:", validOfferId);

      // Loop over selected room slots to book each room category choice
      const bookingPromises = selectedRoomSlots.map((slot, index) => {
        const payload = {
          offerId: validOfferId,
          guestName: guestMode === "existing" ? (selectedTravelers[index] || "Sai") : (guestNames[index] || "Sai"),
          guestEmail: guestMode === "existing" ? "sainimmakayala123@gmail.com" : (guestEmails[index] || "sainimmakayala123@gmail.com"),
          guestPhone: guestMode === "existing" ? "9885180221" : (guestPhones[index] || "9885180221"),
          couponCode: appliedCoupon || null,
          paymentMethod: "CreditCard",

          // Fallback fields for backend cache expiry
          traceId: searchContext?.traceId || blockRes?.blockRoomResult?.traceId || "12",
          resultIndex: validOfferId,
          hotelCode: hotel?.hotelCode || hotel?.hotelId || validOfferId,
          hotelName: hotel?.name || "Hotel Stay",
          price: typeof slot.price === "number" ? slot.price : (slot.price?.offeredPrice || slot.price?.roomPrice || slot.offeredPrice || slot.offeredFare || 453.11),
          checkInDate: searchContext?.checkInDate || slot.checkInDate || "2026-08-01",
          checkOutDate: searchContext?.checkOutDate || slot.checkOutDate || "2026-08-05",
          rooms: searchContext?.rooms || 1,
          adults: searchContext?.adults || 2,
          cityCode: searchContext?.cityCode || hotel?.cityCode || "BOM",
        };
        return bookHotelOffer(payload);
      });

      const results = await Promise.all(bookingPromises);
      logDev("[HotelPassengerDetails] all bookings succeeded:", results);

      // Create combined result mapping
      const combinedBookingResult = {
        bookingId: results.map((r) => r.bookingId || r.id).join(", "),
        bookingReference: results.map((r) => r.bookingReference || r.reference || r.bookingId).join(", "),
        hotelName: results[0]?.hotelName || hotel.name || "Hotel Stay",
        guestName: results.map((r, i) => `${i + 1}. ${r.guestName || (guestMode === "existing" ? selectedTravelers[i] : guestNames[i])}`).join("\n"),
        checkInDate: results[0]?.checkInDate || searchContext.checkInDate || selectedRoomSlots[0]?.checkInDate,
        checkOutDate: results[0]?.checkOutDate || searchContext.checkOutDate || selectedRoomSlots[0]?.checkOutDate,
        roomCategory: selectedRoomSlots.map((slot) => slot.roomCategory).join(" + "),
        status: "Confirmed",
        providerBookingId: results.map((r) => r.providerBookingId || r.bookingReference || r.bookingId || "N/A").join(", "),
      };

      const adjustedOffer = {
        ...selectedRoomSlots[0],
        price: totalRoomsPrice,
      };

      navigation.navigate("HotelBookingConfirmation", {
        hotel,
        selectedOffer: adjustedOffer,
        bookingResult: combinedBookingResult,
        searchContext,
        appliedCoupon,
        couponDiscount,
      });
    } catch (error) {
      logDev("[HotelPassengerDetails] booking failed:", error?.message || error);
      Alert.alert(
        "Booking failed",
        error?.message || "Unable to complete room booking."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Complete your stay</Text>
          <Text style={styles.headerSub}>
            {hotel?.cityCode || searchContext?.cityCode || "Hotel booking"}
          </Text>
        </View>
        <Pressable
          style={styles.amenityBtn}
          onPress={() => {
            logDev("[HotelPassengerDetails] amenities sheet requested");
            sheetRef.current?.expand();
          }}
        >
          <Ionicons name="grid-outline" size={18} color="#C8102E" />
          <Text style={styles.amenityText}>Amenities</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HotelGallery images={hotel?.images} />
        <HotelInfoCard hotel={hotel} searchContext={searchContext} />
        <HostCard />
        <StayHighlights />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Room Selection ({totalSelectedRooms} / {requestedRooms} selected)</Text>
          <FlatList
            data={offers}
            keyExtractor={(item, index) => String(item?.offerId ?? index)}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <RoomCard
                room={item}
                quantity={roomQuantities[item.offerId] || 0}
                onIncrement={() => handleIncrementRoom(item.offerId)}
                onDecrement={() => handleDecrementRoom(item.offerId)}
                formatCurrency={formatCurrency}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryText}>
              Selected Rooms: {totalSelectedRooms} of {requestedRooms}
            </Text>
          </View>
        </View>

        {/* Dynamic Guest Details Forms based on quantities */}
        {selectedRoomSlots.map((slot, index) => (
          <View key={`guest-form-${index}`} style={{ gap: 8, marginTop: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#E53935", marginBottom: 2, textTransform: "uppercase" }}>
              Room {index + 1}: {slot.roomCategory}
            </Text>
            <GuestDetailsForm
              mode={guestMode}
              selectedTraveler={selectedTravelers[index] || ""}
              onSelectedTravelerChange={(val) => {
                setSelectedTravelers((prev) => ({ ...prev, [index]: val }));
              }}
              guestName={guestNames[index] || ""}
              guestEmail={guestEmails[index] || ""}
              guestPhone={guestPhones[index] || ""}
              onChangeGuestName={(val) => {
                setGuestNames((prev) => ({ ...prev, [index]: val }));
              }}
              onChangeGuestEmail={(val) => {
                setGuestEmails((prev) => ({ ...prev, [index]: val }));
              }}
              onChangeGuestPhone={(val) => {
                setGuestPhones((prev) => ({ ...prev, [index]: val }));
              }}
              travelers={travelers}
            />
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promo Codes & Coupons</Text>
          <View style={styles.couponContainer}>
            <TextInput
              style={styles.couponInput}
              placeholder="e.g. WELCOME10, STEALDEAL"
              placeholderTextColor="#94A3B8"
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
              editable={!appliedCoupon}
            />
            <Pressable
              style={[styles.couponBtnAction, appliedCoupon && styles.couponBtnApplied]}
              onPress={appliedCoupon ? () => {
                setAppliedCoupon("");
                setCouponDiscount(0);
                setCouponCode("");
                setCouponMessage("");
              } : handleApplyCoupon}
              disabled={validatingCoupon}
            >
              {validatingCoupon ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.couponBtnText}>
                  {appliedCoupon ? "Remove" : "Apply"}
                </Text>
              )}
            </Pressable>
          </View>
          {couponMessage ? (
            <Text style={[styles.couponMsgText, appliedCoupon ? styles.couponSuccessText : styles.couponErrorText]}>
              {couponMessage}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before you continue</Text>
          <View style={styles.policyCard}>
            <Text style={styles.policyText}>Cancellation Policy</Text>
            <Text style={styles.policyText}>Backend Pricing Sync</Text>
            <Text style={styles.policyText}>Guest ID Verification</Text>
            <Pressable
              style={styles.modeRow}
              onPress={() => {
                logDev("[HotelPassengerDetails] guest mode toggle pressed");
                setGuestMode((m) => (m === "existing" ? "new" : "existing"));
              }}
            >
              <Text style={styles.modeLabel}>
                {guestMode === "existing"
                  ? "Switch to Add New Guest"
                  : "Switch to Existing Traveler"}
              </Text>
            </Pressable>
            <View style={styles.termsRow}>
              <Switch value={agreedToTerms} onValueChange={setAgreedToTerms} />
              <Text style={styles.termsText}>
                I agree to hotel booking policy
              </Text>
            </View>
          </View>
        </View>

        <FareSummaryCard roomPrice={totalRoomsPrice} discount={couponDiscount} />
        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[
            styles.continueBtn, 
            (totalSelectedRooms !== requestedRooms || !agreedToTerms) && { backgroundColor: "#94A3B8" }
          ]} 
          onPress={handleContinue}
          disabled={totalSelectedRooms !== requestedRooms || !agreedToTerms}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueText}>Continue To Payment</Text>
          )}
        </Pressable>
      </View>

      <AmenitiesBottomSheet ref={sheetRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#EEEEEE",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#212121",
  },
  headerSub: {
    fontSize: 12,
    color: "#757575",
    marginTop: 2,
    fontWeight: "700",
  },
  amenityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  amenityText: {
    color: "#E53935",
    fontWeight: "800",
    fontSize: 12,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 120,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#212121",
    letterSpacing: 0.3,
  },
  summaryPill: {
    backgroundColor: "#FAFAFA",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  summaryText: {
    fontWeight: "800",
    color: "#212121",
    fontSize: 14,
  },
  policyCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    gap: 10,
  },
  policyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#757575",
  },
  modeRow: {
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginTop: 6,
  },
  modeLabel: {
    color: "#E53935",
    fontWeight: "800",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  termsText: {
    fontSize: 13,
    fontWeight: "750",
    color: "#212121",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderColor: "#EEEEEE",
  },
  continueBtn: {
    backgroundColor: "#E53935",
    borderRadius: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E53935",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  couponContainer: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FAFAFA",
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
  },
  couponInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#212121",
    fontWeight: "700",
  },
  couponBtnAction: {
    backgroundColor: "#E53935",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  couponBtnApplied: {
    backgroundColor: "#757575",
  },
  couponBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  couponMsgText: {
    fontSize: 12,
    fontWeight: "750",
    marginLeft: 6,
    marginTop: 4,
  },
  couponSuccessText: {
    color: "#2E7D32",
  },
  couponErrorText: {
    color: "#B71C1C",
  },
});
