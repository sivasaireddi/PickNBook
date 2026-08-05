import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar, StyleSheet, View } from "react-native";
import BusBookingSection from "./BusBookingSection";

export default function BusScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#D11A2A" />
      <View style={styles.screen}>
        <BusBookingSection navigation={navigation} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#D11A2A" },
  screen: { flex: 1, backgroundColor: "#F8F9FC" },
});
