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

const SuggestionsDropdown = ({ visible, items, loading, onSelect, query = "" }) => {
  if (!visible || query.trim().length < 2) return null;
  return (
    <View style={styles.dropdown}>
      {loading ? (
        <View style={styles.dropdownStatus}>
          <ActivityIndicator size="small" color="#eb5a51" />
          <Text style={styles.dropdownStatusText}>Searching cities...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.dropdownStatus}>
          <Text style={styles.dropdownStatusText}>No cities found</Text>
        </View>
      ) : (
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {items.map((item, index) => {
            const cityName = item && typeof item === "object" ? item.cityName : String(item);
            const stateName = item && typeof item === "object" ? item.stateName : "";
            const key = item && typeof item === "object" ? item.cityId : index;
            return (
              <Pressable
                key={`${key}-${index}`}
                onPress={() => onSelect(item)}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  index === items.length - 1 && styles.dropdownItemLast,
                  pressed && styles.dropdownItemPressed,
                ]}
              >
                <Ionicons name="location-outline" size={18} color="#6b7280" />
                <View style={styles.dropdownItemTextContainer}>
                  <Text style={styles.dropdownText}>{cityName}</Text>
                  {stateName ? <Text style={styles.dropdownSubtext}>{stateName}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const EditorModal = ({
  from,
  to,
  baseDate,
  selectedDate,
  onChangeFromText,
  onChangeToText,
  onSelectFrom,
  onSelectTo,
  fromPlaces,
  toPlaces,
  showFromSuggestions,
  showToSuggestions,
  loadingFrom,
  loadingTo,
  onSelectDate,
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
            <View style={styles.inputRow}>
              <View style={styles.iconBubble}>
                <Text style={styles.iconBubbleText}>A</Text>
              </View>

              <TextInput
                style={styles.locationInput}
                placeholder="From city"
                placeholderTextColor="#9ca3af"
                value={from.cityName}
                onChangeText={onChangeFromText}
              />
            </View>
            <SuggestionsDropdown
              visible={showFromSuggestions}
              items={fromPlaces}
              loading={loadingFrom}
              onSelect={onSelectFrom}
              query={from.cityName}
            />
          </View>

          <View style={styles.divider} />

          <View style={[styles.fieldWrapper, { zIndex: 10 }]}>
            <View style={styles.inputRow}>
              <Ionicons
                name="location"
                size={22}
                color="#D11A2A"
                style={styles.locationPin}
              />

              <TextInput
                style={styles.locationInput}
                placeholder="To city"
                placeholderTextColor="#9ca3af"
                value={to.cityName}
                onChangeText={onChangeToText}
              />
            </View>
            <SuggestionsDropdown
              visible={showToSuggestions}
              items={toPlaces}
              loading={loadingTo}
              onSelect={onSelectTo}
              query={to.cityName}
            />
          </View>

          <TouchableOpacity
            style={styles.swapButton}
            onPress={onSwap}
            activeOpacity={0.88}
          >
            <Ionicons name="swap-vertical" size={16} color="#ef4444" />
            <Text style={styles.swapButtonText}>Swap</Text>
          </TouchableOpacity>

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
      return {
        cityId: val.cityId || val.code || "",
        cityName: val.cityName || val.name || "",
        stateName: val.stateName || val.state || "",
      };
    }
    return {
      cityId: "",
      cityName: String(val || ""),
      stateName: "",
    };
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [draftFrom, setDraftFrom] = useState(() => normalizeCity(fromProp ?? route?.params?.from));
  const [draftTo, setDraftTo] = useState(() => normalizeCity(toProp ?? route?.params?.to));
  const [selectedDate, setSelectedDate] = useState(journeyDate);

  const [fromPlaces, setFromPlaces] = useState([]);
  const [toPlaces, setToPlaces] = useState([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);

  const suggestionTimers = useRef({ from: null, to: null });
  const requestIds = useRef({ from: 0, to: 0 });

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
    setIsExpanded(true);
  };

  const fetchPlaceSuggestions = async (query, field) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      requestIds.current[field] += 1;
      if (field === "from") setFromPlaces([]);
      else setToPlaces([]);
      return;
    }
    const requestId = requestIds.current[field] + 1;
    requestIds.current[field] = requestId;
    try {
      const data = await searchCities(trimmedQuery);
      if (requestIds.current[field] !== requestId) return;
      
      const suggestions = Array.isArray(data)
        ? data.map((item) => ({
            cityId: String(item?.cityId || item?.code || "").trim(),
            cityName: String(item?.cityName || item?.name || "").trim(),
            stateName: String(item?.stateName || item?.state || "").trim(),
          })).filter((item) => item.cityName && item.cityId)
        : [];

      // Ensure unique suggestions
      const seen = new Set();
      const uniqueSuggestions = [];
      suggestions.forEach((item) => {
        const key = `${item.cityName}-${item.cityId}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSuggestions.push(item);
        }
      });

      if (field === "from") setFromPlaces(uniqueSuggestions);
      else setToPlaces(uniqueSuggestions);
    } catch {
      if (requestIds.current[field] !== requestId) return;
      if (field === "from") setFromPlaces([]);
      else setToPlaces([]);
    } finally {
      if (requestIds.current[field] === requestId) {
        if (field === "from") setLoadingFrom(false);
        else setLoadingTo(false);
      }
    }
  };

  const schedulePlaceSuggestions = (query, field) => {
    const timerRef = suggestionTimers.current[field];
    if (timerRef) clearTimeout(timerRef);
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      if (field === "from") {
        setFromPlaces([]);
        setShowFromSuggestions(false);
        setLoadingFrom(false);
      } else {
        setToPlaces([]);
        setShowToSuggestions(false);
        setLoadingTo(false);
      }
      return;
    }

    if (field === "from") setLoadingFrom(true);
    else setLoadingTo(true);

    suggestionTimers.current[field] = setTimeout(() => {
      suggestionTimers.current[field] = null;
      fetchPlaceSuggestions(trimmedQuery, field);
    }, 400);
  };

  const handleSwap = () => {
    const nextFrom = draftTo;
    const nextTo = draftFrom;
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    setShowFromSuggestions(false);
    setShowToSuggestions(false);
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

    navigation.setParams({
      from: draftFrom,
      to: draftTo,
      date: formatHeaderDate(selectedDate),
      dateValue: selectedDate.toISOString(),
    });

    setIsExpanded(false);
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
          <Text style={styles.routeText}>{`${from || "From"} -> ${to || "To"}`}</Text>
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
          onChangeFromText={(text) => {
            setDraftFrom({ cityId: "", cityName: text, stateName: "" });
            setShowFromSuggestions(true);
            setShowToSuggestions(false);
            schedulePlaceSuggestions(text, "from");
          }}
          onChangeToText={(text) => {
            setDraftTo({ cityId: "", cityName: text, stateName: "" });
            setShowToSuggestions(true);
            setShowFromSuggestions(false);
            schedulePlaceSuggestions(text, "to");
          }}
          onSelectFrom={(city) => {
            setDraftFrom(city);
            setShowFromSuggestions(false);
          }}
          onSelectTo={(city) => {
            setDraftTo(city);
            setShowToSuggestions(false);
          }}
          fromPlaces={fromPlaces}
          toPlaces={toPlaces}
          showFromSuggestions={showFromSuggestions}
          showToSuggestions={showToSuggestions}
          loadingFrom={loadingFrom}
          loadingTo={loadingTo}
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
    paddingVertical: 8,
  },
  routeText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  routeDate: {
    marginTop: 1,
    color: "#6b7280",
    fontSize: 12,
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
    paddingTop: 110,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
  },
  editorWrap: {
    paddingHorizontal: 16,
  },
  editorTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 14,
  },
  editorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    marginRight: 12,
  },
  iconBubbleText: {
    color: "#D11A2A",
    fontSize: 14,
    fontWeight: "800",
  },
  locationPin: {
    width: 28,
    marginRight: 12,
    textAlign: "center",
  },
  locationInput: {
    flex: 1,
    color: "#111827",
    fontSize: 17,
    fontWeight: "700",
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#ececec",
  },
  swapButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff5f5",
  },
  swapButtonText: {
    color: "#D11A2A",
    fontSize: 13,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  monthBlock: {
    width: 58,
    marginRight: 12,
  },
  monthText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  yearText: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "500",
  },
  dateScrollContent: {
    paddingRight: 8,
  },
  dateChip: {
    width: 76,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDateChip: {
    backgroundColor: "#D11A2A",
  },
  dateChipNumber: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  dateChipLabel: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  activeDateChipText: {
    color: "#ffffff",
  },
  searchButton: {
    marginTop: 22,
    backgroundColor: "#D11A2A",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  searchButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  fieldWrapper: {
    position: "relative",
  },
  dropdown: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    maxHeight: 180,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 6,
    zIndex: 99,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  dropdownStatusText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemPressed: {
    backgroundColor: "#f9fafb",
  },
  dropdownItemTextContainer: {
    flex: 1,
    flexDirection: "column",
  },
  dropdownText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
  },
  dropdownSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    fontWeight: "400",
  },
});
