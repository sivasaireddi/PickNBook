import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { requestAuth } from "../../../services/authService";
import { validateStrongPassword } from "./AuthValidation";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import AuthTextInput from "../../../components/auth/AuthTextInput";
import AuthPrimaryButton from "../../../components/auth/AuthPrimaryButton";
import { authTheme } from "../../../components/auth/authStyles";

export default function VerifyOtp() {
  const navigation = useNavigation();
  const route = useRoute();

  const resetEmail = String(route.params?.email || "").trim().toLowerCase();
  const resetPhoneNumber = String(route.params?.phoneNumber || "").replace(/\D/g, "").slice(-10);
  const channel = route.params?.channel === "Mobile" ? "Mobile" : "Email";
  const accountIdentifier = channel === "Mobile"
    ? { phoneNumber: resetPhoneNumber }
    : { email: resetEmail };

  const [step, setStep] = useState(1); // 1 = Enter OTP, 2 = Set Password
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(297); // 04:57

  useEffect(() => {
    if (step !== 1) return;
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
  }, [step]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleVerifyOtp = async () => {
    setErrorMsg("");
    if (!otp || otp.length < 6) {
      setErrorMsg("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      await requestAuth(
        "/api/Auth/forgot-password/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({ ...accountIdentifier, channel, otp }),
        },
        "OTP Verification failed. Please check the OTP.",
        { timeoutMs: 45000 }
      );

      setStep(2);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg(error?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg("");
    const passwordError = validateStrongPassword(password, "New password");
    if (passwordError) {
      setErrorMsg(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await requestAuth(
        "/api/Auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify({ ...accountIdentifier, newPassword: password }),
        },
        "Reset failed. Please try again.",
        { timeoutMs: 45000 }
      );

      // On success, go back to login
      navigation.navigate("Login");
    } catch (error) {
      setErrorMsg(error?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("ForgotPassword");
  };

  return (
    <AuthScreenLayout eyebrow="ACCOUNT RECOVERY" title={step === 1 ? "Verify your reset code" : "Create a new password"} subtitle={step === 1 ? `Enter the OTP sent to your ${channel.toLowerCase()}.` : "Choose a strong password you haven’t used before."} onBack={goBack}>
      <View style={recoveryStyles.progress}><View style={recoveryStyles.progressComplete} /><View style={step === 1 ? recoveryStyles.progressActive : recoveryStyles.progressComplete} /><View style={step === 2 ? recoveryStyles.progressActive : recoveryStyles.progressPending} /></View>
      <View style={recoveryStyles.successBanner}><Ionicons name="checkmark-circle-outline" size={18} color="#147A58" /><Text style={recoveryStyles.successText}>{step === 1 ? `OTP sent to your ${channel.toLowerCase()}` : "OTP verified successfully"}</Text></View>
      {!!errorMsg && <View style={recoveryStyles.errorBanner}><Ionicons name="alert-circle-outline" size={18} color={authTheme.colors.error} /><Text style={recoveryStyles.errorText}>{errorMsg}</Text></View>}
      {step === 1 ? (
        <>
          <AuthTextInput label="One-time password" icon="keypad-outline" placeholder="Enter 6-digit OTP" keyboardType="number-pad" maxLength={6} value={otp} inputStyle={recoveryStyles.otpInput} returnKeyType="done" onSubmitEditing={handleVerifyOtp} onChangeText={(v) => { setOtp(v.replace(/\D/g, "")); setErrorMsg(""); }} />
          <View style={recoveryStyles.timerRow}><Ionicons name="time-outline" size={17} color={authTheme.colors.slate} /><Text style={recoveryStyles.timerText}>Expires in <Text style={recoveryStyles.timerValue}>{formatTime(timeLeft)}</Text></Text></View>
          <AuthPrimaryButton title="Verify OTP" onPress={handleVerifyOtp} loading={loading} icon="checkmark" />
        </>
      ) : (
        <>
          <AuthTextInput label="New password" icon="lock-closed-outline" placeholder="Enter new password" secureTextEntry={!showPassword} value={password} rightIcon={showPassword ? "eye-off-outline" : "eye-outline"} onRightPress={() => setShowPassword(!showPassword)} onChangeText={(v) => { setPassword(v); setErrorMsg(""); }} />
          <AuthTextInput label="Confirm password" icon="shield-checkmark-outline" placeholder="Re-enter new password" secureTextEntry={!showConfirmPassword} value={confirmPassword} rightIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"} onRightPress={() => setShowConfirmPassword(!showConfirmPassword)} onChangeText={(v) => { setConfirmPassword(v); setErrorMsg(""); }} />
          <AuthPrimaryButton title="Reset Password" onPress={handleResetPassword} loading={loading} icon="checkmark" />
        </>
      )}
    </AuthScreenLayout>
  );
}

const recoveryStyles = StyleSheet.create({
  progress: { flexDirection: "row", gap: 6, marginBottom: 20 },
  progressComplete: { flex: 1, height: 4, borderRadius: 2, backgroundColor: authTheme.colors.good },
  progressActive: { flex: 1, height: 4, borderRadius: 2, backgroundColor: authTheme.colors.red },
  progressPending: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#ECECF1" },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, backgroundColor: authTheme.colors.successSoft, borderWidth: 1, borderColor: "#C8EBDD", marginBottom: 17 },
  successText: { flex: 1, fontFamily: "Inter_500Medium", color: "#147A58", fontSize: 12.5 },
  errorBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 14, backgroundColor: authTheme.colors.errorSoft, borderWidth: 1, borderColor: "#F5CDD2", marginBottom: 17 },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", color: authTheme.colors.error, fontSize: 12.5, lineHeight: 18 },
  otpInput: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, letterSpacing: 7, textAlign: "center" },
  timerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: -3, marginBottom: 21 },
  timerText: { fontFamily: "Inter_400Regular", color: authTheme.colors.slate, fontSize: 12.5 },
  timerValue: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep },
});
