import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import {
  readApiMessage,
  requestAuth,
} from "../../../services/authService";
import {
  validateLowercaseEmail,
  validateStrongPassword,
} from "./AuthValidation";

const flightCarImage = require("../../../../assets/loginimage.png");

const VerifyOtp = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [form, setForm] = useState({
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const resetEmail = String(
    route.params?.email || ""
  ).trim();

  const normalizeOtp = (value) =>
    String(value || "")
      .replace(/\D/g, "")
      .slice(0, 6);

  const resetEmailError = resetEmail
    ? validateLowercaseEmail(resetEmail)
    : "";

  const handleChange = (name, value) => {
    const nextValue =
      name === "otp" ? normalizeOtp(value) : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]:
        name === "otp" &&
        nextValue &&
        nextValue.length !== 6
          ? "OTP must be 6 numbers"
          : name === "password" && nextValue
          ? validateStrongPassword(
              nextValue,
              "New password"
            )
          : name === "confirmPassword" &&
            /\s/.test(value)
          ? "Confirm password cannot contain spaces"
          : "",
    }));

    setApiMessage("");
    setIsSuccess(false);
  };

  const validate = () => {
    const newErrors = {};
    const otpValue = form.otp.trim();

    if (!otpValue) {
      newErrors.otp = "OTP is required.";
    } else if (!/^\d{6}$/.test(otpValue)) {
      newErrors.otp = "OTP must be 6 numbers";
    }

    const passwordError = validateStrongPassword(
      form.password,
      "New password"
    );

    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword =
        "Confirm Password is required.";
    } else if (/\s/.test(form.confirmPassword)) {
      newErrors.confirmPassword =
        "Confirm password cannot contain spaces";
    } else if (
      form.password !== form.confirmPassword
    ) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleResendOtp = async () => {
    if (!resetEmail) {
      setIsSuccess(false);
      setApiMessage(
        "Please go back to Forgot Page and enter your email first."
      );
      return;
    }

    if (resetEmailError) {
      setIsSuccess(false);
      setApiMessage(resetEmailError);
      return;
    }

    setLoading(true);
    setApiMessage("");
    setIsSuccess(false);

    setErrors((prev) => ({
      ...prev,
      otp: "",
    }));

    try {
      const payload = await requestAuth(
        "/api/Auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({
            email: resetEmail,
          }),
        },
        "Failed to resend OTP."
      );

      setIsSuccess(true);
      setApiMessage(
        readApiMessage(
          payload,
          "OTP resent successfully."
        )
      );
    } catch (error) {
      setIsSuccess(false);
      setApiMessage(
        error?.message || "Failed to resend OTP."
      );
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setApiMessage("");
    setIsSuccess(false);

    try {
      const payload = await requestAuth(
        "/api/Auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify({
            otp: form.otp,
            newPassword: form.password,
          }),
        },
        "Reset failed. Please try again."
      );

      setIsSuccess(true);
      setApiMessage(
        readApiMessage(
          payload,
          "Password reset successful."
        )
      );

      setTimeout(() => {
        navigation.replace("Login");
      }, 900);
    } catch (error) {
      setIsSuccess(false);
      setApiMessage(
        error?.message ||
          "Something went wrong. Please try again."
      );
    }

    setLoading(false);
  };

  return (
    <ImageBackground
      source={flightCarImage}
      style={styles.container}
      resizeMode="cover"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.brandSection}>
            <Text style={styles.kicker}>
              Welcome to
            </Text>

            <View style={styles.logoContainer}>
              <FontAwesome5
                name="plane-departure"
                size={28}
                color="#fff"
              />
              <FontAwesome5
                name="bus"
                size={28}
                color="#fff"
                style={{ marginLeft: 12 }}
              />
            </View>

            <Text style={styles.brandName}>
              Travling
            </Text>

            <Text style={styles.brandCopy}>
              Verify OTP and set a secure
              password to access your account.
            </Text>

            <Text style={styles.brandMeta}>
              Safe password reset
            </Text>
          </View>

          <View style={styles.formPanel}>
            <Text style={styles.heading}>
              Verify OTP
            </Text>

            <Text style={styles.subheading}>
              Enter OTP and set your new
              account password.
            </Text>

            {!!apiMessage && (
              <Text
                style={[
                  styles.statusMessage,
                  isSuccess
                    ? styles.success
                    : styles.error,
                ]}
              >
                {apiMessage}
              </Text>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>OTP</Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  keyboardType="numeric"
                  maxLength={6}
                  value={form.otp}
                  onChangeText={(text) =>
                    handleChange("otp", text)
                  }
                />

                <TouchableOpacity
                  style={styles.inlineButton}
                  onPress={handleResendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator
                      color="#fff"
                      size="small"
                    />
                  ) : (
                    <Text style={styles.buttonText}>
                      Resend OTP
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {!!errors.otp && (
                <Text style={styles.errorText}>
                  {errors.otp}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                New Password
              </Text>

              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={(text) =>
                    handleChange("password", text)
                  }
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  <FontAwesome5
                    name={
                      showPassword
                        ? "eye-slash"
                        : "eye"
                    }
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {!!errors.password && (
                <Text style={styles.errorText}>
                  {errors.password}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Confirm Password
              </Text>

              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  secureTextEntry={
                    !showConfirmPassword
                  }
                  value={form.confirmPassword}
                  onChangeText={(text) =>
                    handleChange(
                      "confirmPassword",
                      text
                    )
                  }
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  <FontAwesome5
                    name={
                      showConfirmPassword
                        ? "eye-slash"
                        : "eye"
                    }
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {!!errors.confirmPassword && (
                <Text style={styles.errorText}>
                  {errors.confirmPassword}
                </Text>
              )}
            </View>

            <View style={styles.linkContainer}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("ForgotPassword")
                }
              >
                <Text style={styles.link}>
                  Back to Forgot Page
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Login")
                }
              >
                <Text style={styles.link}>
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <Text style={styles.submitText}>
                  Submit
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

export default VerifyOtp;

const styles = StyleSheet.create({
  container: {
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

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  input: {
    flex: 1,
    height: 50,
  },

  inlineButton: {
    marginLeft: 10,
    backgroundColor: "#0B5ED7",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },

  errorText: {
    color: "red",
    marginTop: 5,
    fontSize: 12,
  },

  linkContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
  },

  link: {
    color: "#0B5ED7",
    fontWeight: "600",
  },

  submitButton: {
    backgroundColor: "#0B5ED7",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
