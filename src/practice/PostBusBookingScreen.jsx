import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { blockSeats, bookSeats, getSeatLayout, getPricingPreview, getBusCoupons, getFeaturedOffers } from "../services/busService";
import { getTravelers } from "../services/travelerService";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";

import { API_BASE_URL } from "../constants/config";

const BASE_URL = API_BASE_URL;

const PRICING_PREVIEW_API_URL = `${BASE_URL}/api/BusBookings/pricing-preview`;

const BOOKING_API_URL = `${BASE_URL}/api/BusBookings/book`;

const removeIndianCountryCode = (phone) =>
  String(phone ?? "").replace(/^\s*\+91\s*/, "").trim();

const SEATS_API_URL = (busId) =>
  `${BASE_URL}/api/BusBookings/${encodeURIComponent(
    String(busId)
  )}/seats`;

const BOOKING_TIMEOUT_MS = 45000;

const redactBookingLog = (value) => {
  if (Array.isArray(value)) return value.map(redactBookingLog);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      const hidden = ["contactNo", "phone", "phoneNumber", "email", "idNumber", "address", "firstName", "lastName", "fullName", "passengerName"].some((field) =>
        key.toLowerCase().includes(field.toLowerCase())
      );
      return [key, hidden ? "[REDACTED]" : redactBookingLog(child)];
    })
  );
};

const logBusBookingFlow = (stage, data) => {
  if (data === undefined) {
    console.log(`[BusFlow] ${stage}`);
    return;
  }
  console.log(`[BusFlow] ${stage}`, redactBookingLog(data));
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const CONTENT_MAX_WIDTH = 760;

const getObjectValue = (value) =>
  value && typeof value === "object" ? value : null;

const normalizeIdValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return null;
  }

  const numericValue = Number(trimmedValue);

  return Number.isFinite(numericValue) ? numericValue : trimmedValue;
};

const isIdProofRequiredValue = (value) =>
  value === true || String(value ?? "").trim().toLowerCase() === "true";

const normalizeAmount = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatCurrency = (value = 0, options = {}) =>
  `\u20B9${normalizeAmount(value).toLocaleString("en-IN", options)}`;

