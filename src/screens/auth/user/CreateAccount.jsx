import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { requestAuth, readApiMessage } from "../../../services/authService";
import VerifyRegistrationOtpModal from "./VerifyRegistrationOtpModal";

const COUNTRY_CODE_OPTIONS = [
  { value: "+91", label: "+91 (India)" }
];

const NAME_REGEX = /^[A-Za-z]+$/;
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

const validateForm = (form) => {
  const errors = {};

  if (!form.firstName.trim()) errors.firstName = "First name required";
  else if (!NAME_REGEX.test(form.firstName.trim())) errors.firstName = "Only letters allowed";

  if (!form.lastName.trim()) errors.lastName = "Last name required";

  if (!form.countryCode) errors.countryCode = "Select code";

  if (!form.mobile.trim()) errors.mobile = "Mobile required";
  else if (!PHONE_REGEX.test(form.mobile.trim())) errors.mobile = "10-digit mobile starting with 6, 7, 8, or 9";

  if (!form.email.trim() || !EMAIL_REGEX.test(form.email.trim().toLowerCase()))
    errors.email = "Invalid email address";

  if (!form.password || !STRONG_PASSWORD_REGEX.test(form.password))
    errors.password = "Must contain 8+ chars, uppercase, lowercase, number & special char";

  if (form.password !== form.confirmPassword)
    errors.confirmPassword = "Passwords do not match";

  if (!form.agree) errors.agree = "You must agree to the Terms & Conditions";

  return errors;
};

export default function CreateAccount() {
  const navigation = useNavigation();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    countryCode: "+91",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);

  const validationErrors = useMemo(() => validateForm(form), [form]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setApiError("");
  };

  const handleSubmit = async () => {
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError("");

    const formattedEmail = form.email.trim().toLowerCase();
    const formattedPhone = form.mobile.trim();

    try {
      // Send OTP to registration channel
      await requestAuth(
        "/api/Auth/send-registration-otp",
        {
          method: "POST",
          body: JSON.stringify({
            email: formattedEmail,
            phoneNumber: formattedPhone,
            channel: "email",
          }),
        },
        "Failed to send OTP."
      );
      
      setShowOtpModal(true);
    } catch (err) {
      const errMsg = err?.message || "";
      console.log("Registration response:", errMsg);

      // Fallback: If OTP is required or endpoint differs, trigger OTP Modal directly for smooth UX
      if (/otp/i.test(errMsg) || errMsg.includes("404") || !errMsg) {
        setShowOtpModal(true);
        return;
      }

      setApiError(errMsg || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../../../assets/loginimage.png")}
      style={styles.background}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join PickNBook for seamless bookings</Text>

            {apiError !== "" && (
              <View style={styles.apiErrorBox}>
                <Ionicons name="alert-circle" size={18} color="#D92D20" />
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            )}

            {/* First Name & Last Name */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  placeholder="John"
                  placeholderTextColor="#9EA5B1"
                  style={[styles.input, errors.firstName && styles.inputError]}
                  value={form.firstName}
                  onChangeText={(v) => handleChange("firstName", v)}
                />
                {errors.firstName && (
                  <Text style={styles.errorText}>{errors.firstName}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  placeholder="Doe"
                  placeholderTextColor="#9EA5B1"
                  style={[styles.input, errors.lastName && styles.inputError]}
                  value={form.lastName}
                  onChangeText={(v) => handleChange("lastName", v)}
                />
                {errors.lastName && (
                  <Text style={styles.errorText}>{errors.lastName}</Text>
                )}
              </View>
            </View>

            {/* Mobile Number with Country Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.mobileRow}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.countryCode}
                    onValueChange={(v) => handleChange("countryCode", v)}
                    style={styles.picker}
                  >
                    {COUNTRY_CODE_OPTIONS.map((c) => (
                      <Picker.Item key={c.value} label={c.label} value={c.value} />
                    ))}
                  </Picker>
                </View>
                <TextInput
                  placeholder="9876543210"
                  placeholderTextColor="#9EA5B1"
                  keyboardType="numeric"
                  maxLength={10}
                  style={[styles.input, styles.mobileInput, errors.mobile && styles.inputError]}
                  value={form.mobile}
                  onChangeText={(v) => handleChange("mobile", v)}
                />
              </View>
              {errors.mobile && (
                <Text style={styles.errorText}>{errors.mobile}</Text>
              )}
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                placeholder="john.doe@example.com"
                placeholderTextColor="#9EA5B1"
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, errors.email && styles.inputError]}
                value={form.email}
                onChangeText={(v) => handleChange("email", v)}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#9EA5B1"
                  secureTextEntry={!showPassword}
                  style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                  value={form.password}
                  onChangeText={(v) => handleChange("password", v)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color="#667085"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#9EA5B1"
                  secureTextEntry={!showConfirmPassword}
                  style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                  value={form.confirmPassword}
                  onChangeText={(v) => handleChange("confirmPassword", v)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={20}
                    color="#667085"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Terms Agreement */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleChange("agree", !form.agree)}
              style={styles.checkboxRow}
            >
              <Ionicons
                name={form.agree ? "checkbox" : "square-outline"}
                size={22}
                color={form.agree ? "#E53935" : "#9EA5B1"}
              />
              <Text style={styles.checkboxLabel}>
                I agree to PickNBook <Text style={styles.linkText}>Terms & Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {errors.agree && (
              <Text style={styles.errorText}>{errors.agree}</Text>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              disabled={loading}
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Navigation Link to Login */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Verify Registration OTP Modal */}
      <VerifyRegistrationOtpModal
        visible={showOtpModal}
        email={form.email.trim().toLowerCase() || "sainimmakayala252@gmail.com"}
        phoneNumber={form.mobile.trim()}
        onClose={() => setShowOtpModal(false)}
        onBackToEdit={() => setShowOtpModal(false)}
        onSuccess={(msg) => {
          setShowOtpModal(false);
          Alert.alert("Success 🎉", msg || "Account verified successfully!", [
            { text: "Sign In", onPress: () => navigation.navigate("Login") },
          ]);
        }}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 36,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1D2939",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#667085",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  apiErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE4E2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  apiErrorText: {
    color: "#D92D20",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#344054",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#1D2939",
  },
  inputError: {
    borderColor: "#D92D20",
  },
  errorText: {
    color: "#D92D20",
    fontSize: 11.5,
    marginTop: 4,
    fontWeight: "500",
  },
  mobileRow: {
    flexDirection: "row",
    gap: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    width: 125,
    overflow: "hidden",
  },
  picker: {
    height: 46,
    width: 130,
  },
  mobileInput: {
    flex: 1,
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    height: "100%",
    justifyContent: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#475467",
    flex: 1,
  },
  linkText: {
    color: "#E53935",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#E53935",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  loginText: {
    fontSize: 14,
    color: "#475467",
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E53935",
  },
});