import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { blockHotelRoom, getHotelPricingPreview, fetchHotelCoupons } from "../services/hotelService";
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
const isValidPhone = (value) => /^[6-9]\d{9}$/.test(String(value || "").trim());
const isValidPAN = (value) => /^[A-Z]{3}[PCHFATGJLE][A-Z]{1}[0-9]{4}[A-Z]{1}$/.test(String(value || "").trim().toUpperCase());
const isValidName = (value) => /^[A-Za-z ]{2,}$/.test(String(value || "").trim());
const VALID_TITLES = new Set(["Mr", "Mrs", "Ms"]);

const getPricingInputs = (rooms = []) => rooms.reduce((totals, room) => {
  const price = room?.Price || room?.price || {};
  const rawTotal = Number(
    room?.B2CTotalPrice || room?.b2CTotalPrice || room?.b2cTotalPrice ||
    price.B2CTotalPrice || price.b2CTotalPrice || price.b2cTotalPrice || price.b2cFinalFare || price.B2CFinalFare ||
    price.b2cDisplayFare || price.B2CDisplayFare || price.OfferedPrice || price.offeredPrice ||
    price.PublishedPrice || price.publishedPrice || 0
  );
  const supplierPricing = room?.SupplierPricing || room?.supplierPricing || price.SupplierPricing || price.supplierPricing;
  const supplierTotal = Number(supplierPricing?.TotalPrice ?? supplierPricing?.totalPrice ?? 0);

  if (supplierPricing && supplierTotal > 0) {
    const supplierBase = Number(supplierPricing.BasePrice ?? supplierPricing.basePrice ?? 0);
    const hiddenMarkup = rawTotal - supplierTotal;
    const b2cBase = supplierBase + hiddenMarkup;
    totals.base += b2cBase;
    totals.gst += rawTotal - b2cBase;
    return totals;
  }

  const roomBase = Number(
    room?.B2CBasePrice || room?.b2CBasePrice ||
    price.B2CBasePrice || price.b2cBasePrice ||
    price.RoomPrice || price.roomPrice || price.PublishedPrice || price.publishedPrice || 0
  );
  const gst = price.GST || price.gst || {};
  const gstBreakupTotal = [
    gst.CGSTAmount, gst.cgstAmount, gst.SGSTAmount, gst.sgstAmount,
    gst.IGSTAmount, gst.igstAmount, gst.CessAmount, gst.cessAmount,
  ].reduce((sum, value) => sum + (Number(value) || 0), 0);
  totals.base += Number(price.b2CBasePrice ?? price.b2cBasePrice ?? roomBase);
  totals.gst += Number(price.TotalGSTAmount ?? price.totalGSTAmount ?? 0) ||
    Number(price.Tax ?? price.tax ?? 0) || gstBreakupTotal;
  return totals;
}, { base: 0, gst: 0 });

const normalizeProviderId = (value) => value === null || value === undefined ? "" : String(value).trim();

const getRoomIdentity = (room = {}) => ({
  roomIndex: normalizeProviderId(room.RoomIndex ?? room.roomIndex),
  roomTypeCode: normalizeProviderId(room.RoomTypeCode ?? room.roomTypeCode),
  optionId: normalizeProviderId(room.OptionId ?? room.optionId),
});

const getBlockedRateCorrelationKey = (room = {}) => {
  const ratePlanCode = normalizeProviderId(room.RatePlanCode ?? room.ratePlanCode);
  const roomTypeName = normalizeProviderId(room.RoomTypeName ?? room.roomTypeName).toLowerCase();
  const mealBasis = normalizeProviderId(room.MealBasis ?? room.mealBasis).toLowerCase();
  return ratePlanCode && roomTypeName && mealBasis
    ? `${ratePlanCode}\u001f${roomTypeName}\u001f${mealBasis}`
    : "";
};

