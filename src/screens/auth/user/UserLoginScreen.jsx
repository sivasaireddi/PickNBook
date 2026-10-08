import React, { useContext, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  NativeModules,
  Animated,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";


import AuthContext from "../../../context/AuthContext";
import {
  validateLowercaseEmail,
  validatePasswordNoSpaces,
} from "./AuthValidation";
import { generateMixedCaptcha, validateCaptcha } from "./Captcha";
import {
  AUTH_API_BASE_URL,
  requestAuth,
} from "../../../services/authService";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import AuthTextInput from "../../../components/auth/AuthTextInput";
import AuthPrimaryButton from "../../../components/auth/AuthPrimaryButton";
import { authTheme } from "../../../components/auth/authStyles";

const buildFullName = (firstName, lastName) =>
  [firstName, lastName].filter(Boolean).join(" ").trim();

const getDeviceHostInfo = () => {
  const expoHostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.debuggerHost ||
    Constants?.manifest?.debuggerHost ||
    "";

  return {
    expoHostUri,
    platform: Platform.OS,
    isPhysicalDevice:
      Platform.OS !== "web" &&
      !NativeModules?.SourceCode?.scriptURL?.includes("localhost") &&
      !NativeModules?.SourceCode?.scriptURL?.includes("127.0.0.1"),
  };
};

const isLocalhostUrl = (url) =>
  /(^|:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(
    String(url || "")
  );

const extractStoredUser = (payload) => {
  const root = payload && typeof payload === "object" ? payload : null;

  if (!root) {
    return null;
  }

  const rawUser =
    root.user ??
    root.profile ??
    root.data?.user ??
    root.data?.profile ??
    root.data ??
    root;

  if (!rawUser || typeof rawUser !== "object") {
    return null;
  }

  const firstName = rawUser.firstName ?? rawUser.FirstName ?? "";
  const lastName = rawUser.lastName ?? rawUser.LastName ?? "";
  const email = rawUser.email ?? root.email ?? "";
  const phoneNumber =
    rawUser.phoneNumber ?? rawUser.phone ?? rawUser.mobile ?? "";
  const id =
    rawUser.id ??
    rawUser.userId ??
    rawUser.Id ??
    root.id ??
    root.userId ??
    root.Id ??
    null;

  if (!id && !firstName && !lastName && !email && !phoneNumber) {
    return null;
  }

  return {
    ...rawUser,
    id,
    firstName,
    lastName,
    email,
    phoneNumber,
    fullName: buildFullName(firstName, lastName),
  };
};

const UserLoginScreen = ({ navigation }) => {
  const { signIn } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [generatedCaptcha, setGeneratedCaptcha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiMessage, setApiMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;

  const refreshCaptcha = () => {
    setGeneratedCaptcha(generateMixedCaptcha());
  };

  const handleCaptchaRefresh = () => {
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start();
    refreshCaptcha();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const validate = () => {
    const err = {};
    const emailError = validateLowercaseEmail(email);
    const passwordError = validatePasswordNoSpaces(password);
    const captchaError = validateCaptcha(captcha, generatedCaptcha);

    if (emailError) {
      err.email = emailError;
    }

    if (passwordError) {
      err.password = passwordError;
    }

    if (captchaError) {
      err.captcha = captchaError;
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setApiMessage("");

    try {
      const deviceInfo = getDeviceHostInfo();

      if (__DEV__ && deviceInfo.isPhysicalDevice && isLocalhostUrl(AUTH_API_BASE_URL)) {
        throw new Error(
          "Invalid local API base URL for Expo Go on a physical device."
        );
      }

      const data = await requestAuth(
        "/api/Auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        },
        "Invalid email or password.",
        {
          timeoutMs: 15000,
          timeoutMessage: "Login request timed out. Please try again.",
          networkMessage:
            "Network unavailable. Check Wi-Fi, mobile data, or backend URL.",
          malformedMessage:
            "Login response was malformed. Please contact support.",
        },
      );

      if (!data || typeof data !== "object") {
        throw new Error("Malformed login response.");
      }

      const token = data?.token || data?.Token;
      const storedUser = extractStoredUser(data);

      console.log("[UserLoginScreen] Login successful.");

      if (!token) {
        throw new Error(
          "Login succeeded but no token was returned by the API."
        );
      }

      await SecureStore.setItemAsync("token", String(token));

      await SecureStore.setItemAsync("isLoggedIn", "true");

      if (storedUser) {
        await SecureStore.setItemAsync("user", JSON.stringify(storedUser));
      } else {
        await SecureStore.deleteItemAsync("user");
      }

      await Promise.all([
        SecureStore.deleteItemAsync("profileImage"),
        SecureStore.deleteItemAsync("challengeId"),
        SecureStore.deleteItemAsync("role"),
        SecureStore.deleteItemAsync("x-user-id"),
        SecureStore.deleteItemAsync("X-User-Id"),
      ]);

      const storedToken = await SecureStore.getItemAsync("token");
      const storedUserValue = await SecureStore.getItemAsync("user");

      if (!storedToken) {
        throw new Error("Token storage verification failed.");
      }

      if (storedUser && !storedUserValue) {
        throw new Error("User storage verification failed.");
      }

      setApiMessage("Login successful.");
      signIn();
      navigation.reset({
        index: 0,
        routes: [{ name: "DashBoard" }],
      });
      return;
    } catch (error) {
      const statusCode = error?.response?.status;
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.Message ||
        error?.message ||
        "Something went wrong.";

      if (statusCode === 401 || /invalid credentials/i.test(apiMessage)) {
        setApiMessage("Invalid credentials. Please check your email and password.");
      } else if (/timed out/i.test(apiMessage)) {
        setApiMessage("Login timed out. Please retry.");
      } else if (/network/i.test(apiMessage)) {
        setApiMessage(
          "Network unavailable. Confirm the backend is reachable from your device."
        );
      } else if (/missing token|no token/i.test(apiMessage)) {
        setApiMessage("Login response did not include a token.");
      } else {
        setApiMessage(apiMessage);
      }

      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const success = apiMessage.includes("Successful") || apiMessage.includes("successful");

  return (
    <AuthScreenLayout eyebrow="WELCOME BACK" title="Continue your journey" subtitle="Sign in to manage your trips, travellers, and bookings.">
      {!!apiMessage && (
        <View style={[premiumStyles.messageBox, success ? premiumStyles.successBox : premiumStyles.errorBox]}>
          <Ionicons name={success ? "checkmark-circle-outline" : "alert-circle-outline"} size={18} color={success ? authTheme.colors.good : authTheme.colors.error} />
          <Text style={[premiumStyles.messageText, success ? premiumStyles.successText : premiumStyles.errorText]}>{apiMessage}</Text>
        </View>
      )}

      <AuthTextInput label="Email address" icon="mail-outline" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} error={errors.email} onChangeText={(text) => { setEmail(text); setErrors((prev) => ({ ...prev, email: text ? validateLowercaseEmail(text) : "" })); }} />
      <View>
        <AuthTextInput label="Password" icon="lock-closed-outline" placeholder="Enter your password" secureTextEntry={!showPassword} value={password} error={errors.password} rightIcon={showPassword ? "eye-off-outline" : "eye-outline"} onRightPress={() => setShowPassword(!showPassword)} containerStyle={premiumStyles.passwordField} onChangeText={(text) => { setPassword(text); setErrors((prev) => ({ ...prev, password: text ? validatePasswordNoSpaces(text) : "" })); }} />
        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={premiumStyles.forgotPasswordHit}><Text style={premiumStyles.inlineLink}>Forgot password?</Text></TouchableOpacity>
      </View>

      <View style={premiumStyles.captchaSection}>
        <View style={premiumStyles.captchaHeading}><View><Text style={premiumStyles.captchaKicker}>SECURITY CHECK</Text><Text style={premiumStyles.captchaHelper}>Type the code shown below</Text></View><Ionicons name="shield-checkmark-outline" size={21} color={authTheme.colors.redDeep} /></View>
        <View style={premiumStyles.captchaDisplay}>
          <Text style={premiumStyles.captchaCode}>{generatedCaptcha}</Text>
          <TouchableOpacity onPress={handleCaptchaRefresh} activeOpacity={0.7} style={premiumStyles.refreshButton} accessibilityRole="button" accessibilityLabel="Refresh captcha">
            <Animated.View style={{ transform: [{ rotate: spin }] }}><MaterialIcons name="refresh" size={19} color={authTheme.colors.redDeep} /></Animated.View>
            <Text style={premiumStyles.refreshText}>New code</Text>
          </TouchableOpacity>
        </View>
        <AuthTextInput icon="key-outline" placeholder="Enter captcha" autoCapitalize="none" autoCorrect={false} value={captcha} error={errors.captcha} containerStyle={premiumStyles.captchaInput} onChangeText={(text) => { setCaptcha(text); setErrors((prev) => ({ ...prev, captcha: text ? validateCaptcha(text, generatedCaptcha) : "" })); }} />
      </View>

      <AuthPrimaryButton title="Sign In" onPress={handleLogin} loading={loading} />

      <View style={premiumStyles.dividerRow}><View style={premiumStyles.divider} /><Text style={premiumStyles.dividerText}>OR CONTINUE WITH</Text><View style={premiumStyles.divider} /></View>
      <TouchableOpacity style={premiumStyles.mobileButton} onPress={() => navigation.navigate("MobileLoginScreen")} activeOpacity={0.76} accessibilityRole="button"><View style={premiumStyles.mobileIcon}><Ionicons name="phone-portrait-outline" size={19} color={authTheme.colors.redDeep} /></View><View style={premiumStyles.mobileCopy}><Text style={premiumStyles.mobileTitle}>Mobile OTP</Text><Text style={premiumStyles.mobileSubtitle}>A quick, password-free sign in</Text></View><Ionicons name="chevron-forward" size={19} color={authTheme.colors.slate} /></TouchableOpacity>
      <View style={premiumStyles.createRow}><Text style={premiumStyles.createText}>New to Pick&Book?</Text><TouchableOpacity onPress={() => navigation.navigate("CreateAccount")} style={premiumStyles.createHit}><Text style={premiumStyles.createLink}>Create account</Text></TouchableOpacity></View>
    </AuthScreenLayout>
  );
};

export default UserLoginScreen;

const premiumStyles = StyleSheet.create({
  messageBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 14, marginBottom: 17, borderWidth: 1 },
  successBox: { backgroundColor: authTheme.colors.successSoft, borderColor: "#C8EBDD" },
  errorBox: { backgroundColor: authTheme.colors.errorSoft, borderColor: "#F5CDD2" },
  messageText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12.5, lineHeight: 18 },
  successText: { color: "#147A58" },
  errorText: { color: authTheme.colors.error },
  passwordField: { marginBottom: 0 },
  forgotPasswordHit: { minHeight: 30, alignSelf: "flex-end", justifyContent: "center", paddingLeft: 12, marginBottom: 4 },
  inlineLink: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: authTheme.colors.redDeep },
  captchaSection: { backgroundColor: authTheme.colors.surfaceSoft, borderRadius: 18, borderWidth: 1, borderColor: "#F3DDDE", padding: 14, marginBottom: 18 },
  captchaHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  captchaKicker: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.25, color: authTheme.colors.redDeep },
  captchaHelper: { fontFamily: "Inter_400Regular", fontSize: 11.5, color: authTheme.colors.slate, marginTop: 3 },
  captchaDisplay: { height: 52, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EED4D6", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 8 },
  captchaCode: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, letterSpacing: 4.5, color: authTheme.colors.ink },
  refreshButton: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFF0F1", borderRadius: 10, paddingHorizontal: 10 },
  refreshText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: authTheme.colors.redDeep },
  captchaInput: { marginTop: 10, marginBottom: 0 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: authTheme.colors.line },
  dividerText: { fontFamily: "Inter_600SemiBold", fontSize: 9.5, letterSpacing: 1, color: authTheme.colors.slate },
  mobileButton: { minHeight: 64, flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: authTheme.colors.line, paddingHorizontal: 12, backgroundColor: "#FAFAFC" },
  mobileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F1", marginRight: 11 },
  mobileCopy: { flex: 1 },
  mobileTitle: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.ink, fontSize: 13.5 },
  mobileSubtitle: { fontFamily: "Inter_400Regular", color: authTheme.colors.slate, fontSize: 11.5, marginTop: 2 },
  createRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: 16, gap: 3 },
  createText: { fontFamily: "Inter_400Regular", color: authTheme.colors.slate, fontSize: 13 },
  createHit: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  createLink: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep, fontSize: 13 },
});
