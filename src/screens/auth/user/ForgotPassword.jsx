import React, { useEffect, useState } from "react";
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
import {
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { validateLowercaseEmail } from "./AuthValidation";
import {
  generateMixedCaptcha,
  validateCaptcha,
} from "./Captcha";
import {
  readApiMessage,
  requestAuth,
} from "../../../services/authService";

const flightCarImage = require("../../../../assets/loginimage.png");

function ForgotPassword() {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [generatedCaptcha, setGeneratedCaptcha] =
    useState("");
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] =
  useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const refreshCaptcha = () => {
    setGeneratedCaptcha(generateMixedCaptcha());
    setCaptcha("");
    setErrors((prev) => ({
      ...prev,
      captcha: "",
    }));
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const handleSubmit = async () => {
    const nextErrors = {};
    const emailError = validateLowercaseEmail(email);
    const captchaError = validateCaptcha(
      captcha,
      generatedCaptcha
    );

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (captchaError) {
      nextErrors.captcha = captchaError;
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setIsSuccess(false);
      setStatusMessage("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setIsSuccess(false);
    setStatusMessage("");

    try {
      const payload = await requestAuth(
        "/api/Auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
          }),
        },
        "Failed to send OTP."
      );

      setIsSuccess(true);
      setStatusMessage(
        readApiMessage(payload, "OTP sent successfully.")
      );

      setTimeout(() => {
        navigation.navigate("VerifyOtp", {
          email: email.trim(),
        });
      }, 700);
    } catch (error) {
      setIsSuccess(false);
      setStatusMessage(
        error?.message || "Failed to send OTP."
      );
      refreshCaptcha();
    }

    setLoading(false);
  };

  return (
    <ImageBackground
      source={flightCarImage}
      style={styles.container}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.brandSection}>
              <Text style={styles.kicker}>Welcome to</Text>

              <View style={styles.logoContainer}>
                <MaterialCommunityIcons
                  name="bus"
                  size={30}
                  color="#fff"
                />
              </View>

              <Text style={styles.brandName}>Travling</Text>

              <Text style={styles.brandCopy}>
                Reset your account password in a secure flow
                and get back to your bookings quickly.
              </Text>

              <Text style={styles.brandMeta}>
                Email verification with captcha protection
              </Text>
            </View>

            <View style={styles.formPanel}>
              <Text style={styles.heading}>
                Forgot Password
              </Text>

              <Text style={styles.subheading}>
                Enter your registered email and the captcha
                shown below to receive a reset OTP.
              </Text>

              {!!statusMessage && (
                <Text
                  style={[
                    styles.statusMessage,
                    isSuccess
                      ? styles.success
                      : styles.error,
                  ]}
                >
                  {statusMessage}
                </Text>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrors((prev) => ({
                      ...prev,
                      email: text
                        ? validateLowercaseEmail(text)
                        : "",
                    }));
                    setStatusMessage("");
                  }}
                />

                {!!errors.email && (
                  <Text style={styles.errorText}>
                    {errors.email}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Captcha</Text>

                <View style={styles.captchaCard}>
                  <Text style={styles.captchaText}>
                    {generatedCaptcha}
                  </Text>

                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={refreshCaptcha}
                    disabled={loading}
                  >
                    <MaterialIcons
                      name="refresh"
                      size={22}
                      color="#0B5ED7"
                    />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Enter captcha"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={captcha}
                  onChangeText={(text) => {
                    setCaptcha(text);
                    setErrors((prev) => ({
                      ...prev,
                      captcha: text
                        ? validateCaptcha(
                            text,
                            generatedCaptcha
                          )
                        : "",
                    }));
                    setStatusMessage("");
                  }}
                />

                {!!errors.captcha && (
                  <Text style={styles.errorText}>
                    {errors.captcha}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    Send OTP
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.linkContainer}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Login")}
                >
                  <Text style={styles.link}>
                    Back to Login
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate("Register")}
                >
                  <Text style={styles.link}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

export default ForgotPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    overflow: "hidden",
  },

  brandSection: {
    backgroundColor: "#0B5ED7",
    padding: 25,
    alignItems: "center",
  },

  kicker: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 10,
  },

  logoContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },

  secondLogo: {
    marginLeft: 12,
  },

  brandName: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
  },

  brandCopy: {
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  brandMeta: {
    color: "#fff",
    marginTop: 10,
    fontStyle: "italic",
    textAlign: "center",
  },

  formPanel: {
    padding: 25,
  },

  heading: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },

  subheading: {
    color: "#666",
    marginBottom: 20,
  },

  statusMessage: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
  },

  success: {
    backgroundColor: "#D1E7DD",
    color: "#0F5132",
  },

  error: {
    backgroundColor: "#F8D7DA",
    color: "#842029",
  },

  field: {
    marginBottom: 16,
  },

  label: {
    marginBottom: 8,
    fontWeight: "600",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },

  captchaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },

  captchaText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#1E3A8A",
  },

  refreshButton: {
    padding: 4,
  },

  errorText: {
    color: "#dc2626",
    marginTop: 5,
    fontSize: 12,
  },

  submitButton: {
    backgroundColor: "#0B5ED7",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },

  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  linkContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  link: {
    color: "#0B5ED7",
    fontWeight: "600",
  },
});
