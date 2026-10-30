import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sendLoginOtp } from "../../services/authService";
import AuthTextInput from "./AuthTextInput";
import AuthPrimaryButton from "./AuthPrimaryButton";
import { authTheme } from "./authStyles";

export default function PhoneLoginForm({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      setError("Please enter a valid 10-digit mobile number.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSendOtp = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiMessage("");
    try {
      await sendLoginOtp(phoneNumber);
      setApiMessage("OTP Sent Successfully.");
      setTimeout(() => navigation.navigate("VerifyMobileOtpScreen", { phoneNumber }), 500);
    } catch (err) {
      setApiMessage(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const success = /successful/i.test(apiMessage);

  return (
    <View>
      {!!apiMessage && (
        <View style={[styles.messageBox, success ? styles.successBox : styles.errorBox]}>
          <Ionicons
            name={success ? "checkmark-circle-outline" : "alert-circle-outline"}
            size={18}
            color={success ? authTheme.colors.good : authTheme.colors.error}
          />
          <Text
            style={[styles.messageText, success ? styles.successText : styles.errorText]}
            numberOfLines={3}
          >
            {apiMessage}
          </Text>
        </View>
      )}

      <Text style={styles.fieldLabel}>Mobile number</Text>
      <View style={styles.phoneRow}>
        <View style={styles.countryCode}>
          <Text style={styles.flag}>{"\uD83C\uDDEE\uD83C\uDDF3"}</Text>
          <Text style={styles.countryText}>+91</Text>
        </View>
        <View style={styles.phoneField}>
          <AuthTextInput
            placeholder="10-digit number"
            keyboardType="number-pad"
            maxLength={10}
            value={phoneNumber}
            error={error}
            returnKeyType="done"
            onSubmitEditing={handleSendOtp}
            onChangeText={(text) => {
              setPhoneNumber(text.replace(/[^0-9]/g, ""));
              setError("");
            }}
          />
        </View>
      </View>

      <View style={styles.privacyRow}>
        <Ionicons name="lock-closed" size={12} color={authTheme.colors.red} />
        <Text style={styles.privacyText}>Your number is used only to verify your account.</Text>
      </View>
      <AuthPrimaryButton title="Send OTP" onPress={handleSendOtp} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  messageBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  successBox: { backgroundColor: authTheme.colors.successSoft, borderColor: "#C8EBDD" },
  errorBox: { backgroundColor: authTheme.colors.errorSoft, borderColor: "#F5CDD2" },
  messageText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  successText: { color: "#147A58" },
  errorText: { color: authTheme.colors.error },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: authTheme.colors.inkSoft,
    marginBottom: 7,
  },
  phoneRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  countryCode: {
    height: 56,
    width: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 18,
    backgroundColor: authTheme.colors.authField,
    borderWidth: 1,
    borderColor: authTheme.colors.authBorder,
  },
  flag: { fontSize: 17 },
  countryText: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.ink, fontSize: 14 },
  phoneField: { flex: 1 },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 2,
    marginBottom: 18,
  },
  privacyText: {
    fontFamily: "Inter_400Regular",
    color: authTheme.colors.slate,
    fontSize: 11.5,
    lineHeight: 17,
  },
});
