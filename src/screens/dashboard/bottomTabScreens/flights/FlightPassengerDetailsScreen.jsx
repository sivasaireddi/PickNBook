import React, { useMemo, useState } from "react";
import { 
  Alert, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  useWindowDimensions, 
  View 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { writeFlightBookingFlowState, clearFlightBookingFlowState } from "./services/flightBookingFlowStore";
import { Picker } from "@react-native-picker/picker";
import { getTravelers } from "../../../../services/travelerService";
import { getStoredAuthToken } from "../../../../utils/authSession";

const PRIMARY_RED = "#E53935";
const BACKGROUND = "#F8F9FB";
const WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

export default function FlightPassengerDetailsScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const flowState = route?.params || {};
  
  const travellersCount = useMemo(() => {
    const summary = String(flowState.searchContext?.travellers || "");
    const adults = Number((summary.match(/(\d+)\s*Adult/i) || [])[1] || flowState.searchContext?.adults || 1);
    const children = Number((summary.match(/(\d+)\s*Child/i) || [])[1] || flowState.searchContext?.children || 0);
    const infants = Number((summary.match(/(\d+)\s*Infant/i) || [])[1] || flowState.searchContext?.infants || 0);
    return { adults, children, infants };
  }, [flowState.searchContext]);

  const totalPassengers = Math.max(1, travellersCount.adults + travellersCount.children);

  // Keep existing state structure but populate with detailed fields: dob, gender
  const [passengers, setPassengers] = useState(
    Array.from({ length: totalPassengers }, (_, index) => ({
      title: "Mr",
      firstName: "",
      lastName: "",
      gender: "Male",
      dob: "1995-05-15",
      nationality: "Indian",
      passengerType: index < travellersCount.adults ? "Adult" : "Child",
    }))
  );

  const [contact, setContact] = useState({
    email: flowState.contact?.email || "",
    mobile: flowState.contact?.mobile || "",
  });

  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelersLoading, setTravelersLoading] = useState(false);
  const [travelersError, setTravelersError] = useState(null);
  const [selectedTravelerId, setSelectedTravelerId] = useState(null);

  const fetchSavedTravelers = async () => {
    try {
      setTravelersLoading(true);
      setTravelersError(null);
      const token = await getStoredAuthToken();
      const list = await getTravelers(token);
      setSavedTravelers(list || []);

      if (list && list.length > 0) {
        handleSelectTraveler(list[0]);
      }
    } catch (err) {
      console.log("[FlightPassengerDetailsScreen] Error fetching travelers:", err);
      setTravelersError("Unable to load saved travelers.");
    } finally {
      setTravelersLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSavedTravelers();
  }, []);

  const handleSelectTraveler = (traveler) => {
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
        gender: traveler.gender || "Male",
      };
      return next;
    });

    if (traveler.email) setContact((prev) => ({ ...prev, email: traveler.email }));
    if (traveler.phoneNumber) setContact((prev) => ({ ...prev, mobile: traveler.phoneNumber }));
  };

  const handleAddNewTraveler = () => {
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
  };

  const [errors, setErrors] = useState({});

  const updatePassenger = (index, field, value) => {
    setPassengers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const validateDetails = () => {
    const nextErrors = {};
    let isValid = true;

    // Validate Passenger names & fields
    passengers.forEach((p, idx) => {
      if (!p.firstName.trim()) {
        nextErrors[`p-${idx}-firstName`] = "First name is required";
        isValid = false;
      }
      if (!p.lastName.trim()) {
        nextErrors[`p-${idx}-lastName`] = "Last name is required";
        isValid = false;
      }
      if (!p.dob.trim()) {
        nextErrors[`p-${idx}-dob`] = "Date of Birth (YYYY-MM-DD) is required";
        isValid = false;
      }
    });

    // Validate Contacts
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contact.email.trim() || !emailRegex.test(contact.email)) {
      nextErrors["email"] = "Enter a valid email address";
      isValid = false;
    }
    if (!contact.mobile.trim() || contact.mobile.length < 10) {
      nextErrors["mobile"] = "Enter a valid 10-digit mobile number";
      isValid = false;
    }

    setErrors(nextErrors);
    return isValid;
  };

  const handleContinue = async () => {
    if (!validateDetails()) {
      Alert.alert("Incomplete Details", "Please correct the errors before continuing.");
      return;
    }

    // Pass the state to the Seat Selection Screen
    const nextState = {
      ...flowState,
      passengers,
      contact,
      selectedSeats: passengers.map((_, index) => ({ label: `${12 + index}A` })),
      fareSummary: flowState.fareSummary || { 
        baseFare: Number(flowState.flight?.selectedTravelClassPriceInr || flowState.flight?.fare || 5208) 
      },
    };
    await writeFlightBookingFlowState(nextState);
    console.log("[FlightPassengerDetailsScreen] Saving details", nextState);
    navigation.navigate("FlightSeatSelectionScreen", nextState);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Passenger Details</Text>
          <Text style={styles.headerSubtitle}>Step 2 of 4 • Add traveler records</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.container, width >= 768 && styles.containerWide]}>
          {/* Saved Travelers Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={18} color={PRIMARY_RED} />
              <View>
                <Text style={styles.cardTitle}>Saved Travelers</Text>
                <Text style={styles.cardSubtitle}>Select an existing traveler or add a new one.</Text>
              </View>
            </View>

            {travelersLoading ? (
              <View style={styles.loadingInlineCard}>
                <Text style={styles.loadingInlineText}>Fetching saved travelers...</Text>
              </View>
            ) : travelersError ? (
              <View style={styles.errorInlineCard}>
                <Ionicons name="alert-circle-outline" size={22} color={PRIMARY_RED} />
                <Text style={styles.errorInlineText}>{travelersError}</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={fetchSavedTravelers} style={styles.retryInlineBtn}>
                  <Text style={styles.retryInlineBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : savedTravelers.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="person-add-outline" size={24} color={TEXT_MUTED} />
                <Text style={styles.emptyStateTitle}>No saved travelers found.</Text>
                <TouchableOpacity activeOpacity={0.85} onPress={handleAddNewTraveler} style={styles.addNewTravelerCardBtn}>
                  <Ionicons name="add" size={18} color={PRIMARY_RED} />
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
                  dropdownIconColor={PRIMARY_RED}
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
          </View>

          {passengers.map((passenger, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="person" size={18} color={PRIMARY_RED} />
                <Text style={styles.cardTitle}>{passenger.passengerType} Passenger {index + 1}</Text>
              </View>

              {/* Title Selection */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>TITLE</Text>
                <View style={styles.genderRow}>
                  {["Mr", "Mrs", "Ms"].map((titleOpt) => {
                    const isActive = passenger.title === titleOpt;
                    return (
                      <TouchableOpacity
                        key={titleOpt}
                        activeOpacity={0.8}
                        onPress={() => updatePassenger(index, "title", titleOpt)}
                        style={[styles.genderBtn, isActive && styles.genderBtnActive]}
                      >
                        <Text style={[styles.genderBtnText, isActive && styles.genderBtnTextActive]}>
                          {titleOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Names input row */}
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.fieldLabel}>FIRST NAME</Text>
                  <TextInput
                    style={[styles.input, errors[`p-${index}-firstName`] && styles.inputError]}
                    value={passenger.firstName}
                    onChangeText={(val) => updatePassenger(index, "firstName", val)}
                    placeholder="Enter first name"
                    placeholderTextColor={TEXT_MUTED}
                  />
                  {errors[`p-${index}-firstName`] && (
                    <Text style={styles.errorText}>{errors[`p-${index}-firstName`]}</Text>
                  )}
                </View>

                <View style={styles.flex1}>
                  <Text style={styles.fieldLabel}>LAST NAME</Text>
                  <TextInput
                    style={[styles.input, errors[`p-${index}-lastName`] && styles.inputError]}
                    value={passenger.lastName}
                    onChangeText={(val) => updatePassenger(index, "lastName", val)}
                    placeholder="Enter last name"
                    placeholderTextColor={TEXT_MUTED}
                  />
                  {errors[`p-${index}-lastName`] && (
                    <Text style={styles.errorText}>{errors[`p-${index}-lastName`]}</Text>
                  )}
                </View>
              </View>

              {/* Gender selection */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>GENDER</Text>
                <View style={styles.genderRow}>
                  {["Male", "Female", "Transgender"].map((gOpt) => {
                    const isActive = passenger.gender === gOpt;
                    return (
                      <TouchableOpacity
                        key={gOpt}
                        activeOpacity={0.8}
                        onPress={() => updatePassenger(index, "gender", gOpt)}
                        style={[styles.genderBtn, isActive && styles.genderBtnActive]}
                      >
                        <Text style={[styles.genderBtnText, isActive && styles.genderBtnTextActive]}>
                          {gOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* DOB and Nationality row */}
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.fieldLabel}>DATE OF BIRTH (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.input, errors[`p-${index}-dob`] && styles.inputError]}
                    value={passenger.dob}
                    onChangeText={(val) => updatePassenger(index, "dob", val)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={TEXT_MUTED}
                  />
                  {errors[`p-${index}-dob`] && (
                    <Text style={styles.errorText}>{errors[`p-${index}-dob`]}</Text>
                  )}
                </View>

                <View style={styles.flex1}>
                  <Text style={styles.fieldLabel}>NATIONALITY</Text>
                  <TextInput
                    style={styles.input}
                    value={passenger.nationality}
                    onChangeText={(val) => updatePassenger(index, "nationality", val)}
                    placeholder="e.g. Indian"
                    placeholderTextColor={TEXT_MUTED}
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Contact Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="call" size={18} color={PRIMARY_RED} />
              <Text style={styles.cardTitle}>Contact Details</Text>
            </View>
            <Text style={styles.cardDesc}>Booking receipt & e-ticket will be sent here.</Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.input, errors["email"] && styles.inputError]}
                keyboardType="email-address"
                autoCapitalize="none"
                value={contact.email}
                onChangeText={(val) => setContact((prev) => ({ ...prev, email: val }))}
                placeholder="name@example.com"
                placeholderTextColor={TEXT_MUTED}
              />
              {errors["email"] && <Text style={styles.errorText}>{errors["email"]}</Text>}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
              <TextInput
                style={[styles.input, errors["mobile"] && styles.inputError]}
                keyboardType="phone-pad"
                value={contact.mobile}
                onChangeText={(val) => setContact((prev) => ({ ...prev, mobile: val }))}
                placeholder="10-digit mobile number"
                placeholderTextColor={TEXT_MUTED}
              />
              {errors["mobile"] && <Text style={styles.errorText}>{errors["mobile"]}</Text>}
            </View>
          </View>

          {/* Continue button */}
          <TouchableOpacity activeOpacity={0.9} onPress={handleContinue} style={styles.continueBtn}>
            <Text style={styles.continueBtnText}>Continue to Seats Selection</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => {
              clearFlightBookingFlowState();
              Alert.alert("Draft Cleared", "Passenger details draft has been cleared.");
            }} 
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Clear Booking Draft</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleWrap: {
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  headerSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginTop: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  containerWide: {
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  cardDesc: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginTop: -8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_DARK,
    fontSize: 13,
    fontWeight: "750",
  },
  inputError: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FFF5F5",
  },
  errorText: {
    color: PRIMARY_RED,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  genderBtnActive: {
    backgroundColor: PRIMARY_RED,
    borderColor: PRIMARY_RED,
  },
  genderBtnText: {
    color: TEXT_DARK,
    fontSize: 12,
    fontWeight: "800",
  },
  genderBtnTextActive: {
    color: WHITE,
  },
  continueBtn: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: PRIMARY_RED,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  continueBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },
  clearBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  clearBtnText: {
    color: TEXT_MUTED,
    fontWeight: "800",
    fontSize: 13,
  },
  savedTravelersList: {
    gap: 10,
    marginTop: 8,
  },
  travelerItemCard: {
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  travelerItemCardSelected: {
    borderColor: PRIMARY_RED,
    borderWidth: 1.5,
    backgroundColor: "#FEF2F2",
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
    backgroundColor: WHITE,
  },
  radioRingSelected: {
    borderColor: PRIMARY_RED,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY_RED,
  },
  travelerDetailsWrap: {
    flex: 1,
  },
  travelerItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  travelerItemMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  travelerItemPhone: {
    fontSize: 12,
    fontWeight: "500",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  addTravelerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: PRIMARY_RED,
    backgroundColor: WHITE,
    marginTop: 4,
    gap: 6,
  },
  addTravelerActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY_RED,
  },
  loadingInlineCard: {
    padding: 14,
    alignItems: "center",
  },
  loadingInlineText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  errorInlineCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    gap: 6,
  },
  errorInlineText: {
    fontSize: 13,
    color: PRIMARY_RED,
    fontWeight: "600",
  },
  retryInlineBtn: {
    backgroundColor: PRIMARY_RED,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  retryInlineBtnText: {
    color: WHITE,
    fontWeight: "700",
    fontSize: 12,
  },
  emptyStateCard: {
    alignItems: "center",
    padding: 16,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  addNewTravelerCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PRIMARY_RED,
  },
  addNewTravelerCardBtnText: {
    color: PRIMARY_RED,
    fontSize: 12,
    fontWeight: "700",
  },
  pickerShell: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 6,
  },
  pickerControl: {
    color: TEXT_DARK,
    width: "100%",
  },
});
