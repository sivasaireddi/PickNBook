import React, { memo } from "react";
import { StyleSheet, Text, View, Pressable, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BUS_SEAT_COLORS } from "../../theme/busSeatTheme";

const SeatLayoutHeader = ({ title, subtitle, onBackPress }) => {
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this bus trip from ${title} on ${subtitle}`,
      });
    } catch (error) {
      console.log("Error sharing", error);
    }
  };

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

      <Pressable hitSlop={15} onPress={handleShare} style={styles.iconButtonRight}>
        <Ionicons name="share-social-outline" size={20} color="#111827" />
      </Pressable>
    </View>
  );
};

export default memo(SeatLayoutHeader);

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: "#FFFFFF",
  },
  iconButton: {
    marginRight: 12,
  },
  iconButtonRight: {
    marginLeft: 12,
  },
  centerContent: {
    flex: 1,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#111827",
  },
  subtitleText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 0,
  },
});
