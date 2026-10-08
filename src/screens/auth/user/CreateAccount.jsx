import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { sendRegistrationOtp, format10DigitPhoneNumber } from "../../../services/authService";
import VerifyRegistrationOtpModal from "./VerifyRegistrationOtpModal";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import AuthTextInput from "../../../components/auth/AuthTextInput";
import AuthPrimaryButton from "../../../components/auth/AuthPrimaryButton";
import { authTheme } from "../../../components/auth/authStyles";

const COUNTRY_CODE_OPTIONS = [{ value: "+91", label: "+91 India" }];
const NAME_REGEX = /^[A-Za-z\s]+$/;
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]).{8,64}$/;

const validateForm = (form) => {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = "First name required";
  else if (!NAME_REGEX.test(form.firstName.trim())) errors.firstName = "Only letters allowed";
  if (form.lastName.trim() && !NAME_REGEX.test(form.lastName.trim())) errors.lastName = "Only letters allowed";
  if (!form.countryCode) errors.countryCode = "Select code";
  const cleanMobile = format10DigitPhoneNumber(form.mobile);
  if (!cleanMobile) errors.mobile = "Mobile number required";
  else if (!PHONE_REGEX.test(cleanMobile)) errors.mobile = "Must be a 10-digit Indian number starting with 6, 7, 8, or 9";
  if (!form.email.trim() || !EMAIL_REGEX.test(form.email.trim().toLowerCase())) errors.email = "Invalid email address";
  if (!form.password) errors.password = "Password is required";
  else if (form.password.length < 8 || form.password.length > 64) errors.password = "Password must be 8-64 characters long";
  else if (!STRONG_PASSWORD_REGEX.test(form.password)) errors.password = "Password must contain uppercase, lowercase, number, and special character (@$!%*?&# etc.)";
  if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match";
  if (!form.agree) errors.agree = "You must agree to the Terms & Conditions";
  return errors;
};

