import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View, useWindowDimensions, Modal, ActivityIndicator, TouchableOpacity, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { writeFlightBookingFlowState, readFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { getTravelers } from "../../../../services/travelerService";
import { getStoredAuthToken } from "../../../../utils/authSession";
import { getFlightFareRule } from "./services/flightBookingService";
import { cleanFareRuleHtml } from "./utils/flightUtils";
import { safeFlightLog, validateFlightPassenger } from "./utils/flightFlowUtils";

// Redesigned Theme & Components
import { COLORS } from "./theme/passengerDetailsTheme";
import BackgroundDecorations from "./components/BackgroundDecorations";
import PassengerHeader from "./components/PassengerHeader";
import SavedTravellerCard from "./components/SavedTravellerCard";
import PassengerCard from "./components/PassengerCard";
import ContactCard from "./components/ContactCard";
import FareRuleModal from "./components/FareRuleModal";
import StickyFooter from "./components/StickyFooter";
import PassengerFlightSummary from "./components/PassengerFlightSummary";
import ImportantInformationCard from "./components/ImportantInformationCard";
import AcknowledgementCard from "./components/AcknowledgementCard";

export default function FlightPassengerDetailsScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const routeParams = route?.params || {};
  const [currentFlowState, setCurrentFlowState] = useState(routeParams);

  // Sync stored flowState if parameters missing in route
  useEffect(() => {
    console.log("================================================================================");
    console.log("✈️ [FLIGHT BOOKING FLOW - STEP 3: PASSENGER DETAILS SCREEN MOUNTED]");
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🆔 Trace ID: ${routeParams.traceId || routeParams.flight?.traceId || "N/A"}`);
    console.log(`🏷️ Result Index: ${routeParams.resultIndex || routeParams.flight?.resultIndex || "N/A"}`);
    console.log("================================================================================");

    (async () => {
      const stored = await readFlightBookingFlowState();
      if (stored) {
        console.log("[FlightPassengerDetailsScreen] Restored flow state from SecureStore storage:", Object.keys(stored));
        setCurrentFlowState((prev) => ({
          ...stored,
          ...prev,
          traceId: prev.traceId || prev.flight?.traceId || stored.traceId || stored.flight?.traceId,
          resultIndex: prev.resultIndex || prev.flight?.resultIndex || stored.resultIndex || stored.flight?.resultIndex,
          srdvType: prev.srdvType || prev.flight?.srdvType || stored.srdvType || stored.flight?.srdvType || "MixAPI",
          srdvIndex: prev.srdvIndex || prev.flight?.srdvIndex || stored.srdvIndex || stored.flight?.srdvIndex || "2",
        }));
      }
    })();
  }, []);

  const flowState = useMemo(() => ({ ...currentFlowState, ...routeParams }), [currentFlowState, routeParams]);

  // Extract passenger counts from searchContext
  const travellersCount = useMemo(() => {
    const summary = String(flowState.searchContext?.travellers || "");
    const adults = Number((summary.match(/(\d+)\s*Adult/i) || [])[1] || flowState.searchContext?.adults || 1);
    const children = Number((summary.match(/(\d+)\s*Child/i) || [])[1] || flowState.searchContext?.children || 0);
    const infants = Number((summary.match(/(\d+)\s*Infant/i) || [])[1] || flowState.searchContext?.infants || 0);
    return { adults, children, infants };
  }, [flowState.searchContext]);

  const totalPassengers = Math.max(1, travellersCount.adults + travellersCount.children + travellersCount.infants);

  // International flight check for passport requirements
  const isInternational = useMemo(() => {
    if (typeof flowState.isInternational === "boolean") return flowState.isInternational;
    const rawSegments = flowState.flight?.Segments?.flat?.() || flowState.flight?.rawItem?.Segments?.flat?.() || [];
    const countryCodes = [
      ...rawSegments.flatMap((segment) => [
      segment?.Origin?.CountryCode,
      segment?.Destination?.CountryCode,
      ]),
      flowState.searchContext?.origin?.countryCode,
      flowState.searchContext?.origin?.CountryCode,
      flowState.searchContext?.destination?.countryCode,
      flowState.searchContext?.destination?.CountryCode,
    ].filter(Boolean).map((code) => String(code).toUpperCase());
    return countryCodes.some((code) => !["IN", "IND", "INDIA"].includes(code));
  }, [flowState]);

  // Passengers state
  const [passengers, setPassengers] = useState(() => {
    if (Array.isArray(flowState.passengers) && flowState.passengers.length === totalPassengers) return flowState.passengers;
    return Array.from({ length: totalPassengers }, (_, index) => ({
      title: "Mr",
      firstName: "",
      lastName: "",
      gender: "Male",
      dob: "",
      nationality: "",
      passportNo: "",
      passportExpiry: "",
      passportIssueDate: "",
      passportIssueCountryCode: "",
      passengerType: index < travellersCount.adults ? "Adult" : index < travellersCount.adults + travellersCount.children ? "Child" : "Infant",
    }));
  });

  // Contact details state
  const [contact, setContact] = useState({
    email: flowState.contact?.email || "",
    mobile: flowState.contact?.mobile || "",
  });

  // Fare Rule Modal State
  const [fareRuleModalVisible, setFareRuleModalVisible] = useState(false);
  const [fareRuleLoading, setFareRuleLoading] = useState(false);
  const [fareRuleData, setFareRuleData] = useState(null);
  const [fareRuleError, setFareRuleError] = useState("");

  const handleFetchFareRules = useCallback(async () => {
    setFareRuleModalVisible(true);
    setFareRuleLoading(true);
    setFareRuleError("");
    try {
      const activeTraceId = flowState.traceId || flowState.flight?.traceId || routeParams.traceId || routeParams.flight?.traceId;
      const activeResultIndex = flowState.resultIndex || flowState.flight?.resultIndex || routeParams.resultIndex || routeParams.flight?.resultIndex;
      const activeSrdvType = flowState.srdvType || flowState.flight?.srdvType || routeParams.srdvType || routeParams.flight?.srdvType || "MixAPI";
      const activeSrdvIndex = flowState.srdvIndex || flowState.flight?.srdvIndex || routeParams.srdvIndex || routeParams.flight?.srdvIndex || "2";

      console.log("\n==========================================");
      console.log("📋 [FLIGHT FARE RULE - REQUESTING API]");
      console.log({ traceId: activeTraceId, resultIndex: activeResultIndex, srdvType: activeSrdvType, srdvIndex: activeSrdvIndex });
      console.log("==========================================\n");

      const res = await getFlightFareRule({
        traceId: activeTraceId,
        resultIndex: activeResultIndex,
        srdvType: activeSrdvType,
        srdvIndex: activeSrdvIndex,
      });

      safeFlightLog("[Flight][FareRule][Response]", { status: res?.success === false ? "unavailable" : "received", resultIndex: activeResultIndex });

      setFareRuleData(res);
    } catch (err) {
      console.error("[FlightPassengerDetailsScreen] Fare rule fetch error:", err?.message);
      setFareRuleError(err?.message || "Fare rules are currently unavailable.");
    } finally {
      setFareRuleLoading(false);
    }
  }, [flowState, routeParams]);

  const fareRulesList = useMemo(() => {
    if (fareRuleData?.code === "FARE_RULE_UNAVAILABLE" || (fareRuleData?.success === false && (!fareRuleData?.data || fareRuleData?.data?.length === 0))) {
      return [];
    }
    const rawData = fareRuleData?.data || fareRuleData?.Response || fareRuleData?.Results || fareRuleData;
    let list = rawData?.FareRules || rawData?.FareRule || rawData?.Results || rawData || [];
    if (!Array.isArray(list)) list = [list].filter(Boolean);
    if (rawData?.SpecialRule && !list.some((r) => r.SpecialRule)) {
      list.unshift({ SpecialRule: rawData.SpecialRule });
    }
    return list;
  }, [fareRuleData]);


  // Saved travelers state
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelersLoading, setTravelersLoading] = useState(false);
  const [travelersError, setTravelersError] = useState(null);
  const [selectedTravelerId, setSelectedTravelerId] = useState(null);
  const [errors, setErrors] = useState({});
  const [acknowledgementAccepted, setAcknowledgementAccepted] = useState(
    Boolean(flowState.acknowledgementAccepted)
  );

  // Fetch saved travelers from service
  const fetchSavedTravelers = useCallback(async () => {
    try {
      setTravelersLoading(true);
      setTravelersError(null);
      const token = await getStoredAuthToken();
      const list = await getTravelers(token);
      setSavedTravelers(list || []);

      safeFlightLog("[Flight][Travelers][Response]", { status: "received", flightCount: list?.length || 0 });
    } catch (err) {
      console.warn("[Flight][Travelers][Error]", { message: err?.message || "Unable to load saved travelers" });
      setTravelersError("Unable to load saved travelers.");
    } finally {
      setTravelersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedTravelers();
  }, [fetchSavedTravelers]);

  // Select a saved traveler
  const handleSelectTraveler = useCallback((traveler) => {
    if (!traveler) {
      setSelectedTravelerId(null);
      return;
    }

    setSelectedTravelerId(traveler.id);

    const nameParts = (traveler.fullName || "").split(" ").filter(Boolean);
    const firstName = traveler.firstName || nameParts[0] || "";
    const lastName = traveler.lastName || nameParts.slice(1).join(" ") || "";
    const title = traveler.gender === "Female" ? "Ms" : "Mr";

    setPassengers((prev) => {
      if (!prev || prev.length === 0) return prev;
      const next = [...prev];
      next[0] = {
        ...next[0],
        title,
        firstName,
        lastName,
        gender: traveler.gender === "Transgender" ? "Others" : (traveler.gender || "Male"),
        dob: traveler.dateOfBirth || traveler.dob || next[0].dob,
        nationality: traveler.nationality || next[0].nationality,
        passportNo: traveler.passportNumber || traveler.passportNo || next[0].passportNo,
        passportExpiry: traveler.passportExpiry || next[0].passportExpiry,
        passportIssueDate: traveler.passportIssueDate || next[0].passportIssueDate,
        passportIssueCountryCode: traveler.passportIssueCountryCode || next[0].passportIssueCountryCode,
      };
      return next;
    });

    if (traveler.email) setContact((prev) => ({ ...prev, email: traveler.email }));
    if (traveler.phoneNumber) setContact((prev) => ({ ...prev, mobile: traveler.phoneNumber }));
  }, []);

  // Add new traveler action
  const handleAddNewTraveler = useCallback(() => {
    setSelectedTravelerId(null);
    setPassengers((prev) => {
      if (!prev || prev.length === 0) return prev;
      const next = [...prev];
      next[0] = {
        ...next[0],
        firstName: "",
        lastName: "",
      };
      return next;
    });
  }, []);

  // Field updater
  const updatePassenger = useCallback((index, field, value) => {
    setPassengers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }, []);

  // Contact field updater
  const updateContact = useCallback((field, value) => {
    setContact((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Form validation
  const validateDetails = useCallback(() => {
    const nextErrors = {};
    let isValid = true;

    // Validate Passenger names & fields
    passengers.forEach((p, idx) => {
      const invalid = validateFlightPassenger(p, { international: isInternational, departureDate: flowState.searchContext?.date || flowState.searchContext?.departureDate });
      invalid.forEach((field) => {
        nextErrors[`p-${idx}-${field}`] = `${p.passengerType} passenger ${idx + 1}: ${field.replace(/([A-Z])/g, " $1").toLowerCase()} is invalid`;
        isValid = false;
      });
    });

    // Validate Contacts
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contact.email.trim() || !emailRegex.test(contact.email)) {
      nextErrors["email"] = "Enter a valid email address";
      isValid = false;
    }
    if (!/^\d{10}$/.test(contact.mobile.trim())) {
      nextErrors["mobile"] = "Enter a valid 10-digit mobile number";
      isValid = false;
    }

    if (!acknowledgementAccepted) {
      nextErrors.acknowledgement = "Please accept the cancellation rules and booking terms to continue.";
      isValid = false;
    }

    setErrors(nextErrors);
    safeFlightLog("[Flight][Passengers][Validation]", { validationPassed: isValid, invalidFields: Object.keys(nextErrors) });
    return isValid;
  }, [passengers, contact, isInternational, acknowledgementAccepted, flowState.searchContext?.date, flowState.searchContext?.departureDate]);

  // Handle Continue to Seat Selection
  const handleContinue = useCallback(async () => {
    const isValid = validateDetails();
    console.log("================================================================================");
    console.log("✈️ [FLIGHT BOOKING FLOW - STEP 3: SUBMITTING PASSENGER DETAILS]");
    console.log(`[FlightPassengerDetailsScreen] Validation Status: ${isValid ? "PASSED ✅" : "FAILED ❌"}`);
    if (!isValid) {
      console.warn("[FlightPassengerDetailsScreen] Validation Errors:", JSON.stringify(errors, null, 2));
      console.log("================================================================================");
      Alert.alert("Incomplete Details", "Please correct the errors before continuing.");
      return;
    }

    const activeTraceId = flowState.traceId || flowState.flight?.traceId || routeParams.traceId || routeParams.flight?.traceId;
    const activeResultIndex = flowState.resultIndex || flowState.flight?.resultIndex || routeParams.resultIndex || routeParams.flight?.resultIndex;
    const activeSrdvType = flowState.srdvType || flowState.flight?.srdvType || routeParams.srdvType || routeParams.flight?.srdvType || "MixAPI";
    const activeSrdvIndex = flowState.srdvIndex || flowState.flight?.srdvIndex || routeParams.srdvIndex || routeParams.flight?.srdvIndex || "2";

    console.log("================================================================================");
    console.log("✈️ [MULTI-CITY PASSENGER DETAILS TELEMETRY]");
    console.log(`🆔 Trace ID: ${activeTraceId} | Result Index: ${activeResultIndex}`);
    if (flowState.isMultiCity || flowState.journeyType === 3) {
      console.log("🌍 Multi-City Route Summary:");
      (flowState.multiCityFlights || []).forEach((leg, i) => {
        console.log(`  Leg ${i + 1}: ${leg.airlineName || leg.airlineCode || "Flight"} (${leg.fromCity || leg.origin} ➔ ${leg.toCity || leg.destination})`);
      });
    }
    console.log("================================================================================");

    const nextState = {
      ...flowState,
      traceId: activeTraceId,
      resultIndex: activeResultIndex,
      srdvType: activeSrdvType,
      srdvIndex: activeSrdvIndex,
      passengers,
      contact,
      acknowledgementAccepted,
      isInternational,
      fareRuleState: fareRuleError ? "error" : fareRuleData ? "loaded" : "not_loaded",
      selectedSeats: [],
      selectedSeatLabels: [],
      fareSummary: flowState.fareSummary || {
        baseFare: Number(flowState.flight?.selectedTravelClassPriceInr || flowState.flight?.fare || 0),
      },
    };

    console.log("[FlightPassengerDetailsScreen] Persisting state to SecureStore via writeFlightBookingFlowState...");
    await writeFlightBookingFlowState(nextState);
    console.log("[FlightPassengerDetailsScreen] Navigating to FlightSeatSelectionScreen...");
    navigation.navigate("FlightSeatSelectionScreen", nextState);
  }, [validateDetails, errors, passengers, contact, acknowledgementAccepted, flowState, routeParams, navigation, isInternational, fareRuleData, fareRuleError]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.rootContainer}>
      {/* Background Decor Layer */}
      <BackgroundDecorations />

      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        {/* Header */}
        <PassengerHeader onBackPress={handleBackPress} />

        {/* Scrollable Form Content with Keyboard Awareness */}
        <KeyboardAwareScrollView
          style={styles.keyboardScrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={25}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, width >= 768 && styles.containerWide]}>
            <PassengerFlightSummary
              flight={flowState.flight || {}}
              outboundFlight={flowState.outboundFlight}
              returnFlight={flowState.returnFlight}
              searchContext={flowState.searchContext || {}}
              fareSummary={flowState.fareSummary || {}}
            />
            {/* Saved Travellers Card */}
            <SavedTravellerCard
              savedTravelers={savedTravelers}
              travelersLoading={travelersLoading}
              travelersError={travelersError}
              selectedTravelerId={selectedTravelerId}
              onSelectTraveler={handleSelectTraveler}
              onAddNewTraveler={handleAddNewTraveler}
              onRetryFetch={fetchSavedTravelers}
            />

            {/* Passenger Forms Cards */}
            {passengers.map((passenger, index) => (
              <PassengerCard
                key={index}
                passenger={passenger}
                index={index}
                isInternational={isInternational}
                errors={errors}
                onUpdatePassenger={updatePassenger}
              />
            ))}

            {/* Contact Details Card */}
            <ContactCard
              contact={contact}
              errors={errors}
              onUpdateContact={updateContact}
            />

            <ImportantInformationCard />

            <AcknowledgementCard
              value={acknowledgementAccepted}
              onChange={(value) => {
                setAcknowledgementAccepted(value);
                if (value) setErrors((prev) => ({ ...prev, acknowledgement: undefined }));
              }}
              error={errors.acknowledgement}
            />

            {/* View Fare Rules & Cancellation Policy Trigger Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleFetchFareRules}
              style={styles.fareRuleBtn}
            >
              <Ionicons name="document-text-outline" size={18} color={COLORS.primaryRed} />
              <Text style={styles.fareRuleBtnText}>View Fare Rules & Cancellation Policy</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>

        {/* Fare Rules Modal */}
        <FareRuleModal
          visible={fareRuleModalVisible}
          onClose={() => setFareRuleModalVisible(false)}
          loading={fareRuleLoading}
          fareRuleData={fareRuleData}
          error={fareRuleError}
          onRetry={handleFetchFareRules}
          origin={flowState.flight?.from || flowState.searchContext?.from || ""}
          destination={flowState.flight?.to || flowState.searchContext?.to || ""}
          airline={flowState.flight?.airlineName || "Selected flight"}
        />

        {/* Sticky Action Footer */}
        <StickyFooter onContinue={handleContinue} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safe: {
    flex: 1,
  },
  keyboardScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  container: {
    paddingHorizontal: 12,
    paddingTop: 2,
    gap: 10,
  },
  containerWide: {
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  fareRuleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  fareRuleBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryRed,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    paddingVertical: 16,
  },
  modalLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  ruleCard: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  ruleSector: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  ruleDetail: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  noRulesText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 20,
  },
});
