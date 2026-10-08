import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sendLoginOtp } from "../../../services/authService";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import AuthTextInput from "../../../components/auth/AuthTextInput";
import AuthPrimaryButton from "../../../components/auth/AuthPrimaryButton";
import { authTheme } from "../../../components/auth/authStyles";

const MobileLoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
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
      setApiMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login");
  const success = apiMessage.includes("Successful");

  return (
    <AuthScreenLayout eyebrow="QUICK ACCESS" title="Sign in with mobile" subtitle="We’ll send a secure one-time code to your registered mobile number." onBack={goBack}>
      <View style={styles.phoneBadge}>
        <View style={styles.phoneBadgeIcon}><Ionicons name="chatbubble-ellipses-outline" size={22} color={authTheme.colors.redDeep} /></View>
        <View style={styles.phoneBadgeCopy}><Text style={styles.phoneBadgeTitle}>Fast and secure</Text><Text style={styles.phoneBadgeText}>No password needed. Standard SMS delivery applies.</Text></View>
      </View>

      {!!apiMessage && (
        <View style={[styles.messageBox, success ? styles.successBox : styles.errorBox]}>
          <Ionicons name={success ? "checkmark-circle-outline" : "alert-circle-outline"} size={18} color={success ? authTheme.colors.good : authTheme.colors.error} />
          <Text style={[styles.messageText, { color: success ? "#147A58" : authTheme.colors.error }]}>{apiMessage}</Text>
        </View>
      )}

      <Text style={styles.fieldLabel}>Mobile number</Text>
      <View style={styles.phoneRow}>
        <View style={styles.countryCode}><Text style={styles.flag}>🇮🇳</Text><Text style={styles.countryText}>+91</Text></View>
        <View style={styles.phoneField}>
          <AuthTextInput
            placeholder="10-digit number"
            keyboardType="number-pad"
            maxLength={10}
            value={phoneNumber}
            error={error}
            returnKeyType="done"
            onSubmitEditing={handleSendOtp}
            onChangeText={(text) => { setPhoneNumber(text.replace(/[^0-9]/g, "")); setError(""); }}
          />
        </View>
      </View>

      <Text style={styles.privacyText}><Ionicons name="lock-closed" size={12} color={authTheme.colors.slate} />  Your number is used only to verify your account.</Text>
      <AuthPrimaryButton title="Send OTP" onPress={handleSendOtp} loading={loading} icon="arrow-forward" />

      <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerText}>OR</Text><View style={styles.divider} /></View>
      <TouchableOpacity style={styles.emailButton} onPress={() => navigation.navigate("Login")} activeOpacity={0.75} accessibilityRole="button">
        <Ionicons name="mail-outline" size={19} color={authTheme.colors.redDeep} />
        <Text style={styles.emailButtonText}>Sign in with email</Text>
      </TouchableOpacity>
    </AuthScreenLayout>
  );
};

export default MobileLoginScreen;

const styles = StyleSheet.create({
  phoneBadge: { flexDirection: "row", alignItems: "center", backgroundColor: authTheme.colors.surfaceSoft, borderWidth: 1, borderColor: "#F3DDDE", borderRadius: 16, padding: 12, marginBottom: 22 },
  phoneBadgeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFE9EA", marginRight: 11 },
  phoneBadgeCopy: { flex: 1 },
  phoneBadgeTitle: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.ink, fontSize: 13 },
  phoneBadgeText: { fontFamily: "Inter_400Regular", color: authTheme.colors.slate, fontSize: 11.5, lineHeight: 17, marginTop: 2 },
  messageBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 14, marginBottom: 17, borderWidth: 1 },
  successBox: { backgroundColor: authTheme.colors.successSoft, borderColor: "#C8EBDD" },
  errorBox: { backgroundColor: authTheme.colors.errorSoft, borderColor: "#F5CDD2" },
  messageText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12.5, lineHeight: 18 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: authTheme.colors.inkSoft, marginBottom: 7 },
  phoneRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  countryCode: { height: 54, minWidth: 91, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 16, backgroundColor: "#F8F8FB", borderWidth: 1, borderColor: authTheme.colors.line },
  flag: { fontSize: 17 },
  countryText: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.ink, fontSize: 14 },
  phoneField: { flex: 1 },
  privacyText: { fontFamily: "Inter_400Regular", color: authTheme.colors.slate, fontSize: 11.5, lineHeight: 17, marginTop: -2, marginBottom: 20 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: authTheme.colors.line },
  dividerText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: authTheme.colors.slate },
  emailButton: { height: 52, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", borderRadius: 16, borderWidth: 1, borderColor: "#E7D4D6", backgroundColor: "#FFFFFF" },
  emailButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 13.5, color: authTheme.colors.redDeep },
});
