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



const EditorModal = ({
  from,
  to,
  baseDate,
  selectedDate,
  onPressFrom,
  onPressTo,
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
            <Pressable style={styles.inputRow} onPress={onPressFrom}>
              <View style={styles.iconBubble}>
                <Text style={styles.iconBubbleText}>A</Text>
              </View>

              <Text style={[styles.locationInput, !from.cityName && { color: "#9ca3af" }]}>
                {from.cityName || "From city"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={[styles.fieldWrapper, { zIndex: 10 }]}>
            <Pressable style={styles.inputRow} onPress={onPressTo}>
              <Ionicons
                name="location"
                size={22}
                color="#D11A2A"
                style={styles.locationPin}
              />

              <Text style={[styles.locationInput, !to.cityName && { color: "#9ca3af" }]}>
                {to.cityName || "To city"}
              </Text>
            </Pressable>
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
          onPressFrom={() => {
            navigation.navigate("BusLocationSearchScreen", {
              type: "from",
              currentValue: draftFrom.cityName,
              onSelect: (city) => setDraftFrom(city)
            });
          }}
          onPressTo={() => {
            navigation.navigate("BusLocationSearchScreen", {
              type: "to",
              currentValue: draftTo.cityName,
              onSelect: (city) => setDraftTo(city)
            });
          }}
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
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
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
  iconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    marginRight: 10,
  },
  iconBubbleText: {
    color: "#D11A2A",
    fontSize: 12,
    fontWeight: "700",
  },
  locationPin: {
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
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    marginBottom: 8,
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
