import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { searchHotels } from "../../../services/hotelService";

import AppHeader from "../../../components/AppHeader";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

const HOTEL_CODE_HINTS = [
  { label: "Hyderabad", value: "HYD" },
  { label: "Delhi", value: "DEL" },
  { label: "Bengaluru", value: "BLR" },
  { label: "Mumbai", value: "BOM" },
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
  const [cityCode, setCityCode] = useState("HYD");
  const [checkInDate, setCheckInDate] = useState(new Date());
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const [adults, setAdults] = useState("2");
  const [rooms, setRooms] = useState("1");
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalizedCityCode = useMemo(
    () => String(cityCode || "").trim().toUpperCase(),
    [cityCode],
  );

  const handleSearch = async () => {
    const parsedAdults = Number(adults);
    const parsedRooms = Number(rooms);

    if (!normalizedCityCode || (normalizedCityCode.length !== 3 && !/^\d+$/.test(normalizedCityCode))) {
      setError("Enter a city code (e.g. HYD, DEL) or City ID (e.g. 725862).");
      return;
    }

    if (!(checkOutDate > checkInDate)) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    if (!Number.isInteger(parsedAdults) || parsedAdults < 1) {
      setError("Adults must be at least 1.");
      return;
    }

    if (!Number.isInteger(parsedRooms) || parsedRooms < 1) {
      setError("Rooms must be at least 1.");
      return;
    }

      setLoading(true);
      setError("");

      try {
      const response = await searchHotels({
        cityCode: normalizedCityCode,
        checkInDate: formatApiDate(checkInDate),
        checkOutDate: formatApiDate(checkOutDate),
        adults: parsedAdults,
        rooms: parsedRooms,
      });

      console.log("[HotelsScreen] searchHotels resolved results:", response);
      const hotels = Array.isArray(response) ? response : [];
      navigation.navigate("HotelSearchResultsScreen", {
        hotels,
        searchParams: {
          cityCode: normalizedCityCode,
          checkInDate: formatApiDate(checkInDate),
          checkOutDate: formatApiDate(checkOutDate),
          adults: parsedAdults,
          rooms: parsedRooms,
        },
      });
      } catch (searchError) {
        console.log("Hotel search error:", searchError?.response?.data || searchError);
        setError(
        searchError?.response?.data?.message ||
          searchError?.message ||
          "Unable to fetch hotel results.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Hotels" />
      <ImageBackground
        source={{ uri: PLACEHOLDER_IMAGE }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay}>
          <Text style={styles.title}>
            Stay Beyond <Text style={styles.highlight}>The Ordinary</Text>
          </Text>
          <Text style={styles.subtitle}>
            Search hotels by city code and show live rooms, rates, and cancellation details.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>CITY CODE</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color="#E53935" />
              <TextInput
                placeholder="HYD or 725862"
                placeholderTextColor="#7A869A"
                value={cityCode}
                onChangeText={setCityCode}
                autoCapitalize="characters"
                maxLength={10}
                style={styles.input}
              />
            </View>

            <View style={styles.hintsRow}>
              {HOTEL_CODE_HINTS.map((hint) => (
                <Pressable
                  key={hint.value}
                  style={styles.hintChip}
                  onPress={() => setCityCode(hint.value)}
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

            <View style={styles.row}>
              <View style={styles.dateBox}>
                <Text style={styles.label}>ADULTS</Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepperBtn}
                    onPress={() =>
                      setAdults((current) =>
                        String(Math.max(1, Number(current || 1) - 1)),
                      )
                    }
                  >
                    <Ionicons name="remove" size={18} color="#E53935" />
                  </Pressable>
                  <Text style={styles.stepperValue}>{adults}</Text>
                  <Pressable
                    style={styles.stepperBtn}
                    onPress={() =>
                      setAdults((current) => String(Number(current || 1) + 1))
                    }
                  >
                    <Ionicons name="add" size={18} color="#E53935" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.dateBox}>
                <Text style={styles.label}>ROOMS</Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepperBtn}
                    onPress={() =>
                      setRooms((current) =>
                        String(Math.max(1, Number(current || 1) - 1)),
                      )
                    }
                  >
                    <Ionicons name="remove" size={18} color="#E53935" />
                  </Pressable>
                  <Text style={styles.stepperValue}>{rooms}</Text>
                  <Pressable
                    style={styles.stepperBtn}
                    onPress={() =>
                      setRooms((current) => String(Number(current || 1) + 1))
                    }
                  >
                    <Ionicons name="add" size={18} color="#E53935" />
                  </Pressable>
                </View>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={styles.searchButton} onPress={handleSearch}>
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
        </View>
      </ImageBackground>

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
    backgroundColor: "#FFFFFF",
  },
  hero: {
    minHeight: 500,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(27, 2, 2, 0.6)",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  highlight: {
    color: "#E53935",
  },
  subtitle: {
    color: "#FFEBEE",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 16,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#757575",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FAFAFA",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#212121",
    fontWeight: "700",
  },
  hintsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  hintChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFEBEE",
    borderRadius: 99,
  },
  hintChipText: {
    color: "#E53935",
    fontWeight: "700",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  dateBox: {
    flex: 1,
  },
  dateInput: {
    height: 52,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FAFAFA",
    marginBottom: 12,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#212121",
    fontWeight: "600",
  },
  stepper: {
    height: 52,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    backgroundColor: "#FAFAFA",
    marginBottom: 12,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#212121",
  },
  errorText: {
    color: "#B71C1C",
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 13,
  },
  searchButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#E53935",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#E53935",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
