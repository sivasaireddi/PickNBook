import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../../constants/config";

export default function OTPScreen() {
  const navigation = useNavigation();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!pin) {
      setError("Enter OTP");
      return;
    }

    try {
      setLoading(true);

      
      const challengeId = await SecureStore.getItemAsync("challengeId");

      const res = await fetch(
        `${API_BASE_URL}/api/Auth/admin/login/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            challengeId: challengeId,
            otp: pin,
          }),
        }
      );

     const data = await res.json();

      if (res.ok) {
        const token = data?.token || data?.Token || data?.accessToken || data?.jwt;
        const user = data?.user || data?.User || data?.profile || data;

        console.log("==========================================");
        console.log("[OTPScreen] LOGIN SUCCESSFUL!");
        console.log("[OTPScreen] Login response received.");
        console.log("==========================================");

        if (token) {
          await SecureStore.setItemAsync("token", String(token));
          await SecureStore.setItemAsync("isLoggedIn", "true");
        }
        if (user && typeof user === "object") {
          await SecureStore.setItemAsync("user", JSON.stringify(user));
        }

        navigation.navigate("sidebar");
      } else {
        setError(data.message || "Invalid OTP");
      }
    } catch (err) {
      setError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.pinWrapper}>
      <Text style={styles.topTitle}>Travel</Text>

      <View style={styles.pinBox}>
        <Text style={styles.pinTitle}>PIN</Text>

        <Text style={styles.info}>
          Please enter OTP sent to email
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter OTP"
          value={pin}
          onChangeText={(text) => {
            setPin(text);
            setError("");
          }}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
          <Text style={styles.verifyText}>
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pinWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  topTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  pinBox: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
  },
  pinTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    marginBottom: 15,
    color: "gray",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
  verifyBtn: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  verifyText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
