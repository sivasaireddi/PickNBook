import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { requestAuth } from "../../../services/authService";
import { validateStrongPassword } from "./AuthValidation";

const flightCarImage = require("../../../../assets/loginimage.png");

export default function VerifyOtp() {
  const navigation = useNavigation();
  const route = useRoute();

  const resetEmail = String(route.params?.email || "").trim();
  const channel = route.params?.channel || "Email";

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
          body: JSON.stringify({
            email: resetEmail,
            otp: otp,
          }),
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
          body: JSON.stringify({
            email: resetEmail,
            newPassword: password,
          }),
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

  return (
    <ImageBackground
      source={flightCarImage}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (step === 2) {
                    setStep(1); // Go back to OTP if in step 2
                  } else if (navigation.canGoBack()) {
                    navigation.goBack(); // Go back to Forgot Password
                  } else {
                    navigation.navigate("ForgotPassword");
                  }
                }}
              >
                <Ionicons name="arrow-back" size={16} color="#C61136" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <View style={styles.logoBox}>
                <Text style={styles.logoText}>
                  Pick<Text style={styles.logoHighlight}>N</Text>Book
                </Text>
              </View>
            </View>

            {/* Progress Dots */}
            <View style={styles.progressRow}>
              <View
                style={[
                  styles.dot,
                  styles.dotActiveGreen,
                ]}
              />
              <View
                style={[
                  styles.dot,
                  step === 1 ? styles.dotActiveRed : styles.dotActiveGreen,
                ]}
              />
              <View
                style={[
                  styles.dot,
                  step === 2 && styles.dotActiveRed,
                ]}
              />
            </View>

            {step === 1 ? (
              <>
                {/* Titles */}
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>
                  Enter the OTP sent to your {channel.toLowerCase()}.
                </Text>

                {/* Banners */}
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>
                    OTP sent successfully
                  </Text>
                </View>

                <View style={styles.infoBanner}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#1D4ED8" />
                  <View style={styles.infoBannerTextContainer}>
                    <Text style={styles.infoBannerTitle}>
                      OTP sent to your {channel.toLowerCase()}
                    </Text>
                    <Text style={styles.infoBannerSubtitle}>{resetEmail}</Text>
                  </View>
                </View>

                {/* Error Message */}
                {!!errorMsg && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                {/* Input Field */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>ENTER OTP</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color="#64748B"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                      maxLength={6}
                      value={otp}
                      onChangeText={(v) => {
                        setOtp(v.replace(/\D/g, ""));
                        setErrorMsg("");
                      }}
                    />
                  </View>
                </View>

                {/* Timer */}
                <Text style={styles.timerText}>
                  Expires in <Text style={styles.timerRed}>{formatTime(timeLeft)}</Text>
                </Text>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Titles */}
                <Text style={styles.title}>Set new password</Text>
                <Text style={styles.subtitle}>
                  Create a new secure password for your account.
                </Text>

                {/* Banners */}
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>
                    OTP verified. Set your new password below.
                  </Text>
                </View>

                {/* Error Message */}
                {!!errorMsg && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                {/* New Password Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                  <View style={styles.inputContainer}>
                    <Feather
                      name="lock"
                      size={20}
                      color="#64748B"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Min 6 characters"
                      placeholderTextColor="#64748B"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        setErrorMsg("");
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Feather
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                  <View style={styles.inputContainer}>
                    <Feather
                      name="lock"
                      size={20}
                      color="#64748B"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#64748B"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={(v) => {
                        setConfirmPassword(v);
                        setErrorMsg("");
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Feather
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.45)", // Light overlay for readability
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(198, 17, 54, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  backButtonText: {
    color: "#C61136",
    fontSize: 14,
    fontWeight: "600",
  },
  logoBox: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#7E1946",
    letterSpacing: -0.5,
  },
  logoHighlight: {
    color: "#F6C000",
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  dotActiveRed: {
    backgroundColor: "#C61136",
  },
  dotActiveGreen: {
    backgroundColor: "#16A34A",
  },
  title: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 32,
    color: "#1E293B",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 20,
    fontWeight: "500",
  },
  successBanner: {
    backgroundColor: "#E5F6EB",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: "#15803D",
    fontSize: 14,
    fontWeight: "600",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoBannerTextContainer: {
    flex: 1,
  },
  infoBannerTitle: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  infoBannerSubtitle: {
    color: "#2563EB",
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
    height: "100%",
  },
  timerText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
    marginBottom: 24,
  },
  timerRed: {
    color: "#C61136",
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#C61136",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#C61136",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