export default function CreateAccount() {
  const navigation = useNavigation();
  const [form, setForm] = useState({ firstName: "", lastName: "", countryCode: "+91", mobile: "", email: "", password: "", confirmPassword: "", channel: "Mobile", agree: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const validationErrors = useMemo(() => validateForm(form), [form]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
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
      await sendRegistrationOtp({ channel: form.channel || "Mobile", phoneNumber: formattedPhone, email: formattedEmail });
      setShowOtpModal(true);
    } catch (err) {
      const errMsg = err?.message || "";
      setApiError(errMsg || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login");

  return (
    <AuthScreenLayout compact eyebrow="JOIN THE JOURNEY" title="Create your account" subtitle="One secure profile for bookings, updates, and smoother trips." onBack={goBack}>
      {!!apiError && <View style={styles.messageBox}><Ionicons name="alert-circle-outline" size={18} color={authTheme.colors.error} /><Text style={styles.messageText}>{apiError}</Text></View>}

      <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
      <View style={styles.nameRow}>
        <AuthTextInput dense label="First name" placeholder="First name" autoCapitalize="words" value={form.firstName} onChangeText={(v) => handleChange("firstName", v)} error={errors.firstName} containerStyle={styles.nameField} />
        <AuthTextInput dense label="Last name" placeholder="Last name" autoCapitalize="words" value={form.lastName} onChangeText={(v) => handleChange("lastName", v)} error={errors.lastName} containerStyle={styles.nameField} />
      </View>

      <Text style={styles.sectionLabel}>CONTACT & VERIFICATION</Text>
      <Text style={styles.fieldLabel}>Mobile number</Text>
      <View style={styles.mobileRow}>
        <View style={[styles.pickerContainer, errors.countryCode && styles.inputError]}>
          <Picker selectedValue={form.countryCode} onValueChange={(v) => handleChange("countryCode", v)} style={styles.picker}>
            {COUNTRY_CODE_OPTIONS.map((c) => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
          </Picker>
        </View>
        <View style={styles.mobileField}><AuthTextInput dense placeholder="10-digit number" keyboardType="number-pad" maxLength={10} value={form.mobile} onChangeText={(v) => handleChange("mobile", v)} error={errors.mobile} /></View>
      </View>
      <AuthTextInput dense label="Email address" icon="mail-outline" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={form.email} onChangeText={(v) => handleChange("email", v)} error={errors.email} />

      <Text style={styles.fieldLabel}>Receive verification OTP via</Text>
      <View style={styles.segmentedControl}>
        {[{ value: "Mobile", label: "Mobile SMS", icon: "call-outline" }, { value: "Email", label: "Email OTP", icon: "mail-outline" }].map((option) => {
          const active = form.channel === option.value;
          return <TouchableOpacity key={option.value} activeOpacity={0.78} style={[styles.segment, active && styles.segmentActive]} onPress={() => handleChange("channel", option.value)} accessibilityRole="radio" accessibilityState={{ checked: active }}><Ionicons name={option.icon} size={17} color={active ? "#FFFFFF" : authTheme.colors.inkSoft} /><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text></TouchableOpacity>;
        })}
      </View>

      <Text style={[styles.sectionLabel, styles.securitySection]}>SECURE YOUR ACCOUNT</Text>
      <AuthTextInput dense label="Password" icon="lock-closed-outline" placeholder="Create a strong password" secureTextEntry={!showPassword} value={form.password} onChangeText={(v) => handleChange("password", v)} error={errors.password} rightIcon={showPassword ? "eye-off-outline" : "eye-outline"} onRightPress={() => setShowPassword(!showPassword)} />
      <AuthTextInput dense label="Confirm password" icon="shield-checkmark-outline" placeholder="Repeat your password" secureTextEntry={!showConfirmPassword} value={form.confirmPassword} onChangeText={(v) => handleChange("confirmPassword", v)} error={errors.confirmPassword} rightIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"} onRightPress={() => setShowConfirmPassword(!showConfirmPassword)} />

      <TouchableOpacity activeOpacity={0.78} onPress={() => handleChange("agree", !form.agree)} style={styles.checkboxRow} accessibilityRole="checkbox" accessibilityState={{ checked: form.agree }}>
        <Ionicons name={form.agree ? "checkbox" : "square-outline"} size={22} color={form.agree ? authTheme.colors.red : authTheme.colors.slate} />
        <Text style={styles.checkboxLabel}>I agree to Pick&Book <Text style={styles.linkText}>Terms & Privacy Policy</Text></Text>
      </TouchableOpacity>
      {!!errors.agree && <Text style={styles.checkboxError}>{errors.agree}</Text>}
      <AuthPrimaryButton compact title="Create Account" onPress={handleSubmit} loading={loading} />
      <View style={styles.loginRow}><Text style={styles.loginText}>Already travelling with us?</Text><TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.loginAction}><Text style={styles.loginLink}>Sign in</Text></TouchableOpacity></View>

      <VerifyRegistrationOtpModal visible={showOtpModal} formData={form} onClose={() => setShowOtpModal(false)} onBackToEdit={() => setShowOtpModal(false)} onSuccess={(msg) => { setShowOtpModal(false); Alert.alert("Success 🎉", msg || "Account verified successfully!", [{ text: "Sign In", onPress: () => navigation.navigate("Login") }]); }} />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  messageBox: { flexDirection: "row", gap: 9, padding: 12, borderRadius: 14, backgroundColor: authTheme.colors.errorSoft, marginBottom: 18 },
  messageText: { flex: 1, fontFamily: "Inter_500Medium", color: authTheme.colors.error, fontSize: 12.5, lineHeight: 18 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9.5, letterSpacing: 1.2, color: authTheme.colors.redDeep, marginBottom: 5 },
  securitySection: { marginTop: 2 },
  nameRow: { flexDirection: "row", gap: 8 },
  nameField: { flex: 1 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10.5, color: authTheme.colors.inkSoft, marginBottom: 3 },
  mobileRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  pickerContainer: { height: 46, width: 108, borderWidth: 1, borderColor: authTheme.colors.line, borderRadius: 12, backgroundColor: "#F8F8FB", overflow: "hidden", justifyContent: "center" },
  picker: { height: 46, width: 116, color: authTheme.colors.ink, fontFamily: "Inter_500Medium" },
  mobileField: { flex: 1 },
  inputError: { borderColor: authTheme.colors.error, backgroundColor: authTheme.colors.errorSoft },
  segmentedControl: { flexDirection: "row", padding: 3, borderRadius: 13, backgroundColor: "#F1F1F5", marginBottom: 7, gap: 3 },
  segment: { flex: 1, height: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10 },
  segmentActive: { backgroundColor: authTheme.colors.redDeep },
  segmentText: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.inkSoft, fontSize: 12.5 },
  segmentTextActive: { color: "#FFFFFF" },
  checkboxRow: { flexDirection: "row", alignItems: "center", minHeight: 34, paddingHorizontal: 2, marginBottom: 2, gap: 8 },
  checkboxLabel: { fontFamily: "Inter_400Regular", fontSize: 12.5, lineHeight: 18, color: authTheme.colors.slate, flex: 1 },
  linkText: { color: authTheme.colors.redDeep, fontFamily: "Inter_600SemiBold" },
  checkboxError: { fontFamily: "Inter_500Medium", color: authTheme.colors.error, fontSize: 11.5, marginBottom: 12 },
  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 4, gap: 4 },
  loginText: { fontFamily: "Inter_400Regular", color: authTheme.colors.slate, fontSize: 13 },
  loginAction: { minHeight: 32, justifyContent: "center", paddingHorizontal: 4 },
  loginLink: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep, fontSize: 13 },
});