const formatCurrencyDetailed = (value = 0) =>
  formatCurrency(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const buildFullName = (firstName, lastName, fallback = "") => {
  const fullName = [firstName, lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || fallback.trim();
};

const extractStoredUser = (payload) => {
  const root = getObjectValue(payload);

  if (!root) {
    return null;
  }

  const rawUser =
    getObjectValue(root.profile) ||
    getObjectValue(root.user) ||
    getObjectValue(root.data?.profile) ||
    getObjectValue(root.data?.user) ||
    getObjectValue(root.data) ||
    getObjectValue(root.result) ||
    root;

  if (!rawUser) {
    return null;
  }

  const firstName = rawUser.firstName ?? rawUser.FirstName ?? "";
  const lastName = rawUser.lastName ?? rawUser.LastName ?? "";

  return {
    ...rawUser,
    id: normalizeIdValue(
      rawUser.id ?? rawUser.userId ?? rawUser.Id ?? root.id ?? root.userId ?? root.Id
    ),
    firstName,
    lastName,
    email: rawUser.email ?? rawUser.Email ?? root.email ?? "",
    phoneNumber: rawUser.phoneNumber ?? rawUser.phone ?? rawUser.mobile ?? root.phoneNumber ?? "",
    fullName: buildFullName(firstName, lastName, rawUser.fullName ?? root.fullName ?? ""),
  };
};

const extractPricingPayload = (payload) => {
  const root = getObjectValue(payload);

  if (!root) {
    return null;
  }

  return (
    getObjectValue(root.priceBreakdown) ||
    getObjectValue(root.pricing) ||
    getObjectValue(root.data?.priceBreakdown) ||
    getObjectValue(root.data?.pricing) ||
    getObjectValue(root.data) ||
    getObjectValue(root.result?.priceBreakdown) ||
    getObjectValue(root.result?.pricing) ||
    getObjectValue(root.result) ||
    root
  );
};

const extractApiErrorMessage = (data) => {
  if (!data) {
    return null;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (data.errors && typeof data.errors === "object") {
    const flattenedErrors = Object.values(data.errors)
      .flat()
      .filter(Boolean)
      .map((value) => String(value).trim());

    if (flattenedErrors.length > 0) {
      return flattenedErrors.join("\n");
    }
  }

  return null;
};

const normalizeSeatList = (value) => {
  if (Array.isArray(value)) {
    return value.map((seat) => String(seat ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((seat) => seat.trim())
      .filter(Boolean);
  }

  return [];
};

const extractSeatCollection = (payload) => {
  if (Array.isArray(payload?.seats)) {
    return payload.seats;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
};

const normalizeSeatDetail = (value) => {
  const seat = getObjectValue(value);

  if (!seat) {
    return null;
  }

  const seatCode = String(seat.SeatCode ?? seat.seatCode ?? seat.seatNumber ?? seat.code ?? "").trim();

  if (!seatCode) {
    return null;
  }

  return {
    seatCode,
    priceInr: normalizeAmount(
      seat.TotalSeatFare ??
        seat.totalSeatFare ??
        seat.priceInr ??
        seat.fareBeforeTax ??
        seat.taxableFare ??
        seat.price ??
        seat.baseFare ??
        seat.BaseFare ??
        seat.fare ??
        seat.amount
    ),
    baseFareInr: normalizeAmount(seat.BaseFare ?? seat.baseFare ?? seat.baseFareInr),
    markupAmountInr: normalizeAmount(seat.MarkupAmount ?? seat.markupAmount ?? seat.markupAmountInr),
  };
};

const normalizeSeatDetailList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((seat) => normalizeSeatDetail(seat)).filter(Boolean);
};

const formatTimeString = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    value = value.time || value.Time || value.departureTime || value.arrivalTime || "";
  }
  const str = String(value || "").trim();
  if (!str || str === "--" || str === "null" || str === "undefined") return "";

  if (/^\d{1,2}:\d{2}\s*(AM|PM|am|pm)?$/i.test(str)) {
    return str;
  }

  const date = new Date(str);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }

  return str;
};

const buildBookingDetailsPayload = ({
  bookingResponse,
  requestBody,
  normalizedPassengers,
  fareSummary,
  selectedSeats,
  busId,
  passengerName,
  passengerPhone,
  passengerEmail,
  routeParams = {},
}) => {
  const responseData = getObjectValue(bookingResponse) || {};
  const bookingData = getObjectValue(responseData.booking) || getObjectValue(responseData.Booking) || responseData;
  const busObject = getObjectValue(routeParams.bus) || {};
  const journeyData =
    getObjectValue(responseData.journey) ||
    getObjectValue(responseData.Journey) ||
    getObjectValue(responseData.route) ||
    getObjectValue(responseData.Route) ||
    getObjectValue(responseData.trip) ||
    {};
  const paymentData = getObjectValue(responseData.payment) || getObjectValue(responseData.Payment) || {};
  const firstPassenger = normalizedPassengers?.[0] || requestBody?.passengers?.[0] || {};

  const resolvedBusName =
    journeyData.busName ||
    journeyData.BusName ||
    journeyData.vehicleName ||
    bookingData.busName ||
    responseData.busName ||
    routeParams.operatorName ||
    routeParams.busName ||
    busObject.operatorName ||
    busObject.travelsName ||
    busObject.travels ||
    busObject.busType ||
    `Bus ${busId}`;

  const resolvedFrom =
    journeyData.from ||
    journeyData.From ||
    journeyData.source ||
    journeyData.origin ||
    responseData.from ||
    routeParams.from ||
    routeParams.source ||
    routeParams.origin ||
    busObject.from ||
    busObject.source ||
    busObject.origin ||
    "--";

  const resolvedTo =
    journeyData.to ||
    journeyData.To ||
    journeyData.destination ||
    responseData.to ||
    routeParams.to ||
    routeParams.destination ||
    busObject.to ||
    busObject.destination ||
    "--";

  const resolvedTravelDate =
    journeyData.travelDate ||
    journeyData.TravelDate ||
    journeyData.dateOfJourney ||
    responseData.travelDate ||
    bookingData.travelDate ||
    routeParams.date ||
    routeParams.travelDate ||
    routeParams.dateValue ||
    busObject.doj ||
    busObject.date ||
    "--";

  const rawDeparture =
    journeyData.departureTime ||
    journeyData.DepartureTime ||
    journeyData.departureTimeUtc ||
    journeyData.DepartureTimeUtc ||
    journeyData.departure ||
    responseData.departureTime ||
    responseData.DepartureTime ||
    routeParams.selectedBoardingPoint?.time ||
    routeParams.selectedBoardingPoint?.Time ||
    routeParams.selectedBoardingPoint?.departureTime ||
    routeParams.selectedBoardingPoint?.DepartureTime ||
    routeParams.boardingPoint?.time ||
    routeParams.boardingPoint?.Time ||
    routeParams.departureTime ||
    routeParams.DepartureTime ||
    busObject.departureTimeUtc ||
    busObject.DepartureTimeUtc ||
    busObject.DepartureTime ||
    busObject.departureTime ||
    busObject.departure ||
    busObject.depTime ||
    (Array.isArray(busObject.BoardingPoints) ? busObject.BoardingPoints[0]?.Time : "") ||
    (Array.isArray(busObject.boardingPoints) ? busObject.boardingPoints[0]?.time : "") ||
    (Array.isArray(routeParams.boardingPoints) ? routeParams.boardingPoints[0]?.time : "");

  const rawArrival =
    journeyData.arrivalTime ||
    journeyData.ArrivalTime ||
    journeyData.arrivalTimeUtc ||
    journeyData.ArrivalTimeUtc ||
    journeyData.arrival ||
    responseData.arrivalTime ||
    responseData.ArrivalTime ||
    routeParams.selectedDroppingPoint?.time ||
    routeParams.selectedDroppingPoint?.Time ||
    routeParams.selectedDroppingPoint?.arrivalTime ||
    routeParams.selectedDroppingPoint?.ArrivalTime ||
    routeParams.droppingPoint?.time ||
    routeParams.droppingPoint?.Time ||
    routeParams.arrivalTime ||
    routeParams.ArrivalTime ||
    busObject.arrivalTimeUtc ||
    busObject.ArrivalTimeUtc ||
    busObject.ArrivalTime ||
    busObject.arrivalTime ||
    busObject.arrival ||
    busObject.arrTime ||
    (Array.isArray(busObject.DroppingPoints) ? busObject.DroppingPoints[0]?.Time : "") ||
    (Array.isArray(busObject.droppingPoints) ? busObject.droppingPoints[0]?.time : "") ||
    (Array.isArray(routeParams.droppingPoints) ? routeParams.droppingPoints[0]?.time : "");

  const resolvedDepartureTime = formatTimeString(rawDeparture) || (typeof rawDeparture === "string" ? rawDeparture : "--");
  const resolvedArrivalTime = formatTimeString(rawArrival) || (typeof rawArrival === "string" ? rawArrival : "--");

  const resolvedGender =
    firstPassenger.gender ||
    firstPassenger.Gender ||
    firstPassenger.sex ||
    firstPassenger.Sex ||
    requestBody.gender ||
    requestBody.passengers?.[0]?.gender ||
    "--";

  return {
    bookingId:
      bookingData.bookingId ||
      bookingData.bookingID ||
      bookingData.pnrNumber ||
      bookingData.pnr ||
      responseData.bookingId ||
      responseData.pnrNumber ||
      `PNR-${Date.now()}`,
    bookingDateTime:
      bookingData.bookingDateTime ||
      bookingData.createdAt ||
      responseData.bookingDateTime ||
      new Date().toISOString(),
    passenger: {
      name:
        requestBody.passengerName ||
        passengerName ||
        firstPassenger.fullName ||
        firstPassenger.name ||
        "--",
      age: firstPassenger.age ?? "--",
      gender: resolvedGender,
      mobileNumber: requestBody.passengerPhone || passengerPhone || "--",
      email: requestBody.passengerEmail || passengerEmail || "--",
      list: normalizedPassengers,
    },
    journey: {
      busName: resolvedBusName,
      from: resolvedFrom,
      to: resolvedTo,
      travelDate: resolvedTravelDate,
      departureTime: resolvedDepartureTime,
      arrivalTime: resolvedArrivalTime,
    },
    seats: {
      selectedSeatNumbers: selectedSeats,
      totalSeats: selectedSeats.length,
    },
    payment: {
      ticketFare: fareSummary.subtotal,
      taxes: fareSummary.gstAmount + fareSummary.convenienceFee,
      totalAmountPaid: fareSummary.grandTotal,
      paymentStatus:
        paymentData.status ||
        paymentData.paymentStatus ||
        responseData.paymentStatus ||
        "Success",
    },
    requestBody,
    rawResponse: responseData,
  };
};

const areSelectedSeatsBooked = (seatData, selectedSeatCodes) => {
  const requestedSeats = new Set(
    selectedSeatCodes.map((seat) => String(seat).trim().toUpperCase())
  );

  const bookedSeats = new Set(
    seatData
      .filter((seat) => seat?.isBooked)
      .map((seat) => String(seat?.seatCode ?? "").trim().toUpperCase())
  );

  return [...requestedSeats].every((seatCode) => bookedSeats.has(seatCode));
};

const AnimatedCard = ({ children, delay = 0, style }) => {
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const animatedTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(animatedTranslateY, {
        toValue: 0,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animatedOpacity, animatedTranslateY, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: animatedOpacity,
          transform: [{ translateY: animatedTranslateY }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const IconInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  accessibilityLabel,
}) => (
  <View style={styles.inputShell}>
    <View style={styles.inputIconWrap}>
      {icon}
    </View>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      accessibilityLabel={accessibilityLabel || placeholder}
    />
  </View>
);

const SectionCard = ({ title, subtitle, icon, children, style }) => (
  <View style={[styles.sectionCard, style]}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIconBadge}>{icon}</View>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
    {children}
  </View>
);

const PostBusBookingScreen = ({ route, navigation }) => {
  const busId = normalizeIdValue(route?.params?.busId) ?? 11;
  const selectedBus = route?.params?.bus || {};
  const idProofRequired = isIdProofRequiredValue(
    selectedBus.IdProofRequired ??
      selectedBus.isIdProofRequired ??
      selectedBus.idProofRequired ??
      route?.params?.IdProofRequired ??
      route?.params?.isIdProofRequired ??
      route?.params?.idProofRequired
  );

  const selectedSeatsParam = route?.params?.selectedSeats;
  const seatNumberParam = route?.params?.seatNumber;
  const selectedSeatDetailsParam = route?.params?.selectedSeatDetails;

  const selectedSeats = useMemo(() => {
    const seatsFromArray = normalizeSeatList(selectedSeatsParam);

    if (seatsFromArray.length > 0) {
      return seatsFromArray;
    }

    const seatsFromString = normalizeSeatList(seatNumberParam);

    if (seatsFromString.length > 0) {
      return seatsFromString;
    }

    return [];
  }, [seatNumberParam, selectedSeatsParam]);

  const routeSeatDetails = useMemo(
    () => normalizeSeatDetailList(selectedSeatDetailsParam),
    [selectedSeatDetailsParam]
  );

  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [seatPricingLoading, setSeatPricingLoading] = useState(false);

  const [authToken, setAuthToken] = useState("");

  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelersLoading, setTravelersLoading] = useState(false);
  const [travelersError, setTravelersError] = useState(null);
  const [selectedTravelerIds, setSelectedTravelerIds] = useState({});
  const [travelerTargetIndex, setTravelerTargetIndex] = useState(0);
  const [savedTravelerPickerOpen, setSavedTravelerPickerOpen] = useState(false);
  const [genderPickerIndex, setGenderPickerIndex] = useState(null);

  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [idProofErrors, setIdProofErrors] = useState({});

  const [couponCode, setCouponCode] = useState("");
  const [couponInputText, setCouponInputText] = useState("");
  const [couponFeedback, setCouponFeedback] = useState("");
  const [selectedFeaturedOfferId, setSelectedFeaturedOfferId] = useState(normalizeIdValue(route?.params?.selectedFeaturedOfferId) || null);
  
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  
  const [pricing, setPricing] = useState(null);
  const [selectedSeatDetails, setSelectedSeatDetails] = useState(routeSeatDetails);

  // Cache block response to prevent double /block calls
  const [cachedBlockKey, setCachedBlockKey] = useState(null);
  const [cachedBlockResponse, setCachedBlockResponse] = useState(null);
  const bookingSubmissionRef = useRef(false);

  const [passengers, setPassengers] = useState(
    selectedSeats.map((seat) => ({
      fullName: "",
      gender: "",
      seatNumber: seat,
      age: "",
      idType: "Aadhar",
      idNumber: "",
    }))
  );

  const fetchSeatCollection = async () => {
    const bus = route?.params?.bus || {};
    const layout = await getSeatLayout({
      traceId: bus.traceId,
      resultIndex: bus.resultIndex,
      srdvIndex: bus.srdvIndex,
    });
    return extractSeatCollection(layout);
  };

  const loadSession = async () => {
    try {
      setSessionLoading(true);

      const token = await SecureStore.getItemAsync("token");
      const storedUser = await SecureStore.getItemAsync("user");

      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const user = extractStoredUser(parsedUser) || {};

      setAuthToken(token || "");

      setPassengerName(user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim());
      setPassengerPhone(removeIndianCountryCode(user?.phoneNumber));
      setPassengerEmail(user?.email || "");
    } catch (error) {
      console.log("Session Load Error:", error);
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchSavedTravelers = async (tokenToUse) => {
    const token = tokenToUse || authToken;
    if (!token) return;

    try {
      setTravelersLoading(true);
      setTravelersError(null);
      console.log("[PostBusBookingScreen] Fetching GET /api/Travelers");
      const list = await getTravelers(token);
      setSavedTravelers(list || []);
      return list || [];
    } catch (err) {
      console.log("[PostBusBookingScreen] Error fetching saved travelers:", err);
      setTravelersError("Unable to load saved travelers.");
    } finally {
      setTravelersLoading(false);
    }
    return [];
  };

  useEffect(() => {
    const fetchDeals = async () => {
      if (!authToken) return;
      try {
        setDealsLoading(true);
        const [couponsRes, offersRes] = await Promise.all([
          getBusCoupons(authToken).catch(() => []),
          getFeaturedOffers().catch(() => ({ offers: [] }))
        ]);
        
        if (Array.isArray(couponsRes)) {
          setAvailableCoupons(couponsRes);
        }
        
        if (offersRes && Array.isArray(offersRes.offers)) {
          console.log("[PostBusBookingScreen] Raw Featured Offers:", JSON.stringify(offersRes.offers, null, 2));
          
          const busOffers = offersRes.offers.filter(offer => 
            String(offer.bookingType || offer.type || offer.serviceType || "bus").toLowerCase().includes("bus")
          );
          setFeaturedOffers(busOffers);
        }
      } catch (err) {
        console.warn("Failed to fetch deals", err);
      } finally {
        setDealsLoading(false);
      }
    };
    
    fetchDeals();
  }, [authToken]);

  const handleSelectTraveler = (traveler, passengerIndex = travelerTargetIndex) => {
    if (!traveler || passengerIndex < 0 || passengerIndex >= passengers.length) return;

    setSelectedTravelerIds((current) => ({
      ...current,
      [passengerIndex]: traveler.id,
    }));

    setPassengers((prev) => {
      if (!prev?.[passengerIndex]) return prev;
      const next = [...prev];
      next[passengerIndex] = {
        ...next[passengerIndex],
        fullName: traveler.fullName || "",
        gender: traveler.gender || "",
        age: traveler.age ? String(traveler.age) : "",
      };
      return next;
    });

    if (passengerIndex === 0 && traveler.fullName) setPassengerName(traveler.fullName);
    if (traveler.phoneNumber) {
      setPassengerPhone((current) => current || removeIndianCountryCode(traveler.phoneNumber));
    }
    if (traveler.email) setPassengerEmail((current) => current || traveler.email);
  };

  const openTravelerPicker = (passengerIndex) => {
    setTravelerTargetIndex(passengerIndex);
    setSavedTravelerPickerOpen(true);
  };

  const handleAddNewTraveler = (passengerIndex = travelerTargetIndex) => {
    setTravelerTargetIndex(passengerIndex);
    setSavedTravelerPickerOpen(false);
    navigation.navigate("TravelersScreen", {
      openAdd: true,
      returnToBooking: true,
      returnRouteName: "PostBusBooking",
      travelerTargetIndex: passengerIndex,
    });
  };

  const getCleanSeatType = (rawType) => {
    const typeLower = String(rawType || "").toLowerCase().trim();
    if (typeLower.includes("sleeper")) {
      return "Sleeper";
    }
    return "Seater";
  };

  const fetchPricingPreview = async ({ applyPricing = true } = {}) => {
    logBusBookingFlow("Pricing preview started", {
      applyPricing,
      selectedSeats,
      selectedSeatDetails,
      couponCode,
      selectedFeaturedOfferId,
    });
    if (selectedSeats.length === 0) {
      if (applyPricing) {
        setPricing(null);
      }
      setPricingLoading(false);
      return null;
    }

    try {
      setPricingLoading(true);

      let finalSeats = [];
      try {
        const hasBaseFare = selectedSeatDetails.some((d) => d.baseFare !== undefined && d.baseFare !== null);
        if (!hasBaseFare) {
          console.log("[PricingPreview] Fetching layout to resolve seat details...");
          const fullSeats = await fetchSeatCollection();
          finalSeats = selectedSeats.map((seatCode) => {
            const seat = fullSeats.find((s) => String(s.seatCode ?? s.SeatName ?? "") === String(seatCode)) || {};
            const rawBase = seat.Price?.BaseFare ?? seat.Price?.baseFare ?? seat.BaseFare ?? seat.baseFare ?? seat.SeatFare ?? seat.priceInr ?? 0;
            const rawGst = seat.Price?.GSTAmount ?? seat.Price?.gstAmount ?? seat.GSTAmount ?? seat.gstAmount ?? 0;
            return {
              seatCode,
              baseFare: Number(rawBase),
              seatType: getCleanSeatType(seat.SeatType ?? seat.seatType),
              externalGst: Number(rawGst),
            };
          });
        } else {
          finalSeats = selectedSeats.map((seatCode) => {
            const detail = selectedSeatDetails.find((d) => String(d.seatCode) === String(seatCode)) || {};
            return {
              seatCode: String(seatCode),
              baseFare: Number(detail.baseFare ?? detail.priceInr ?? 0),
              seatType: getCleanSeatType(detail.seatType),
              externalGst: Number(detail.externalGst ?? 0),
            };
          });
        }
      } catch (e) {
        console.warn("[PricingPreview] Failed to resolve seat details, using fallbacks:", e.message);
        finalSeats = selectedSeats.map((seatCode) => {
          const detail = selectedSeatDetails.find((d) => String(d.seatCode) === String(seatCode)) || {};
          return {
            seatCode: String(seatCode),
            baseFare: Number(detail.priceInr ?? 0),
            seatType: getCleanSeatType(detail.seatType),
            externalGst: Number(detail.externalGst ?? 0),
          };
        });
      }

      const busObj = route?.params?.bus || {};
      const fromCity = String(busObj.fromCity ?? busObj.from ?? route?.params?.from ?? route?.params?.sourceCity ?? "");
      const toCity = String(busObj.toCity ?? busObj.to ?? route?.params?.to ?? route?.params?.destinationCity ?? "");
      const departureTime = String(busObj.departureTimeUtc ?? busObj.departureTime ?? busObj.DepartureTime ?? route?.params?.departureTime ?? route?.params?.dateValue ?? "");
      const operatorName = String(busObj.operatorName ?? busObj.travelsName ?? route?.params?.operatorName ?? "Operator");
      const busType = String(busObj.busType ?? route?.params?.busType ?? "Bus");
      const traceId = String(route?.params?.traceId ?? busObj.traceId ?? "");

      const seatsPayload = finalSeats.map((s) => ({
        seatCode: String(s.seatCode),
        seatType: String(s.seatType || "Seater"),
        baseFare: Number(s.baseFare || 0),
        externalGst: Number(s.externalGst || 0),
      }));

      // totalFare = sum of per-seat (baseFare + externalGst) — provider-level fares only
      const totalFare = seatsPayload.reduce(
        (sum, s) => sum + s.baseFare + s.externalGst, 0
      );

      const requestPayload = {
        traceId,
        resultIndex: String(route?.params?.resultIndex ?? busObj.resultIndex ?? route?.params?.ResultIndex ?? busObj.ResultIndex ?? ""),
        srdvIndex: Number(route?.params?.srdvIndex ?? busObj.srdvIndex ?? route?.params?.SrdvIndex ?? busObj.SrdvIndex ?? 0) || undefined,
        couponCode: couponCode || null,
        selectedFeaturedOfferId: selectedFeaturedOfferId || null,
        fromCity,
        toCity,
        departureTime,
        operatorName,
        busType,
        totalFare,
        seats: seatsPayload,
      };

      logBusBookingFlow("Pricing preview request", requestPayload);

      const apiData = await getPricingPreview(requestPayload);
      const pricingPayload = extractPricingPayload(apiData) || apiData;

      logBusBookingFlow("Pricing preview response", pricingPayload);

      if (applyPricing) {
        setPricing(pricingPayload);
        if (couponCode) {
          const appliedCode = String(pricingPayload?.appliedPromotionCode || "").trim();
          const discount = normalizeAmount(
            pricingPayload?.couponDiscountAmount ?? pricingPayload?.appliedCouponAmount ?? 0
          );
          setCouponFeedback(
            appliedCode || discount > 0
              ? "Coupon applied to the live fare."
              : "This coupon is not applicable to the selected trip."
          );
        }
      }

      return pricingPayload;
    } catch (error) {
      const errorData = error?.response?.data;
      logBusBookingFlow("Pricing preview failed", {
        message: error?.message,
        status: error?.response?.status,
        response: errorData,
      });
      console.log("Pricing Preview Error Details:", errorData ? JSON.stringify(errorData, null, 2) : error.message);
      
      const errorMessage = errorData?.message || errorData?.Message || "";
      if (
        error?.response?.status === 400 && 
        (errorMessage.toLowerCase().includes("invalid") || errorMessage.toLowerCase().includes("inactive") || errorMessage.toLowerCase().includes("coupon") || errorMessage.toLowerCase().includes("offer"))
      ) {
        Alert.alert("Offer Unavailable", errorMessage || "The selected offer is invalid or inactive.");
        setCouponCode("");
        setCouponInputText("");
        setSelectedFeaturedOfferId(null);
        setCouponFeedback(errorMessage || "Unable to apply this coupon.");
      }

      if (applyPricing) {
        setPricing(null);
      }

      return null;
    } finally {
      setPricingLoading(false);
    }
  };

  const handlePassengerChange = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);

    if (field === "idNumber" && idProofErrors[index]) {
      setIdProofErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors[index];
        return nextErrors;
      });
    }
  };

  const fetchLatestSeatStatus = async () => fetchSeatCollection();

  const validateForm = () => {
    setIdProofErrors({});

    if (sessionLoading) {
      Alert.alert("Please Wait", "Loading your booking session.");
      return false;
    }

    if (!authToken) {
      Alert.alert("Login Required", "Please sign in again before booking.");
      return false;
    }

    if (selectedSeats.length === 0) {
      Alert.alert("No Seats Selected", "Select at least one seat before continuing.");
      return false;
    }

    // Validate Contact Details
    if (!passengerPhone.trim()) {
      Alert.alert("Contact Details Required", "Please enter a mobile number so we can send your ticket.");
      return false;
    }
    if (!/^\d{10}$/.test(passengerPhone.replace(/\D/g, ""))) {
      Alert.alert("Contact Details Required", "Enter a valid 10-digit mobile number.");
      return false;
    }
    if (!passengerEmail.trim() || !passengerEmail.trim().includes("@")) {
      Alert.alert("Contact Details Required", "Please enter a valid email address for booking confirmation.");
      return false;
    }

    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i];
      if (!passenger.fullName.trim() || !passenger.gender || !passenger.age) {
        Alert.alert("Validation Error", `Complete all details for Passenger ${i + 1} (Seat ${passenger.seatNumber}).`);
        return false;
      }
      const passengerAge = Number(passenger.age);
      if (!Number.isInteger(passengerAge) || passengerAge < 1 || passengerAge > 120) {
        Alert.alert("Validation Error", `Enter a valid age for Passenger ${i + 1}.`);
        return false;
      }

      if (idProofRequired) {
        const cleanId = String(passenger.idNumber || "").trim();
        if (!cleanId) {
          setIdProofErrors((currentErrors) => ({
            ...currentErrors,
            [i]: "Aadhaar/ID Proof is required",
          }));
          Alert.alert("Validation", "Aadhaar/ID Proof is required");
          return false;
        }
        if (!/^\d{12}$/.test(cleanId)) {
          setIdProofErrors((currentErrors) => ({
            ...currentErrors,
            [i]: "Aadhaar/ID Proof must contain exactly 12 digits",
          }));
          Alert.alert("Validation", `Aadhaar Number for Passenger ${i + 1} must contain exactly 12 digits`);
          return false;
        }
      }
    }

    return true;
  };

  const seatBreakdown = useMemo(() => {
    const pricingSeatDetails = normalizeSeatDetailList(pricing?.seats);

    const seatSource = pricingSeatDetails.length > 0 ? pricingSeatDetails : selectedSeatDetails;

    const priceBySeatCode = new Map(
      seatSource.map((seat) => [seat.seatCode, normalizeAmount(seat.priceInr)])
    );

    return selectedSeats.map((seatCode) => ({
      seatCode,
      priceInr: normalizeAmount(priceBySeatCode.get(seatCode)),
    }));
  }, [pricing?.seats, selectedSeatDetails, selectedSeats]);

  const fareSummary = useMemo(() => {
    const estimatedSubtotal = seatBreakdown.reduce((sum, seat) => sum + seat.priceInr, 0);

    const subtotal = pricing
      ? normalizeAmount(
          pricing.subtotalBeforeCoupon ??
            pricing.subtotal ??
            pricing.taxableFare ??
            pricing.taxableFareInr ??
            pricing.netFareInr ??
            pricing.baseFareInr ??
            pricing.baseFare ??
            estimatedSubtotal
        )
      : estimatedSubtotal;

    // 1. Auto Discount Calculation
    const rawAutoDiscount = pricing
      ? normalizeAmount(
          pricing.autoDiscountAmount ??
            pricing.autoDiscount ??
            pricing.automaticDiscount ??
            0
        )
      : 0;

    const autoPromoCode =
      pricing?.autoPromotionCode ||
      pricing?.autoPromotionTitle ||
      pricing?.autoDiscountLabel ||
      "";

    const autoDiscountLabel = autoPromoCode
      ? `Auto Discount (${autoPromoCode})`
      : "Auto Discount";

    // 2. Coupon / Manual Discount Calculation
    let rawCouponDiscount = pricing
      ? normalizeAmount(
          pricing.couponDiscountAmount ??
            pricing.manualDiscountAmount ??
            pricing.appliedCouponAmount ??
            0
        )
      : 0;

    // Fallback if backend returns pricing.couponAmount or discountAmount/totalDiscount without splitting:
    if (pricing && rawCouponDiscount === 0) {
      const rawTotalDiscount = normalizeAmount(pricing.totalDiscount ?? pricing.discountAmount ?? 0);
      const rawCouponAmount = normalizeAmount(pricing.couponAmount ?? pricing.discountAmountInr ?? 0);

      if (rawAutoDiscount > 0) {
        if (rawTotalDiscount > rawAutoDiscount) {
          rawCouponDiscount = rawTotalDiscount - rawAutoDiscount;
        } else if (rawCouponAmount > rawAutoDiscount && (pricing.appliedPromotionCode || couponCode)) {
          rawCouponDiscount = rawCouponAmount - rawAutoDiscount;
        }
      } else {
        rawCouponDiscount = rawCouponAmount || rawTotalDiscount;
      }
    }

    const appliedCouponCode = pricing?.appliedPromotionCode || couponCode || "";
    const couponDiscountLabel = appliedCouponCode
      ? `Coupon (${appliedCouponCode})`
      : "Coupon";

    const gstPercent = pricing?.gstPercent ?? pricing?.taxPercent ?? null;

    const gstAmount = pricing
      ? normalizeAmount(pricing.gstAmount ?? pricing.gstAmountInr ?? pricing.taxAmount ?? 0)
      : 0;

    const convenienceFee = pricing
      ? normalizeAmount(
          pricing.convenienceFee ??
            pricing.convenienceFeeInr ??
            pricing.serviceFee ??
            pricing.bookingFee ??
            0
        )
      : 0;

    const totalDiscount = rawAutoDiscount + rawCouponDiscount;
    const computedGrandTotal = subtotal - totalDiscount + gstAmount + convenienceFee;

    const grandTotal = pricing
      ? normalizeAmount(
          pricing.grandTotal ??
            pricing.finalAmount ??
            pricing.total ??
            pricing.customerFareInr ??
            pricing.totalPriceInr ??
            pricing.totalPayable ??
            computedGrandTotal
        )
      : estimatedSubtotal;

    return {
      subtotal,
      autoDiscountAmount: rawAutoDiscount,
      autoDiscountLabel,
      couponAmount: rawCouponDiscount,
      couponDiscountLabel,
      gstPercent,
      gstAmount,
      convenienceFee,
      grandTotal,
      isEstimated: !pricing,
    };
  }, [pricing, seatBreakdown, couponCode]);

  const fareSummaryNote = fareSummary.isEstimated
    ? (couponCode || selectedFeaturedOfferId)
      ? "Estimated from selected seat fares. Deal, GST, and convenience fee will refresh when pricing preview becomes available."
      : "Estimated from selected seat fares. GST and convenience fee will refresh when pricing preview becomes available."
    : "Final payable amount including discounts, GST, and convenience fee.";

  const couponSummaryLabel = couponCode
    ? `Coupon (${couponCode})`
    : selectedFeaturedOfferId
      ? "Featured Offer"
      : fareSummary.couponDiscountLabel || "Coupon";

  const couponSummaryValue = (couponCode || selectedFeaturedOfferId)
    ? fareSummary.couponAmount > 0
      ? `-${formatCurrencyDetailed(fareSummary.couponAmount)}`
      : fareSummary.isEstimated
        ? "Applying..."
        : "Not applicable"
    : fareSummary.couponAmount > 0
      ? `-${formatCurrencyDetailed(fareSummary.couponAmount)}`
      : "Not applied";

  const gstSummaryLabel =
    fareSummary.gstPercent !== null ? `GST (${fareSummary.gstPercent}%)` : "GST";

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    setPassengers((currentPassengers) =>
      selectedSeats.map((seat) => {
        const existingPassenger = currentPassengers.find(
          (passenger) => passenger.seatNumber === seat
        );

        return (
          existingPassenger || {
            fullName: "",
            gender: "",
            seatNumber: seat,
            age: "",
            idType: "Aadhar",
            idNumber: "",
          }
        );
      })
    );

    // Reset block cache when seat selection changes
    setCachedBlockKey(null);
    setCachedBlockResponse(null);
  }, [selectedSeats]);

  useFocusEffect(
    useCallback(() => {
      if (sessionLoading || !authToken) return undefined;

      let active = true;
      fetchSavedTravelers(authToken).then((list) => {
        if (!active || !route?.params?.newlyCreatedTravelerId) return;
        const created = list.find(
          (traveler) => String(traveler.id) === String(route.params.newlyCreatedTravelerId)
        );
        if (created) {
          handleSelectTraveler(
            created,
            Number(route?.params?.newlyCreatedTravelerTargetIndex ?? 0)
          );
        }
        navigation.setParams({
          newlyCreatedTravelerId: undefined,
          newlyCreatedTravelerTargetIndex: undefined,
        });
      });

      return () => {
        active = false;
      };
    }, [authToken, sessionLoading, route?.params?.newlyCreatedTravelerId, route?.params?.newlyCreatedTravelerTargetIndex])
  );

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (!authToken) {
      return;
    }

    if (selectedSeats.length === 0) {
      return;
    }

    console.log("Fetching Pricing Preview...");

    fetchPricingPreview();
  }, [authToken, couponCode, selectedFeaturedOfferId, selectedSeats, sessionLoading]);

  useEffect(() => {
    let isActive = true;

    const loadSelectedSeatDetails = async () => {
      if (selectedSeats.length === 0) {
        setSelectedSeatDetails([]);
        setSeatPricingLoading(false);
        return;
      }

      const filteredRouteSeatDetails = routeSeatDetails.filter((seat) =>
        selectedSeats.includes(seat.seatCode)
      );

      const hasRoutePricingForAllSeats = selectedSeats.every((seatCode) =>
        filteredRouteSeatDetails.some((seat) => seat.seatCode === seatCode && seat.priceInr > 0)
      );

      if (hasRoutePricingForAllSeats) {
        setSelectedSeatDetails(filteredRouteSeatDetails);
        setSeatPricingLoading(false);
        return;
      }

      try {
        setSeatPricingLoading(true);

        const seatCollection = await fetchSeatCollection();

        const fetchedSeatDetails = seatCollection
          .map((seat) => normalizeSeatDetail(seat))
          .filter((seat) => seat && selectedSeats.includes(seat.seatCode));

        if (isActive) {
          setSelectedSeatDetails(fetchedSeatDetails);
        }
      } catch (error) {
        console.log("Seat Pricing Error:", error?.response?.data || error.message);

        if (isActive) {
          setSelectedSeatDetails(filteredRouteSeatDetails);
        }
      } finally {
        if (isActive) {
          setSeatPricingLoading(false);
        }
      }
    };

    loadSelectedSeatDetails();

    return () => {
      isActive = false;
    };
  }, [busId, routeSeatDetails, selectedSeats]);

  const handleBooking = async () => {
    if (bookingSubmissionRef.current) return;

    if (!validateForm()) {
      logBusBookingFlow("Booking validation failed");
      return;
    }

    bookingSubmissionRef.current = true;

    const getGenderInt = (genderStr) => {
      const clean = String(genderStr || "").trim().toLowerCase();
      if (clean === "female" || clean === "f" || clean === "2") {
        return 2;
      }
      if (clean === "male" || clean === "m" || clean === "1") return 1;
      return 1;
    };

    try {
      setLoading(true);
      logBusBookingFlow("Booking flow started", {
        selectedSeats,
        bus: route?.params?.bus,
        boardingPoint: route?.params?.selectedBoardingPoint || route?.params?.boardingPoint,
        droppingPoint: route?.params?.selectedDroppingPoint || route?.params?.droppingPoint,
      });

      const normalizedPassengers = passengers.map((passenger) => {
        const nameParts = String(passenger.fullName || "").trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");
        const fullName = `${firstName} ${lastName}`.trim();
        
        const seatCode = passenger.seatNumber || passenger.seatCode || "";
        const seatDetail = selectedSeatDetails.find((s) => String(s.seatCode) === String(seatCode)) || {};
        const seatFare = Number(seatDetail.baseFare ?? seatDetail.priceInr ?? 0);

        const genderInt = getGenderInt(passenger.gender);
        const genderStr = genderInt === 2 ? "Female" : "Male";
        const title = genderInt === 2 ? "Ms" : "Mr";

        const normalizedPassenger = {
          title,
          firstName,
          lastName,
          fullName,
          age: Number(passenger.age),
          seatName: seatCode,
          seatNumber: seatCode,
          fare: seatFare,
          baseFare: seatFare,
          seatType: getCleanSeatType(seatDetail.seatType),
          externalGst: Number(seatDetail.externalGst ?? 0),
          contactNo: passengerPhone.trim(),
          email: passengerEmail.trim(),
          address: "",
          city: String(route?.params?.from ?? route?.params?.bus?.fromCity ?? ""),
          state: "",
          genderInt,
          genderStr,
        };

        if (idProofRequired) {
          normalizedPassenger.idType = "Aadhar Card";
          normalizedPassenger.idNumber = String(passenger.idNumber || "").trim();
        }

        return normalizedPassenger;
      });

      logBusBookingFlow("Passengers normalized", normalizedPassengers);

      const selectedSeatCodes = normalizedPassengers.map((passenger) => passenger.seatNumber);

      const finalPricingPayload = await fetchPricingPreview({
        applyPricing: true,
      });

      logBusBookingFlow("Booking pricing result", finalPricingPayload);

      if (!finalPricingPayload) {
        Alert.alert("Pricing Error", "Unable to verify latest fare before booking.");
        return;
      }

      const bus = route?.params?.bus || {};
      const traceId = bus.traceId;
      const resultIndex = bus.resultIndex !== undefined && bus.resultIndex !== null ? String(bus.resultIndex).trim() : "";

      let baseDate = new Date().toISOString().split("T")[0];
      if (route?.params?.dateValue) {
        baseDate = route.params.dateValue;
      } else if (route?.params?.date || route?.params?.departDate) {
        const d = new Date(route?.params?.date || route?.params?.departDate);
        if (!Number.isNaN(d.getTime())) {
          baseDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }

      const extractDatePart = (timeStr, fallbackDate) => {
        if (!timeStr) return fallbackDate;
        const s = String(timeStr).trim();
        const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) return m[1];
        return fallbackDate;
      };

      const parseToDateTime = (timeStr, baseDateStr) => {
        if (!timeStr) return null;
        const trimmed = String(timeStr).trim();
        if (!trimmed) return null;

        // 1. If it starts with YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
          const normalized = trimmed.replace(" ", "T");
          // e.g. "2026-10-14T21:40" -> "2026-10-14T21:40:00"
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
            return `${normalized}:00`;
          }
          // e.g. "2026-10-14T21:40:00"
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(normalized)) {
            return normalized.slice(0, 19);
          }
          return normalized;
        }

        const datePart = baseDateStr ? String(baseDateStr).trim() : baseDate;

        // 2. Check 12-hour format e.g. "09:40 PM" or "9:40 AM"
        const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
        if (ampmMatch) {
          const [, hh, mm, ss = "00", modifier] = ampmMatch;
          let hour = parseInt(hh, 10);
          if (modifier.toUpperCase() === "PM" && hour < 12) hour += 12;
          if (modifier.toUpperCase() === "AM" && hour === 12) hour = 0;
          return `${datePart}T${String(hour).padStart(2, "0")}:${mm}:${ss}`;
        }

        // 3. Check 24-hour format e.g. "21:40" or "21:40:00" or "9:40"
        const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (timeMatch) {
          const [, hh, mm, ss = "00"] = timeMatch;
          return `${datePart}T${String(hh).padStart(2, "0")}:${mm}:${ss}`;
        }

        if (trimmed.includes("T")) {
          return trimmed;
        }

        return trimmed || null;
      };

      const getMinutesOfDay = (timeStr) => {
        if (!timeStr) return null;
        const value = String(timeStr).trim();
        const timePart = value.match(/(?:T|\s)(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i)?.[1] ?? value;
        const match = timePart.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
        if (!match) return null;

        let hour = Number(match[1]);
        const minute = Number(match[2]);
        const modifier = match[3]?.toUpperCase();
        if (minute > 59 || hour > (modifier ? 12 : 23)) return null;
        if (modifier === "PM" && hour < 12) hour += 12;
        if (modifier === "AM" && hour === 12) hour = 0;
        return hour * 60 + minute;
      };

      const addOneDay = (datePart) => {
        const match = String(datePart || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return datePart;
        const nextDate = new Date(Date.UTC(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]) + 1,
        ));
        return [
          nextDate.getUTCFullYear(),
          String(nextDate.getUTCMonth() + 1).padStart(2, "0"),
          String(nextDate.getUTCDate()).padStart(2, "0"),
        ].join("-");
      };

      const normalizeSeatType = (seatType) => {
        const typeStr = String(seatType || "").toLowerCase();
        if (typeStr.includes("sleeper")) return "Sleeper";
        if (typeStr.includes("seater")) return "Seater";
        return seatType || "Seater";
      };

      const getPointId = (val) => {
        if (!val) return "";
        if (typeof val === "object") {
          return String(val.Id ?? val.id ?? val.pointId ?? val.pointID ?? val.code ?? "");
        }
        return String(val);
      };

      const boardingPoint = (typeof route?.params?.boardingPoint === 'object' ? route.params.boardingPoint : route?.params?.selectedBoardingPoint) || {};
      const droppingPoint = (typeof route?.params?.droppingPoint === 'object' ? route.params.droppingPoint : route?.params?.selectedDroppingPoint) || {};

      const rawBoardingId = route?.params?.boardingPointId ?? route?.params?.BoardingPointId ?? boardingPoint?.Id ?? boardingPoint?.id ?? "";
      const rawDroppingId = route?.params?.droppingPointId ?? route?.params?.DroppingPointId ?? droppingPoint?.Id ?? droppingPoint?.id ?? "";

      const boardingPointId = getPointId(rawBoardingId);
      const droppingPointId = getPointId(rawDroppingId);

      const boardingPointName = boardingPoint?.Name ?? boardingPoint?.name ?? route?.params?.boardingPointName ?? (typeof route?.params?.boardingPoint === 'string' ? route.params.boardingPoint : "");
      const droppingPointName = droppingPoint?.Name ?? droppingPoint?.name ?? route?.params?.droppingPointName ?? (typeof route?.params?.droppingPoint === 'string' ? route.params.droppingPoint : "");

      // 1. Build Block payload matching API Integration Guide schema
      const pricingSeats = Array.isArray(finalPricingPayload?.seats)
        ? finalPricingPayload.seats
        : [];

      const blockPassengers = normalizedPassengers.map((p) => {
        const pricingSeat = pricingSeats.find(
          (seat) => String(seat?.seatCode ?? "") === String(p.seatNumber ?? p.seatName ?? "")
        );
        // Block must receive the provider base fare. The pricing-preview
        // response may also contain markup in fareBeforeTax; that value must
        // not be sent to the operator's block API as passenger fare.
        const providerSeatFare = Number(
          pricingSeat?.baseFare ?? p.baseFare ?? p.fare ?? 0
        );
        const passengerObj = {
          title: String(p.title || "Mr"),
          firstName: String(p.firstName || p.fullName || "Passenger"),
          lastName: String(p.lastName || ""),
          age: Number(p.age) || 25,
          gender: p.genderInt !== undefined ? String(p.genderInt) : (String(p.genderStr || p.gender).toLowerCase() === "female" ? "2" : "1"),
          seatName: String(p.seatName || p.seatNumber || ""),
          fare: providerSeatFare,
          contactNo: String(passengerPhone || "").trim(),
          email: String(passengerEmail || "").trim(),
          address: String(boardingPointName || "").trim(),
          city: String(route?.params?.from ?? route?.params?.bus?.fromCity ?? ""),
          state: ""
        };

        if (idProofRequired) {
          passengerObj.idType = "Aadhar Card";
          passengerObj.idNumber = String(p.idNumber || "").trim();
        }

        return passengerObj;
      });

      const busObj = route?.params?.bus || {};
      const routeId = String(busObj.routeId ?? busObj.RouteId ?? route?.params?.routeId ?? "");
      const fromCity = String(busObj.fromCity ?? busObj.from ?? route?.params?.from ?? route?.params?.sourceCity ?? "");
      const toCity = String(busObj.toCity ?? busObj.to ?? route?.params?.to ?? route?.params?.destinationCity ?? "");
      const rawDepartureTime = String(busObj.departureDateTime ?? busObj.departureTimeUtc ?? busObj.DepartureTime ?? busObj.departureTime ?? route?.params?.departureTime ?? "");
      const rawArrivalTime = String(busObj.arrivalDateTime ?? busObj.arrivalTimeUtc ?? busObj.ArrivalTime ?? busObj.arrivalTime ?? route?.params?.arrivalTime ?? "");
      
      const departureDatePart = extractDatePart(rawDepartureTime, baseDate);
      let arrivalDatePart = extractDatePart(rawArrivalTime, departureDatePart);

      const rawBoardingTime = route?.params?.boardingPointTime ?? boardingPoint?.rawTime ?? boardingPoint?.Time ?? boardingPoint?.time ?? "";
      const rawDroppingTime = route?.params?.droppingPointTime ?? droppingPoint?.rawTime ?? droppingPoint?.Time ?? droppingPoint?.time ?? "";

      // If arrivalDatePart was not explicitly next-day, but drop time is earlier than boarding time,
      // it means the journey reaches the next day.
      const effectiveBoardingTime = rawBoardingTime || rawDepartureTime;
      const effectiveDroppingTime = rawDroppingTime || rawArrivalTime;
      const boardingMinutes = getMinutesOfDay(effectiveBoardingTime);
      const droppingMinutes = getMinutesOfDay(effectiveDroppingTime);
      const droppingHasExplicitDate = /^\d{4}-\d{2}-\d{2}/.test(
        String(effectiveDroppingTime).trim(),
      );
      if (
        arrivalDatePart === departureDatePart &&
        !droppingHasExplicitDate &&
        boardingMinutes !== null &&
        droppingMinutes !== null &&
        droppingMinutes < boardingMinutes
      ) {
        arrivalDatePart = addOneDay(departureDatePart);
      }

      const departureTime = parseToDateTime(rawDepartureTime, departureDatePart) || rawDepartureTime;
      const arrivalTime = parseToDateTime(rawArrivalTime, arrivalDatePart) || rawArrivalTime;
      
      const boardingPointTime = parseToDateTime(rawBoardingTime, departureDatePart);
      const droppingPointTime = parseToDateTime(rawDroppingTime, arrivalDatePart);

      const operatorName = String(busObj.operatorName ?? busObj.travelsName ?? route?.params?.operatorName ?? "Operator");
      const busType = String(busObj.busType ?? route?.params?.busType ?? "Bus");
      // The bus operator's block API expects the provider fare, not the
      // customer payable amount (which may include discounts, GST and fees).
      // Sending grandTotal here can make SRDV reject an otherwise valid seat
      // selection with error 1003.
      const providerTotalFare = blockPassengers.reduce(
        (sum, passenger) => sum + (Number(passenger.fare) || 0),
        0
      );
      const customerTotalFare = Number(fareSummary.grandTotal || busObj.priceInr || 0);

      const blockRequestBody = {
        traceId: String(route?.params?.traceId ?? busObj.traceId ?? ""),
        resultIndex: String(busObj.resultIndex ?? busObj.ResultIndex ?? route?.params?.resultIndex ?? ""),
        srdvIndex: String(busObj.srdvIndex ?? busObj.SrdvIndex ?? route?.params?.srdvIndex ?? "").trim(),
        boardingPointId: String(boardingPointId || "").trim(),
        droppingPointId: String(droppingPointId || "").trim(),
        fromCity,
        toCity,
        departureTime,
        arrivalTime,
        operatorName,
        busType,
        totalFare: providerTotalFare,
        couponCode: (couponCode && couponCode.trim()) ? couponCode.trim() : null,
        passengers: blockPassengers,
      };

      const missingBlockFields = [
        ["traceId", blockRequestBody.traceId],
        ["resultIndex", blockRequestBody.resultIndex],
        ["srdvIndex", blockRequestBody.srdvIndex],
        ["boardingPointId", blockRequestBody.boardingPointId],
        ["droppingPointId", blockRequestBody.droppingPointId],
      ].filter(([, value]) => !String(value || "").trim()).map(([name]) => name);

      if (missingBlockFields.length > 0 || blockPassengers.some((passenger) => !passenger.seatName)) {
        Alert.alert(
          "Seat Block Failed",
          `Missing booking details: ${missingBlockFields.join(", ") || "seat"}. Please go back and select the bus again.`
        );
        setLoading(false);
        return;
      }

      const finalBlockRequestBody = {
        ...blockRequestBody,
        TraceId: blockRequestBody.traceId,
        ResultIndex: blockRequestBody.resultIndex,
        SrdvIndex: blockRequestBody.srdvIndex,
        request: blockRequestBody,
      };

      logBusBookingFlow("Seat block request", finalBlockRequestBody);

      // 1. Block Seats — reuse cached block if available to prevent double /block calls
      let blockResponse;
      let srdvBlockKey;

      if (cachedBlockKey && cachedBlockResponse) {
        console.log("[PostBusBookingScreen] Reusing cached blockKey:", cachedBlockKey);
        logBusBookingFlow("Seat block response reused", cachedBlockResponse);
        blockResponse = cachedBlockResponse;
        srdvBlockKey = cachedBlockKey;
      } else {
        try {
          blockResponse = await blockSeats(finalBlockRequestBody);
          logBusBookingFlow("Seat block response", blockResponse);
        } catch (blockError) {
          logBusBookingFlow("Seat block network failed", {
            message: blockError?.message,
            status: blockError?.response?.status,
            response: blockError?.response?.data,
          });
          console.log("[PostBusBookingScreen] Seat block failed:", blockError);
          const apiErrorMessage = extractApiErrorMessage(blockError?.response?.data);
          Alert.alert(
            "Seat Block Failed",
            apiErrorMessage || "Seat is no longer available. Please choose another seat."
          );
          setLoading(false);
          return;
        }

        // Check if blocking succeeded on SRDV side
        const errCode = blockResponse?.Error?.ErrorCode ?? blockResponse?.Error?.errorCode ?? blockResponse?.errorCode ?? blockResponse?.ErrorCode;
        const errMsg = blockResponse?.Error?.ErrorMessage ?? blockResponse?.Error?.errorMessage ?? blockResponse?.errorMessage ?? blockResponse?.ErrorMessage ?? "Seat blocking failed.";

        if (errCode !== undefined && errCode !== null && String(errCode).trim() !== "0") {
          console.log("[PostBusBookingScreen] Seat block reported Error:", errCode, errMsg);
          Alert.alert(
            "Seat Block Failed",
            errMsg
          );
          setLoading(false);
          return;
        }

        // Extract resolved BlockKey from block response
        const blockKey = blockResponse?.BlockKey ?? 
                         blockResponse?.blockKey ?? 
                         blockResponse?.Result?.BlockKey ?? 
                         blockResponse?.Result?.blockKey ?? 
                         blockResponse?.BlockTicket?.BlockKey ??
                         blockResponse?.BlockTicket?.blockKey ??
                         blockResponse?.Result?.BlockTicket?.BlockKey ??
                         blockResponse?.Result?.BlockTicket?.blockKey ??
                         blockResponse?.SrdvBookingId ?? 
                         blockResponse?.srdvBookingId ?? 
                         blockResponse?.Result?.SrdvBookingId ?? "";

        srdvBlockKey = String(blockKey || "");
        logBusBookingFlow("Seat block key resolved", { srdvBlockKey });

        // Cache the block response to prevent re-blocking
        setCachedBlockKey(srdvBlockKey);
        setCachedBlockResponse(blockResponse);
      }

      // 2. Extract Exact Seat Info from Block Response
      const blockTicketPassengers = 
        blockResponse?.BlockTicket?.Passenger || 
        blockResponse?.Result?.BlockTicket?.Passenger || 
        blockResponse?.Passenger ||
        blockResponse?.Result?.Passenger ||
        [];
      const blockPassengerArray = Array.isArray(blockTicketPassengers) ? blockTicketPassengers : [blockTicketPassengers];

      const previewSeats = selectedSeatCodes.map((seatCode) => {
        // Find the matched seat in block response
        const bp = blockPassengerArray.find(p => 
          String(p?.Seat?.SeatName || p?.Seat?.seatName || p?.Seat?.seatNumber || p?.seat?.seatName || p?.seatName || p?.SeatName || "") === String(seatCode) ||
          String(p?.Seat?.SeatNo || p?.Seat?.seatNo || p?.seatNumber || p?.SeatNumber || "") === String(seatCode)
        );

        const exactSeatType = bp?.Seat?.SeatType || bp?.Seat?.seatType || bp?.SeatType || bp?.seatType || "Seater";
        const exactBaseFare = bp?.Seat?.Price?.BaseFare || bp?.Seat?.Price?.baseFare || bp?.Price?.BaseFare || bp?.Price?.baseFare || bp?.baseFare || bp?.BaseFare || 0;
        const exactGst = bp?.Seat?.Price?.GSTAmount || bp?.Seat?.Price?.gstAmount || bp?.Price?.GSTAmount || bp?.Price?.gstAmount || bp?.gstAmount || bp?.GSTAmount || 0;

        return {
          seatCode: seatCode,
          seatType: exactSeatType,
          baseFare: exactBaseFare,
          externalGst: exactGst
        };
      });

      logBusBookingFlow("Seats resolved from block response", previewSeats);

      // 3. Dynamic Pricing Preview
      let grandTotalToPay = customerTotalFare;
      try {
        const pricingPayload = {
          traceId: String(route?.params?.traceId ?? busObj.traceId ?? ""),
          resultIndex: String(route?.params?.resultIndex ?? busObj.resultIndex ?? route?.params?.ResultIndex ?? busObj.ResultIndex ?? ""),
          srdvIndex: Number(route?.params?.srdvIndex ?? busObj.srdvIndex ?? route?.params?.SrdvIndex ?? busObj.SrdvIndex ?? 0) || undefined,
          couponCode: (couponCode && couponCode.trim()) ? couponCode.trim() : null,
          promotionId: null,
          seats: previewSeats,
          fromCity,
          toCity,
          departureTime,
          busType,
          totalFare: providerTotalFare + previewSeats.reduce((sum, s) => sum + (Number(s.externalGst) || 0), 0)
        };
        const pricingResponse = await getPricingPreview(pricingPayload);
        logBusBookingFlow("Final pricing preview response", pricingResponse);

        if (pricingResponse?.grandTotal) {
          grandTotalToPay = Number(pricingResponse.grandTotal);
        } else if (pricingResponse?.GrandTotal) {
          grandTotalToPay = Number(pricingResponse.GrandTotal);
        }
      } catch (priceError) {
        console.error("[PostBusBookingScreen] Pricing Preview failed, continuing with totalFare fallback:", priceError);
      }

      // 4. Build exact bookRequestBody for Cashfree Webhook Fulfillment
      const bookPassengers = previewSeats.map((ps, index) => {
        const passenger = normalizedPassengers.find(
          (item) => String(item.seatNumber) === String(ps.seatCode)
        ) || normalizedPassengers[index];
        return {
          seatNumber: String(ps.seatCode),
          fullName: passenger?.fullName || "",
          gender: passenger?.genderStr || "",
          age: Number(passenger?.age),
          leadPassenger: index === 0,
          seatType: String(ps.seatType),
          baseFare: Number(ps.baseFare),
          externalGst: Number(ps.externalGst)
        };
      });

      const bookRequestBody = {
        traceId: String(route?.params?.traceId ?? busObj.traceId ?? ""),
        resultIndex: String(busObj.resultIndex ?? busObj.ResultIndex ?? route?.params?.resultIndex ?? ""),
        srdvIndex: Number(busObj.srdvIndex ?? busObj.SrdvIndex ?? route?.params?.srdvIndex ?? 0),
        blockKey: String(srdvBlockKey || ""),
        BoardingPointId: String(boardingPointId || "").trim(),
        boardingPointId: String(boardingPointId || "").trim(),
        boardingPointName: String(boardingPointName || "").trim(),
        boardingPointTime: boardingPointTime || null,
        DroppingPointId: String(droppingPointId || "").trim(),
        droppingPointId: String(droppingPointId || "").trim(),
        droppingPointName: String(droppingPointName || "").trim(),
        droppingPointTime: droppingPointTime || null,
        passengerName: passengerName.trim() || normalizedPassengers[0]?.fullName || "",
        passengerPhone: passengerPhone.trim(),
        passengerEmail: passengerEmail.trim(),
        fromCity,
        toCity,
        departureTime,
        arrivalTime,
        operatorName,
        totalFare: grandTotalToPay,
        passengers: bookPassengers,
        busType: busType
      };

      const finalBookRequestBody = bookRequestBody;

      // 3. Navigate to Cashfree Checkout as the Confirmation screen
      // We append the block response to the request body so CheckoutScreen and Backend have it.
      
      const sanitizeBlockResponse = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(sanitizeBlockResponse);
        
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'Time' && typeof value === 'string') {
            const parsed = parseToDateTime(value, departureDatePart);
            newObj[key] = parsed || value;
          } else if (typeof value === 'object') {
            newObj[key] = sanitizeBlockResponse(value);
          } else {
            newObj[key] = value;
          }
        }
        return newObj;
      };

      const sanitizedBlockResponse = sanitizeBlockResponse(blockResponse);

      const bookingPayloadWithBlock = {
        ...finalBookRequestBody,
        blockResponse: sanitizedBlockResponse
      };

      logBusBookingFlow("Checkout navigation payload", {
        amount: grandTotalToPay,
        bookingType: "Bus",
        bookingDetails: bookingPayloadWithBlock,
      });


      setLoading(false);

      // Navigate to Cashfree Checkout as the Confirmation screen
      navigation.navigate("CheckoutScreen", {
        userToken: authToken,
        amount: grandTotalToPay,
        bookingType: "Bus",
        bookingDetails: bookingPayloadWithBlock,
        customerDetails: {
          name: passengerName.trim() || passengers[0]?.fullName?.trim(),
          phone: passengerPhone.trim(),
          email: passengerEmail.trim(),
          couponCode: (couponCode && couponCode.trim()) ? couponCode.trim() : null
        },
        reviewDetails: {
          operatorName,
          fromCity,
          toCity,
          journeyDate: journeyDateLabel,
          seats: selectedSeats,
          boardingPoint: {
            id: boardingPointId,
            name: boardingPointName,
            time: boardingTime,
          },
          droppingPoint: {
            id: droppingPointId,
            name: droppingPointName,
            time: droppingTime,
          },
          passengers: normalizedPassengers.map((passenger) => ({
            fullName: passenger.fullName,
            gender: passenger.genderStr,
            age: passenger.age,
            seatNumber: passenger.seatNumber,
          })),
          contact: {
            phone: passengerPhone.trim(),
            email: passengerEmail.trim(),
          },
          fareSummary: {
            seatBreakdown,
            subtotal: fareSummary.subtotal,
            autoDiscountAmount: fareSummary.autoDiscountAmount,
            autoDiscountLabel: fareSummary.autoDiscountLabel,
            couponAmount: fareSummary.couponAmount,
            couponLabel: fareSummary.couponDiscountLabel,
            gstAmount: fareSummary.gstAmount,
            gstPercent: fareSummary.gstPercent,
            convenienceFee: fareSummary.convenienceFee,
            total: grandTotalToPay,
          },
        },
      });

      return;
    } catch (error) {
      logBusBookingFlow("Booking flow failed", {
        code: error?.code,
        message: error?.message,
        status: error?.response?.status,
        response: error?.response?.data,
      });
      console.log("Booking Error:", {
        code: error?.code,
        message: error?.message,
        status: error?.response?.status,
        responseData: error?.response?.data,
      });

      if (error.code === "ECONNABORTED") {
        try {
          const latestSeatStatus = await fetchLatestSeatStatus();

          const seatsBooked = areSelectedSeatsBooked(latestSeatStatus, selectedSeats);

          if (seatsBooked) {
            Alert.alert("Booking Status", "Booking may already be completed. Please check My Bookings.");
          } else {
            Alert.alert("Timeout", "Server took too long. Try again.");
          }
        } catch {
          Alert.alert("Timeout", "Unable to verify booking status.");
        }
      } else {
        const apiErrorMessage = extractApiErrorMessage(error?.response?.data);

        Alert.alert("Booking Failed", apiErrorMessage || error.message);
      }
    } finally {
      bookingSubmissionRef.current = false;
      setLoading(false);
    }
  };

  const passengerCount = selectedSeats.length;
  const tripBus = getObjectValue(route?.params?.bus) || {};
  const tripOperator = String(
    route?.params?.operatorName ??
      tripBus.operatorName ??
      tripBus.travelsName ??
      tripBus.travelName ??
      tripBus.busName ??
      "Bus operator"
  ).trim();
  const tripFrom = String(
    route?.params?.from ??
      route?.params?.fromCity ??
      tripBus.fromCity ??
      tripBus.sourceCity ??
      tripBus.source ??
      "Origin"
  ).trim();
  const tripTo = String(
    route?.params?.to ??
      route?.params?.toCity ??
      tripBus.toCity ??
      tripBus.destinationCity ??
      tripBus.destination ??
      "Destination"
  ).trim();
  const boardingSelection =
    getObjectValue(route?.params?.selectedBoardingPoint) ||
    getObjectValue(route?.params?.boardingPoint) ||
    {};
  const droppingSelection =
    getObjectValue(route?.params?.selectedDroppingPoint) ||
    getObjectValue(route?.params?.droppingPoint) ||
    {};
  const boardingName = String(
    route?.params?.boardingPointName ??
      boardingSelection.name ??
      boardingSelection.Name ??
      "Boarding point"
  ).trim();
  const droppingName = String(
    route?.params?.droppingPointName ??
      droppingSelection.name ??
      droppingSelection.Name ??
      "Dropping point"
  ).trim();
  const boardingTime = String(
    route?.params?.boardingPointTime ??
      boardingSelection.rawTime ??
      boardingSelection.time ??
      boardingSelection.Time ??
      ""
  ).trim();
  const droppingTime = String(
    route?.params?.droppingPointTime ??
      droppingSelection.rawTime ??
      droppingSelection.time ??
      droppingSelection.Time ??
      ""
  ).trim();
  const rawJourneyDate =
    route?.params?.dateLabel ??
    route?.params?.date ??
    route?.params?.dateValue ??
    route?.params?.departDate ??
    "";
  const parsedJourneyDate = rawJourneyDate ? new Date(rawJourneyDate) : null;
  const journeyDateLabel =
    parsedJourneyDate && !Number.isNaN(parsedJourneyDate.getTime())
      ? parsedJourneyDate.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : String(rawJourneyDate || "Date unavailable");

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageShell}>
            <AnimatedCard>
              <LinearGradient
                colors={["#D11A2A", "#B91C1C", "#0F172A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      if (navigation?.canGoBack?.()) {
                        navigation.goBack();
                      } else {
                        navigation?.navigate?.("BusListScreen");
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={10}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.heroRightCluster}>
                    <View style={styles.heroIconWrap}>
                      <MaterialCommunityIcons name="bus-side" size={28} color="#fff" />
                    </View>
                    <View style={styles.heroBadge}>
                      <Text style={styles.heroBadgeText}>
                        {passengerCount === 1 ? "1 Seat Selected" : `${passengerCount} Seats Selected`}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.heroEyebrow}>CONFIRMED TRIP</Text>
                <Text style={styles.heroTitle} numberOfLines={1}>{tripOperator}</Text>
                <Text style={styles.heroRoute} numberOfLines={1}>
                  {tripFrom} → {tripTo}
                </Text>

                <View style={styles.heroJourneyRow}>
                  <View style={styles.heroPointBlock}>
                    <Text style={styles.heroPointLabel}>BOARDING</Text>
                    <Text style={styles.heroPointName} numberOfLines={1}>{boardingName}</Text>
                    <Text style={styles.heroPointTime}>{boardingTime || "Time unavailable"}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#FDA4AF" />
                  <View style={[styles.heroPointBlock, styles.heroPointBlockRight]}>
                    <Text style={styles.heroPointLabel}>DROPPING</Text>
                    <Text style={styles.heroPointName} numberOfLines={1}>{droppingName}</Text>
                    <Text style={styles.heroPointTime}>{droppingTime || "Time unavailable"}</Text>
                  </View>
                </View>

                <View style={styles.heroMetaRow}>
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="calendar-outline" size={15} color="#FFE4E6" />
                    <Text style={styles.heroMetaText} numberOfLines={1}>{journeyDateLabel}</Text>
                  </View>
                  <View style={styles.heroMetaItem}>
                    <MaterialIcons name="event-seat" size={16} color="#FFE4E6" />
                    <Text style={styles.heroMetaText} numberOfLines={1}>
                      {selectedSeats.length > 0 ? selectedSeats.join(", ") : "No seats"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </AnimatedCard>

            <AnimatedCard delay={80}>
              <SectionCard
                title="Saved Travelers"
                subtitle="Select an existing traveler or add a new one."
                icon={<Ionicons name="people" size={18} color="#D11A2A" />}
              >
                {travelersLoading ? (
                  <View style={styles.loadingInlineCard}>
                    <ActivityIndicator color="#D11A2A" size="small" />
                    <Text style={styles.loadingInlineText}>Fetching saved travelers...</Text>
                  </View>
                ) : travelersError ? (
                  <View style={styles.errorInlineCard}>
                    <Ionicons name="alert-circle-outline" size={22} color="#D11A2A" />
                    <Text style={styles.errorInlineText}>{travelersError}</Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => fetchSavedTravelers(authToken)}
                      style={styles.retryInlineBtn}
                    >
                      <Text style={styles.retryInlineBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : savedTravelers.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Ionicons name="person-add-outline" size={24} color="#64748B" />
                    <Text style={styles.emptyStateTitle}>No saved travelers found.</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleAddNewTraveler}
                      style={styles.addNewTravelerCardBtn}
                    >
                      <Ionicons name="add" size={18} color="#D11A2A" />
                      <Text style={styles.addNewTravelerCardBtnText}>+ Add New Traveler</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {passengers.map((passenger, passengerIndex) => {
                      const assignedTraveler = savedTravelers.find(
                        (traveler) => String(traveler.id) === String(selectedTravelerIds[passengerIndex])
                      );
                      return (
                        <TouchableOpacity
                          key={`traveler-seat-${passenger.seatNumber}`}
                          activeOpacity={0.85}
                          onPress={() => openTravelerPicker(passengerIndex)}
                          style={styles.savedTravelerSelector}
                          accessibilityRole="button"
                          accessibilityLabel={`Select saved traveler for seat ${passenger.seatNumber}`}
                        >
                          <View style={styles.savedTravelerSelectorIcon}>
                            <Ionicons name="person" size={18} color="#D11A2A" />
                          </View>
                          <View style={styles.savedTravelerSelectorTextWrap}>
                            <Text style={styles.savedTravelerSelectorLabel}>Seat {passenger.seatNumber}</Text>
                            <Text style={styles.savedTravelerSelectorValue} numberOfLines={1}>
                              {assignedTraveler?.fullName || "Choose a saved traveler"}
                            </Text>
                          </View>
                          <Ionicons name="chevron-down" size={20} color="#64748B" />
                        </TouchableOpacity>
                      );
                    })}

                    <Modal
                      visible={savedTravelerPickerOpen}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setSavedTravelerPickerOpen(false)}
                    >
                      <View style={styles.travelerModalBackdrop}>
                        <TouchableOpacity
                          style={styles.travelerModalDismissArea}
                          activeOpacity={1}
                          onPress={() => setSavedTravelerPickerOpen(false)}
                        />
                        <View style={styles.travelerModalSheet}>
                          <View style={styles.travelerModalHandle} />
                          <View style={styles.travelerModalHeader}>
                            <View>
                              <Text style={styles.travelerModalTitle}>Choose traveler</Text>
                              <Text style={styles.travelerModalSubtitle}>
                                Assign a traveler to seat {passengers[travelerTargetIndex]?.seatNumber || ""}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => setSavedTravelerPickerOpen(false)}
                              style={styles.travelerModalClose}
                              accessibilityLabel="Close traveler selection"
                            >
                              <Ionicons name="close" size={20} color="#475569" />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.savedTravelersList}>
                            {savedTravelers.map((traveler) => {
                              const isSelected = String(traveler.id) === String(selectedTravelerIds[travelerTargetIndex]);
                              const isAssignedElsewhere = Object.entries(selectedTravelerIds).some(
                                ([index, id]) => Number(index) !== travelerTargetIndex && String(id) === String(traveler.id)
                              );
                              return (
                                <TouchableOpacity
                                  key={traveler.id}
                                  activeOpacity={0.85}
                                  onPress={() => {
                                    handleSelectTraveler(traveler, travelerTargetIndex);
                                    setSavedTravelerPickerOpen(false);
                                  }}
                                  disabled={isAssignedElsewhere}
                                  style={[
                                    styles.travelerItemCard,
                                    isSelected && styles.travelerItemCardSelected,
                                    isAssignedElsewhere && styles.travelerItemCardDisabled,
                                  ]}
                                >
                                  <View style={styles.travelerAvatar}>
                                    <Text style={styles.travelerAvatarText}>
                                      {(traveler.fullName || "?").charAt(0).toUpperCase()}
                                    </Text>
                                  </View>
                                  <View style={styles.travelerDetailsWrap}>
                                    <Text style={styles.travelerItemName} numberOfLines={1}>
                                      {traveler.fullName || "Unnamed traveler"}
                                    </Text>
                                    <Text style={styles.travelerItemMeta}>
                                      {traveler.gender || "Traveler"}{traveler.age ? ` • ${traveler.age} years` : ""}
                                    </Text>
                                    {traveler.phoneNumber ? (
                                      <Text style={styles.travelerItemPhone}>
                                        {removeIndianCountryCode(traveler.phoneNumber)}
                                      </Text>
                                    ) : null}
                                  </View>
                                  <View style={[styles.radioRing, isSelected && styles.radioRingSelected]}>
                                    {isSelected ? <View style={styles.radioDot} /> : null}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}

                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => {
                                setSavedTravelerPickerOpen(false);
                                handleAddNewTraveler();
                              }}
                              style={styles.addTravelerActionBtn}
                            >
                              <Ionicons name="add-circle-outline" size={19} color="#D11A2A" />
                              <Text style={styles.addTravelerActionBtnText}>Add new traveler</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </Modal>
                  </>
                )}
              </SectionCard>
            </AnimatedCard>

            <AnimatedCard delay={100}>
              <SectionCard
                title="Contact Details"
                subtitle="Your ticket and updates will be sent here."
                icon={<Ionicons name="mail-open-outline" size={18} color="#D11A2A" />}
              >
                <View style={styles.contactFieldsRow}>
                  <View style={styles.contactFieldBlock}>
                    <Text style={styles.contactFieldLabel}>MOBILE NUMBER</Text>
                    <TextInput
                      style={styles.contactTextInput}
                      value={passengerPhone}
                      onChangeText={(value) => setPassengerPhone(removeIndianCountryCode(value))}
                      placeholder="Enter mobile number"
                      keyboardType="phone-pad"
                      maxLength={15}
                    />
                  </View>

                  <View style={styles.contactFieldBlock}>
                    <Text style={styles.contactFieldLabel}>EMAIL ADDRESS</Text>
                    <TextInput
                      style={styles.contactTextInput}
                      value={passengerEmail}
                      onChangeText={setPassengerEmail}
                      placeholder="Enter email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </SectionCard>
            </AnimatedCard>

            <AnimatedCard delay={120}>
              <SectionCard
                title="Offers & Coupons"
                subtitle={
                  couponCode
                    ? `Coupon ${couponCode} applied`
                    : selectedFeaturedOfferId
                      ? `Featured Offer Applied`
                      : "Apply a coupon before payment"
                }
                icon={<MaterialCommunityIcons name="ticket-percent-outline" size={18} color="#D11A2A" />}
              >
                <View style={styles.couponSectionWrap}>
                  {(couponCode || selectedFeaturedOfferId) ? (
                    <View style={styles.appliedCouponCard}>
                      <View style={styles.appliedCouponInfo}>
                        <View style={styles.appliedCouponBadge}>
                          <MaterialCommunityIcons name="ticket-percent" size={18} color="#D11A2A" />
                          <Text style={styles.appliedCouponCodeText}>{couponCode || "Offer Applied"}</Text>
                        </View>
                        <Text style={styles.appliedCouponSubtext}>
                          {fareSummary.couponAmount > 0
                            ? `Saves ${formatCurrencyDetailed(fareSummary.couponAmount)} on this booking`
                            : "Deal applied"}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.removeCouponBtn}
                        onPress={() => {
                          setCouponCode("");
                          setCouponInputText("");
                          setSelectedFeaturedOfferId(null);
                          setCouponFeedback("");
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                        <Text style={styles.removeCouponBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.couponInputRow}>
                        <TextInput
                          style={styles.couponTextInput}
                          placeholder="Enter coupon code"
                          placeholderTextColor="#94A3B8"
                          value={couponInputText}
                          onChangeText={setCouponInputText}
                          autoCapitalize="characters"
                        />
                        <TouchableOpacity
                          style={[
                            styles.applyCouponBtn,
                            !couponInputText.trim() && styles.applyCouponBtnDisabled,
                          ]}
                          onPress={() => {
                            if (couponInputText.trim()) {
                              setCouponFeedback("Checking coupon...");
                              setCouponCode(couponInputText.trim().toUpperCase());
                              setSelectedFeaturedOfferId(null);
                            }
                          }}
                          disabled={!couponInputText.trim() || pricingLoading}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.applyCouponBtnText}>{pricingLoading ? "Checking..." : "Apply"}</Text>
                        </TouchableOpacity>
                      </View>
                      {couponFeedback ? (
                        <Text style={styles.couponFeedbackText}>{couponFeedback}</Text>
                      ) : null}

                      {dealsLoading ? (
                        <ActivityIndicator color="#D11A2A" style={{ marginTop: 20 }} />
                      ) : (
                        <View style={{ marginTop: 16 }}>
                          {availableCoupons.length > 0 && (
                            <>
                              <Text style={styles.dealsSectionTitle}>Available Coupons</Text>
                              {availableCoupons.map((coupon) => (
                                <TouchableOpacity
                                  key={coupon.id || coupon.couponCode}
                                  style={styles.dealCard}
                                  onPress={() => {
                                    setCouponCode(coupon.couponCode);
                                    setSelectedFeaturedOfferId(null);
                                  }}
                                >
                                  <View style={styles.dealIconWrap}>
                                    <MaterialCommunityIcons name="brightness-percent" size={20} color="#D11A2A" />
                                  </View>
                                  <View style={styles.dealContent}>
                                    <Text style={styles.dealTitle}>{coupon.couponCode}</Text>
                                    <Text style={styles.dealDescription}>{coupon.remark || `Save ${coupon.couponType === "Percentage" ? coupon.value + "%" : "\u20B9" + coupon.value}`}</Text>
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </>
                          )}

                          {featuredOffers.length > 0 && (
                            <>
                              <Text style={[styles.dealsSectionTitle, { marginTop: availableCoupons.length > 0 ? 12 : 0 }]}>Featured Offers</Text>
                              {featuredOffers.map((offer, index) => (
                                <TouchableOpacity
                                  key={offer.offerId || offer.id || index}
                                  style={styles.dealCard}
                                  onPress={() => {
                                    setSelectedFeaturedOfferId(offer.offerId || offer.id);
                                    setCouponCode("");
                                  }}
                                >
                                  <View style={styles.dealIconWrap}>
                                    <MaterialCommunityIcons name="star-circle-outline" size={20} color="#D11A2A" />
                                  </View>
                                  <View style={styles.dealContent}>
                                    <Text style={styles.dealTitle}>{offer.title}</Text>
                                    <Text style={styles.dealDescription}>{offer.subtitle || offer.description}</Text>
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              </SectionCard>
            </AnimatedCard>

            <AnimatedCard delay={160}>
              <Text style={styles.sectionHeading}>Passenger Details</Text>

              {idProofRequired && (
                <View style={styles.idProofBanner}>
                  <Ionicons name="information-circle-outline" size={20} color="#991B1B" style={{ marginRight: 8 }} />
                  <Text style={styles.idProofBannerText}>
                    This bus operator requires a valid Aadhaar number for booking.
                  </Text>
                </View>
              )}

              {passengers.map((passenger, index) => (
                <View
                  key={`${passenger.seatNumber}-${index}`}
                  style={styles.passengerCard}
                >
                  <View style={styles.passengerCardTop}>
                    <View>
                      <Text style={styles.passengerLabel}>Passenger {index + 1}</Text>
                      <Text style={styles.passengerMeta}>Seat {passenger.seatNumber}</Text>
                    </View>
                    <View style={styles.seatBadge}>
                      <Text style={styles.seatBadgeText}>{passenger.seatNumber}</Text>
                    </View>
                  </View>

                  <View style={styles.formStack}>
                    <IconInput
                      icon={<Ionicons name="person-outline" size={18} color="#D11A2A" />}
                      placeholder="Full Name"
                      value={passenger.fullName}
                      onChangeText={(text) => handlePassengerChange(index, "fullName", text)}
                      accessibilityLabel={`Passenger ${index + 1} full name`}
                    />

                    <View style={styles.rowGap}>
                      <View style={styles.flexGrow}>
                        <View style={styles.pickerFieldLabelRow}>
                          <MaterialCommunityIcons
                            name="gender-male-female"
                            size={16}
                            color="#64748B"
                          />
                          <Text style={styles.pickerFieldLabel}>Gender</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.modernPickerShell}
                          onPress={() => {
                            Keyboard.dismiss();
                            setGenderPickerIndex(index);
                          }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={`Passenger ${index + 1} gender`}
                        >
                          <Text style={[styles.genderValue, !passenger.gender && styles.genderPlaceholder]}>
                            {passenger.gender || "Select Gender"}
                          </Text>
                          <Ionicons name="chevron-down" size={18} color="#D11A2A" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.ageFieldWrap}>
                        <View style={styles.pickerFieldLabelRow}>
                          <MaterialCommunityIcons name="calendar-outline" size={16} color="#64748B" />
                          <Text style={styles.pickerFieldLabel}>Age</Text>
                        </View>
                        <TextInput
                          style={styles.ageInput}
                          placeholder="Age"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={String(passenger.age || "")}
                          onChangeText={(text) =>
                            handlePassengerChange(index, "age", text.replace(/[^0-9]/g, ""))
                          }
                          accessibilityLabel={`Passenger ${index + 1} age`}
                        />
                      </View>
                    </View>

                    {idProofRequired && (
                      <View style={{ marginTop: 12 }}>
                        <View style={styles.idProofLabelRow}>
                          <Ionicons name="card-outline" size={16} color="#64748B" />
                          <Text style={styles.idProofLabel}>Aadhaar/ID Proof <Text style={styles.requiredIndicator}>*</Text></Text>
                        </View>
                        <IconInput
                          icon={<Ionicons name="card-outline" size={18} color="#D11A2A" />}
                          placeholder="Enter Aadhaar/ID Proof"
                          value={passenger.idNumber}
                          onChangeText={(text) =>
                            handlePassengerChange(
                              index,
                              "idNumber",
                              text.replace(/[^0-9]/g, "")
                            )
                          }
                          keyboardType="number-pad"
                          maxLength={12}
                          accessibilityLabel={`Passenger ${index + 1} Aadhaar number`}
                        />
                        {idProofErrors[index] ? (
                          <Text style={styles.idProofError}>{idProofErrors[index]}</Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>
              ))}

              <Modal
                visible={genderPickerIndex !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setGenderPickerIndex(null)}
              >
                <View style={styles.genderModalBackdrop}>
                  <View style={styles.genderModalCard}>
                    <Text style={styles.genderModalTitle}>Select gender</Text>
                    {["Male", "Female"].map((value) => (
                      <TouchableOpacity
                        key={value}
                        style={styles.genderOption}
                        onPress={() => {
                          handlePassengerChange(genderPickerIndex, "gender", value);
                          setGenderPickerIndex(null);
                        }}
                      >
                        <Text style={styles.genderOptionText}>{value}</Text>
                        {passengers[genderPickerIndex]?.gender === value ? (
                          <Ionicons name="checkmark-circle" size={21} color="#D11A2A" />
                        ) : null}
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.genderCancel} onPress={() => setGenderPickerIndex(null)}>
                      <Text style={styles.genderCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </AnimatedCard>

            <AnimatedCard delay={200}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeaderRow}>
                  <View>
                    <Text style={styles.summaryTitle}>Fare Summary</Text>
                    <Text style={styles.summarySubtitle}>
                      Review the final checkout amount before confirming.
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.summaryBadge,
                      fareSummary.isEstimated && styles.summaryBadgeEstimated,
                    ]}
                  >
                    {fareSummary.isEstimated ? "Estimated" : "Live"}
                  </Text>
                </View>

                {selectedSeats.length === 0 ? (
                  <Text style={styles.summaryNote}>Select seats to view the fare breakdown.</Text>
                ) : (
                  <>
                    {(pricingLoading || seatPricingLoading) && (
                      <View style={styles.summaryLoadingRow}>
                        <ActivityIndicator size="small" color="#D11A2A" />
                        <Text style={styles.summaryLoadingText}>Updating fare...</Text>
                      </View>
                    )}

                    <View style={styles.summaryTopPanel}>
                      <View style={styles.summaryTopItem}>
                        <Text style={styles.summaryTopLabel}>Selected Seats</Text>
                        <Text style={styles.summaryTopValue}>{selectedSeats.join(", ")}</Text>
                      </View>
                      <View style={styles.summaryTopItemRight}>
                        <Text style={styles.summaryTopLabel}>Seat Count</Text>
                        <Text style={styles.summaryTopValue}>{selectedSeats.length}</Text>
                      </View>
                    </View>

                    <View style={styles.summarySection}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Seat fares</Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrencyDetailed(fareSummary.subtotal)}
                        </Text>
                      </View>

                      {seatBreakdown.map((seat) => (
                        <View key={seat.seatCode} style={styles.summarySeatRow}>
                          <Text style={styles.summarySeatLabel}>Seat {seat.seatCode}</Text>
                          <Text style={styles.summarySeatValue}>
                            {seat.priceInr > 0 ? formatCurrencyDetailed(seat.priceInr) : "--"}
                          </Text>
                        </View>
                      ))}

                      <View style={styles.summaryDivider} />

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Base Fare</Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrencyDetailed(fareSummary.subtotal)}
                        </Text>
                      </View>

                      {fareSummary.autoDiscountAmount > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, styles.summaryAccentText]}>
                            {fareSummary.autoDiscountLabel}
                          </Text>
                          <Text style={[styles.summaryValue, styles.summaryAccentText]}>
                            -{formatCurrencyDetailed(fareSummary.autoDiscountAmount)}
                          </Text>
                        </View>
                      )}

                      {(couponCode || selectedFeaturedOfferId || fareSummary.couponAmount > 0) && (
                        <View style={styles.summaryRow}>
                          <Text
                            style={[
                              styles.summaryLabel,
                              fareSummary.couponAmount > 0 && styles.summaryAccentText,
                            ]}
                          >
                            {couponSummaryLabel}
                          </Text>
                          <Text
                            style={[
                              styles.summaryValue,
                              fareSummary.couponAmount > 0 && styles.summaryAccentText,
                            ]}
                          >
                            {couponSummaryValue}
                          </Text>
                        </View>
                      )}

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{gstSummaryLabel}</Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrencyDetailed(fareSummary.gstAmount)}
                        </Text>
                      </View>

                      {fareSummary.convenienceFee > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Convenience Fee</Text>
                          <Text style={styles.summaryValue}>
                            {formatCurrencyDetailed(fareSummary.convenienceFee)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.summaryDivider} />

                      <View style={styles.summaryGrandTotalRow}>
                        <Text style={styles.totalLabel}>Total Fare</Text>
                        <Text style={styles.totalText}>
                          {formatCurrencyDetailed(fareSummary.grandTotal)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.summaryNote}>{fareSummaryNote}</Text>
                  </>
                )}
              </View>
            </AnimatedCard>

            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>

        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleBooking}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Confirm and pay for bus booking"
          >
            <LinearGradient
              colors={loading ? ["#94A3B8", "#64748B"] : ["#D11A2A", "#B91C1C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.buttonText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Confirm &amp; Pay</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostBusBookingScreen;

const responsiveSpacing = (min, max) => {
  const ratio = Math.min(Math.max(SCREEN_WIDTH / 430, 0.85), 1.2);
  return Math.round(min + (max - min) * (ratio - 0.85) / 0.35);
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardAvoiding: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
    paddingBottom: 120,
  },
  pageShell: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: responsiveSpacing(14, 22),
    paddingTop: responsiveSpacing(12, 18),
  },
  heroCard: {
    borderRadius: 20,
    padding: responsiveSpacing(12, 16),
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroRightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  heroIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 25,
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  heroEyebrow: {
    color: "#FDA4AF",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroRoute: {
    marginTop: 2,
    color: "#FFE4E6",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  heroJourneyRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.11)",
  },
  heroPointBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroPointBlockRight: {
    alignItems: "flex-end",
  },
  heroPointLabel: {
    color: "#FDA4AF",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  heroPointName: {
    marginTop: 2,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  heroPointTime: {
    marginTop: 2,
    color: "#FFE4E6",
    fontSize: 10,
    fontWeight: "600",
  },
  heroMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroMetaItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroMetaText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  heroSubtitle: {
    marginTop: 4,
    color: "#FFE4E6",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
    maxWidth: 520,
  },
  heroSeatRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  heroSeatText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  idProofBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  idProofBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
    lineHeight: 18,
  },
  idProofLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 5,
  },
  idProofLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  requiredIndicator: {
    color: "#DC2626",
  },
  idProofError: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  sectionCard: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    color: "#0F172A",
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "400",
    color: "#64748B",
  },
  formStack: {
    gap: 12,
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    minHeight: 56,
    overflow: "hidden",
  },
  inputIconWrap: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: "#0F172A",
    fontSize: 15,
    paddingVertical: 14,
    paddingRight: 14,
  },
  pickerShell: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    height: 40,
    justifyContent: "center",
  },
  pickerControl: {
    color: "#0F172A",
    width: "100%",
    fontSize: 12,
  },
  savedTravelerSelector: {
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  savedTravelerSelectorIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
  },
  savedTravelerSelectorTextWrap: {
    flex: 1,
  },
  savedTravelerSelectorLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  savedTravelerSelectorValue: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  travelerModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  travelerModalDismissArea: {
    flex: 1,
  },
  travelerModalSheet: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
  },
  travelerModalHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
    marginBottom: 18,
  },
  travelerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  travelerModalTitle: {
    color: "#0F172A",
    fontSize: 21,
    fontWeight: "800",
  },
  travelerModalSubtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
  },
  travelerModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },
  travelerItemCardDisabled: {
    opacity: 0.42,
  },
  loadingInlineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  loadingInlineText: {
    color: "#64748B",
    fontSize: 14,
  },
  emptyStateCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyStateTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyStateText: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
  sectionHeading: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  passengerCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: responsiveSpacing(12, 14),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  passengerCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  passengerLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  passengerMeta: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
  },
  seatBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFE4E6",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  seatBadgeText: {
    color: "#D11A2A",
    fontWeight: "800",
    fontSize: 12,
  },
  rowGap: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  flexGrow: {
    flex: 1,
  },
  pickerFieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  pickerFieldLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modernPickerShell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    height: 44,
    paddingHorizontal: 12,
  },
  genderValue: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "600",
  },
  genderPlaceholder: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  genderModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  genderModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  genderModalTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  genderOption: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  genderOptionText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
  genderCancel: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  genderCancelText: {
    color: "#D11A2A",
    fontSize: 15,
    fontWeight: "700",
  },
  couponFeedbackText: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
  },
  ageFieldWrap: {
    width: Math.min(110, SCREEN_WIDTH * 0.24),
  },
  ageInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "500",
  },
  summaryCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: responsiveSpacing(12, 14),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  summarySubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  summaryBadge: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryBadgeEstimated: {
    backgroundColor: "#FFE4E6",
    color: "#D11A2A",
  },
  summaryLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  summaryLoadingText: {
    color: "#475569",
    fontSize: 11,
  },
  summaryTopPanel: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryTopItem: {
    flex: 1,
  },
  summaryTopItemRight: {
    alignItems: "flex-end",
  },
  summaryTopLabel: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  summaryTopValue: {
    marginTop: 4,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "800",
  },
  summarySection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  summarySeatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  summarySeatLabel: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
  },
  summarySeatValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryLabel: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 8,
  },
  summaryAccentText: {
    color: "#D11A2A",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  summaryGrandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  summaryNote: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
  },
  totalLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#16A34A",
    marginLeft: 12,
  },
  bottomSpacing: {
    height: 12,
  },
  ctaWrap: {
    paddingHorizontal: responsiveSpacing(14, 22),
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  button: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#D11A2A",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonGradient: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  buttonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
  },
  savedTravelersList: {
    gap: 10,
  },
  travelerItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  travelerItemCardSelected: {
    borderColor: "#D11A2A",
    borderWidth: 1.5,
    backgroundColor: "#FFF5F5",
  },
  travelerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE4E6",
  },
  travelerAvatarText: {
    color: "#D11A2A",
    fontSize: 17,
    fontWeight: "800",
  },
  radioWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  radioRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  radioRingSelected: {
    borderColor: "#D11A2A",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D11A2A",
  },
  travelerDetailsWrap: {
    flex: 1,
  },
  travelerItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  travelerItemMeta: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  travelerItemPhone: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  addTravelerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D11A2A",
    backgroundColor: "#FFFFFF",
    marginTop: 6,
    gap: 6,
  },
  addTravelerActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D11A2A",
  },
  errorInlineCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    gap: 6,
  },
  errorInlineText: {
    fontSize: 11,
    color: "#991B1B",
    fontWeight: "600",
  },
  retryInlineBtn: {
    backgroundColor: "#D11A2A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  retryInlineBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  addNewTravelerCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D11A2A",
  },
  addNewTravelerCardBtnText: {
    color: "#D11A2A",
    fontSize: 11,
    fontWeight: "700",
  },
  contactFieldsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  contactFieldBlock: {
    flex: 1,
  },
  contactFieldLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  contactTextInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 11,
    color: "#0F172A",
    fontWeight: "500",
  },
  couponSectionWrap: {
    gap: 8,
  },
  couponInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  couponTextInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "500",
  },
  applyCouponBtn: {
    backgroundColor: "#D11A2A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  applyCouponBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },
  applyCouponBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  appliedCouponCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 6,
  },
  appliedCouponInfo: {
    flex: 1,
    paddingRight: 10,
  },
  appliedCouponBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appliedCouponCodeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D11A2A",
    letterSpacing: 0.5,
  },
  appliedCouponSubtext: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
  removeCouponBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  removeCouponBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  dealsSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dealCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  dealIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dealContent: {
    flex: 1,
  },
  dealTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  dealDescription: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
});
