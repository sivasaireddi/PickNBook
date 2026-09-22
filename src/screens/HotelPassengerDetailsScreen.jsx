import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import * as SecureStore from "expo-secure-store";
import { blockHotelRoom, getHotelPricingPreview, bookHotelOffer, fetchHotelCoupons, validateHotelCoupon } from "../services/hotelService";
import { useHotelBooking } from "../context/HotelBookingContext";
import CheckoutHeader from "./dashboard/bottomTabScreens/hotelCheckoutComponents/CheckoutHeader";
import BookingSummary from "./dashboard/bottomTabScreens/hotelCheckoutComponents/BookingSummary";
import GuestAccordion from "./dashboard/bottomTabScreens/hotelCheckoutComponents/GuestAccordion";
import GuestForm from "./dashboard/bottomTabScreens/hotelCheckoutComponents/GuestForm";
import CouponSection from "./dashboard/bottomTabScreens/hotelCheckoutComponents/CouponSection";
import CouponBottomSheet from "./dashboard/bottomTabScreens/hotelCheckoutComponents/CouponBottomSheet";
import BookingPolicySection from "./dashboard/bottomTabScreens/hotelCheckoutComponents/BookingPolicySection";
import CancellationPolicySheet from "./dashboard/bottomTabScreens/hotelCheckoutComponents/CancellationPolicySheet";
import FareSummary from "./dashboard/bottomTabScreens/hotelCheckoutComponents/FareSummary";
import CheckoutBottomBar from "./dashboard/bottomTabScreens/hotelCheckoutComponents/CheckoutBottomBar";

