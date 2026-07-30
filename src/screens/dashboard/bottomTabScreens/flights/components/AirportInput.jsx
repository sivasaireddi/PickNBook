import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  primary: "#D11A2A",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
};

export default function AirportInput({
  label,
  field = "from",
  placeholder,
  city,
  code,
  icon,
  value,
  onChangeText,
  onSelect,
  tripType = "flight",
  places = [],
  loading = false,
  error = null,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChangeText = (text) => {
    onChangeText?.(text);
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      setSuggestions([]);
      setShowSuggestions(false);
      console.log("Filtered Cities:", []);
      return;
    }
    const filteredCities = (places || []).filter((item) =>
      item && item.cityName && item.cityName.toLowerCase().includes(trimmed.toLowerCase())
    );
    console.log("Filtered Cities:", filteredCities);
    setSuggestions(filteredCities);
    setShowSuggestions(true);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          autoCapitalize="words"
        />
        <Text style={styles.code}>{code || "Airport code"}</Text>
      </View>
      {showSuggestions ? (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
            {loading ? (
              <View style={styles.dropdownItem}>
                <Text style={styles.dropdownText}>Loading places...</Text>
              </View>
            ) : error ? (
              <View style={styles.dropdownItem}>
                <Text style={styles.dropdownText}>Error loading places</Text>
              </View>
            ) : suggestions.length === 0 ? (
              <View style={styles.dropdownItem}>
                <Text style={styles.dropdownText}>No cities found</Text>
              </View>
            ) : (
              suggestions.map((item, index) => (
                <Pressable
                  key={`${item.cityName}-${index}`}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                  onPress={() => {
                    const selectedCityName = item.cityName;
                    onChangeText?.(selectedCityName);
                    onSelect?.(selectedCityName);
                    setShowSuggestions(false);
                    setSuggestions([]);
                    console.log("Selected City:", selectedCityName);
                  }}
                >
                  <Ionicons name="location-outline" size={18} color={COLORS.muted} />
                  <Text style={styles.dropdownText}>{item.cityName}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  inputWrap: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemPressed: {
    backgroundColor: "#FFF1F2",
  },
  dropdownText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  input: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    padding: 0,
  },
  code: {
    color: COLORS.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
});
