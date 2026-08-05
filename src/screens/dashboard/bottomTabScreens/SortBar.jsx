import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowUp, Bus, Clock, Coins, Armchair } from "lucide-react-native";

const BORDER_COLOR = "#F4A3A3";
const PRIMARY_RED = "#D11A2A";

const SORT_OPTIONS = [
  { id: "departure", label: "Departure", Icon: Bus },
  { id: "duration", label: "Duration", Icon: Clock },
  { id: "arrival", label: "Arrival", Icon: Bus },
  { id: "fare", label: "Fare", Icon: Coins },
  { id: "seats", label: "Seats Available", Icon: Armchair },
];

const SortChip = ({ item, isSelected, direction, handlePress }) => {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1.03 : 1)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: isSelected ? 1.03 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isSelected, scaleAnim]);

  const IconComponent = item.Icon;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => handlePress(item.id)}
        style={[
          styles.filterBadge,
          isSelected ? styles.activeFilterBadge : styles.inactiveFilterBadge,
        ]}
      >
        <IconComponent
          size={16}
          color={isSelected ? "#FFFFFF" : PRIMARY_RED}
          style={styles.icon}
        />

        <Text
          style={[
            styles.filterText,
            isSelected ? styles.activeFilterText : styles.inactiveFilterText,
          ]}
        >
          {item.label}
        </Text>

        <ArrowUp
          size={14}
          color={isSelected ? "#FFFFFF" : PRIMARY_RED}
          style={[
            styles.arrowIcon,
            isSelected && direction === "desc" && styles.arrowDesc,
          ]}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SortBar({
  resultCount = null,
  value = "arrival",
  direction = "asc",
  onChange = () => {},
}) {
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animTranslateY = useRef(new Animated.Value(12)).current;
  const animScale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(animTranslateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(animScale, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animOpacity, animTranslateY, animScale]);

  const handlePress = (id) => {
    if (value === id) {
      const nextDirection = direction === "asc" ? "desc" : "asc";
      onChange(id, nextDirection);
    } else {
      onChange(id, "asc");
    }
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.outerGlowContainer,
          {
            opacity: animOpacity,
            transform: [{ translateY: animTranslateY }, { scale: animScale }],
          },
        ]}
      >
        <View style={styles.innerContainer}>
          <View style={styles.sortSection}>
            <Text style={styles.sortByLabel}>SORT BY:</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContainer}
            >
              {SORT_OPTIONS.map((item) => (
                <SortChip
                  key={item.id}
                  item={item}
                  isSelected={value === item.id}
                  direction={direction}
                  handlePress={handlePress}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#F8F9FB",
  },
  outerGlowContainer: {
    borderRadius: 24,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  innerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sortSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sortByLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
    marginRight: 8,
    letterSpacing: 0.3,
  },
  scrollContainer: {
    alignItems: "center",
    paddingRight: 4,
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 28,
    marginRight: 8,
    borderWidth: 1,
  },
  activeFilterBadge: {
    backgroundColor: PRIMARY_RED,
    borderColor: PRIMARY_RED,
    borderWidth: 0,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  inactiveFilterBadge: {
    backgroundColor: "#FFFFFF",
    borderColor: BORDER_COLOR,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  icon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 12,
  },
  activeFilterText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  inactiveFilterText: {
    color: "#2C2C2C",
    fontWeight: "600",
  },
  arrowIcon: {
    marginLeft: 4,
  },
  arrowDesc: {
    transform: [{ rotate: "180deg" }],
  },
});
