import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { requestAuth } from "../../../services/authService";

const flightCarImage = require("../../../../assets/loginimage.png");

export default function ForgotPassword() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("email"); // "email" | "mobile"
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
    if (activeTab === "mobile" && !mobile.trim()) {
      setErrorMsg("Please enter your registered mobile");
      return;
    }

    setLoading(true);

    try {
      await requestAuth(
        "/api/Auth/forgot-password/send-otp",
        {
          method: "POST",
          body: JSON.stringify({
            channel: activeTab === "email" ? "Email" : "Mobile",
            email: activeTab === "email" ? email.trim() : "",
            phoneNumber: activeTab === "mobile" ? mobile.trim() : "",
          }),
        },
        "Failed to send OTP.",
        { timeoutMs: 45000 }
      );

      // On success navigate to VerifyOtp
      navigation.navigate("VerifyOtp", {
        channel: activeTab === "email" ? "Email" : "Mobile",
        email: activeTab === "email" ? email.trim() : "",
        phoneNumber: activeTab === "mobile" ? mobile.trim() : "",
      });
    } catch (error) {
      setErrorMsg(error?.message || "Failed to send OTP.");
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
                onPress={() => navigation.goBack()}
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
              <View style={[styles.dot, styles.dotActiveRed]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            {/* Titles */}
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter your registered email or mobile to receive a reset OTP.
            </Text>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "email" && styles.tabButtonActive,
                ]}
                onPress={() => {
                  setActiveTab("email");
                  setErrorMsg("");
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={activeTab === "email" ? "#FFFFFF" : "#64748B"}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "email" && styles.tabButtonTextActive,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "mobile" && styles.tabButtonActive,
                ]}
                onPress={() => {
                  setActiveTab("mobile");
                  setErrorMsg("");
                }}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={activeTab === "mobile" ? "#FFFFFF" : "#64748B"}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "mobile" && styles.tabButtonTextActive,
                  ]}
                >
                  Mobile
                </Text>
              </TouchableOpacity>
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
              <Text style={styles.inputLabel}>
                {activeTab === "email" ? "EMAIL ADDRESS" : "MOBILE NUMBER"}
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name={activeTab === "email" ? "mail-outline" : "call-outline"}
                  size={20}
                  color="#64748B"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={
                    activeTab === "email"
                      ? "Enter your registered email"
                      : "Enter your registered mobile"
                  }
                  placeholderTextColor="#64748B"
                  keyboardType={
                    activeTab === "email" ? "email-address" : "numeric"
                  }
                  autoCapitalize="none"
                  value={activeTab === "email" ? email : mobile}
                  onChangeText={(v) => {
                    activeTab === "email" ? setEmail(v) : setMobile(v);
                    setErrorMsg("");
                  }}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Send Reset OTP</Text>
              )}
            </TouchableOpacity>

            {/* Back to Login Link */}
            <TouchableOpacity
              style={styles.backToLoginBtn}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.backToLoginText}>← Back to Login</Text>
            </TouchableOpacity>
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
    color: "#7E1946", // Dark burgundy/purple
    letterSpacing: -0.5,
  },
  logoHighlight: {
    color: "#F6C000", // Yellow N
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
    marginBottom: 30,
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: "#C61136",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  inputWrapper: {
    marginBottom: 24,
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
  backToLoginBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  backToLoginText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 14,
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
});
