import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import AppHeader from "../../../components/AppHeader";
import FlightSearchScreen from "./flights/FlightSearchScreen";

export default function FlightScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <AppHeader />
      <View style={styles.screen}>
        <FlightSearchScreen navigation={navigation} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  screen: { flex: 1, backgroundColor: "#F4F7FB" },
});
