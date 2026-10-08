import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { format10DigitPhoneNumber, requestAuth } from "../../../services/authService";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import AuthTextInput from "../../../components/auth/AuthTextInput";
import AuthPrimaryButton from "../../../components/auth/AuthPrimaryButton";
import { authTheme } from "../../../components/auth/authStyles";

export default function ForgotPassword() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("email");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    setErrorMsg("");
    if (activeTab === "email" && !email.trim()) {
      setErrorMsg("Please enter your registered email");
      return;
    }
    const phoneNumber = format10DigitPhoneNumber(mobile);
    if (activeTab === "mobile" && !/^[6-9]\d{9}$/.test(phoneNumber)) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    const channel = activeTab === "email" ? "Email" : "Mobile";
    const accountIdentifier = activeTab === "email"
      ? { email: email.trim().toLowerCase() }
      : { phoneNumber };
    setLoading(true);
    try {
      await requestAuth("/api/Auth/forgot-password/send-otp", {
        method: "POST",
        body: JSON.stringify({ channel, ...accountIdentifier }),
      }, "Failed to send OTP.", { timeoutMs: 45000 });
      navigation.navigate("VerifyOtp", { channel, ...accountIdentifier });
    } catch (error) {
      setErrorMsg(error?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login");

  return (
    <AuthScreenLayout eyebrow="ACCOUNT RECOVERY" title="Reset your password" subtitle="Choose where you’d like to receive your secure reset code." onBack={goBack}>
      <View style={styles.progress}><View style={[styles.progressBar, styles.progressActive]} /><View style={styles.progressBar} /><View style={styles.progressBar} /></View>
      <View style={styles.segmentedControl}>
        {[{ value: "email", label: "Email", icon: "mail-outline" }, { value: "mobile", label: "Mobile", icon: "call-outline" }].map((option) => {
          const active = activeTab === option.value;
          return <TouchableOpacity key={option.value} style={[styles.segment, active && styles.segmentActive]} onPress={() => { setActiveTab(option.value); setErrorMsg(""); }} accessibilityRole="tab" accessibilityState={{ selected: active }}><Ionicons name={option.icon} size={17} color={active ? "#FFFFFF" : authTheme.colors.inkSoft} /><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text></TouchableOpacity>;
        })}
      </View>
      {!!errorMsg && <View style={styles.errorBanner}><Ionicons name="alert-circle-outline" size={18} color={authTheme.colors.error} /><Text style={styles.errorText}>{errorMsg}</Text></View>}
      <AuthTextInput label={activeTab === "email" ? "Registered email" : "Registered mobile"} icon={activeTab === "email" ? "mail-outline" : "call-outline"} placeholder={activeTab === "email" ? "you@example.com" : "Enter mobile number"} keyboardType={activeTab === "email" ? "email-address" : "number-pad"} autoCapitalize="none" value={activeTab === "email" ? email : mobile} onChangeText={(value) => { activeTab === "email" ? setEmail(value) : setMobile(value); setErrorMsg(""); }} returnKeyType="done" onSubmitEditing={handleSubmit} />
      <AuthPrimaryButton title="Send Reset OTP" onPress={handleSubmit} loading={loading} />
      <TouchableOpacity style={styles.backToLogin} onPress={() => navigation.navigate("Login")}><Ionicons name="arrow-back" size={16} color={authTheme.colors.redDeep} /><Text style={styles.backToLoginText}>Back to sign in</Text></TouchableOpacity>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: "row", gap: 6, marginBottom: 22 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#ECECF1" },
  progressActive: { backgroundColor: authTheme.colors.red },
  segmentedControl: { flexDirection: "row", padding: 4, borderRadius: 16, backgroundColor: "#F1F1F5", marginBottom: 20, gap: 4 },
  segment: { flex: 1, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12 },
  segmentActive: { backgroundColor: authTheme.colors.redDeep },
  segmentText: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.inkSoft, fontSize: 13 },
  segmentTextActive: { color: "#FFFFFF" },
  errorBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 14, backgroundColor: authTheme.colors.errorSoft, borderWidth: 1, borderColor: "#F5CDD2", marginBottom: 17 },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", color: authTheme.colors.error, fontSize: 12.5, lineHeight: 18 },
  backToLogin: { minHeight: 48, flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", marginTop: 14 },
  backToLoginText: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep, fontSize: 13 },
});
