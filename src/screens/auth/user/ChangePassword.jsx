import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import AuthContext from "../../../context/AuthContext";
import {
  readApiMessage,
  requestAuth,
} from "../../../services/authService";
import { requireAuthToken, clearAuthSession } from "../../../utils/authSession";
import {
  validatePasswordNoSpaces,
  validateStrongPassword,
} from "./AuthValidation";

const flightCarImage = require("../../../../assets/loginimage.png");

function ChangePassword({ navigation }) {
  const { signOut } = useContext(AuthContext);
  const oldPasswordInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [showCurrent, setShowCurrent] =
    useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] =
    useState(false);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] =
    useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    oldPasswordInputRef.current?.focus();
  }, []);

  const clearSession = async () => {
    try {
      await clearAuthSession();
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err) {
      console.log("LOGOUT ERROR:", err.message);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;

    const newErrors = {};

    const currentPasswordError = validatePasswordNoSpaces(
      currentPassword,
      "Old password"
    );
    const newPasswordError = validateStrongPassword(
      newPassword,
      "New password"
    );
    const confirmPasswordError = validatePasswordNoSpaces(
      confirmPassword,
      "Confirm password"
    );

    if (currentPasswordError) {
      newErrors.currentPassword = currentPasswordError;
    }

    if (newPasswordError) {
      newErrors.newPassword = newPasswordError;
    }

    if (confirmPasswordError) {
      newErrors.confirmPassword = confirmPasswordError;
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSuccess(false);
      setStatusMessage("Please fix the highlighted fields.");
      return;
    }

    let token;

    try {
      token = await requireAuthToken(
        "Session expired. Please login again."
      );
    } catch (error) {
      setErrors({});
      setIsSuccess(false);
      setStatusMessage(error.message);

      setTimeout(() => {
        clearSession();
      }, 1200);

      return;
    }

    setLoading(true);
    setStatusMessage("");

    try {
      const payload = await requestAuth(
        "/api/Auth/change-password",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            oldPassword: currentPassword,
            newPassword,
          }),
        },
        "Unable to change password."
      );

      setErrors({});
      setIsSuccess(true);
      setStatusMessage(
        readApiMessage(
          payload,
          "Password changed successfully. Please sign in again."
        )
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        clearSession();
      }, 1200);
    } catch (error) {
      const message =
        error?.message ||
        "Something went wrong. Please try again.";

      setIsSuccess(false);
      setStatusMessage(message);

      if (
        /session expired|unauthorized|invalid token|login again/i.test(
          message
        )
      ) {
        setTimeout(() => {
          clearSession();
        }, 1200);
      }
    }

    setLoading(false);
  };

  return (
    <ImageBackground
      source={flightCarImage}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.brandSection}>
            <Text style={styles.kicker}>Welcome to</Text>

            <View style={styles.logoRow}>
              <MaterialCommunityIcons
                name="bus"
                size={34}
                color="#fff"
              />
            </View>

            <Text style={styles.brandName}>Travling</Text>

            <Text style={styles.brandCopy}>
              Plan your bus and holiday
              trips with one secure traveler account.
            </Text>

            <Text style={styles.brandMeta}>
              Travel smarter. Manage bookings faster.
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.heading}>
              Change Password
            </Text>

            <Text style={styles.subheading}>
              Update your account password to keep your
              trips secure.
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
              <Text style={styles.label}>Old Password</Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  ref={oldPasswordInputRef}
                  style={styles.input}
                  placeholder="Enter old password"
                  placeholderTextColor="#888"
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    setErrors((prev) => ({
                      ...prev,
                      currentPassword: text
                        ? validatePasswordNoSpaces(
                            text,
                            "Old password"
                          )
                        : "",
                    }));
                    setStatusMessage("");
                  }}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowCurrent(!showCurrent)
                  }
                >
                  <Ionicons
                    name={showCurrent ? "eye-off" : "eye"}
                    size={22}
                    color="#555"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldError}>
                {errors.currentPassword || " "}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#888"
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    setErrors((prev) => ({
                      ...prev,
                      newPassword: text
                        ? validateStrongPassword(
                            text,
                            "New password"
                          )
                        : "",
                    }));
                    setStatusMessage("");
                  }}
                />

                <TouchableOpacity
                  onPress={() => setShowNew(!showNew)}
                >
                  <Ionicons
                    name={showNew ? "eye-off" : "eye"}
                    size={22}
                    color="#555"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldError}>
                {errors.newPassword || " "}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Confirm Password
              </Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#888"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setErrors((prev) => ({
                      ...prev,
                      confirmPassword: text
                        ? validatePasswordNoSpaces(
                            text,
                            "Confirm password"
                          )
                        : "",
                    }));
                    setStatusMessage("");
                  }}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowConfirm(!showConfirm)
                  }
                >
                  <Ionicons
                    name={showConfirm ? "eye-off" : "eye"}
                    size={22}
                    color="#555"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldError}>
                {errors.confirmPassword || " "}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Update Password
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  navigation.canGoBack()
                    ? navigation.goBack()
                    : navigation.navigate("DashBoard")
                }
              >
                <Text style={styles.secondaryButtonText}>
                  Back
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footnote}>
              Your details are protected with secure
              authentication.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

export default ChangePassword;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
  },

  brandSection: {
    backgroundColor: "#1d4ed8",
    padding: 30,
    alignItems: "center",
  },

  kicker: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
  },

  logoRow: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 15,
  },

  brandName: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },

  brandCopy: {
    color: "#e5e7eb",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },

  brandMeta: {
    color: "#dbeafe",
    fontSize: 14,
  },

  formSection: {
    padding: 25,
  },

  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },

  subheading: {
    color: "#6b7280",
    marginBottom: 20,
    fontSize: 15,
  },

  statusMessage: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 14,
  },

  success: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },

  error: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },

  field: {
    marginBottom: 10,
  },

  label: {
    marginBottom: 6,
    fontWeight: "600",
    color: "#111827",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },

  input: {
    flex: 1,
    height: 50,
    color: "#111827",
  },

  fieldError: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 4,
    minHeight: 18,
  },

  buttonContainer: {
    marginTop: 15,
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "600",
  },

  footnote: {
    marginTop: 20,
    textAlign: "center",
    color: "#6b7280",
    fontSize: 13,
  },
});
