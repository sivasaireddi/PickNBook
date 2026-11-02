import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { searchCities } from "../../../services/busService";
import { createBusSearchNavigationParams } from "../../../utils/busSearchParams";
import {
  flattenBusLocationResults,
  normalizeBusLocationResults,
} from "../../../utils/busLocationResults";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DATE_WINDOW_SIZE = 10;

const getNormalizedDate = (value) => {
  const parsedDate = value ? new Date(value) : new Date();

  if (Number.isNaN(parsedDate.getTime())) {
    const today = new Date();

    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
  );
};

const addDays = (value, offset) => {
  const nextDate = getNormalizedDate(value);

  nextDate.setDate(nextDate.getDate() + offset);

  return getNormalizedDate(nextDate);
};

const buildDateOptions = (startDate) =>
  Array.from({ length: DATE_WINDOW_SIZE }, (_, index) =>
    addDays(startDate, index),
  );

const isSameDay = (left, right) =>
  getNormalizedDate(left).getTime() === getNormalizedDate(right).getTime();

const formatHeaderDate = (value) =>
  getNormalizedDate(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatMonthLabel = (value) =>
  getNormalizedDate(value)
    .toLocaleDateString("en-US", {
      month: "short",
    })
    .toUpperCase();

const formatWeekdayLabel = (value) =>
  getNormalizedDate(value).toLocaleDateString("en-US", {
    weekday: "short",
  });

const formatDayNumber = (value) =>
  String(getNormalizedDate(value).getDate()).padStart(2, "0");



const EditorModal = ({
  from,
  to,
  baseDate,
  selectedDate,
  onPressFrom,
  onPressTo,
  onSelectDate,
  activeLocationField,
  locationQuery,
  locationResults,
  locationLoading,
  locationError,
  onLocationQueryChange,
  onSelectLocation,
  onSwap,
  onApply,
  onClose,
}) => {
  const translateY = useSharedValue(-28);
  const opacity = useSharedValue(0);
  const dateOptions = useMemo(
    () => buildDateOptions(baseDate),
    [baseDate],
  );

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 240 });
    opacity.value = withTiming(1, { duration: 220 });
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, animatedStyle]}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.editorWrap}>
        <Text style={styles.editorTitle}>Search for Buses</Text>

        <View style={styles.editorCard}>
          <View style={[styles.fieldWrapper, { zIndex: 20 }]}>
            <Pressable style={styles.inputRow} onPress={onPressFrom}>
              <Ionicons name="radio-button-on" size={20} color="#D11A2A" style={styles.locationIcon} />

              <Text style={[styles.locationInput, !from.cityName && { color: "#9ca3af" }]}>
                {from.cityName || "From city"}
              </Text>
            </Pressable>
          </View>

          <TouchableOpacity
            style={styles.swapButton}
            onPress={onSwap}
            activeOpacity={0.88}
          >
            <Ionicons name="swap-vertical" size={16} color="#D11A2A" />
            <Text style={styles.swapButtonText}>Swap</Text>
          </TouchableOpacity>

          <View style={[styles.fieldWrapper, { zIndex: 10 }]}>
            <Pressable style={styles.inputRow} onPress={onPressTo}>
              <Ionicons
                name="location"
                size={22}
                color="#D11A2A"
                style={styles.locationIcon}
              />

              <Text style={[styles.locationInput, !to.cityName && { color: "#9ca3af" }]}>
                {to.cityName || "To city"}
              </Text>
            </Pressable>
          </View>

          {activeLocationField ? (
            <View style={styles.locationPickerPanel}>
              <View style={styles.locationSearchRow}>
                <Ionicons name="search" size={18} color="#64748B" />
                <TextInput
                  autoFocus
                  value={locationQuery}
                  onChangeText={onLocationQueryChange}
                  placeholder={activeLocationField === "from" ? "Search From city" : "Search To city"}
                  placeholderTextColor="#94A3B8"
                  style={styles.locationSearchInput}
                />
                {locationLoading ? <ActivityIndicator size="small" color="#D11A2A" /> : null}
              </View>
              {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.locationResults} nestedScrollEnabled>
                {locationResults.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.locationResultRow}
                    onPress={() => onSelectLocation(item.payload)}
                  >
                    <Ionicons
                      name={item.kind === "city" ? "business-outline" : "location-outline"}
                      size={18}
                      color="#D11A2A"
                    />
                    <View style={styles.locationResultText}>
                      <Text style={styles.locationResultTitle}>{item.title}</Text>
                      {item.subtitle ? <Text style={styles.locationResultSubtitle}>{item.subtitle}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.dateRow}>
            <View style={styles.monthBlock}>
              <Text style={styles.monthText}>{formatMonthLabel(selectedDate)}</Text>
              <Text style={styles.yearText}>
                {getNormalizedDate(selectedDate).getFullYear()}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScrollContent}
            >
              {dateOptions.map((item) => {
                const active = isSameDay(item, selectedDate);

                return (
                  <TouchableOpacity
                    key={item.toISOString()}
                    style={[styles.dateChip, active && styles.activeDateChip]}
                    onPress={() => onSelectDate(item)}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[
                        styles.dateChipNumber,
                        active && styles.activeDateChipText,
                      ]}
                    >
                      {formatDayNumber(item)}
                    </Text>

                    <Text
                      style={[
                        styles.dateChipLabel,
                        active && styles.activeDateChipText,
                      ]}
                    >
                      {formatWeekdayLabel(item)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={onApply}
            activeOpacity={0.9}
          >
            <Text style={styles.searchButtonText}>Search Buses</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default function RouteHeader({
  route,
  from: fromProp,
  to: toProp,
  date: dateProp,
  dateValue: dateValueProp,
  onSearchApplied,
}) {
  const navigation = useNavigation();

  const getCityName = (val) => (val && typeof val === "object" ? (val.cityName || val.name) : String(val || ""));
  const from = getCityName(fromProp ?? route?.params?.from ?? "");
  const to = getCityName(toProp ?? route?.params?.to ?? "");
  const journeyDate = useMemo(
    () => getNormalizedDate(dateValueProp ?? route?.params?.dateValue ?? dateProp),
    [dateProp, dateValueProp, route?.params?.dateValue],
  );

  const normalizeCity = (val) => {
    if (val && typeof val === "object") {
      const cityName = val.cityName || val.name || val.city || "";
      return {
        cityId: val.cityId || val.cityCode || val.code || val.id || "",
        cityName,
        label: val.label || cityName,
        stateName: val.stateName || val.state || "",
      };
    }
    return {
      cityId: "",
      cityName: String(val || ""),
      label: String(val || ""),
      stateName: "",
    };
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [draftFrom, setDraftFrom] = useState(() => normalizeCity(fromProp ?? route?.params?.from));
  const [draftTo, setDraftTo] = useState(() => normalizeCity(toProp ?? route?.params?.to));
  const [selectedDate, setSelectedDate] = useState(journeyDate);
  const [activeLocationField, setActiveLocationField] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationSearchSequence = useRef(0);

  useEffect(() => {
    if (!activeLocationField || !locationQuery.trim()) {
      setLocationResults([]);
      setLocationLoading(false);
      setLocationError("");
      return undefined;
    }

    const requestId = ++locationSearchSequence.current;
    const timeoutId = setTimeout(async () => {
      setLocationLoading(true);
      setLocationError("");
      try {
        const results = await searchCities(locationQuery.trim(), { throwOnError: true });
        if (requestId !== locationSearchSequence.current) return;
        setLocationResults(flattenBusLocationResults(normalizeBusLocationResults(results), 8));
      } catch {
        if (requestId !== locationSearchSequence.current) return;
        setLocationResults([]);
        setLocationError("Unable to load places. Try again.");
      } finally {
        if (requestId === locationSearchSequence.current) setLocationLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [activeLocationField, locationQuery]);

  useEffect(() => {
    if (isExpanded) {
      return;
    }

    setDraftFrom(normalizeCity(fromProp ?? route?.params?.from));
    setDraftTo(normalizeCity(toProp ?? route?.params?.to));
    setSelectedDate(journeyDate);
  }, [fromProp, route?.params?.from, toProp, route?.params?.to, journeyDate, isExpanded]);

  const openEditor = () => {
    setDraftFrom(normalizeCity(fromProp ?? route?.params?.from));
    setDraftTo(normalizeCity(toProp ?? route?.params?.to));
    setSelectedDate(journeyDate);
    setActiveLocationField(null);
    setLocationQuery("");
    setLocationResults([]);
    setIsExpanded(true);
  };



  const handleSwap = () => {
    const nextFrom = draftTo;
    const nextTo = draftFrom;
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
  };

  const handleApply = () => {
    if (!draftFrom.cityId) {
      Alert.alert("Validation Error", "Please select a valid From city from the suggestions.");
      return;
    }
    if (!draftTo.cityId) {
      Alert.alert("Validation Error", "Please select a valid To city from the suggestions.");
      return;
    }

    if (draftFrom.cityId === draftTo.cityId) {
      Alert.alert(
        "Invalid route",
        "Source and destination must be different.",
      );
      return;
    }
    if (!selectedDate || Number.isNaN(new Date(selectedDate).getTime())) {
      Alert.alert("Validation Error", "Please select a valid travel date.");
      return;
    }

    navigation.setParams(createBusSearchNavigationParams({
      from: draftFrom,
      to: draftTo,
      date: selectedDate,
    }));

    onSearchApplied?.();
    setIsExpanded(false);
  };

  const openLocationPicker = (field) => {
    const current = field === "from" ? draftFrom : draftTo;
    setActiveLocationField(field);
    setLocationQuery(current.cityName || "");
    setLocationResults([]);
    setLocationError("");
  };

  const handleSelectLocation = (selection) => {
    const normalized = normalizeCity(selection);
    if (activeLocationField === "from") setDraftFrom(normalized);
    if (activeLocationField === "to") setDraftTo(normalized);
    setActiveLocationField(null);
    setLocationQuery("");
    setLocationResults([]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.routeBox}
          onPress={openEditor}
          activeOpacity={0.9}
        >
          <View style={styles.routeTitleRow}>
            <Text style={styles.routeText} numberOfLines={1}>{from || "From"}</Text>
            <Ionicons name="arrow-forward" size={14} color="#64748B" />
            <Text style={[styles.routeText, styles.routeTextRight]} numberOfLines={1}>{to || "To"}</Text>
          </View>
          <Text style={styles.routeDate}>{formatHeaderDate(journeyDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={openEditor}
          activeOpacity={0.88}
        >
          <MaterialIcons name="edit" size={22} color="#D11A2A" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isExpanded}
        transparent
        animationType="none"
        onRequestClose={() => setIsExpanded(false)}
      >
        <EditorModal
          from={draftFrom}
          to={draftTo}
          baseDate={journeyDate}
          selectedDate={selectedDate}
          onPressFrom={() => openLocationPicker("from")}
          onPressTo={() => openLocationPicker("to")}
          activeLocationField={activeLocationField}
          locationQuery={locationQuery}
          locationResults={locationResults}
          locationLoading={locationLoading}
          locationError={locationError}
          onLocationQueryChange={setLocationQuery}
          onSelectLocation={handleSelectLocation}
          onSelectDate={setSelectedDate}
          onSwap={handleSwap}
          onApply={handleApply}
          onClose={() => setIsExpanded(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#f7f8fb",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  routeBox: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  routeText: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  routeTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  routeTextRight: { textAlign: "right" },
  routeDate: {
    marginTop: 1,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "500",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.55)",
  },
  editorWrap: {
    paddingHorizontal: 16,
  },
  editorTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  editorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
  },
  locationIcon: {
    width: 26,
    marginRight: 10,
    textAlign: "center",
  },
  locationInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#ececec",
  },
  swapButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginVertical: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff5f5",
  },
  swapButtonText: {
    color: "#D11A2A",
    fontSize: 12,
    fontWeight: "600",
  },
  locationPickerPanel: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  locationSearchRow: {
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
  },
  locationSearchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    paddingVertical: 10,
  },
  locationResults: {
    maxHeight: 180,
  },
  locationResultRow: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
  },
  locationResultText: {
    flex: 1,
    marginLeft: 10,
  },
  locationResultTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  locationResultSubtitle: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 11,
  },
  locationError: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#B91C1C",
    fontSize: 12,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  monthBlock: {
    width: 52,
    marginRight: 10,
  },
  monthText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
  },
  yearText: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "500",
  },
  dateScrollContent: {
    paddingRight: 8,
  },
  dateChip: {
    width: 64,
    marginRight: 8,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDateChip: {
    backgroundColor: "#D11A2A",
  },
  dateChipNumber: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  dateChipLabel: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "500",
  },
  activeDateChipText: {
    color: "#ffffff",
  },
  searchButton: {
    marginTop: 16,
    backgroundColor: "#D11A2A",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  searchButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
