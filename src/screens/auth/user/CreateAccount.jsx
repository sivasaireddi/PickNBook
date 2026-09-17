import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  sendRegistrationOtp,
  readApiMessage,
  format10DigitPhoneNumber,
} from "../../../services/authService";
import VerifyRegistrationOtpModal from "./VerifyRegistrationOtpModal";

const COUNTRY_CODE_OPTIONS = [
  { value: "+91", label: "+91 India" }
];

const NAME_REGEX = /^[A-Za-z\s]+$/;
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]).{8,64}$/;

const validateForm = (form) => {
  const errors = {};

  if (!form.firstName.trim()) errors.firstName = "First name required";
  else if (!NAME_REGEX.test(form.firstName.trim())) errors.firstName = "Only letters allowed";

  if (form.lastName.trim() && !NAME_REGEX.test(form.lastName.trim())) {
    errors.lastName = "Only letters allowed";
  }

  if (!form.countryCode) errors.countryCode = "Select code";

  const cleanMobile = format10DigitPhoneNumber(form.mobile);
  if (!cleanMobile) errors.mobile = "Mobile number required";
  else if (!PHONE_REGEX.test(cleanMobile))
    errors.mobile = "Must be a 10-digit Indian number starting with 6, 7, 8, or 9";

  if (!form.email.trim() || !EMAIL_REGEX.test(form.email.trim().toLowerCase()))
    errors.email = "Invalid email address";

  if (!form.password) {
    errors.password = "Password is required";
  } else if (form.password.length < 8 || form.password.length > 64) {
    errors.password = "Password must be 8-64 characters long";
  } else if (!STRONG_PASSWORD_REGEX.test(form.password)) {
    errors.password =
      "Password must contain uppercase, lowercase, number, and special character (@$!%*?&# etc.)";
  }

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
    channel: "Mobile",
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
    const formattedPhone = format10DigitPhoneNumber(form.mobile);

    try {
      // Send OTP to selected registration channel ("Mobile" or "Email")
      await sendRegistrationOtp({
        channel: form.channel || "Mobile",
        phoneNumber: formattedPhone,
        email: formattedEmail,
      });

      setShowOtpModal(true);
    } catch (err) {
      const errMsg = err?.message || "";
      console.log("Registration OTP send error:", errMsg);

      // Fallback: If OTP is required or modal flow testing
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
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Top Header Bar for Back Button */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Login");
              }
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#1D2939" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Form Card Container */}
          <View style={styles.card}>
            <Text style={styles.title} numberOfLines={1}>Create Account</Text>

            {apiError !== "" && (
              <View style={styles.apiErrorBox}>
                <Ionicons name="alert-circle" size={16} color="#D92D20" />
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            )}

            {/* First Name & Last Name */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  placeholder="Enter first name"
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
                  placeholder="Enter last name"
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
                  placeholder="Enter mobile number"
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
                placeholder="Enter email address"
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

            {/* OTP Verification Channel Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Receive Verification OTP via</Text>
              <View style={styles.channelRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.channelBtn,
                    form.channel === "Mobile" && styles.channelBtnActive,
                  ]}
                  onPress={() => handleChange("channel", "Mobile")}
                >
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color={form.channel === "Mobile" ? "#FFFFFF" : "#475467"}
                  />
                  <Text
                    style={[
                      styles.channelBtnText,
                      form.channel === "Mobile" && styles.channelBtnTextActive,
                    ]}
                  >
                    Mobile SMS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.channelBtn,
                    form.channel === "Email" && styles.channelBtnActive,
                  ]}
                  onPress={() => handleChange("channel", "Email")}
                >
                  <Ionicons
                    name="mail-outline"
                    size={15}
                    color={form.channel === "Email" ? "#FFFFFF" : "#475467"}
                  />
                  <Text
                    style={[
                      styles.channelBtnText,
                      form.channel === "Email" && styles.channelBtnTextActive,
                    ]}
                  >
                    Email OTP
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="Enter password"
                  placeholderTextColor="#9EA5B1"
                  secureTextEntry={!showPassword}
                  style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                  value={form.password}
                  onChangeText={(v) => handleChange("password", v)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye" : "eye-off"}
                    size={18}
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
                  placeholder="Confirm password"
                  placeholderTextColor="#9EA5B1"
                  secureTextEntry={!showConfirmPassword}
                  style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                  value={form.confirmPassword}
                  onChangeText={(v) => handleChange("confirmPassword", v)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={18}
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
                size={20}
                color={form.agree ? "#E53935" : "#9EA5B1"}
                style={styles.checkboxIcon}
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
              activeOpacity={0.85}
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
        formData={form}
        onClose={() => setShowOtpModal(false)}
        onBackToEdit={() => setShowOtpModal(false)}
        onSuccess={(msg) => {
          setShowOtpModal(false);
          Alert.alert("Success 🎉", msg || "Account verified successfully!", [
            { text: "Sign In", onPress: () => navigation.navigate("Login") },
          ]);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#EAECF0",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1D2939",
    textAlign: "center",
    marginBottom: 12,
  },
  apiErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECDCA",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
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
    gap: 10,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344054",
    marginBottom: 4,
  },
  input: {
    height: 48,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 11,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#1D2939",
  },
  inputError: {
    borderColor: "#D92D20",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#D92D20",
    fontSize: 11.5,
    marginTop: 3,
    fontWeight: "500",
  },
  mobileRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  pickerContainer: {
    height: 48,
    width: 125,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 11,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    overflow: "hidden",
  },
  picker: {
    height: 48,
    width: 135,
    color: "#1D2939",
  },
  mobileInput: {
    flex: 1,
    height: 48,
  },
  channelRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  channelBtn: {
    flex: 1,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 11,
    backgroundColor: "#F2F4F7",
    borderWidth: 1,
    borderColor: "#EAECF0",
  },
  channelBtnActive: {
    backgroundColor: "#E53935",
    borderColor: "#E53935",
  },
  channelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475467",
  },
  channelBtnTextActive: {
    color: "#FFFFFF",
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
    right: 2,
    width: 40,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  checkboxIcon: {
    marginTop: 1,
  },
  checkboxLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: "#475467",
    flex: 1,
  },
  linkText: {
    color: "#E53935",
    fontWeight: "600",
  },
  button: {
    height: 48,
    backgroundColor: "#E53935",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
    alignItems: "center",
    marginTop: 10,
    paddingBottom: 2,
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