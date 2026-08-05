import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Red Theme Colors matching PickNBook Bus Branding
const COLORS = {
  primaryRed: "#C62828",
  darkRed: "#8E0000",
  accentRed: "#E53935",
  lightRed: "#FFEBEE",
  textDark: "#212121",
  textSecondary: "#757575",
  white: "#FFFFFF",
  yearLightRed: "#FFCDD2",
  disabledText: "#CFCFCF",
  borderLight: "#F1F5F9",
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export const RedDatePickerModal = ({
  visible,
  value,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}) => {
  // Initial date normalization
  const selectedDateObj = useMemo(() => {
    const d = value ? new Date(value) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  // Local state for temporary picker selection before confirming OK
  const [tempSelectedDate, setTempSelectedDate] = useState(selectedDateObj);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1)
  );

  // Sync state when modal becomes visible or value changes
  useEffect(() => {
    if (visible) {
      const d = value ? new Date(value) : new Date();
      const validDate = isNaN(d.getTime()) ? new Date() : d;
      setTempSelectedDate(validDate);
      setCurrentMonth(new Date(validDate.getFullYear(), validDate.getMonth(), 1));
    }
  }, [visible, value]);

  // Entrance animation
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Date helper functions
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthName = useMemo(() => {
    return currentMonth.toLocaleString("en-US", { month: "long" });
  }, [currentMonth]);

  const formattedHeaderYear = tempSelectedDate.getFullYear();
  const formattedHeaderDate = useMemo(() => {
    return tempSelectedDate.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }, [tempSelectedDate]);

  // Calendar calculations (Monday start: M T W T F S S)
  const daysGrid = useMemo(() => {
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const startOffset = (firstDayIndex + 6) % 7; // Monday = 0, Tuesday = 1, ..., Sunday = 6

    const grid = [];

    // Lead-in empty days from previous month
    for (let i = 0; i < startOffset; i++) {
      grid.push({ type: "empty", key: `empty-${i}` });
    }

    // Days of current month
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateObj = new Date(year, month, day);
      dateObj.setHours(0, 0, 0, 0);

      const minObj = minimumDate ? new Date(minimumDate) : null;
      if (minObj) minObj.setHours(0, 0, 0, 0);

      const maxObj = maximumDate ? new Date(maximumDate) : null;
      if (maxObj) maxObj.setHours(23, 59, 59, 999);

      const isDisabled =
        (minObj && dateObj < minObj) || (maxObj && dateObj > maxObj);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = dateObj.getTime() === today.getTime();

      const tempSel = new Date(tempSelectedDate);
      tempSel.setHours(0, 0, 0, 0);
      const isSelected = dateObj.getTime() === tempSel.getTime();

      grid.push({
        type: "day",
        day,
        dateObj,
        isDisabled,
        isToday,
        isSelected,
        key: `day-${day}`,
      });
    }

    return grid;
  }, [year, month, tempSelectedDate, minimumDate, maximumDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const canGoPrev = useMemo(() => {
    if (!minimumDate) return true;
    const minObj = new Date(minimumDate);
    const prevMonthEnd = new Date(year, month, 0);
    return prevMonthEnd >= new Date(minObj.getFullYear(), minObj.getMonth(), 1);
  }, [minimumDate, year, month]);

  const handleDaySelect = (item) => {
    if (item.isDisabled || item.type !== "day") return;
    setTempSelectedDate(item.dateObj);
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm(tempSelectedDate);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <Animated.View
          style={[
            styles.dialogContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.headerYear}>{formattedHeaderYear}</Text>
            <Text style={styles.headerDate}>{formattedHeaderDate}</Text>
          </View>

          {/* Month Navigation Row */}
          <View style={styles.monthRow}>
            <Text style={styles.monthTitle}>
              {monthName} {year}
            </Text>

            <View style={styles.monthNavButtons}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                disabled={!canGoPrev}
                style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={canGoPrev ? COLORS.primaryRed : COLORS.disabledText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.navBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.primaryRed}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w, idx) => (
              <View key={idx} style={styles.weekdayCol}>
                <Text style={styles.weekdayText}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {daysGrid.map((item) => {
              if (item.type === "empty") {
                return <View key={item.key} style={styles.dayCol} />;
              }

              return (
                <View key={item.key} style={styles.dayCol}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={item.isDisabled}
                    onPress={() => handleDaySelect(item)}
                    style={[
                      styles.dayCircle,
                      item.isToday && !item.isSelected && styles.todayCircle,
                      item.isSelected && styles.selectedCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        item.isDisabled && styles.disabledDayText,
                        item.isToday && !item.isSelected && styles.todayText,
                        item.isSelected && styles.selectedDayText,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onCancel}
              style={styles.actionBtn}
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleConfirm}
              style={styles.actionBtn}
            >
              <Text style={styles.okText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.52)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  dialogContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  header: {
    backgroundColor: COLORS.primaryRed,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerYear: {
    color: COLORS.yearLightRed,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  headerDate: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  monthTitle: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: "700",
  },
  monthNavButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navBtn: {
    padding: 6,
    borderRadius: 20,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginVertical: 6,
  },
  weekdayCol: {
    flex: 1,
    alignItems: "center",
  },
  weekdayText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  dayCol: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  todayCircle: {
    borderWidth: 1.5,
    borderColor: COLORS.accentRed,
  },
  selectedCircle: {
    backgroundColor: COLORS.primaryRed,
    elevation: 4,
    shadowColor: COLORS.darkRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dayText: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: "500",
  },
  todayText: {
    color: COLORS.primaryRed,
    fontWeight: "700",
  },
  selectedDayText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  disabledDayText: {
    color: COLORS.disabledText,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  okText: {
    color: COLORS.primaryRed,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

export default RedDatePickerModal;
