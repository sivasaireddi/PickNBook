import React, {
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { blockSeats, bookSeats, getSeatLayout } from "../services/busService";
import { getTravelers } from "../services/travelerService";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";

const BASE_URL =
  "https://paycheck-baton-overfull.ngrok-free.dev";

const COUPONS_API_URL = `${BASE_URL}/api/busbookings/user/available`;

const PRICING_PREVIEW_API_URL = (busId) =>
  `${BASE_URL}/api/BusBookings/${encodeURIComponent(
    String(busId)
  )}/pricing-preview`;

const BOOKING_API_URL = (busId) =>
  `${BASE_URL}/api/BusBookings/${encodeURIComponent(
    String(busId)
  )}/book`;

const SEATS_API_URL = (busId) =>
  `${BASE_URL}/api/BusBookings/${encodeURIComponent(
    String(busId)
  )}/seats`;

const BOOKING_TIMEOUT_MS = 45000;

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
  const [couponLoading, setCouponLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [seatPricingLoading, setSeatPricingLoading] = useState(false);

  const [authToken, setAuthToken] = useState("");

  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelersLoading, setTravelersLoading] = useState(false);
  const [travelersError, setTravelersError] = useState(null);
  const [selectedTravelerId, setSelectedTravelerId] = useState(null);

  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [selectedSeatDetails, setSelectedSeatDetails] = useState(routeSeatDetails);

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
      setPassengerPhone(user?.phoneNumber || "");
      setPassengerEmail(user?.email || "");
    } catch (error) {
      console.log("Session Load Error:", error);
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchCoupons = async () => {
    if (!authToken) {
      setCoupons([]);
      return;
    }

    try {
      setCouponLoading(true);

      const response = await axios.get(COUPONS_API_URL, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      setCoupons(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log("Coupon Error:", error?.response?.data || error.message);
    } finally {
      setCouponLoading(false);
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

      if (list && list.length > 0) {
        handleSelectTraveler(list[0]);
      }
    } catch (err) {
      console.log("[PostBusBookingScreen] Error fetching saved travelers:", err);
      setTravelersError("Unable to load saved travelers.");
    } finally {
      setTravelersLoading(false);
    }
  };

  const handleSelectTraveler = (traveler) => {
    if (!traveler) {
      setSelectedTravelerId(null);
      return;
    }

    setSelectedTravelerId(traveler.id);

    setPassengers((prev) => {
      if (!prev || prev.length === 0) return prev;
      const next = [...prev];
      next[0] = {
        ...next[0],
        fullName: traveler.fullName || "",
        gender: traveler.gender || "Male",
        age: String(traveler.age || "25"),
      };
      return next;
    });

    if (traveler.fullName) setPassengerName(traveler.fullName);
    if (traveler.phoneNumber) setPassengerPhone(traveler.phoneNumber);
    if (traveler.email) setPassengerEmail(traveler.email);
  };

  const handleAddNewTraveler = () => {
    setSelectedTravelerId(null);
    setPassengers((prev) => {
      if (!prev || prev.length === 0) return prev;
      const next = [...prev];
      next[0] = {
        ...next[0],
        fullName: "",
        gender: "",
        age: "",
      };
      return next;
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
    if (!authToken) {
      if (applyPricing) {
        setPricing(null);
      }

      return null;
    }

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
              seatCode,
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
            seatCode,
            baseFare: Number(detail.priceInr ?? 0),
            seatType: getCleanSeatType(detail.seatType),
            externalGst: Number(detail.externalGst ?? 0),
          };
        });
      }

      const pricingPassengers = finalSeats.map((s) => ({
        seatNumber: String(s.seatCode),
        SeatNumber: String(s.seatCode),
        baseFare: Number(s.baseFare),
        BaseFare: Number(s.baseFare),
        seatType: String(s.seatType),
        SeatType: String(s.seatType),
        externalGst: Number(s.externalGst),
        ExternalGst: Number(s.externalGst),
      }));

      const requestPayload = {
        traceId: String(route?.params?.traceId ?? route?.params?.bus?.traceId ?? ""),
        TraceId: String(route?.params?.traceId ?? route?.params?.bus?.traceId ?? ""),
        couponCode: couponCode || null,
        CouponCode: couponCode || null,
        passengers: pricingPassengers,
        Passengers: pricingPassengers,
      };

      const finalRequest = {
        ...requestPayload,
        request: requestPayload,
        Request: requestPayload,
      };

      const url = PRICING_PREVIEW_API_URL(busId);
      console.log("Pricing Preview Request URL:", url);
      console.log("Pricing Preview Request Payload:", JSON.stringify(finalRequest, null, 2));

      const response = await axios.post(url, finalRequest, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      console.log("Pricing Preview API Response:", JSON.stringify(response.data, null, 2));

      const pricingPayload = extractPricingPayload(response.data) || response.data;

      console.log("Resolved Pricing Payload:", pricingPayload);

      if (applyPricing) {
        setPricing(pricingPayload);
      }

      return pricingPayload;
    } catch (error) {
      console.log("Pricing Preview Error Details:", error?.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message);
      console.log("Pricing Preview Error:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });

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
  };

  const fetchLatestSeatStatus = async () => fetchSeatCollection();

  const validateForm = () => {
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

    const couponAmount = pricing
      ? normalizeAmount(
          pricing.couponAmount ??
            pricing.discountAmountInr ??
            pricing.discountAmount ??
            pricing.discount ??
            0
        )
      : 0;

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

    const computedGrandTotal = subtotal - couponAmount + gstAmount + convenienceFee;

    const grandTotal = pricing
      ? normalizeAmount(
          pricing.grandTotal ??
            pricing.total ??
            pricing.customerFareInr ??
            pricing.totalPriceInr ??
            pricing.totalPayable ??
            computedGrandTotal
        )
      : estimatedSubtotal;

    return {
      subtotal,
      couponAmount,
      gstPercent,
      gstAmount,
      convenienceFee,
      grandTotal,
      isEstimated: !pricing,
    };
  }, [pricing, seatBreakdown]);

  const fareSummaryNote = fareSummary.isEstimated
    ? couponCode
      ? "Estimated from selected seat fares. Coupon, GST, and convenience fee will refresh when pricing preview becomes available."
      : "Estimated from selected seat fares. GST and convenience fee will refresh when pricing preview becomes available."
    : "Final payable amount including coupon, GST, and convenience fee.";

  const couponSummaryLabel = couponCode ? `Coupon (${couponCode})` : "Coupon";

  const couponSummaryValue = !couponCode
    ? "Not applied"
    : fareSummary.couponAmount > 0
      ? `-${formatCurrencyDetailed(fareSummary.couponAmount)}`
      : fareSummary.isEstimated
        ? "Applying..."
        : formatCurrencyDetailed(0);

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
  }, [selectedSeats]);

  useEffect(() => {
    if (!sessionLoading && authToken) {
      fetchCoupons();
      fetchSavedTravelers(authToken);
    }
  }, [authToken, sessionLoading]);

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
  }, [authToken, couponCode, selectedSeats, sessionLoading]);

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
    if (!validateForm()) {
      return;
    }

    const getGenderInt = (genderStr) => {
      const clean = String(genderStr || "").trim().toLowerCase();
      if (clean === "male" || clean === "m" || clean === "1" || clean.includes("male")) {
        return 1;
      }
      if (clean === "female" || clean === "f" || clean === "2" || clean.includes("female")) {
        return 2;
      }
      return 1;
    };

    try {
      setLoading(true);

      const normalizedPassengers = passengers.map((passenger) => {
        const nameParts = String(passenger.fullName || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "Passenger";
        const lastName = nameParts.slice(1).join(" ") || "Kumar"; // Default fallback last name for travel operator requirements
        const fullName = `${firstName} ${lastName}`.trim();
        
        const seatCode = passenger.seatNumber || passenger.seatCode || "";
        const seatDetail = selectedSeatDetails.find((s) => String(s.seatCode) === String(seatCode)) || {};
        const seatFare = Number(seatDetail.baseFare ?? seatDetail.priceInr ?? 0);

        const genderInt = getGenderInt(passenger.gender);
        const genderStr = genderInt === 2 ? "Female" : "Male";
        const title = genderInt === 2 ? "Ms" : "Mr";

        return {
          title,
          firstName,
          lastName,
          fullName,
          age: Number(passenger.age) || 25,
          seatName: seatCode,
          seatNumber: seatCode,
          fare: seatFare,
          baseFare: seatFare,
          seatType: getCleanSeatType(seatDetail.seatType),
          externalGst: Number(seatDetail.externalGst ?? 0),
          contactNo: passengerPhone.trim() || "1234567890",
          email: passengerEmail.trim() || "passenger@example.com",
          address: "Default Address",
          city: "Default City",
          state: "Default State",
          genderInt,
          genderStr,
          idType: passenger.idType || "Aadhar",
          idNumber: String(passenger.idNumber || "").trim() || "123456789012",
        };
      });

      const selectedSeatCodes = normalizedPassengers.map((passenger) => passenger.seatNumber);

      const finalPricingPayload = await fetchPricingPreview({
        applyPricing: true,
      });

      if (!finalPricingPayload) {
        Alert.alert("Pricing Error", "Unable to verify latest fare before booking.");
        return;
      }

      const bus = route?.params?.bus || {};
      const traceId = bus.traceId;
      const resultIndex = bus.resultIndex !== undefined && bus.resultIndex !== null ? String(bus.resultIndex).trim() : "";

      const baseDate = route?.params?.departDate ?? route?.params?.date ?? new Date().toISOString().split("T")[0];

      const parseToDateTime = (timeStr, baseDateStr) => {
        if (!timeStr) return null;
        const trimmed = String(timeStr).trim();
        if (trimmed.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
          return trimmed;
        }
        const datePart = baseDateStr ? String(baseDateStr).trim() : new Date().toISOString().split("T")[0];
        const timeMatch = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (timeMatch) {
          const [_, hh, mm, ss = "00"] = timeMatch;
          return `${datePart}T${hh}:${mm}:${ss}`;
        }
        return null;
      };

      const getPointId = (val) => {
        if (!val) return "";
        if (typeof val === "object") {
          return String(val.Id ?? val.id ?? val.pointId ?? val.pointID ?? val.code ?? "");
        }
        return String(val);
      };

      const boardingPoint = route?.params?.boardingPoint || {};
      const droppingPoint = route?.params?.droppingPoint || {};

      const rawBoardingId = route?.params?.boardingPointId ?? boardingPoint?.Id ?? boardingPoint?.id ?? "";
      const rawDroppingId = route?.params?.droppingPointId ?? droppingPoint?.Id ?? droppingPoint?.id ?? "";

      const boardingPointId = getPointId(rawBoardingId);
      const droppingPointId = getPointId(rawDroppingId);

      const boardingPointName = boardingPoint?.Name ?? boardingPoint?.name ?? "";
      const boardingPointTime = parseToDateTime(boardingPoint?.Time ?? boardingPoint?.time ?? "", baseDate);
      const droppingPointName = droppingPoint?.Name ?? droppingPoint?.name ?? "";
      const droppingPointTime = parseToDateTime(droppingPoint?.Time ?? droppingPoint?.time ?? "", baseDate);

      // 1. Build Block payload (gender as integer, strictly required idType and idNumber)
      const blockPassengers = normalizedPassengers.map((p) => ({
        title: p.title,
        firstName: p.firstName,
        lastName: p.lastName,
        age: p.age,
        gender: p.genderInt,
        seatName: p.seatName,
        fare: p.fare,
        address: p.address,
        city: p.city,
        state: p.state,
        contactNo: p.contactNo,
        email: p.email,
        idType: p.idType,
        idNumber: p.idNumber,
      }));

      const blockRequestBody = {
        traceId,
        resultIndex,
        srdvIndex: Number(bus.srdvIndex ?? 0),
        boardingPointId,
        droppingPointId,
        passengerName: passengerName.trim() || passengers[0]?.fullName?.trim() || "Passenger",
        passengerPhone: passengerPhone.trim(),
        passengerEmail: passengerEmail.trim(),
        couponCode: couponCode || null,
        selectedSeats: selectedSeatCodes,
        passengers: blockPassengers,
      };

      const finalBlockRequestBody = {
        ...blockRequestBody,
        request: blockRequestBody,
      };

      // 1. Block Seats
      let blockResponse;
      try {
        console.log("[PostBusBookingScreen] Blocking seats with payload:", JSON.stringify(finalBlockRequestBody, null, 2));
        blockResponse = await blockSeats(finalBlockRequestBody);
        console.log("[PostBusBookingScreen] Seat block success:", blockResponse);
      } catch (blockError) {
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

      // 2. Build Book payload (gender as string, containing block key)
      const bookPassengers = normalizedPassengers.map((p) => ({
        fullName: p.fullName,
        fullName: p.fullName,
        title: p.title,
        Title: p.title,
        firstName: p.firstName,
        FirstName: p.firstName,
        lastName: p.lastName,
        LastName: p.lastName,
        age: p.age,
        Age: p.age,
        gender: p.genderStr,
        Gender: p.genderStr,
        seatName: p.seatName,
        SeatName: p.seatName,
        seatNumber: p.seatNumber,
        SeatNumber: p.seatNumber,
        fare: p.fare,
        Fare: p.fare,
        baseFare: p.baseFare,
        BaseFare: p.baseFare,
        seatType: p.seatType,
        SeatType: p.seatType,
        externalGst: p.externalGst,
        ExternalGst: p.externalGst,
        contactNo: p.contactNo,
        ContactNo: p.contactNo,
        passengerPhone: p.contactNo,
        PassengerPhone: p.contactNo,
        email: p.email,
        Email: p.email,
        passengerEmail: p.email,
        PassengerEmail: p.email,
        address: p.address,
        Address: p.address,
        city: p.city,
        City: p.city,
        state: p.state,
        State: p.state,
      }));

      const bookRequestBody = {
        traceId,
        TraceId: traceId,
        resultIndex,
        ResultIndex: resultIndex,
        srdvIndex: Number(bus.srdvIndex ?? 0),
        SrdvIndex: Number(bus.srdvIndex ?? 0),
        boardingPointId,
        BoardingPointId: boardingPointId,
        boardingPointName,
        BoardingPointName: boardingPointName,
        boardingPointTime,
        BoardingPointTime: boardingPointTime,
        droppingPointId,
        DroppingPointId: droppingPointId,
        droppingPointName,
        DroppingPointName: droppingPointName,
        droppingPointTime,
        DroppingPointTime: droppingPointTime,
        passengerName: passengerName.trim() || passengers[0]?.fullName?.trim() || "Passenger",
        PassengerName: passengerName.trim() || passengers[0]?.fullName?.trim() || "Passenger",
        passengerPhone: passengerPhone.trim(),
        PassengerPhone: passengerPhone.trim(),
        passengerEmail: passengerEmail.trim(),
        PassengerEmail: passengerEmail.trim(),
        paymentMethod: "Razorpay",
        PaymentMethod: "Razorpay",
        couponCode: couponCode || null,
        CouponCode: couponCode || null,
        selectedSeats: selectedSeatCodes,
        SelectedSeats: selectedSeatCodes,
        seats: selectedSeatCodes?.length || 1,
        Seats: selectedSeatCodes?.length || 1,
        passengers: bookPassengers,
        Passengers: bookPassengers,
        
        // Pass block keys to resolve booking session
        blockKey: blockKey,
        BlockKey: blockKey,
        srdvBookingId: blockKey,
        SrdvBookingId: blockKey,
        bookingId: blockKey,
        BookingId: blockKey,
      };

      const finalBookRequestBody = {
        ...bookRequestBody,
        request: bookRequestBody,
        Request: bookRequestBody,
      };

      // 3. Book Seats
      console.log("[PostBusBookingScreen] Booking seats with payload:", JSON.stringify(finalBookRequestBody, null, 2));
      const bookResponse = await bookSeats(busId, finalBookRequestBody, authToken);
      console.log("[PostBusBookingScreen] Booking success:", bookResponse);

      const bookingDetails = buildBookingDetailsPayload({
        bookingResponse: bookResponse,
        requestBody: bookRequestBody,
        normalizedPassengers,
        fareSummary,
        selectedSeats: selectedSeatCodes,
        busId,
        passengerName,
        passengerPhone,
        passengerEmail,
        routeParams: route?.params || {},
      });

      setLoading(false);

      navigation.navigate("BookingDetailsScreen", {
        bookingDetails,
      });

      return;
    } catch (error) {
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
      setLoading(false);
    }
  };

  const passengerCount = selectedSeats.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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

                <Text style={styles.heroTitle}>Bus Booking</Text>
                <Text style={styles.heroSubtitle}>
                  Review passengers, apply offers, and confirm your trip in a secure checkout flow.
                </Text>

                <View style={styles.heroSeatRow}>
                  <MaterialIcons name="event-seat" size={18} color="#FFE4E6" />
                  <Text style={styles.heroSeatText}>
                    {selectedSeats.length > 0 ? selectedSeats.join(", ") : "No seats selected yet"}
                  </Text>
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
                  <View style={styles.pickerShell}>
                    <Picker
                      selectedValue={selectedTravelerId ? String(selectedTravelerId) : ""}
                      onValueChange={(itemValue) => {
                        if (!itemValue || itemValue === "NEW_TRAVELER") {
                          handleAddNewTraveler();
                        } else {
                          const selected = savedTravelers.find(
                            (t) => String(t.id) === String(itemValue)
                          );
                          if (selected) {
                            handleSelectTraveler(selected);
                          }
                        }
                      }}
                      style={styles.pickerControl}
                      accessibilityLabel="Saved Travelers Selection"
                      dropdownIconColor="#D11A2A"
                    >
                      <Picker.Item label="Select Saved Traveler" value="" color="#0F172A" />
                      {savedTravelers.map((traveler) => (
                        <Picker.Item
                          key={traveler.id}
                          label={`${traveler.fullName} (${traveler.gender}, ${traveler.age} yrs${traveler.phoneNumber ? ` • 📞 ${traveler.phoneNumber}` : ""})`}
                          value={String(traveler.id)}
                          color="#0F172A"
                        />
                      ))}
                      <Picker.Item label="+ Add New Traveler" value="NEW_TRAVELER" color="#0F172A" />
                    </Picker>
                  </View>
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
                      onChangeText={setPassengerPhone}
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
                subtitle={couponLoading ? "Loading available offers" : "Apply a coupon before payment"}
                icon={<MaterialCommunityIcons name="ticket-percent-outline" size={18} color="#D11A2A" />}
              >
                {couponLoading ? (
                  <View style={styles.loadingInlineCard}>
                    <ActivityIndicator color="#D11A2A" />
                    <Text style={styles.loadingInlineText}>Fetching available coupons...</Text>
                  </View>
                ) : coupons.length > 0 ? (
                  <View style={styles.pickerShell}>
                    <Picker
                      selectedValue={couponCode}
                      onValueChange={(value) => setCouponCode(value)}
                      style={styles.pickerControl}
                      accessibilityLabel="Coupon selection"
                      dropdownIconColor="#D11A2A"
                    >
                      <Picker.Item label="Select Coupon" value="" color="#0F172A" />

                      {coupons.map((coupon) => (
                        <Picker.Item
                          key={coupon.id}
                          label={`${coupon.couponCode}`}
                          value={coupon.couponCode}
                          color="#0F172A"
                        />
                      ))}
                    </Picker>
                  </View>
                ) : (
                  <View style={styles.emptyStateCard}>
                    <MaterialCommunityIcons name="ticket-outline" size={20} color="#64748B" />
                    <Text style={styles.emptyStateTitle}>No coupons available</Text>
                    <Text style={styles.emptyStateText}>
                      We’ll show offers here when they are available for your account.
                    </Text>
                  </View>
                )}
              </SectionCard>
            </AnimatedCard>

            <AnimatedCard delay={160}>
              <Text style={styles.sectionHeading}>Passenger Details</Text>

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
                        <View style={styles.modernPickerShell}>
                          <Picker
                            selectedValue={passenger.gender}
                            onValueChange={(value) =>
                              handlePassengerChange(index, "gender", value)
                            }
                            style={styles.pickerControl}
                            accessibilityLabel={`Passenger ${index + 1} gender`}
                            dropdownIconColor="#D11A2A"
                          >
                            <Picker.Item label="Select Gender" value="" color="#0F172A" />
                            <Picker.Item label="Male" value="Male" color="#0F172A" />
                            <Picker.Item label="Female" value="Female" color="#0F172A" />
                          </Picker>
                        </View>
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


                  </View>
                </View>
              ))}
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

                      <View style={styles.summaryRow}>
                        <Text
                          style={[
                            styles.summaryLabel,
                            couponCode && styles.summaryAccentText,
                          ]}
                        >
                          {couponSummaryLabel}
                        </Text>
                        <Text
                          style={[
                            styles.summaryValue,
                            couponCode && styles.summaryAccentText,
                          ]}
                        >
                          {couponSummaryValue}
                        </Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{gstSummaryLabel}</Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrencyDetailed(fareSummary.gstAmount)}
                        </Text>
                      </View>

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
    borderRadius: 24,
    padding: responsiveSpacing(18, 24),
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
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
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
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontSize: Math.min(34, SCREEN_WIDTH * 0.09),
    lineHeight: Math.min(42, SCREEN_WIDTH * 0.11),
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#FFE4E6",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 520,
  },
  heroSeatRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  heroSeatText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  sectionCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: responsiveSpacing(16, 20),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 13,
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
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  pickerControl: {
    color: "#0F172A",
    width: "100%",
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
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  passengerCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: responsiveSpacing(16, 18),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
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
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  passengerMeta: {
    marginTop: 3,
    fontSize: 13,
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
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  ageFieldWrap: {
    width: Math.min(110, SCREEN_WIDTH * 0.24),
  },
  ageInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: "#0F172A",
    fontSize: 15,
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: responsiveSpacing(16, 20),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  summarySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
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
    marginBottom: 12,
    gap: 10,
  },
  summaryLoadingText: {
    color: "#475569",
    fontSize: 13,
  },
  summaryTopPanel: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryTopItem: {
    flex: 1,
  },
  summaryTopItemRight: {
    alignItems: "flex-end",
  },
  summaryTopLabel: {
    fontSize: 12,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  summaryTopValue: {
    marginTop: 5,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "800",
  },
  summarySection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  summarySeatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  summarySeatLabel: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
  },
  summarySeatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 12,
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
    marginTop: 12,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
  },
  totalLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  totalText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#16A34A",
    marginLeft: 12,
  },
  bottomSpacing: {
    height: 12,
  },
  ctaWrap: {
    paddingHorizontal: responsiveSpacing(14, 22),
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  button: {
    borderRadius: 18,
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
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  buttonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  savedTravelersList: {
    gap: 10,
  },
  travelerItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  travelerItemMeta: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  travelerItemPhone: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  addTravelerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D11A2A",
    backgroundColor: "#FFFFFF",
    marginTop: 6,
    gap: 6,
  },
  addTravelerActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D11A2A",
  },
  errorInlineCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    gap: 8,
  },
  errorInlineText: {
    fontSize: 13,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D11A2A",
  },
  addNewTravelerCardBtnText: {
    color: "#D11A2A",
    fontSize: 13,
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
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  contactTextInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
});
