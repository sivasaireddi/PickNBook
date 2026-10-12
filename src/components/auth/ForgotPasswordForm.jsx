import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format10DigitPhoneNumber, requestAuth } from "../../services/authService";
import AuthTextInput from "./AuthTextInput";
import AuthPrimaryButton from "./AuthPrimaryButton";
import { authTheme } from "./authStyles";

export default function ForgotPasswordForm({ navigation, onBack, showHeading = true }) {
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
      await requestAuth(
        "/api/Auth/forgot-password/send-otp",
        {
          method: "POST",
          body: JSON.stringify({ channel, ...accountIdentifier }),
        },
        "Failed to send OTP.",
        { timeoutMs: 45000 }
      );
      navigation.navigate("VerifyOtp", { channel, ...accountIdentifier });
    } catch (error) {
      setErrorMsg(error?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {showHeading && (
        <View style={styles.heading}>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>Choose where to receive your reset code.</Text>
        </View>
      )}

      <View style={styles.segmentedControl}>
        {[
          { value: "email", label: "Email", icon: "mail-outline" },
          { value: "mobile", label: "Mobile", icon: "call-outline" },
        ].map((option) => {
          const active = activeTab === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => {
                setActiveTab(option.value);
                setErrorMsg("");
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={option.icon}
                size={16}
                color={active ? "#FFFFFF" : authTheme.colors.inkSoft}
              />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!!errorMsg && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={authTheme.colors.error} />
          <Text style={styles.errorText} numberOfLines={3}>{errorMsg}</Text>
        </View>
      )}

      <AuthTextInput
        label={activeTab === "email" ? "Registered email" : "Registered mobile"}
        icon={activeTab === "email" ? "mail-outline" : "call-outline"}
        placeholder={activeTab === "email" ? "you@example.com" : "10-digit mobile number"}
        keyboardType={activeTab === "email" ? "email-address" : "number-pad"}
        autoCapitalize="none"
        maxLength={activeTab === "mobile" ? 10 : undefined}
        value={activeTab === "email" ? email : mobile}
        onChangeText={(value) => {
          if (activeTab === "email") setEmail(value);
          else setMobile(value.replace(/[^0-9]/g, ""));
          setErrorMsg("");
        }}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <AuthPrimaryButton title="Send Reset OTP" onPress={handleSubmit} loading={loading} />
      <TouchableOpacity style={styles.backToLogin} onPress={onBack} accessibilityRole="button">
        <Ionicons name="arrow-back" size={16} color={authTheme.colors.redDeep} />
        <Text style={styles.backToLoginText}>Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: 16 },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    color: authTheme.colors.ink,
    fontSize: 21,
    lineHeight: 26,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    color: authTheme.colors.slate,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  segmentedControl: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#F1F1F5",
    marginBottom: 16,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 11,
  },
  segmentActive: { backgroundColor: authTheme.colors.redDeep },
  segmentText: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.inkSoft, fontSize: 12.5 },
  segmentTextActive: { color: "#FFFFFF" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: authTheme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "#F5CDD2",
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    color: authTheme.colors.error,
    fontSize: 12,
    lineHeight: 17,
  },
  backToLogin: {
    minHeight: 44,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  backToLoginText: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep, fontSize: 13 },
});
