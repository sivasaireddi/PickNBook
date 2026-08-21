import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { RADIUS, SPACING } from "../constants/spacing";
import { searchAirports } from "../services/FlightService";

const POPULAR_AIRPORTS = [
  { cityName: "Delhi", airportCode: "DEL", airportName: "Indira Gandhi International Airport", airportId: "DEL", country: "India" },
  { cityName: "Mumbai", airportCode: "BOM", airportName: "Chhatrapati Shivaji Maharaj Airport", airportId: "BOM", country: "India" },
  { cityName: "Bengaluru", airportCode: "BLR", airportName: "Kempegowda International Airport", airportId: "BLR", country: "India" },
  { cityName: "Hyderabad", airportCode: "HYD", airportName: "Rajiv Gandhi International Airport", airportId: "HYD", country: "India" },
  { cityName: "Chennai", airportCode: "MAA", airportName: "Chennai International Airport", airportId: "MAA", country: "India" },
  { cityName: "Kolkata", airportCode: "CCU", airportName: "Netaji Subhash Chandra Bose Airport", airportId: "CCU", country: "India" },
  { cityName: "Pune", airportCode: "PNQ", airportName: "Pune Airport", airportId: "PNQ", country: "India" },
  { cityName: "Ahmedabad", airportCode: "AMD", airportName: "Sardar Vallabhbhai Patel Airport", airportId: "AMD", country: "India" },
  { cityName: "Goa", airportCode: "GOI", airportName: "Dabolim Airport", airportId: "GOI", country: "India" },
  { cityName: "Kochi", airportCode: "COK", airportName: "Cochin International Airport", airportId: "COK", country: "India" },
  { cityName: "Jaipur", airportCode: "JAI", airportName: "Jaipur International Airport", airportId: "JAI", country: "India" },
  { cityName: "Vijayawada", airportCode: "VGA", airportName: "Vijayawada International Airport", airportId: "VGA", country: "India" },
  { cityName: "Visakhapatnam", airportCode: "VTZ", airportName: "Visakhapatnam Airport", airportId: "VTZ", country: "India" },
];

export function AirportSearchModal({
  visible,
  onClose,
  title = "Select Airport",
  onSelectAirport,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [apiResults, setApiResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const debounceTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    
    if (text.trim().length < 2) {
      setApiResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchAirports(text.trim(), "all");
        // API returns objects with { cityName, airportCode, airportName, ... }
        setApiResults(results || []);
      } catch (e) {
        setApiResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const filteredAirports = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_AIRPORTS;
    
    // If we have API results, use them
    let results = apiResults.length > 0 ? [...apiResults] : [];
    
    // Fallback to local filter if API returned nothing but we are still searching
    if (results.length === 0) {
      const query = searchQuery.trim().toLowerCase();
      results = POPULAR_AIRPORTS.filter(
        (item) =>
          item.cityName.toLowerCase().includes(query) ||
          item.airportCode.toLowerCase().includes(query) ||
          item.airportName.toLowerCase().includes(query)
      );
    }

    
    // Add custom manual entry at the top
    const customCode = query.substring(0, 3).toUpperCase();
    results.unshift({
      cityName: searchQuery.trim(),
      airportCode: customCode,
      airportName: `Use custom entry: ${searchQuery.trim()}`,
      airportId: customCode,
      country: "",
      isCustom: true,
      id: "custom-entry"
    });

    return results;
  }, [searchQuery]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color={COLORS.placeholder} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search city, airport name or IATA code..."
            placeholderTextColor={COLORS.placeholder}
            style={styles.searchInput}
            autoFocus
            clearButtonMode="while-editing"
            onSubmitEditing={() => {
              if (searchQuery.trim().length > 0) {
                 const customCode = searchQuery.trim().substring(0, 3).toUpperCase();
                 onSelectAirport({
                    cityName: searchQuery.trim(),
                    airportCode: customCode,
                    airportName: `Custom: ${searchQuery.trim()}`,
                    airportId: customCode,
                    country: ""
                 });
                 onClose();
              }
            }}
          />
          {searchQuery.length > 0 && Platform.OS === "android" && (
            <TouchableOpacity onPress={() => handleSearchChange("")}>
              <Ionicons name="close-circle" size={18} color={COLORS.placeholder} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={{ padding: SPACING.lg, alignItems: "center" }}>
             <Text style={{ color: COLORS.textSecondary }}>Searching...</Text>
          </View>
        ) : (
          <FlatList
          data={filteredAirports}
          keyExtractor={(item) => item.id || item.airportCode}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                onSelectAirport(item);
                onClose();
              }}
              style={[styles.airportItem, item.isCustom && { backgroundColor: COLORS.surfaceMuted, borderBottomWidth: 2, borderBottomColor: COLORS.primary }]}
            >
              <View style={[styles.planeIconCircle, item.isCustom && { backgroundColor: COLORS.primary + "20" }]}>
                <Ionicons name={item.isCustom ? "create-outline" : "airplane-outline"} size={20} color={COLORS.primary} />
              </View>

              <View style={styles.itemInfo}>
                <Text style={[styles.itemCity, item.isCustom && { color: COLORS.primary }]}>{item.cityName}</Text>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.airportName}
                </Text>
              </View>

              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>{item.airportCode}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    margin: SPACING.lg,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  airportItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  planeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.chipBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemCity: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  itemName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  codeBadge: {
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeText: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
    color: COLORS.primary,
  },
});

export default AirportSearchModal;
