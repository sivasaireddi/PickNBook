import React, { memo } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { BUS_SEAT_COLORS, BUS_SEAT_SHADOWS } from "../../theme/busSeatTheme";

const formatPrice = (value = 0) => `\u20B9${Math.round(value)}`;

const PriceChip = memo(({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.priceChip,
      !active && styles.priceChipInactiveShadow,
      active && styles.priceChipActive,
      pressed && styles.priceChipPressed,
    ]}
  >
    <Text style={[styles.priceChipText, active && styles.priceChipTextActive]}>
      {label}
    </Text>
  </Pressable>
));

const SeatPriceFilters = ({ priceFilters, selectedPrice, onSelectPrice }) => {
  return (
    <View style={styles.container}>
      <PriceChip
        label="All"
        active={selectedPrice === null}
        onPress={() => onSelectPrice(null)}
      />
      {priceFilters.map((price) => (
        <PriceChip
          key={price}
          label={formatPrice(price)}
          active={selectedPrice === price}
          onPress={() => onSelectPrice(selectedPrice === price ? null : price)}
        />
      ))}
    </View>
  );
};

export default memo(SeatPriceFilters);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#F8F9FB",
  },
  priceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  priceChipInactiveShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  priceChipActive: {
    borderColor: "#D11A2A",
    backgroundColor: "#FFF5F5",
    shadowColor: "#D11A2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priceChipPressed: {
    opacity: 0.8,
  },
  priceChipText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
  },
  priceChipTextActive: {
    color: "#111827",
    fontWeight: "600",
  },
});