const mergeBlockedRoomsWithSelectedIdentity = (blockedRooms, selectedRooms) => {
  if (blockedRooms.length !== selectedRooms.length) {
    throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
  }

  const selectedGroups = new Map();
  selectedRooms.forEach((room) => {
    const key = getBlockedRateCorrelationKey(room);
    const identity = getRoomIdentity(room);
    if (!key || !identity.roomIndex || !identity.roomTypeCode || !identity.optionId) {
      throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
    }
    const group = selectedGroups.get(key) || { count: 0, identityKey: "", identity: null, ambiguous: false };
    const identityKey = `${identity.roomIndex}\u001f${identity.roomTypeCode}\u001f${identity.optionId}`;
    if (group.identityKey && group.identityKey !== identityKey) group.ambiguous = true;
    group.count += 1;
    group.identityKey = group.identityKey || identityKey;
    group.identity = group.identity || identity;
    selectedGroups.set(key, group);
  });

  const blockedCounts = new Map();
  blockedRooms.forEach((room) => {
    const key = getBlockedRateCorrelationKey(room);
    if (!key) throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
    blockedCounts.set(key, (blockedCounts.get(key) || 0) + 1);
  });

  selectedGroups.forEach((group, key) => {
    if (blockedCounts.get(key) !== group.count || group.ambiguous || !group.identity) {
      throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
    }
  });
  if (blockedCounts.size !== selectedGroups.size) {
    throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
  }

  return blockedRooms.map((blockedRoom) => {
    const group = selectedGroups.get(getBlockedRateCorrelationKey(blockedRoom));
    const selectedIdentity = group?.identity;
    if (!selectedIdentity) {
      throw new Error("Selected hotel rate option is missing or no longer matches the room hold.");
    }
    return {
      ...blockedRoom,
      RoomIndex: selectedIdentity.roomIndex,
      RoomTypeCode: selectedIdentity.roomTypeCode,
      OptionId: selectedIdentity.optionId,
      roomIndex: selectedIdentity.roomIndex,
      roomTypeCode: selectedIdentity.roomTypeCode,
      optionId: selectedIdentity.optionId,
    };
  });
};

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

  const targetTraceId = routeParams.traceId ?? session.traceId ?? hotel.traceId ?? null;
  const targetSrdvType = String(routeParams.srdvType || session.srdvType || hotel.srdvType || "MixAPI");
  const targetSrdvIndex = String(routeParams.srdvIndex || session.srdvIndex || hotel.srdvIndex || "15");
  const targetResultIndex = String(
    routeParams.resultIndex ?? selectedRoomSlots[0]?.resultIndex ?? selectedRoomSlots[0]?.ResultIndex ?? hotel.resultIndex ?? hotel.ResultIndex ?? ""
  );
  const targetHotelCode = String(
    selectedRoomSlots[0]?.hotelCode ?? selectedRoomSlots[0]?.HotelCode ?? routeParams.hotelCode ?? hotel.hotelCode ?? hotel.HotelCode ?? ""
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
  const [pricingStatus, setPricingStatus] = useState("idle");
  const [activeCouponCode, setActiveCouponCode] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // Passenger state per room & pax
  const [paxState, setPaxState] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [showPolicySheet, setShowPolicySheet] = useState(false);
  const pricingRequestSequenceRef = useRef(0);

  const loadAuthoritativePricing = async (rooms, couponCode = "") => {
    const requestId = ++pricingRequestSequenceRef.current;
    const normalizedCoupon = String(couponCode || "").trim().toUpperCase();
    const inputs = getPricingInputs(rooms);
    setPricingStatus("loading");
    setValidatingCoupon(true);
    setPricingPreview(null);
    setContextPricingPreview(null);
    try {
      const result = await getHotelPricingPreview({
        HotelCode: targetHotelCode,
        B2CBasePrice: inputs.base,
        SrdvGstAmount: inputs.gst,
        CouponCode: normalizedCoupon,
      });
      if (requestId !== pricingRequestSequenceRef.current) return { stale: true };
      const finalTotal = Number(result?.finalTotal ?? result?.FinalTotal);
      if (!Number.isFinite(finalTotal) || finalTotal <= 0) {
        throw new Error("The latest payable amount could not be verified.");
      }
      if (normalizedCoupon && (result?.isCouponValid ?? result?.IsCouponValid) !== true) {
        setPricingStatus("invalid");
        setActiveCouponCode("");
        return { invalidCoupon: true, result };
      }
      const nextPreview = {
        ...result,
        appliedCoupon: normalizedCoupon || null,
      };
      setPricingPreview(nextPreview);
      setContextPricingPreview(nextPreview);
      setActiveCouponCode(normalizedCoupon);
      setPricingStatus("valid");
      return { result: nextPreview };
    } catch (error) {
      if (requestId !== pricingRequestSequenceRef.current) return { stale: true };
      setPricingStatus("invalid");
      setActiveCouponCode("");
      throw error;
    } finally {
      if (requestId === pricingRequestSequenceRef.current) setValidatingCoupon(false);
    }
  };

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
      if (targetTraceId === null || !targetResultIndex || !targetHotelCode) {
        throw new Error("Hotel session information is incomplete. Please select the hotel again.");
      }
      const blockRoomPayload = {
        TraceId: targetTraceId,
        ResultIndex: targetResultIndex,
        HotelCode: targetHotelCode,
        HotelName: String(hotel.name || hotel.hotelName || "Hotel Stay"),
        GuestNationality: "IN",
        NoOfRooms: selectedRoomSlots.length,
        HotelRoomsDetails: selectedRoomSlots,
      };

      const res = await blockHotelRoom(blockRoomPayload);
      console.log("[HotelPassengerDetails] BlockRoom result:", JSON.stringify(res, null, 2));

      const blockResObj = res?.BlockRoomResult || res?.blockRoomResult || res || {};
      const blockErrorObj = blockResObj?.error || blockResObj?.Error;
      const canProceed = blockResObj?.canProceedToBook ?? blockResObj?.CanProceedToBook;
      const availabilityType = String(blockResObj?.availabilityType ?? blockResObj?.AvailabilityType ?? "").toLowerCase();
      const errorCode = Number(blockErrorObj?.errorCode ?? blockErrorObj?.ErrorCode);
      const blockedRooms = blockResObj.HotelRoomsDetails || blockResObj.hotelRoomsDetails;
      if (
        !Number.isFinite(errorCode) ||
        errorCode !== 0 ||
        availabilityType !== "confirm" ||
        canProceed !== true ||
        !Array.isArray(blockedRooms) ||
        blockedRooms.length === 0
      ) {
        throw new Error(blockErrorObj?.errorMessage || blockErrorObj?.ErrorMessage || "This room is no longer available.");
      }
      const authoritativeRooms = mergeBlockedRoomsWithSelectedIdentity(blockedRooms, selectedRoomSlots);
      const normalizedBlockResult = {
        ...blockResObj,
        HotelRoomsDetails: authoritativeRooms,
        hotelRoomsDetails: authoritativeRooms,
      };
      setBlockedResultData(normalizedBlockResult);
      setBlockedRoomResult(normalizedBlockResult);

      const pricingOutcome = await loadAuthoritativePricing(authoritativeRooms, "");
      if (pricingOutcome?.stale || !pricingOutcome?.result) {
        throw new Error("The latest payable amount could not be verified.");
      }

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
      initPaxState(authoritativeRooms);
    } catch (err) {
      console.log("[HotelPassengerDetails] BlockRoom error:", err?.message);
      const message = err?.isTraceExpired
        ? "Your room hold has expired. Please select the room again to check updated availability."
        : (err?.message || "Room availability/price verification failed.");
      setBlockError(message);
      if (err?.isTraceExpired) {
        Alert.alert("Room hold expired", message, [{ text: "OK", onPress: () => navigation.goBack() }]);
      }
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
          isLead: rIdx === 0 && a === 0,
        };
        globalPaxIdx++;
      }

      for (let c = 0; c < numChildren; c++) {
        const key = `room-${rIdx}-pax-${globalPaxIdx}`;
        initialState[key] = {
          title: "Mr",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          pan: "",
          passport: "",
          age: String(childAges[c] ?? ""),
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

    setCouponMessage("");

    try {
      const outcome = await loadAuthoritativePricing(authoritativeRoomList, code);
      if (outcome?.stale) return;
      if (outcome?.invalidCoupon) {
        const result = outcome.result;
        setCouponCodeInput("");
        setCouponMessage(result?.couponMessage || result?.CouponMessage || result?.message || "Invalid or expired coupon code.");
        const restored = await loadAuthoritativePricing(authoritativeRoomList, "");
        if (!restored?.stale && !restored?.result) throw new Error("Unable to restore the current hotel price.");
      } else if (outcome?.result) {
        const result = outcome.result;
        setCouponMessage(result.couponMessage || result.CouponMessage || `Coupon ${code.trim().toUpperCase()} applied successfully.`);
        if (couponCodeInput !== code.trim().toUpperCase()) {
          setCouponCodeInput(code.trim().toUpperCase());
        }
      }
    } catch (err) {
      setCouponMessage(err?.message || "Failed to validate coupon.");
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCodeInput("");
    setCouponMessage("");
    loadAuthoritativePricing(authoritativeRoomList, "").then((outcome) => {
      if (!outcome?.stale && !outcome?.result) {
        throw new Error("Unable to refresh the current hotel price.");
      }
    }).catch((err) => {
      Alert.alert("Pricing unavailable", err?.message || "Unable to refresh the current hotel price.");
    });
  };

  const authoritativeRoomList = useMemo(() => {
    const list = blockedResultData?.hotelRoomsDetails || blockedResultData?.HotelRoomsDetails || [];
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
    if (pricingStatus !== "valid" || !pricingPreview || validatingCoupon) {
      return { isValid: false, globalError: "Verifying the latest hotel price...", fieldErrors };
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

        if (!VALID_TITLES.has(pax.title)) paxErrors.title = "Select Mr, Mrs, or Ms";
        if (!isValidName(pax.firstName)) paxErrors.firstName = "Enter at least 2 letters";
        if (!isValidName(pax.lastName)) paxErrors.lastName = "Enter at least 2 letters";
        const age = Number(pax.age);
        if (!Number.isInteger(age) || (pax.isChild ? age < 0 || age > 17 : age < 18 || age > 99)) {
          paxErrors.age = pax.isChild ? "Child age must be 0–17" : "Adult age must be 18–99";
        }

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
  }, [blockingRooms, blockError, pricingStatus, pricingPreview, validatingCoupon, authoritativeRoomList, roomGuestsConfig, paxState, agreedToTerms]);

  const fareBreakdown = useMemo(() => {
    return {
      base: Number(pricingPreview?.basePrice ?? pricingPreview?.BasePrice ?? 0),
      gst: Number(pricingPreview?.srdvGstAmount ?? pricingPreview?.SrdvGstAmount ?? 0),
      convenienceFee: Number(pricingPreview?.convenienceFee ?? pricingPreview?.ConvenienceFee ?? 0),
      discount: Number(pricingPreview?.discountAmount ?? pricingPreview?.DiscountAmount ?? 0),
      total: Number(pricingPreview?.finalTotal ?? pricingPreview?.FinalTotal ?? 0),
    };
  }, [pricingPreview]);

  const hotelPricing = useMemo(() => ({
    basePrice: pricingPreview?.basePrice ?? pricingPreview?.BasePrice ?? null,
    srdvGstAmount: pricingPreview?.srdvGstAmount ?? pricingPreview?.SrdvGstAmount ?? null,
    agentMarkup: pricingPreview?.agentMarkup ?? pricingPreview?.AgentMarkup ?? null,
    convenienceFee: pricingPreview?.convenienceFee ?? pricingPreview?.ConvenienceFee ?? null,
    totalBeforeDiscount: pricingPreview?.totalBeforeDiscount ?? pricingPreview?.TotalBeforeDiscount ?? null,
    discountAmount: pricingPreview?.discountAmount ?? pricingPreview?.DiscountAmount ?? null,
    finalTotal: pricingPreview?.finalTotal ?? pricingPreview?.FinalTotal ?? null,
  }), [pricingPreview]);

  const handleBookRoom = async () => {
    if (!validationState.isValid) {
      Alert.alert("Check Passenger Details", validationState.globalError || "Please fill all required fields correctly.");
      return;
    }

    setBookingLoading(true);
    try {
      if (pricingStatus !== "valid" || !pricingPreview || validatingCoupon) {
        throw new Error("The latest hotel price is still being verified.");
      }
      if (targetTraceId === null || !targetResultIndex || !targetHotelCode) {
        throw new Error("Hotel session information is incomplete. Please select the hotel again.");
      }
      const finalRoomIdentities = authoritativeRoomList.map(getRoomIdentity);
      if (
        finalRoomIdentities.length === 0 ||
        finalRoomIdentities.some((identity) => !identity.roomIndex || !identity.roomTypeCode || !identity.optionId)
      ) {
        throw new Error("Selected hotel rate information is incomplete. Please select and block the room again.");
      }
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
            MiddleName: "",
            LastName: String(pax.lastName || "").trim(),
            PaxType: pax.isChild ? "2" : "1",
            Age: Number(pax.age),
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
          passengersPayload.push(paxObj);
        }

        const roomOfferedPrice = Number(roomObj.price?.offeredPrice || roomObj.offeredPrice || 0);
        const roomBasePrice = Number(roomObj.price?.roomPrice || roomObj.roomPrice || roomOfferedPrice);

        return {
          ChildCount: Number(guestConfig.NoOfChild || 0),
          RequireAllPaxDetails: Boolean(roomObj.requireAllPaxDetails || roomObj.RequireAllPaxDetails),
          RoomId: String(roomObj.roomId || roomObj.RoomId || ""),
          RoomStatus: "Active",
          RoomIndex: finalRoomIdentities[rIdx].roomIndex,
          RoomTypeCode: finalRoomIdentities[rIdx].roomTypeCode,
          OptionId: finalRoomIdentities[rIdx].optionId,
          RoomTypeName: String(roomObj.roomTypeName || roomObj.RoomTypeName || roomObj.categoryName || "Standard Room"),
          RatePlanCode: String(roomObj.ratePlanCode || roomObj.RatePlanCode || ""),
          RatePlan: String(roomObj.ratePlan || roomObj.RatePlan || roomObj.ratePlanCode || ""),
          LastCancellationDate: String(roomObj.lastCancellationDate || roomObj.LastCancellationDate || ""),
          CancellationPolicies: roomObj.cancellationPolicies || roomObj.CancellationPolicies || [],
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

      if (!Number.isFinite(fareBreakdown.total) || fareBreakdown.total <= 0) {
        throw new Error("The latest payable amount could not be verified.");
      }

      const bookPayload = {
        EndUserIp: "192.168.1.1",
        CheckInDate: searchParams?.checkInDate,
        CheckOutDate: searchParams?.checkOutDate,
        TraceId: targetTraceId,
        SrdvType: targetSrdvType,
        SrdvIndex: targetSrdvIndex,
        ResultIndex: targetResultIndex,
        HotelCode: targetHotelCode,
        HotelName: String(hotel.name || hotel.hotelName || "Hotel Stay"),
        GuestNationality: "IN",
        NoOfRooms: authoritativeRoomList.length,
        ClientReferenceNo: "0",
        IsVoucherBooking: true,
        GuestName: `${leadPax.firstName} ${leadPax.lastName}`.trim(),
        GuestTitle: String(leadPax.title || "Mr"),
        GuestGender: leadPax.title === "Mr" ? "Male" : "Female",
        GuestAge: Number(leadPax.age),
        GuestEmail: String(leadPax.email).trim(),
        GuestPhone: String(leadPax.phone).trim(),
        Price: fareBreakdown.total,
        CouponCode: activeCouponCode,
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
        hotelPricing,
        bookingDetails: bookPayload,
        customerDetails: {
          name: `${leadPax.firstName} ${leadPax.lastName}`.trim(),
          phone: String(leadPax.phone).trim(),
          email: String(leadPax.email).trim(),
          couponCode: activeCouponCode || null,
        }
      });
    } catch (err) {
      console.log("[HotelPassengerDetails] BookRoom error:", err?.message);
      const message = err?.isTraceExpired
        ? "Your room hold has expired. Please select the room again to check updated availability."
        : (err?.message || "Unable to prepare this room reservation.");
      Alert.alert(err?.isTraceExpired ? "Room hold expired" : "Booking unavailable", message, err?.isTraceExpired
        ? [{ text: "OK", onPress: () => navigation.goBack() }]
        : undefined);
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
        disabled={!agreedToTerms || !validationState.isValid || pricingStatus !== "valid" || validatingCoupon}
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
