import React, { useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../utils/flightUtils";

const PRIMARY_RED = "#E11D2E";
const PRIMARY_RED_DARK = "#B3121F";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

const STOPS_OPTIONS = [
  { id: "nonstop", label: "Non-stop" },
  { id: "1stop", label: "1 Stop" },
  { id: "2plus", label: "2+ Stops" },
];

const TIME_OPTIONS = [
  { id: "early_morning", label: "Early", icon: "partly-sunny-outline" },
  { id: "morning", label: "Morning", icon: "sunny-outline" },
  { id: "afternoon", label: "Afternoon", icon: "cloudy-outline" },
  { id: "evening", label: "Evening", icon: "moon-outline" },
];

const BAGGAGE_OPTIONS = [
  { id: "checkin", label: "Check-in baggage" },
  { id: "15kg", label: "15 KG or more" },
  { id: "20kg", label: "20 KG or more" },
];

export default function FilterSheet({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  minPrice = 0,
  maxPrice = 50000,
  minDuration = 0,
  maxDuration = 1440,
  availableAirlines = [],
  availableCabinClasses = [],
}) {
  const [selectedStops, setSelectedStops] = useState([]);
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState(maxPrice);
  const [selectedDepTime, setSelectedDepTime] = useState([]);
  const [selectedArrTime, setSelectedArrTime] = useState([]);
  const [isRefundable, setIsRefundable] = useState(false);
  const [selectedMaxDuration, setSelectedMaxDuration] = useState(maxDuration);
  const [selectedBaggage, setSelectedBaggage] = useState([]);
  const [selectedCabinClasses, setSelectedCabinClasses] = useState([]);

  useEffect(() => {
    if (visible) {
      setSelectedStops(filters.stops || []);
      setSelectedAirlines(filters.airlines || []);
      setSelectedMaxPrice(filters.priceRange?.[1] ?? maxPrice);
      setSelectedDepTime(filters.departureTime || []);
      setSelectedArrTime(filters.arrivalTime || []);
      setIsRefundable(filters.isRefundable || false);
      setSelectedMaxDuration(filters.durationMax ?? maxDuration);
      setSelectedBaggage(filters.baggage || []);
      setSelectedCabinClasses(filters.cabinClass || []);
    }
  }, [filters, maxPrice, maxDuration, visible]);

  const toggleArrayItem = (setter, id) => {
    setter((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleApply = () => {
    onApplyFilters({
      stops: selectedStops,
      airlines: selectedAirlines,
      priceRange: [minPrice, selectedMaxPrice],
      departureTime: selectedDepTime,
      arrivalTime: selectedArrTime,
      isRefundable,
      durationMax: selectedMaxDuration,
      baggage: selectedBaggage,
      cabinClass: selectedCabinClasses,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedStops([]);
    setSelectedAirlines([]);
    setSelectedMaxPrice(maxPrice);
    setSelectedDepTime([]);
    setSelectedArrTime([]);
    setIsRefundable(false);
    setSelectedMaxDuration(maxDuration);
    setSelectedBaggage([]);
    setSelectedCabinClasses([]);
    onResetFilters();
    onClose();
  };

  const adjustPrice = (amount) => {
    setSelectedMaxPrice(prev => Math.min(Math.max(prev + amount, minPrice), maxPrice));
  };
  
  const adjustDuration = (amount) => {
    setSelectedMaxDuration(prev => Math.min(Math.max(prev + amount, minDuration), maxDuration));
  };

  const formatDur = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const renderChip = (opt, isSelected, onPress) => (
    <TouchableOpacity
      key={opt.id}
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.checkboxChip, isSelected && styles.checkboxChipSelected]}
    >
      {opt.icon && <Ionicons name={opt.icon} size={14} color={isSelected ? PRIMARY_RED : TEXT_MUTED} />}
      <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{opt.label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Stops */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stops</Text>
              <View style={styles.chipRow}>
                {STOPS_OPTIONS.map((opt) => renderChip(opt, selectedStops.includes(opt.id), () => toggleArrayItem(setSelectedStops, opt.id)))}
              </View>
            </View>

            {/* Price */}
            <View style={styles.section}>
               <Text style={styles.sectionTitle}>Max Price Cap</Text>
               <View style={styles.adjustRow}>
                  <TouchableOpacity onPress={() => adjustPrice(-1000)} style={styles.adjustBtn}><Ionicons name="remove" size={20} /></TouchableOpacity>
                  <Text style={styles.priceValText}>{formatCurrency(selectedMaxPrice)}</Text>
                  <TouchableOpacity onPress={() => adjustPrice(1000)} style={styles.adjustBtn}><Ionicons name="add" size={20} /></TouchableOpacity>
               </View>
            </View>

            {/* Departure */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Departure</Text>
              <View style={styles.chipRow}>
                {TIME_OPTIONS.map((opt) => renderChip(opt, selectedDepTime.includes(opt.id), () => toggleArrayItem(setSelectedDepTime, opt.id)))}
              </View>
            </View>

            {/* Arrival */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Arrival</Text>
              <View style={styles.chipRow}>
                {TIME_OPTIONS.map((opt) => renderChip(opt, selectedArrTime.includes(opt.id), () => toggleArrayItem(setSelectedArrTime, opt.id)))}
              </View>
            </View>

            {/* Airlines */}
            {availableAirlines.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Airlines</Text>
                <View style={styles.airlineList}>
                  {availableAirlines.map((airline) => {
                    const isSelected = selectedAirlines.includes(airline.code);
                    return (
                      <TouchableOpacity
                        key={airline.code}
                        activeOpacity={0.8}
                        onPress={() => toggleArrayItem(setSelectedAirlines, airline.code)}
                        style={[styles.airlineRow, isSelected && styles.airlineRowSelected]}
                      >
                        <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={18} color={isSelected ? PRIMARY_RED : TEXT_MUTED} />
                        <Text style={[styles.airlineText, isSelected && styles.airlineTextSelected]}>
                          {airline.name} ({airline.code})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Refundability */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Refundability</Text>
              <TouchableOpacity
                 activeOpacity={0.8}
                 onPress={() => setIsRefundable(p => !p)}
                 style={[styles.airlineRow, isRefundable && styles.airlineRowSelected]}
              >
                <Ionicons name={isRefundable ? "checkbox" : "square-outline"} size={18} color={isRefundable ? PRIMARY_RED : TEXT_MUTED} />
                <Text style={[styles.airlineText, isRefundable && styles.airlineTextSelected]}>Refundable</Text>
              </TouchableOpacity>
            </View>

            {/* Duration */}
            <View style={styles.section}>
               <Text style={styles.sectionTitle}>Max Duration</Text>
               <View style={styles.adjustRow}>
                  <TouchableOpacity onPress={() => adjustDuration(-30)} style={styles.adjustBtn}><Ionicons name="remove" size={20} /></TouchableOpacity>
                  <Text style={styles.durationValText}>{formatDur(selectedMaxDuration)}</Text>
                  <TouchableOpacity onPress={() => adjustDuration(30)} style={styles.adjustBtn}><Ionicons name="add" size={20} /></TouchableOpacity>
               </View>
            </View>

            {/* Baggage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Baggage</Text>
              <View style={styles.chipRow}>
                {BAGGAGE_OPTIONS.map((opt) => renderChip(opt, selectedBaggage.includes(opt.id), () => toggleArrayItem(setSelectedBaggage, opt.id)))}
              </View>
            </View>
            
            {/* Cabin Class */}
            {availableCabinClasses.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cabin Class</Text>
                <View style={styles.chipRow}>
                  {availableCabinClasses.map((cc) => renderChip({id: cc, label: cc}, selectedCabinClasses.includes(cc), () => toggleArrayItem(setSelectedCabinClasses, cc)))}
                </View>
              </View>
            )}

          </ScrollView>

          <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Clear All</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={handleApply} style={{ flex: 1 }}>
              <LinearGradient colors={[PRIMARY_RED, PRIMARY_RED_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyBtn}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  checkboxChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  checkboxChipSelected: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FEF2F2",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  chipLabelSelected: {
    color: PRIMARY_RED,
    fontWeight: "700",
  },
  airlineList: {
    gap: 8,
  },
  airlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  airlineRowSelected: {
    borderColor: PRIMARY_RED,
    backgroundColor: "#FEF2F2",
  },
  airlineText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  airlineTextSelected: {
    color: PRIMARY_RED,
    fontWeight: "700",
  },
  adjustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 8,
  },
  adjustBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  priceValText: {
    fontSize: 18,
    fontWeight: "900",
    color: PRIMARY_RED,
  },
  durationValText: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT_DARK,
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  resetBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  applyBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
