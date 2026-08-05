import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import RedDatePickerModal from "../../../components/RedDatePickerModal";

const trips = [
  { label: "One Way", value: "oneway" },
  { label: "Round Trip", value: "twoway" },
];
const sorts = [
  { label: "Departure", value: "departure" },
  { label: "Duration", value: "duration" },
  { label: "Arrival", value: "arrival" },
  { label: "Fare", value: "fare" },
  { label: "Seats Available", value: "seats" },
];
const busTypes = ["AC", "Non AC", "Seater", "Sleeper"];
const timeBands = [
  { label: "6am to 12pm", value: "morning", icon: "partly-sunny-outline" },
  { label: "12pm to 6pm", value: "afternoon", icon: "sunny-outline" },
  { label: "6pm to 12am", value: "evening", icon: "moon-outline" },
  { label: "12am to 6am", value: "night", icon: "crescent-outline" },
];
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i);

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const makeDate = (y, m, d) => new Date(y, m, Math.min(d, daysInMonth(y, m)));
const normalize = (d) => makeDate(d.getFullYear(), d.getMonth(), d.getDate());
const getDate = (v) => {
  const d = v ? new Date(v) : new Date();
  return Number.isNaN(d.getTime()) ? normalize(new Date()) : normalize(d);
};
const getText = (v, fallback) =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;
const getTrip = (v) => (v === "twoway" ? "twoway" : "oneway");
const fmt = (d) =>
  d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
const heroFmt = (d) =>
  d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
const toggle = (list, value) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

const Chip = ({ label, active, onPress, style }) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipOn, style]}
    onPress={onPress}
    activeOpacity={0.88}
  >
    <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
  </TouchableOpacity>
);

