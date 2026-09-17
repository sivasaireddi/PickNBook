import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar, StyleSheet, View } from "react-native";
import BusBookingSection from "./BusBookingSection";

export default function BusScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.screen}>
        <BusBookingSection navigation={navigation} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000" },
  screen: { flex: 1, backgroundColor: "#F8F9FC" },
});
