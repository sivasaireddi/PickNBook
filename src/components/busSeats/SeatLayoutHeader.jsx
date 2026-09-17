import React, { memo } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SeatLayoutHeader = ({ title, subtitle, onBackPress }) => {
  return (
    <View style={styles.headerContainer}>
      <Pressable hitSlop={15} onPress={onBackPress} style={styles.iconButton}>
        <Ionicons name="arrow-back" size={22} color="#111827" />
      </Pressable>

      {/* Center Content */}
      <View style={styles.centerContent}>
        <Text numberOfLines={1} style={styles.titleText}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitleText}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
};

export default memo(SeatLayoutHeader);

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  iconButton: {
    marginRight: 12,
  },
  centerContent: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  subtitleText: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 0,
  },
});