export default function SearchScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const wide = width >= 1080;
  const tablet = width >= 760;
  const compact = width < 520;

  const [source, setSource] = useState(() =>
    getText(route?.params?.source, "Chennai"),
  );
  const [destination, setDestination] = useState(() =>
    getText(route?.params?.destination, "Hyderabad"),
  );
  const [tripType, setTripType] = useState(() =>
    getTrip(route?.params?.tripType),
  );
  const [departureDate, setDepartureDate] = useState(() =>
    getDate(route?.params?.departureDate),
  );
  const [draftDate, setDraftDate] = useState(() =>
    getDate(route?.params?.departureDate),
  );
  const [showEdit, setShowEdit] = useState(true);
  const [showDate, setShowDate] = useState(false);
  const [sortBy, setSortBy] = useState("duration");
  const [typeFilters, setTypeFilters] = useState([]);
  const [departureFilters, setDepartureFilters] = useState([]);
  const [arrivalFilters, setArrivalFilters] = useState([]);
  const [boardingPoint, setBoardingPoint] = useState("");
  const [droppingPoint, setDroppingPoint] = useState("");
  const [travelName, setTravelName] = useState("");

  useEffect(() => {
    const nextDate = getDate(route?.params?.departureDate);
    setSource(getText(route?.params?.source, "Chennai"));
    setDestination(getText(route?.params?.destination, "Hyderabad"));
    setTripType(getTrip(route?.params?.tripType));
    setDepartureDate(nextDate);
    setDraftDate(nextDate);
  }, [
    route?.params?.source,
    route?.params?.destination,
    route?.params?.tripType,
    route?.params?.departureDate,
  ]);

  const swap = () => {
    setSource(destination);
    setDestination(source);
  };

  const openDate = () => {
    setDraftDate(departureDate);
    setShowDate(true);
  };

  const editDraft = (part, value) => {
    setDraftDate((current) => {
      const year = part === "year" ? value : current.getFullYear();
      const month = part === "month" ? value : current.getMonth();
      const day = part === "day" ? value : current.getDate();
      return makeDate(year, month, day);
    });
  };

  const applySearch = () => {
    if (!source.trim() || !destination.trim()) {
      Alert.alert("Missing route", "Please enter both source and destination.");
      return;
    }
    if (source.trim().toLowerCase() === destination.trim().toLowerCase()) {
      Alert.alert("Invalid route", "Source and destination must be different.");
      return;
    }
    navigation.setParams({
      transport: "buses",
      source: source.trim(),
      destination: destination.trim(),
      tripType,
      departureDate: departureDate.toISOString(),
    });
    setShowEdit(false);
  };

  const resetFilters = () => {
    setSortBy("duration");
    setTypeFilters([]);
    setDepartureFilters([]);
    setArrivalFilters([]);
    setBoardingPoint("");
    setDroppingPoint("");
    setTravelName("");
  };

  const topLinks = [
    { key: "buses", label: "Buses", icon: "bus-outline", active: true },
    { key: "checkin", label: "Web Check-in", icon: "checkmark-done-outline" },
    { key: "ticket", label: "Print Ticket", icon: "document-text-outline" },
  ];

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page}>
          <View style={[styles.topBar, !tablet && styles.stack]}>
            <TouchableOpacity
              style={styles.brand}
              onPress={() => navigation.goBack()}
              activeOpacity={0.88}
            >
              <View style={styles.logo}>
                <Ionicons
                  name="navigate-circle-outline"
                  size={24}
                  color="#fff"
                />
              </View>
              <View>
                <Text style={styles.brandTitle}>Travel.....</Text>
                <Text style={styles.brandSub}>BUSES</Text>
              </View>
            </TouchableOpacity>
            <View style={[styles.topLinks, !tablet && styles.wrap]}>
              {topLinks.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.topLink, item.active && styles.topLinkOn]}
                  onPress={item.onPress}
                  disabled={!item.onPress}
                  activeOpacity={0.88}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={item.active ? "#173f7b" : "#47658d"}
                  />
                  <Text
                    style={[
                      styles.topLinkText,
                      item.active && styles.topLinkTextOn,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.profile}>
                <Ionicons name="person-outline" size={20} color="#284875" />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View
              style={[
                styles.summary,
                !wide && styles.wrap,
                compact && styles.column,
              ]}
            >
              <View style={styles.block}>
                <Text style={styles.small}>From</Text>
                <Text style={styles.big}>{source}</Text>
              </View>
              <TouchableOpacity
                style={styles.swap}
                onPress={swap}
                activeOpacity={0.88}
              >
                <Ionicons name="swap-horizontal" size={18} color="#274777" />
              </TouchableOpacity>
              <View style={styles.block}>
                <Text style={styles.small}>To</Text>
                <Text style={styles.big}>{destination}</Text>
              </View>
              <View style={styles.block}>
                <Text style={styles.small}>Date</Text>
                <Text style={styles.big}>{heroFmt(departureDate)}</Text>
              </View>
              <TouchableOpacity
                style={styles.modify}
                onPress={() => setShowEdit((v) => !v)}
                activeOpacity={0.9}
              >
                <Text style={styles.modifyText}>Modify Search</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showEdit && (
            <View style={styles.card}>
              <View
                style={[
                  styles.form,
                  !wide && styles.wrap,
                  compact && styles.column,
                ]}
              >
                <View style={styles.field}>
                  <Text style={styles.label}>Source</Text>
                  <TextInput
                    value={source}
                    onChangeText={setSource}
                    placeholder="Enter source"
                    placeholderTextColor="#8ea1bf"
                    style={styles.input}
                  />
                </View>
                <TouchableOpacity
                  style={styles.swapMini}
                  onPress={swap}
                  activeOpacity={0.88}
                >
                  <Ionicons name="swap-horizontal" size={18} color="#2b5fb3" />
                </TouchableOpacity>
                <View style={styles.field}>
                  <Text style={styles.label}>Destination</Text>
                  <TextInput
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="Enter destination"
                    placeholderTextColor="#8ea1bf"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Departure Date</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={openDate}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.dateBtnText}>{fmt(departureDate)}</Text>
                    <Feather name="calendar" size={16} color="#5b6f93" />
                  </TouchableOpacity>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Trip Type</Text>
                  <View style={styles.picker}>
                    <Picker
                      selectedValue={tripType}
                      onValueChange={(v) => setTripType(v)}
                    >
                      {trips.map((item) => (
                        <Picker.Item
                          key={item.value}
                          label={item.label}
                          value={item.value}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.btnAlt}
                  onPress={() => setShowEdit(false)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.btnAltText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={applySearch}
                  activeOpacity={0.9}
                >
                  <Text style={styles.btnText}>Apply Search</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.banner}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#1e63c8"
            />
            <Text style={styles.bannerText}>
              Live bus inventory is not connected yet. This layout is ready for
              search results integration.
            </Text>
          </View>

          <View style={[styles.layout, !tablet && styles.column]}>
            <View style={[styles.filters, !tablet && styles.fullWidth]}>
              <View style={styles.filtersHead}>
                <View style={styles.filtersTitleWrap}>
                  <Feather name="filter" size={14} color="#fff" />
                  <Text style={styles.filtersTitle}>FILTERS</Text>
                </View>
                <TouchableOpacity onPress={resetFilters} activeOpacity={0.88}>
                  <Text style={styles.reset}>Reset</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.filterCard}>
                <Text style={styles.section}>INR Price Range</Text>
                <View style={styles.rangeLabels}>
                  <Text style={styles.note}>INR 0</Text>
                  <Text style={styles.note}>INR 0</Text>
                </View>
                <View style={styles.range}>
                  <View style={styles.thumb} />
                </View>
                <View style={styles.range}>
                  <View style={styles.thumb} />
                </View>
              </View>

              <View style={styles.filterCard}>
                <Text style={styles.section}>Bus Type</Text>
                <View style={styles.grid}>
                  {busTypes.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      active={typeFilters.includes(item)}
                      onPress={() => setTypeFilters((v) => toggle(v, item))}
                      style={styles.gridChip}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.filterCard}>
                <Text style={styles.section}>Departure Time</Text>
                <View style={styles.grid}>
                  {timeBands.map((item) => (
                    <TouchableOpacity
                      key={`d-${item.value}`}
                      style={[
                        styles.timeChip,
                        departureFilters.includes(item.value) &&
                          styles.timeChipOn,
                      ]}
                      onPress={() =>
                        setDepartureFilters((v) => toggle(v, item.value))
                      }
                      activeOpacity={0.88}
                    >
                      <Ionicons
                        name={item.icon}
                        size={15}
                        color="#fff"
                        style={styles.timeIcon}
                      />
                      <Text style={styles.timeText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterCard}>
                <Text style={styles.section}>Arrival Time</Text>
                <View style={styles.grid}>
                  {timeBands.map((item) => (
                    <TouchableOpacity
                      key={`a-${item.value}`}
                      style={[
                        styles.timeChip,
                        arrivalFilters.includes(item.value) &&
                          styles.timeChipOn,
                      ]}
                      onPress={() =>
                        setArrivalFilters((v) => toggle(v, item.value))
                      }
                      activeOpacity={0.88}
                    >
                      <Ionicons
                        name={item.icon}
                        size={15}
                        color="#fff"
                        style={styles.timeIcon}
                      />
                      <Text style={styles.timeText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterCard}>
                <Text style={styles.section}>Boarding Points</Text>
                <View style={styles.searchRow}>
                  <Ionicons name="search-outline" size={16} color="#6b82a7" />
                  <TextInput
                    value={boardingPoint}
                    onChangeText={setBoardingPoint}
                    placeholder="Choose Boarding Point"
                    placeholderTextColor="#91a5c4"
                    style={styles.searchInput}
                  />
                </View>
              </View>
              <View style={styles.filterCard}>
                <Text style={styles.section}>Dropping Point</Text>
                <View style={styles.searchRow}>
                  <Ionicons name="search-outline" size={16} color="#6b82a7" />
                  <TextInput
                    value={droppingPoint}
                    onChangeText={setDroppingPoint}
                    placeholder="Choose Dropping Point"
                    placeholderTextColor="#91a5c4"
                    style={styles.searchInput}
                  />
                </View>
              </View>
              <View style={styles.filterCard}>
                <Text style={styles.section}>Travels</Text>
                <View style={styles.searchRow}>
                  <Ionicons name="search-outline" size={16} color="#6b82a7" />
                  <TextInput
                    value={travelName}
                    onChangeText={setTravelName}
                    placeholder="Choose Travel Name"
                    placeholderTextColor="#91a5c4"
                    style={styles.searchInput}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.results, !tablet && styles.fullWidth]}>
              <View style={[styles.sortBar, !tablet && styles.sortStack]}>
                <View style={styles.sortCount}>
                  <MaterialCommunityIcons
                    name="bus-marker"
                    size={18}
                    color="#274777"
                  />
                  <Text style={styles.sortCountText}>0 Buses found</Text>
                </View>
                <View style={styles.sortWrap}>
                  <Text style={styles.sortLabel}>SORT BY:</Text>
                  <View style={styles.sortChips}>
                    {sorts.map((item) => (
                      <Chip
                        key={item.value}
                        label={item.label}
                        active={sortBy === item.value}
                        onPress={() => setSortBy(item.value)}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
                    color="#2b66ba"
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  No buses match the selected filters.
                </Text>
                <Text style={styles.emptyText}>
                  Once your bus API is connected, matching services will appear
                  here with timings, prices, seats, and operator details.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <RedDatePickerModal
        visible={showDate}
        value={departureDate}
        minimumDate={new Date()}
        onConfirm={(selectedDate) => {
          const next = normalize(selectedDate);
          setDepartureDate(next);
          setDraftDate(next);
          setShowDate(false);
        }}
        onCancel={() => setShowDate(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#eef4fe" },
  content: { padding: 18, paddingBottom: 30 },
  page: { width: "100%", maxWidth: 1360, alignSelf: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#d7e3f6",
  },
  stack: { flexDirection: "column", alignItems: "stretch" },
  column: { flexDirection: "column" },
  wrap: { flexWrap: "wrap" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2b66ba",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { color: "#20488d", fontSize: 28, fontWeight: "900" },
  brandSub: {
    color: "#5f7394",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  topLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  topLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#f4f8ff",
    borderWidth: 1,
    borderColor: "#d8e4f7",
  },
  topLinkOn: { backgroundColor: "#e4efff", borderColor: "#b8cef3" },
  topLinkText: { color: "#47658d", fontSize: 12, fontWeight: "700" },
  topLinkTextOn: { color: "#173f7b" },
  profile: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8e4f7",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    marginTop: 14,
    padding: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#d7e3f6",
  },
  summary: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d1def3",
    backgroundColor: "#fff",
  },
  block: {
    flex: 1,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#dbe5f6",
  },
  small: {
    color: "#506c93",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  big: { marginTop: 4, color: "#173f7b", fontSize: 19, fontWeight: "800" },
  swap: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fbff",
    borderRightWidth: 1,
    borderRightColor: "#dbe5f6",
  },
  modify: {
    minWidth: 138,
    paddingHorizontal: 20,
    backgroundColor: "#173f7b",
    alignItems: "center",
    justifyContent: "center",
  },
  modifyText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  form: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  field: { flex: 1, minWidth: 180 },
  label: {
    marginBottom: 8,
    color: "#4f6d95",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c7d8f3",
    paddingHorizontal: 14,
    color: "#173f7b",
    fontSize: 15,
    fontWeight: "700",
  },
  swapMini: {
    width: 46,
    height: 46,
    borderRadius: 12,
    marginBottom: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6f9ff",
    borderWidth: 1,
    borderColor: "#c7d8f3",
  },
  dateBtn: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c7d8f3",
  },
  dateBtnText: { color: "#173f7b", fontSize: 15, fontWeight: "700" },
  picker: {
    minHeight: 50,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c7d8f3",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  btnAlt: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#bed0eb",
  },
  btnAltText: { color: "#274777", fontSize: 14, fontWeight: "800" },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#173f7b",
  },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  banner: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#f7fbff",
    borderWidth: 1,
    borderColor: "#c6dbfb",
    alignSelf: "flex-start",
  },
  bannerText: { color: "#26508d", fontSize: 12, fontWeight: "700" },
  layout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginTop: 14,
  },
  filters: { width: 290 },
  fullWidth: { width: "100%" },
  filtersHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#173f7b",
  },
  filtersTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  filtersTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  reset: { color: "#fff", fontSize: 13, fontWeight: "800" },
  filterCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#d5e2f6",
  },
  section: {
    color: "#173f7b",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
  },
  note: { color: "#355887", fontSize: 13, fontWeight: "700" },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  range: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#e3ebf9",
    marginBottom: 18,
    justifyContent: "center",
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#d7d7d7",
    borderWidth: 1,
    borderColor: "#b6bdd0",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f3f7ff",
    borderWidth: 1,
    borderColor: "#c6d8f4",
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: "#173f7b", borderColor: "#173f7b" },
  chipText: { color: "#2f4f7e", fontSize: 12, fontWeight: "800" },
  chipTextOn: { color: "#fff" },
  gridChip: { flex: 1 },
  timeChip: {
    minWidth: 96,
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#173f7b",
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipOn: { backgroundColor: "#2b66ba" },
  timeIcon: { marginBottom: 6 },
  timeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  searchRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c7d8f3",
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: "#173f7b",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 10,
  },
  results: { flex: 1, minWidth: 0 },
  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#d5e2f6",
  },
  sortStack: { flexDirection: "column", alignItems: "flex-start" },
  sortCount: { flexDirection: "row", alignItems: "center", gap: 8 },
  sortCountText: { color: "#274777", fontSize: 16, fontWeight: "800" },
  sortWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    flex: 1,
  },
  sortLabel: {
    color: "#4f6d95",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  sortChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  empty: {
    minHeight: 330,
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#c9dcfa",
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e8f0ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#3c5e90",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyText: {
    maxWidth: 520,
    marginTop: 10,
    color: "#6985ad",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(8,18,36,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 720,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#fff",
  },
  modalTitle: { color: "#163c73", fontSize: 24, fontWeight: "800" },
  modalSub: {
    marginTop: 6,
    marginBottom: 16,
    color: "#607da8",
    fontSize: 15,
    fontWeight: "600",
  },
  pickers: { flexDirection: "row", gap: 12 },
  pickCol: { flex: 1 },
  pickLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#56759f",
    marginBottom: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  pickWrap: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d7e3f5",
    backgroundColor: "#f6f9ff",
  },
});
