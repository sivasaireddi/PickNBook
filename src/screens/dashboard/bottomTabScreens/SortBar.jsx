import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ArrowUp, Bus, Clock, Coins, Armchair } from "lucide-react-native";

const SORT_OPTIONS = [
  { id: "departure", label: "Departure", Icon: Bus },
  { id: "duration", label: "Duration", Icon: Clock },
  { id: "arrival", label: "Arrival", Icon: Bus },
  { id: "fare", label: "Fare", Icon: Coins },
  { id: "seats", label: "Seats Available", Icon: Armchair },
];

export default function SortBar({
  resultCount = null,
  value = "arrival",   // Active sorting field
  direction = "asc",   // 'asc' (First click -> Arrow Up), 'desc' (Second click -> Arrow Down)
  onChange = () => {}, // Callback: (id, direction) => {}
}) {
  const handlePress = (id) => {
    if (value === id) {
      const nextDirection = direction === "asc" ? "desc" : "asc";
      onChange(id, nextDirection);
    } else {
      onChange(id, "asc");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.sortSection}>
          <Text style={styles.sortByLabel}>SORT BY:</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {SORT_OPTIONS.map((item) => {
              const isSelected = value === item.id;
              const IconComponent = item.Icon;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => handlePress(item.id)}
                  style={[
                    styles.filterBadge,
                    isSelected && styles.activeFilterBadge,
                  ]}
                >
                  <IconComponent
                    size={16}
                    color={isSelected ? "#FFFFFF" : "#4A5568"}
                    style={styles.icon}
                  />

                  <Text
                    style={[
                      styles.filterText,
                      isSelected && styles.activeFilterText,
                    ]}
                  >
                    {item.label}
                  </Text>

                  <ArrowUp
                    size={14}
                    color={isSelected ? "#FFFFFF" : "#A0AEC0"}
                    style={[
                      styles.arrowIcon,
                      isSelected && direction === "desc" && styles.arrowDesc,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#F7FAFC",
  },
  innerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sortSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sortByLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2D3748",
    marginRight: 8,
  },
  scrollContainer: {
    alignItems: "center",
    paddingRight: 16,
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeFilterBadge: {
    backgroundColor: "#D61A1A",
    borderColor: "#D61A1A",
  },
  icon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2D3748",
  },
  activeFilterText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  arrowIcon: {
    marginLeft: 4,
  },
  arrowDesc: {
    transform: [{ rotate: "180deg" }],
  },
});