const formatCurrency = (value, currency = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const isValidPhone = (value) => /^\d{10}$/.test(String(value || "").trim());
const isValidPAN = (value) => /^[A-Z]{3}[PCHFATGJLE][A-Z]{1}[0-9]{4}[A-Z]{1}$/.test(String(value || "").trim().toUpperCase());

export default function HotelPassengerDetailsScreen({ navigation, route }) {
  const {
    session,
    searchParams,
    selectedHotel: contextSelectedHotel,
    selectedRooms: contextSelectedRooms,
    setBlockedRoomResult,
    setPricingPreview: setContextPricingPreview,
  } = useHotelBooking();

  const routeParams = route?.params || {};
  const hotel = routeParams.hotel || contextSelectedHotel || {};
  const selectedRoomSlots = routeParams.selectedRoomSlots || contextSelectedRooms || [];

  const targetTraceId = String(routeParams.traceId || session.traceId || hotel.traceId || "");
  const targetSrdvType = String(routeParams.srdvType || session.srdvType || hotel.srdvType || "MixAPI");
  const targetSrdvIndex = String(routeParams.srdvIndex || session.srdvIndex || hotel.srdvIndex || "15");
  const targetResultIndex = String(
    routeParams.resultIndex || selectedRoomSlots[0]?.resultIndex || hotel.resultIndex || ""
  );
  const targetHotelCode = String(
    selectedRoomSlots[0]?.hotelCode || routeParams.hotelCode || targetResultIndex || hotel.hotelCode || ""
  );

  const roomGuestsConfig = searchParams?.roomGuests || [
    { NoOfAdults: "2", NoOfChild: "0", ChildAge: [] },
  ];

  const [blockingRooms, setBlockingRooms] = useState(true);
  const [blockError, setBlockError] = useState("");
  const [blockedResultData, setBlockedResultData] = useState(null);
  const [showPriceChangedModal, setShowPriceChangedModal] = useState(false);
  const [priceChangeDetails, setPriceChangeDetails] = useState({ oldPrice: 0, newPrice: 0 });

  // Pricing preview state
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [pricingPreview, setPricingPreview] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // Passenger state per room & pax
  const [paxState, setPaxState] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [showPolicySheet, setShowPolicySheet] = useState(false);

  // 1. Trigger Step 4: Block Room pre-checkout
  useEffect(() => {
    executeBlockRoom();

    // Fetch active coupons
    fetchHotelCoupons().then(coupons => {
      if (Array.isArray(coupons)) {
        setAvailableCoupons(coupons);
      }
    });
  }, []);

  const executeBlockRoom = async () => {
    setBlockingRooms(true);
    setBlockError("");
    try {
      const blockRoomPayload = {
        EndUserIp: "192.168.1.1",
        ClientId: "180232",
        UserName: "PickNBk6",
        Password: "PickNB@486",
        TraceId: targetTraceId,
        SrdvType: targetSrdvType,
        SrdvIndex: targetSrdvIndex,
        ResultIndex: targetResultIndex,
        HotelCode: targetHotelCode,
        HotelName: String(hotel.name || hotel.hotelName || "Hotel Stay"),
        GuestNationality: "IN",
        NoOfRooms: selectedRoomSlots.length,
        ClientReferenceNo: Math.floor(Date.now() / 1000),
        IsVoucherBooking: false,
        CouponCode: "",
        HotelRoomsDetails: selectedRoomSlots,
      };

      const res = await blockHotelRoom(blockRoomPayload);
      console.log("[HotelPassengerDetails] BlockRoom result:", JSON.stringify(res, null, 2));

      const blockResObj = res?.BlockRoomResult || res?.blockRoomResult || res || {};
      setBlockedResultData(blockResObj);
      setBlockedRoomResult(blockResObj);

      // Extract new authoritative room details
      const authoritativeRooms = blockResObj.HotelRoomsDetails || blockResObj.hotelRoomsDetails || [];

      // Calculate total original vs total blocked price notice
      const originalTotal = selectedRoomSlots.reduce((sum, s) => sum + Number(s.price?.offeredPrice || s.offeredPrice || 0), 0);
      const blockedB2CTotal = authoritativeRooms.reduce(
        (sum, r) => sum + Number(r.price?.b2CTotalPrice || r.price?.B2CTotalPrice || r.price?.offeredPrice || r.offeredPrice || 0),
        0
      );

      if (blockResObj.IsPriceChanged || blockResObj.isPriceChanged) {
        setPriceChangeDetails({ oldPrice: originalTotal, newPrice: blockedB2CTotal || originalTotal });
        setShowPriceChangedModal(true);
      }

      // Initialize passenger state inputs matching room & guest configuration
      initPaxState(authoritativeRooms.length > 0 ? authoritativeRooms : selectedRoomSlots);
    } catch (err) {
      console.log("[HotelPassengerDetails] BlockRoom error:", err?.message);
      setBlockError(err?.message || "Room availability/price verification failed.");
    } finally {
      setBlockingRooms(false);
    }
  };

  const initPaxState = (roomsData) => {
    const initialState = {};
    roomsData.forEach((roomObj, rIdx) => {
      const guestConfig = roomGuestsConfig[rIdx] || roomGuestsConfig[0] || { NoOfAdults: "2", NoOfChild: "0", ChildAge: [] };
      const numAdults = Number(guestConfig.NoOfAdults) || 1;
      const numChildren = Number(guestConfig.NoOfChild) || 0;
      const childAges = guestConfig.ChildAge || [];

      let globalPaxIdx = 0;
      for (let a = 0; a < numAdults; a++) {
        const key = `room-${rIdx}-pax-${globalPaxIdx}`;
        initialState[key] = {
          title: "Mr",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          pan: "",
          passport: "",
          age: "",
          isChild: false,
          isLead: a === 0, // Exactly one lead passenger per room
        };
        globalPaxIdx++;
      }

      for (let c = 0; c < numChildren; c++) {
        const key = `room-${rIdx}-pax-${globalPaxIdx}`;
        initialState[key] = {
          title: "Mstr",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          pan: "",
          passport: "",
          age: String(childAges[c] || 5),
          isChild: true,
          isLead: false,
        };
        globalPaxIdx++;
      }
    });
    setPaxState(initialState);
  };

  const handleUpdatePax = (key, field, value) => {
    setPaxState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleApplyCoupon = async (codeOverride) => {
    const code = typeof codeOverride === 'string' ? codeOverride : couponCodeInput;
    if (!code || !code.trim()) {
      Alert.alert("Input Code", "Please enter a coupon code.");
      return;
    }

    // We need the current base total.
    // Calculate it synchronously from authoritativeRoomList since fareBreakdown might not be ready in exact timing, 
    // or we can just rely on the existing fareBreakdown.base since it's memoized.
    const currentBaseTotal = fareBreakdown?.base || 0;

    setValidatingCoupon(true);
    setCouponMessage("");

    try {
      const result = await validateHotelCoupon({
        couponCode: code.trim(),
        totalAmount: currentBaseTotal,
      });
      console.log("[HotelPassengerDetails] coupon validation result:", result);

      if (result?.isValid) {
        setPricingPreview({
          appliedCoupon: code.trim().toUpperCase(),
          couponDiscount: result.discountAmount || 0,
        });
        setCouponMessage(result.message || `Coupon ${code.trim().toUpperCase()} applied successfully.`);
        if (couponCodeInput !== code.trim().toUpperCase()) {
          setCouponCodeInput(code.trim().toUpperCase());
        }
      } else {
        setPricingPreview(null);
        setCouponMessage(result?.message || "Invalid or expired coupon code.");
      }
    } catch (err) {
      setPricingPreview(null);
      setCouponMessage(err?.message || "Failed to validate coupon.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCodeInput("");
    setCouponMessage("");
    setPricingPreview(null);
  };

  const authoritativeRoomList = useMemo(() => {
    const list = blockedResultData?.hotelRoomsDetails || [];
    return list.length > 0 ? list : selectedRoomSlots;
  }, [blockedResultData, selectedRoomSlots]);

  const validationState = useMemo(() => {
    let isValid = true;
    let globalError = "";
    const fieldErrors = {};

    if (blockingRooms) {
      return { isValid: false, globalError: "Verifying room availability...", fieldErrors };
    }
    if (blockError) {
      return { isValid: false, globalError: blockError, fieldErrors };
    }

    for (let rIdx = 0; rIdx < authoritativeRoomList.length; rIdx++) {
      const roomObj = authoritativeRoomList[rIdx];
      const isPANMandatory = Boolean(roomObj.isPANMandatory || roomObj.IsPANMandatory);
      const isPassportMandatory = Boolean(roomObj.isPassportMandatory || roomObj.IsPassportMandatory);

      const guestConfig = roomGuestsConfig[rIdx] || roomGuestsConfig[0] || { NoOfAdults: "2", NoOfChild: "0" };
      const totalPax = (Number(guestConfig.NoOfAdults) || 1) + (Number(guestConfig.NoOfChild) || 0);

      for (let pIdx = 0; pIdx < totalPax; pIdx++) {
        const key = `room-${rIdx}-pax-${pIdx}`;
        const pax = paxState[key] || {};
        const paxErrors = {};

        if (!pax.firstName || !pax.firstName.trim()) paxErrors.firstName = "First name is required";
        if (!pax.lastName || !pax.lastName.trim()) paxErrors.lastName = "Last name is required";
        if (pax.isChild && (!pax.age || String(pax.age).trim() === "")) paxErrors.age = "Age is required";

        if (pax.isLead) {
          if (!isValidEmail(pax.email)) paxErrors.email = "Valid email is required";
          if (!isValidPhone(pax.phone)) paxErrors.phone = "Valid 10-digit mobile is required";
        }

        if (isPANMandatory && (!pax.pan || !isValidPAN(pax.pan))) {
          paxErrors.pan = "Valid 10-character PAN is required";
        }
        if (isPassportMandatory && (!pax.passport || !pax.passport.trim())) {
          paxErrors.passport = "Passport number is required";
        }

        if (Object.keys(paxErrors).length > 0) {
          isValid = false;
          fieldErrors[key] = paxErrors;
        }
      }
    }

    if (!agreedToTerms) {
      isValid = false;
      globalError = "Please accept the hotel booking policies before proceeding.";
    }

    return { isValid, globalError, fieldErrors };
  }, [blockingRooms, blockError, authoritativeRoomList, roomGuestsConfig, paxState, agreedToTerms]);

  const fareBreakdown = useMemo(() => {
    const primaryRoom = authoritativeRoomList[0] || selectedRoomSlots[0] || {};
    const priceObj = primaryRoom.price || primaryRoom.Price || {};

    const roomPriceVal = Number(
      priceObj.b2CBasePrice ??
      priceObj.B2CBasePrice ??
      priceObj.offeredPrice ??
      priceObj.OfferedPrice ??
      priceObj.publishedPrice ??
      priceObj.PublishedPrice ??
      priceObj.roomPrice ??
      priceObj.RoomPrice ??
      0
    );

    const base =
      roomPriceVal ||
      authoritativeRoomList.reduce(
        (sum, r) =>
          sum +
          Number(
            r.price?.b2CBasePrice ??
            r.price?.B2CBasePrice ??
            r.price?.offeredPrice ??
            r.price?.OfferedPrice ??
            r.price?.roomPrice ??
            r.price?.RoomPrice ??
            r.roomPrice ??
            r.offeredPrice ??
            0
          ),
        0
      ) ||
      selectedRoomSlots.reduce(
        (sum, s) =>
          sum +
          Number(
            s.price?.b2CBasePrice ??
            s.price?.B2CBasePrice ??
            s.price?.offeredPrice ??
            s.price?.OfferedPrice ??
            s.price?.roomPrice ??
            s.price?.RoomPrice ??
            s.roomPrice ??
            s.offeredPrice ??
            0
          ),
        0
      );

    const gst =
      Number(
        priceObj.totalGSTAmount ??
        priceObj.TotalGSTAmount ??
        priceObj.tax ??
        priceObj.Tax ??
        0
      ) ||
      authoritativeRoomList.reduce(
        (sum, r) =>
          sum +
          Number(
            r.price?.totalGSTAmount ??
            r.price?.TotalGSTAmount ??
            r.price?.tax ??
            r.price?.Tax ??
            0
          ),
        0
      ) ||
      0;

    const convenienceFee =
      Number(priceObj.otherCharges ?? priceObj.OtherCharges ?? 0) ||
      authoritativeRoomList.reduce(
        (sum, r) =>
          sum + Number(r.price?.otherCharges ?? r.price?.OtherCharges ?? 0),
        0
      ) ||
      0;

    const discount =
      Number(
        pricingPreview?.couponDiscount ??
        priceObj.couponDiscount ??
        priceObj.CouponDiscount ??
        priceObj.discount ??
        priceObj.Discount ??
        0
      ) ||
      authoritativeRoomList.reduce(
        (sum, r) =>
          sum +
          Number(
            r.price?.couponDiscount ??
            r.price?.CouponDiscount ??
            r.price?.discount ??
            r.price?.Discount ??
            0
          ),
        0
      ) ||
      0;

    const b2cTotal = Number(
      priceObj.b2CTotalPrice ??
      priceObj.b2cTotalPrice ??
      priceObj.B2CTotalPrice ??
      0
    );

    const calculatedTotal =
      b2cTotal ||
      authoritativeRoomList.reduce(
        (sum, r) =>
          sum +
          Number(
            r.price?.b2CTotalPrice ??
            r.price?.b2cTotalPrice ??
            r.price?.B2CTotalPrice ??
            r.price?.offeredPrice ??
            r.offeredPrice ??
            0
          ),
        0
      ) ||
      selectedRoomSlots.reduce(
        (sum, s) =>
          sum +
          Number(
            s.price?.b2CTotalPrice ??
            s.price?.b2cTotalPrice ??
            s.price?.B2CTotalPrice ??
            s.price?.offeredPrice ??
            s.offeredPrice ??
            0
          ),
        0
      );

    const total = Math.max(0, calculatedTotal - (pricingPreview?.couponDiscount || 0));

    return { base, gst, convenienceFee, discount, total };
  }, [authoritativeRoomList, selectedRoomSlots, pricingPreview]);

  const handleBookRoom = async () => {
    if (!validationState.isValid) {
      Alert.alert("Check Passenger Details", validationState.globalError || "Please fill all required fields correctly.");
      return;
    }

    setBookingLoading(true);
    try {
      // Build HotelRoomsDetails with nested HotelPassenger arrays
      const hotelRoomsDetailsPayload = authoritativeRoomList.map((roomObj, rIdx) => {
        const guestConfig = roomGuestsConfig[rIdx] || roomGuestsConfig[0] || { NoOfAdults: "2", NoOfChild: "0" };
        const totalPax = (Number(guestConfig.NoOfAdults) || 1) + (Number(guestConfig.NoOfChild) || 0);

        const passengersPayload = [];
        for (let pIdx = 0; pIdx < totalPax; pIdx++) {
          const key = `room-${rIdx}-pax-${pIdx}`;
          const pax = paxState[key] || {};

          const paxObj = {
            Title: String(pax.title || "Mr"),
            FirstName: String(pax.firstName || "").trim(),
            LastName: String(pax.lastName || "").trim(),
            PaxType: pax.isChild ? "2" : "1",
            LeadPassenger: Boolean(pax.isLead),
          };

          if (pax.isLead) {
            paxObj.Phoneno = String(pax.phone || "").trim();
            paxObj.Email = String(pax.email || "").trim();
          }
          if (pax.pan) {
            paxObj.PAN = String(pax.pan || "").trim().toUpperCase();
          }
          if (pax.passport) {
            paxObj.PassportNo = String(pax.passport || "").trim().toUpperCase();
          }
          if (pax.isChild) {
            paxObj.Age = Number(pax.age || 5);
          }

          passengersPayload.push(paxObj);
        }

        const roomOfferedPrice = Number(roomObj.price?.offeredPrice || roomObj.offeredPrice || 0);
        const roomBasePrice = Number(roomObj.price?.roomPrice || roomObj.roomPrice || roomOfferedPrice);

        return {
          ChildCount: Number(guestConfig.NoOfChild || 0),
          RequireAllPaxDetails: Boolean(roomObj.requireAllPaxDetails || roomObj.RequireAllPaxDetails),
          RoomId: String(roomObj.roomId || roomObj.RoomId || ""),
          RoomStatus: "Active",
          RoomIndex: String(roomObj.roomIndex || roomObj.RoomIndex || `${rIdx + 1}`),
          RoomTypeCode: String(roomObj.roomTypeCode || roomObj.RoomTypeCode || ""),
          RoomTypeName: String(roomObj.roomTypeName || roomObj.RoomTypeName || roomObj.categoryName || "Standard Room"),
          RatePlanCode: String(roomObj.ratePlanCode || roomObj.RatePlanCode || ""),
          RatePlan: String(roomObj.ratePlan || roomObj.RatePlan || roomObj.ratePlanCode || ""),
          OfferedPrice: roomOfferedPrice,
          Price: {
            RoomPrice: roomBasePrice,
            OfferedPrice: roomOfferedPrice,
          },
          HotelPassenger: passengersPayload,
        };
      });

      const leadPaxKey = "room-0-pax-0";
      const leadPax = paxState[leadPaxKey] || {};

      if (!leadPax.firstName || !leadPax.lastName || !leadPax.email || !leadPax.phone) {
        Alert.alert("Missing Details", "Please provide complete details for the Lead Guest (First Name, Last Name, Email, and Phone).");
        setBookingLoading(false);
        return;
      }

      const totalAuthoritativePrice = authoritativeRoomList.reduce(
        (sum, r) => sum + Number(r.price?.offeredPrice || r.offeredPrice || 0),
        0
      );
      const grandTotalPrice =
        pricingPreview?.totalPrice ||
        pricingPreview?.basePrice ||
        totalAuthoritativePrice ||
        selectedRoomSlots.reduce((sum, s) => sum + Number(s.price?.offeredPrice || s.offeredPrice || 0), 0);

      const bookPayload = {
        EndUserIp: "192.168.1.1",
        ClientId: "180232",
        UserName: "PickNBk6",
        Password: "PickNB@486",
        TraceId: targetTraceId,
        SrdvType: targetSrdvType,
        SrdvIndex: targetSrdvIndex,
        ResultIndex: targetResultIndex,
        HotelCode: targetHotelCode,
        HotelName: String(hotel.name || hotel.hotelName || "Hotel Stay"),
        GuestNationality: "IN",
        NoOfRooms: authoritativeRoomList.length,
        ClientReferenceNo: Math.floor(Date.now() / 1000),
        IsVoucherBooking: true,
        GuestName: `${leadPax.firstName} ${leadPax.lastName}`.trim(),
        GuestEmail: String(leadPax.email).trim(),
        GuestPhone: String(leadPax.phone).trim(),
        Price: totalAuthoritativePrice,
        CouponCode: pricingPreview?.appliedCoupon ? String(pricingPreview.appliedCoupon) : "",
        HotelRoomsDetails: hotelRoomsDetailsPayload,
      };

      console.log("[HotelPassengerDetails] booking payload prepared for checkout:", {
        hotelCode: bookPayload.HotelCode,
        resultIndex: bookPayload.ResultIndex,
        traceId: bookPayload.TraceId,
        roomCount: bookPayload.NoOfRooms,
        amount: fareBreakdown.total,
        hasGuestDetails: Boolean(bookPayload.GuestName && bookPayload.GuestEmail && bookPayload.GuestPhone),
      });


      const token = await SecureStore.getItemAsync("token");

      navigation.navigate("CheckoutScreen", {
        userToken: token || "",
        amount: fareBreakdown.total,
        bookingType: "Hotel",
        bookingDetails: bookPayload,
        customerDetails: {
          name: `${leadPax.firstName} ${leadPax.lastName}`.trim(),
          phone: String(leadPax.phone).trim(),
          email: String(leadPax.email).trim(),
          couponCode: pricingPreview?.appliedCoupon ? String(pricingPreview.appliedCoupon) : null,
        }
      });
    } catch (err) {
      console.log("[HotelPassengerDetails] BookRoom error:", err?.message);
      Alert.alert("Booking Failed", err?.message || "Unable to confirm room reservation.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (blockingRooms) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Verifying room availability & locking rates (BlockRoom)...</Text>
      </SafeAreaView>
    );
  }

  if (blockError) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{blockError}</Text>
        <Pressable style={styles.retryBtn} onPress={executeBlockRoom}>
          <Text style={styles.retryBtnText}>Retry Block Room</Text>
        </Pressable>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Back to Room Selection</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <CheckoutHeader onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <BookingSummary
          hotelName={hotel.name || hotel.hotelName}
          location={hotel.address}
          checkInDate={searchParams.checkInDate}
          checkOutDate={searchParams.checkOutDate}
          roomCount={authoritativeRoomList.length}
          isConfirmed={blockedResultData?.status === "Confirmed" || true}
        />

        <View style={styles.guestSection}>
          <Text style={styles.sectionTitle}>Guest Details</Text>
          {authoritativeRoomList.map((roomObj, rIdx) => {
            const guestConfig = roomGuestsConfig[rIdx] || roomGuestsConfig[0] || { NoOfAdults: "2", NoOfChild: "0" };
            const numAdults = Number(guestConfig.NoOfAdults) || 1;
            const numChildren = Number(guestConfig.NoOfChild) || 0;
            const totalPax = numAdults + numChildren;

            const isPANMandatory = Boolean(roomObj.isPANMandatory || roomObj.IsPANMandatory);
            const isPassportMandatory = Boolean(roomObj.isPassportMandatory || roomObj.IsPassportMandatory);
            const roomTypeName = roomObj.roomTypeName || roomObj.RoomTypeName || roomObj.categoryName || "Standard Room";

            const paxForms = [];
            for (let pIdx = 0; pIdx < totalPax; pIdx++) {
              const key = `room-${rIdx}-pax-${pIdx}`;
              const pax = paxState[key] || {};
              const errors = validationState.fieldErrors[key] || {};
              const guestHasErrors = Object.keys(errors).length > 0;

              const isLead = pax.isLead;

              paxForms.push(
                <GuestAccordion
                  key={key}
                  title={`${(pIdx + 1).toString().padStart(2, '0')} ${isLead ? "Lead Guest" : `Guest ${pIdx + 1}`}`}
                  subtitle={`${roomTypeName}`}
                  isExpandedDefault={isLead}
                  hasError={guestHasErrors}
                >
                  <GuestForm
                    isLead={pax.isLead}
                    isChild={pax.isChild}
                    title={pax.title}
                    firstName={pax.firstName}
                    lastName={pax.lastName}
                    email={pax.email}
                    phone={pax.phone}
                    pan={pax.pan}
                    passport={pax.passport}
                    age={pax.age}
                    isPANMandatory={isPANMandatory}
                    isPassportMandatory={isPassportMandatory}
                    onChangeTitle={(val) => handleUpdatePax(key, "title", val)}
                    onChangeFirstName={(val) => handleUpdatePax(key, "firstName", val)}
                    onChangeLastName={(val) => handleUpdatePax(key, "lastName", val)}
                    onChangeEmail={(val) => handleUpdatePax(key, "email", val)}
                    onChangePhone={(val) => handleUpdatePax(key, "phone", val)}
                    onChangePan={(val) => handleUpdatePax(key, "pan", val)}
                    onChangePassport={(val) => handleUpdatePax(key, "passport", val)}
                    onChangeAge={(val) => handleUpdatePax(key, "age", val)}
                    errors={errors}
                  />
                </GuestAccordion>
              );
            }

            return (
              <View key={`room-block-${rIdx}`} style={styles.roomGroup}>
                <Text style={styles.roomGroupTitle}>Room {rIdx + 1}</Text>
                {paxForms}
              </View>
            );
          })}
        </View>

        <CouponSection
          couponCodeInput={couponCodeInput}
          setCouponCodeInput={setCouponCodeInput}
          pricingPreview={pricingPreview}
          validatingCoupon={validatingCoupon}
          couponMessage={couponMessage}
          handleApplyCoupon={handleApplyCoupon}
          handleRemoveCoupon={handleRemoveCoupon}
          availableCouponsCount={availableCoupons.length}
          onViewAvailableCoupons={() => setShowCouponSheet(true)}
        />

        <BookingPolicySection
          agreedToTerms={agreedToTerms}
          setAgreedToTerms={setAgreedToTerms}
          onViewPolicies={() => setShowPolicySheet(true)}
        />

        <FareSummary
          basePrice={fareBreakdown.base}
          gst={fareBreakdown.gst}
          convenienceFee={fareBreakdown.convenienceFee}
          discount={fareBreakdown.discount}
          totalPrice={fareBreakdown.total}
        />
      </ScrollView>

      {/* Modals & Sheets */}
      <CouponBottomSheet
        visible={showCouponSheet}
        onClose={() => setShowCouponSheet(false)}
        availableCoupons={availableCoupons}
        handleApplyCoupon={handleApplyCoupon}
        validatingCoupon={validatingCoupon}
      />

      <CancellationPolicySheet
        visible={showPolicySheet}
        onClose={() => setShowPolicySheet(false)}
        rooms={authoritativeRoomList}
      />

      <Modal visible={showPriceChangedModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="information-circle-outline" size={40} color="#D97706" />
            <Text style={styles.modalTitle}>Room Rate Updated</Text>
            <Text style={styles.modalText}>
              The supplier updated the room rate during checkout confirmation.
            </Text>
            <View style={styles.priceCompareRow}>
              <Text style={styles.oldPriceText}>Was: {formatCurrency(priceChangeDetails.oldPrice)}</Text>
              <Text style={styles.newPriceText}>Now: {formatCurrency(priceChangeDetails.newPrice)}</Text>
            </View>
            <Pressable style={styles.modalBtn} onPress={() => setShowPriceChangedModal(false)}>
              <Text style={styles.modalBtnText}>Acknowledge & Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <CheckoutBottomBar
        totalPrice={fareBreakdown.total}
        onConfirm={handleBookRoom}
        disabled={!agreedToTerms || !validationState.isValid}
        loading={bookingLoading}
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
    textAlign: "center",
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 110,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hotelName: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  hotelAddress: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  datesText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "700",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  guestSection: {
    marginBottom: 16,
  },
  roomGroup: {
    marginBottom: 16,
  },
  roomGroupTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    marginTop: 4,
  },
  roomBlockContainer: {
    gap: 4,
  },
  roomBlockTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
    marginTop: 4,
  },
  couponContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  couponInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
  },
  couponBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  couponBtnApplied: {
    backgroundColor: "#64748B",
  },
  couponBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  couponMsg: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  successMsg: {
    color: "#166534",
  },
  errorMsg: {
    color: "#DC2626",
  },
  dealsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  dealsSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 4,
  },
  couponCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  couponCardLeft: {
    flex: 1,
  },
  couponCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  couponCardDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  couponCardBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  couponCardBtnText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "800",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    lineHeight: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  priceCompareRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 8,
  },
  oldPriceText: {
    fontSize: 13,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  newPriceText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#EF4444",
  },
  modalBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  validationHintBanner: {
    backgroundColor: "#FEF2F2",
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerPriceBox: {
    flex: 1,
  },
  footerPriceLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  footerPriceValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#EF4444",
  },
  bookBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  bookBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});
