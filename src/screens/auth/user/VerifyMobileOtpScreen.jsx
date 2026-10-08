import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { verifyLoginOtp } from "../../../services/authService";
import AuthContext from "../../../context/AuthContext";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import AuthTextInput from "../../../components/auth/AuthTextInput";
import AuthPrimaryButton from "../../../components/auth/AuthPrimaryButton";
import { authTheme } from "../../../components/auth/authStyles";

const buildFullName = (firstName, lastName) =>
  [firstName, lastName].filter(Boolean).join(" ").trim();

const extractStoredUser = (payload) => {
  const root = payload && typeof payload === "object" ? payload : null;
  if (!root) return null;
  const rawUser =
    root.user ?? root.profile ?? root.data?.user ?? root.data?.profile ?? root.data ?? root;
  if (!rawUser || typeof rawUser !== "object") return null;

  const firstName = rawUser.firstName ?? rawUser.FirstName ?? "";
  const lastName = rawUser.lastName ?? rawUser.LastName ?? "";
  const email = rawUser.email ?? root.email ?? "";
  const phoneNumber = rawUser.phoneNumber ?? rawUser.phone ?? rawUser.mobile ?? "";
  const id =
    rawUser.id ?? rawUser.userId ?? rawUser.Id ?? root.id ?? root.userId ?? root.Id ?? null;

  if (!id && !firstName && !lastName && !email && !phoneNumber) return null;

  return {
    ...rawUser,
    id,
    firstName,
    lastName,
    email,
    phoneNumber,
    fullName: buildFullName(firstName, lastName),
  };
};

const VerifyMobileOtpScreen = ({ navigation, route }) => {
  const { signIn } = useContext(AuthContext);
  const phoneNumber = route.params?.phoneNumber || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(297); // 04:57

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    setApiMessage("");

    try {
      // Look for any guest IDs in secure store to pass
      const guestId = await SecureStore.getItemAsync("guestId") || 
                      await SecureStore.getItemAsync("X-Guest-Id") || 
                      await SecureStore.getItemAsync("x-guest-id");

      const data = await verifyLoginOtp(phoneNumber, otp, guestId);
      
      const token = data?.token || data?.Token;
      const storedUser = extractStoredUser(data);

      if (!token) {
        throw new Error("Login succeeded but no token was returned by the API.");
      }

      await SecureStore.setItemAsync("token", String(token));
      await SecureStore.setItemAsync("isLoggedIn", "true");

      if (storedUser) {
        await SecureStore.setItemAsync("user", JSON.stringify(storedUser));
      } else {
        await SecureStore.deleteItemAsync("user");
      }

      await Promise.all([
        SecureStore.deleteItemAsync("profileImage"),
        SecureStore.deleteItemAsync("challengeId"),
        SecureStore.deleteItemAsync("role"),
        SecureStore.deleteItemAsync("x-user-id"),
        SecureStore.deleteItemAsync("X-User-Id"),
      ]);

      setApiMessage("Login successful.");
      signIn();
      navigation.reset({
        index: 0,
        routes: [{ name: "DashBoard" }],
      });
    } catch (err) {
      setApiMessage(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MobileLoginScreen");
  const success = apiMessage.includes("Successful") || apiMessage.includes("successful");

  return (
    <AuthScreenLayout eyebrow="VERIFY YOUR NUMBER" title="Enter your secure code" subtitle={`We sent a 6-digit OTP to ${phoneNumber}.`} onBack={goBack}>
      <View style={otpStyles.iconWrap}><Ionicons name="shield-checkmark-outline" size={30} color={authTheme.colors.redDeep} /></View>
      {!!apiMessage && <View style={[otpStyles.messageBox, success ? otpStyles.successBox : otpStyles.errorBox]}><Ionicons name={success ? "checkmark-circle-outline" : "alert-circle-outline"} size={18} color={success ? authTheme.colors.good : authTheme.colors.error} /><Text style={[otpStyles.messageText, { color: success ? "#147A58" : authTheme.colors.error }]}>{apiMessage}</Text></View>}
      <AuthTextInput label="One-time password" icon="keypad-outline" placeholder="Enter 6-digit OTP" keyboardType="number-pad" maxLength={6} value={otp} error={error} inputStyle={otpStyles.otpInput} returnKeyType="done" onSubmitEditing={handleVerifyOtp} onChangeText={(text) => { setOtp(text.replace(/[^0-9]/g, "")); setError(""); }} />
      <View style={otpStyles.timerRow}><Ionicons name="time-outline" size={17} color={timeLeft > 0 ? authTheme.colors.slate : authTheme.colors.error} /><Text style={otpStyles.timerLabel}>{timeLeft > 0 ? "Code expires in" : "Code expired"}</Text>{timeLeft > 0 && <Text style={otpStyles.timerValue}>{formatTime(timeLeft)}</Text>}</View>
      <AuthPrimaryButton title="Verify OTP" onPress={handleVerifyOtp} loading={loading} disabled={timeLeft === 0} icon="checkmark" />
      <TouchableOpacity style={otpStyles.changeNumber} onPress={goBack}><Text style={otpStyles.changeNumberText}>Change mobile number</Text></TouchableOpacity>
    </AuthScreenLayout>
  );
};

export default VerifyMobileOtpScreen;

const otpStyles = StyleSheet.create({
  iconWrap: { width: 58, height: 58, borderRadius: 19, alignSelf: "center", alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F1", borderWidth: 1, borderColor: "#F3D5D7", marginBottom: 20 },
  messageBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 14, marginBottom: 17, borderWidth: 1 },
  successBox: { backgroundColor: authTheme.colors.successSoft, borderColor: "#C8EBDD" },
  errorBox: { backgroundColor: authTheme.colors.errorSoft, borderColor: "#F5CDD2" },
  messageText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12.5, lineHeight: 18 },
  otpInput: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, letterSpacing: 7, textAlign: "center" },
  timerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 22, marginTop: -2 },
  timerLabel: { fontFamily: "Inter_400Regular", color: authTheme.colors.slate, fontSize: 12.5 },
  timerValue: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep, fontSize: 12.5 },
  changeNumber: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10 },
  changeNumberText: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep, fontSize: 13 },
});
