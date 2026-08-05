import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { searchHotelOffers, resolveCityId } from "../../../services/hotelService";
import { useHotelBooking } from "../../../context/HotelBookingContext";
import AppHeader from "../../../components/AppHeader";

const CITY_HINTS = [
  { label: "New Delhi", value: "725862" },
  { label: "Mumbai", value: "130443" },
  { label: "Hyderabad", value: "118488" },
  { label: "Bengaluru", value: "111124" },
];

const formatDisplayDate = (date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatApiDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const HotelsScreen = () => {
  const navigation = useNavigation();
  const { setSearchSession } = useHotelBooking();

  const [destinationInput, setDestinationInput] = useState("New Delhi (725862)");
  const [checkInDate, setCheckInDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  );

  // Multi-room guests state
  const [roomGuests, setRoomGuests] = useState([
    { NoOfAdults: "2", NoOfChild: "0", ChildAge: [] },
  ]);

  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resolvedCityId = useMemo(() => resolveCityId(destinationInput), [destinationInput]);

  const handleAddRoom = () => {
    if (roomGuests.length >= 4) return;
    setRoomGuests((prev) => [
      ...prev,
      { NoOfAdults: "2", NoOfChild: "0", ChildAge: [] },
    ]);
  };

  const handleRemoveRoom = (index) => {
    if (roomGuests.length <= 1) return;
    setRoomGuests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAdults = (roomIdx, delta) => {
    setRoomGuests((prev) =>
      prev.map((r, idx) => {
        if (idx !== roomIdx) return r;
        const currentAdults = Math.max(1, (Number(r.NoOfAdults) || 1) + delta);
        return { ...r, NoOfAdults: String(currentAdults) };
      })
    );
  };

  const handleUpdateChildren = (roomIdx, delta) => {
    setRoomGuests((prev) =>
      prev.map((r, idx) => {
        if (idx !== roomIdx) return r;
        const currentChildren = Math.max(0, (Number(r.NoOfChild) || 0) + delta);
        let newAges = [...(r.ChildAge || [])];
        if (currentChildren > newAges.length) {
          while (newAges.length < currentChildren) newAges.push(5);
        } else if (currentChildren < newAges.length) {
          newAges = newAges.slice(0, currentChildren);
        }
        return { ...r, NoOfChild: String(currentChildren), ChildAge: newAges };
      })
    );
  };

  const handleUpdateChildAge = (roomIdx, childIdx, ageStr) => {
    const ageNum = Math.min(12, Math.max(1, Number(ageStr) || 5));
    setRoomGuests((prev) =>
      prev.map((r, idx) => {
        if (idx !== roomIdx) return r;
        const newAges = [...(r.ChildAge || [])];
        newAges[childIdx] = ageNum;
        return { ...r, ChildAge: newAges };
      })
    );
  };

  const handleSearch = async () => {
    setError("");

    // Validate dates
    if (!(checkOutDate > checkInDate)) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    // Validate ChildAge matching NoOfChild for every room
    for (let i = 0; i < roomGuests.length; i++) {
      const room = roomGuests[i];
      const childCount = Number(room.NoOfChild) || 0;
      if ((room.ChildAge || []).length !== childCount) {
        setError(`Room ${i + 1}: Please specify exact ages for all ${childCount} children.`);
        return;
      }
    }

    setLoading(true);

    try {
      const searchParams = {
        cityId: resolvedCityId,
        checkInDate: formatApiDate(checkInDate),
        checkOutDate: formatApiDate(checkOutDate),
        noOfRooms: roomGuests.length,
        roomGuests,
      };

      console.log("[HotelsScreen] executing searchHotelOffers:", searchParams);
      const searchResult = await searchHotelOffers(searchParams);

      const hotels = searchResult?.hotels || [];
      const sessionData = {
        traceId: searchResult?.traceId || "",
        srdvType: searchResult?.srdvType || "MixAPI",
        srdvIndex: searchResult?.srdvIndex || "15",
      };

      // Save to context
      setSearchSession(searchParams, sessionData);

      navigation.navigate("HotelSearchResultsScreen", {
        hotels,
        searchParams: {
          ...searchParams,
          ...sessionData,
        },
      });
    } catch (searchError) {
      console.log("[HotelsScreen] Search error:", searchError?.message);
      setError(
        searchError?.message || "Unable to search hotels. Please verify destination and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Hotels" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroBanner}>
          <Text style={styles.title}>
            Stay Beyond <Text style={styles.highlight}>The Ordinary</Text>
          </Text>
          <Text style={styles.subtitle}>
            Find live rooms, real-time rates, and instant booking confirmation.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>DESTINATION CITY / CITY ID</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="business-outline" size={20} color="#E53935" />
            <TextInput
              placeholder="Search City or ID (e.g. Delhi, 725862)"
              placeholderTextColor="#7A869A"
              value={destinationInput}
              onChangeText={setDestinationInput}
              style={styles.input}
            />
          </View>

          <View style={styles.hintsRow}>
            {CITY_HINTS.map((hint) => (
              <Pressable
                key={hint.value}
                style={styles.hintChip}
                onPress={() => setDestinationInput(`${hint.label} (${hint.value})`)}
              >
                <Text style={styles.hintChipText}>{hint.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.dateBox}>
              <Text style={styles.label}>CHECK-IN</Text>
              <Pressable
                style={styles.dateInput}
                onPress={() => setShowCheckInPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#E53935" />
                <Text style={styles.dateText}>
                  {formatDisplayDate(checkInDate)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.dateBox}>
              <Text style={styles.label}>CHECK-OUT</Text>
              <Pressable
                style={styles.dateInput}
                onPress={() => setShowCheckOutPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#E53935" />
                <Text style={styles.dateText}>
                  {formatDisplayDate(checkOutDate)}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Multi-Room Guest Configuration */}
          <View style={styles.roomsHeader}>
            <Text style={styles.sectionTitle}>ROOMS & GUESTS ({roomGuests.length})</Text>
            {roomGuests.length < 4 && (
              <Pressable style={styles.addRoomBtn} onPress={handleAddRoom}>
                <Ionicons name="add-circle-outline" size={18} color="#E53935" />
                <Text style={styles.addRoomText}>Add Room</Text>
              </Pressable>
            )}
          </View>

          {roomGuests.map((room, rIdx) => {
            const childCount = Number(room.NoOfChild) || 0;
            return (
              <View key={`room-${rIdx}`} style={styles.roomCard}>
                <View style={styles.roomTitleRow}>
                  <Text style={styles.roomTitle}>Room {rIdx + 1}</Text>
                  {roomGuests.length > 1 && (
                    <Pressable onPress={() => handleRemoveRoom(rIdx)}>
                      <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                    </Pressable>
                  )}
                </View>

                <View style={styles.row}>
                  <View style={styles.dateBox}>
                    <Text style={styles.subLabel}>Adults (12+ yrs)</Text>
                    <View style={styles.stepper}>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => handleUpdateAdults(rIdx, -1)}
                      >
                        <Ionicons name="remove" size={16} color="#E53935" />
                      </Pressable>
                      <Text style={styles.stepperValue}>{room.NoOfAdults}</Text>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => handleUpdateAdults(rIdx, 1)}
                      >
                        <Ionicons name="add" size={16} color="#E53935" />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.dateBox}>
                    <Text style={styles.subLabel}>Children (0-11 yrs)</Text>
                    <View style={styles.stepper}>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => handleUpdateChildren(rIdx, -1)}
                      >
                        <Ionicons name="remove" size={16} color="#E53935" />
                      </Pressable>
                      <Text style={styles.stepperValue}>{room.NoOfChild}</Text>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => handleUpdateChildren(rIdx, 1)}
                      >
                        <Ionicons name="add" size={16} color="#E53935" />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {childCount > 0 && (
                  <View style={styles.childAgesContainer}>
                    <Text style={styles.subLabel}>Child Ages (Years)</Text>
                    <View style={styles.childAgesRow}>
                      {(room.ChildAge || []).map((age, cIdx) => (
                        <View key={`child-${rIdx}-${cIdx}`} style={styles.childAgeInputBox}>
                          <Text style={styles.childAgeTag}>Child {cIdx + 1}</Text>
                          <TextInput
                            style={styles.childAgeInput}
                            keyboardType="number-pad"
                            maxLength={2}
                            value={String(age)}
                            onChangeText={(val) => handleUpdateChildAge(rIdx, cIdx, val)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.searchButton} onPress={handleSearch} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="search-outline" size={20} color="#fff" />
                <Text style={styles.searchText}>SEARCH HOTELS</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {showCheckInPicker && (
        <DateTimePicker
          value={checkInDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowCheckInPicker(false);
            if (selectedDate) {
              setCheckInDate(selectedDate);
              if (checkOutDate <= selectedDate) {
                setCheckOutDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
              }
            }
          }}
        />
      )}

      {showCheckOutPicker && (
        <DateTimePicker
          value={checkOutDate}
          mode="date"
          minimumDate={new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000)}
          onChange={(event, selectedDate) => {
            setShowCheckOutPicker(false);
            if (selectedDate) setCheckOutDate(selectedDate);
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default HotelsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroBanner: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 34,
  },
  highlight: {
    color: "#EF4444",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: -20,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  inputContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
  },
  hintsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  hintChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FEF2F2",
    borderRadius: 99,
  },
  hintChipText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 11,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  dateBox: {
    flex: 1,
  },
  dateInput: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  roomsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    letterSpacing: 0.5,
  },
  addRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addRoomText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 12,
  },
  roomCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 12,
  },
  roomTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  roomTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  stepper: {
    height: 44,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  childAgesContainer: {
    marginTop: 8,
  },
  childAgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  childAgeInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  childAgeTag: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  childAgeInput: {
    width: 28,
    height: 28,
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
    color: "#0F172A",
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "700",
    marginVertical: 8,
    fontSize: 12,
  },
  searchButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: "#EF4444",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
