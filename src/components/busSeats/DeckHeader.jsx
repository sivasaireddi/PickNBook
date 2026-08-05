import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { moderateScale } from "react-native-size-matters";

const DeckHeader = ({ title }) => {
  return (
    <View style={styles.container}>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
    </View>
  );
};

export default memo(DeckHeader);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 4,
    paddingVertical: 1,
    paddingLeft: 2,
  },
  title: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#1A1A1A",
  },
});
