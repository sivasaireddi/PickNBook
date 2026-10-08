import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authTheme } from "../../../components/auth/authStyles";
import {
  verifyRegistrationOtp,
  registerUser,
  sendRegistrationOtp,
  readApiMessage,
  format10DigitPhoneNumber,
} from "../../../services/authService";

/**
 * VerifyRegistrationOtpModal Component
 *
 * Implements Step 2 & 3 of the User Registration Flow:
 * - Accepts channel ("Mobile" or "Email")
 * - 5-minute validity expiration timer (300s)
 * - 30-second resend cooldown timer
 * - Calls POST /api/Auth/verify-registration-otp then POST /api/Auth/register
 */
export default function VerifyRegistrationOtpModal({
  visible = true,
  onClose,
  formData = {},
  onSuccess,
  onBackToEdit,
}) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("OTP sent successfully");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(30); // 30s cooldown

  const channel = formData.channel === "Email" || formData.channel === "email" ? "Email" : "Mobile";
  const email = formData.email ? formData.email.trim().toLowerCase() : "";
  const rawMobile = formData.mobile ? formData.mobile.trim() : "";
  const phoneNumber = format10DigitPhoneNumber(rawMobile);

  // Countdown timers logic
  useEffect(() => {
    if (!visible) return;

    // Reset state on open
    setOtp("");
    setErrorMsg("");
    setSuccessMsg("OTP sent successfully");
    setTimeLeft(300);
    setResendCooldown(30);

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [visible]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formattedMins = String(mins).padStart(2, "0");
    const formattedSecs = String(secs).padStart(2, "0");
    return `${formattedMins}:${formattedSecs}`;
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setErrorMsg("Please enter the 6-digit OTP code");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // Step 2: Verify OTP
      await verifyRegistrationOtp({
        channel,
        phoneNumber,
        email,
        otp: otp.trim(),
      });

      // Step 3: Complete User Registration
      const registerPayload = await registerUser({
        firstName: formData.firstName?.trim() || "",
        lastName: formData.lastName?.trim() || "",
        phoneNumber,
        email,
        password: formData.password || "",
      });

      const msg = readApiMessage(registerPayload, "User registered successfully");
      if (onSuccess) {
        onSuccess(msg, registerPayload);
      }
    } catch (err) {
      const errMsg = err?.message || "Invalid or expired OTP. Please try again.";
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    setErrorMsg("");

    try {
      const payload = await sendRegistrationOtp({
        channel,
        phoneNumber,
        email,
      });

      setSuccessMsg(readApiMessage(payload, "OTP sent successfully"));
      setTimeLeft(300); // Reset 5 min timer
      setResendCooldown(30); // Reset 30s resend cooldown
    } catch (err) {
      setErrorMsg(err?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            enabled={Platform.OS === "ios"}
            style={styles.keyboardContainer}
          >
            <View style={styles.card}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>

              {/* Main Title */}
              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>
                Step 2 of 3: Verify the 6-digit code sent to your {channel.toLowerCase()}.
              </Text>

              {/* Success Alert Banner */}
              {!!successMsg && (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginRight: 6 }} />
                  <Text style={styles.successBannerText}>{successMsg}</Text>
                </View>
              )}

              {/* Section Header */}
              <Text style={styles.sectionTitle}>Verification Details</Text>
              <Text style={styles.emailPrompt}>
                {channel === "Mobile"
                  ? "An OTP has been sent via SMS to your mobile number:"
                  : "An OTP has been sent to your email address:"}
              </Text>
              <Text style={styles.emailAddress}>
                {channel === "Mobile" ? `+91 ${phoneNumber}` : email}
              </Text>

              {/* Error Message if any */}
              {!!errorMsg && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBoxText}>{errorMsg}</Text>
                </View>
              )}

              {/* OTP Input Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Enter 6-Digit OTP</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#64748B"
                    style={styles.shieldIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={6}
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text.replace(/\D/g, ""));
                      if (errorMsg) setErrorMsg("");
                    }}
                  />
                </View>
              </View>

              {/* Timer Row */}
              <View style={styles.timerRow}>
                <Text style={styles.timerLabel}>OTP valid for </Text>
                <View style={styles.timerBadge}>
                  <Text style={styles.timerBadgeText}>
                    {formatTime(timeLeft)}
                  </Text>
                </View>
                {resendCooldown > 0 ? (
                  <Text style={styles.cooldownText}>
                    Resend in {resendCooldown}s
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resending}
                    style={styles.resendLink}
                  >
                    {resending ? (
                      <ActivityIndicator size="small" color="#9E104D" />
                    ) : (
                      <Text style={styles.resendText}>Resend OTP</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionSection}>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (loading || otp.length !== 6) && styles.disabledBtn,
                  ]}
                  onPress={handleVerify}
                  disabled={loading || otp.length !== 6}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify & Complete Registration</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={onBackToEdit || onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBtnText}>
                    Back to Edit Details
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 22, 43, 0.58)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  keyboardContainer: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: "SpaceGrotesk_700Bold",
    color: authTheme.colors.ink,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: authTheme.colors.slate,
    lineHeight: 20,
    marginBottom: 18,
  },

  /* Success Banner */
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  successBannerIcon: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#16A34A",
    marginRight: 8,
  },
  successBannerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },

  /* Verify Details Section */
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  emailPrompt: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 4,
  },
  emailAddress: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
    marginBottom: 20,
  },

  /* Error Box */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorBoxText: {
    fontSize: 13,
    color: "#DC2626",
    marginLeft: 6,
    flex: 1,
  },

  /* Input Field */
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8FB",
    borderWidth: 1,
    borderColor: authTheme.colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  shieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },

  /* Timer Row */
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  timerLabel: {
    fontSize: 13,
    color: "#475569",
  },
  timerBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timerBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9E104D",
  },
  resendLink: {
    marginLeft: 10,
  },
  resendText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0284C7",
  },
  cooldownText: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },


  /* Action Section */
  actionSection: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: authTheme.colors.redDeep,
    borderRadius: 16,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: authTheme.colors.redDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.75,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: authTheme.colors.redDeep,
  },
});
