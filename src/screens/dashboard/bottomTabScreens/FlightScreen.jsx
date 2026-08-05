import React from "react";
import { StyleSheet, View } from "react-native";
import FlightSearchScreen from "./flights/FlightSearchScreen";

export default function FlightScreen({ navigation }) {
  return (
    <View style={styles.screen}>
      <FlightSearchScreen navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F9FC" },
});
