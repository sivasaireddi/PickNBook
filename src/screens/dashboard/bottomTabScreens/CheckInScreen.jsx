import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Linking,
  Animated,
} from "react-native";

import goIndigoLogo from "../../../../assets/indigo.png";
import airIndiaExpressLogo from "../../../../assets/Air-India_express.jpg";
import spicejetLogo from "../../../../assets/Spicejet.png";
import akasaAirLogo from "../../../../assets/AkasaAir.png";
import philippineAirlinesLogo from "../../../../assets/Philip.png";
import emiratesLogo from "../../../../assets/Emirates.png";
import qatarAirwaysLogo from "../../../../assets/qatarairways.png";

const CheckInScreen = () => {
  const airlines = [
    {
      id: 1,
      name: "Go Indigo",
      logo: goIndigoLogo,
      checkInUrl: "https://www.goindigo.in/web-check-in.html",
    },
    {
      id: 2,
      name: "Air India Express",
      logo: airIndiaExpressLogo,
      checkInUrl: "https://www.airindiaexpress.com/checkin-home",
    },
    {
      id: 3,
      name: "SpiceJet",
      logo: spicejetLogo,
      checkInUrl: "https://www.spicejet.com/#checkin",
    },
    {
      id: 4,
      name: "Akasa Air",
      logo: akasaAirLogo,
      checkInUrl: "https://www.akasaair.com/check-in",
    },
    {
      id: 5,
      name: "Philippine Airlines",
      logo: philippineAirlinesLogo,
      checkInUrl:
        "https://www.philippineairlines.com/ph/en/check-in-online.html",
    },
    {
      id: 6,
      name: "Emirates",
      logo: emiratesLogo,
      checkInUrl:
        "https://www.emirates.com/in/english/manage-booking/online-check-in/",
    },
    {
      id: 7,
      name: "Qatar Airways",
      logo: qatarAirwaysLogo,
      checkInUrl: "https://cki.qatarairways.com/cki/dashboard",
    },
  ];

  const handleCardClick = (url) => {
    Linking.openURL(url);
  };

  const renderItem = ({ item, index }) => (
    <AirlineCard item={item} index={index} onPress={handleCardClick} />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Web Check-In</Text>
        <Text style={styles.subtitle}>
          Quick check-in for all airlines, anywhere, anytime
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={airlines}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />

      {/* Footer */}
      <Text style={styles.footer}>
        ✈️ All links redirect to official airline portals. Check-in opens 24–48
        hours before departure.
      </Text>
    </View>
  );
};

export default CheckInScreen;





/* ========================= */
/* 🎯 Animated Card Component */
/* ========================= */

const AirlineCard = ({ item, index, onPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPress(item.checkInUrl)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={styles.row}>
          {/* Logo */}
          <Image source={item.logo} style={styles.logo} resizeMode="contain" />

          {/* Airline Name */}
          <Text style={styles.airlineName}>{item.name}</Text>

          {/* Button */}
          <View style={styles.button}>
            <Text style={styles.buttonText}>Check In</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};





/* ========================= */
/* 🎨 Styles */
/* ========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f6fb",
    paddingHorizontal: 16,
    paddingTop: 40,
  },

  header: {
    backgroundColor: "#1d63bf",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
  },

  subtitle: {
    fontSize: 14,
    color: "#fff",
    marginTop: 5,
  },

  list: {
    paddingBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#d2dceb",
    elevation: 3,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    width: 60,
    height: 40,
  },

  airlineName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1c3556",
    marginHorizontal: 10,
  },

  button: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#1d63bf",
    borderRadius: 6,
  },

  buttonText: {
    color: "#1d63bf",
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#6c809f",
    marginTop: 10,
  },
});