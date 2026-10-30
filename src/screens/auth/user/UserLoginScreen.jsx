import React, { useContext, useState } from "react";
import { NativeModules, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

import AuthContext from "../../../context/AuthContext";
import { validateLowercaseEmail, validatePasswordNoSpaces } from "./AuthValidation";
import { AUTH_API_BASE_URL, requestAuth } from "../../../services/authService";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import AuthTextInput from "../../../components/auth/AuthTextInput";
import AuthPrimaryButton from "../../../components/auth/AuthPrimaryButton";
import AuthMethodTabs from "../../../components/auth/AuthMethodTabs";
import PhoneLoginForm from "../../../components/auth/PhoneLoginForm";
import ForgotPasswordForm from "../../../components/auth/ForgotPasswordForm";
import { authTheme } from "../../../components/auth/authStyles";
import LegalEntityFooter from "../../../components/common/LegalEntityFooter";

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
  /(^|:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(String(url || ""));

const extractStoredUser = (payload) => {
  const root = payload && typeof payload === "object" ? payload : null;
  if (!root) return null;
  const rawUser =
    root.user ?? root.profile ?? root.data?.user ?? root.data?.profile ?? root.data ?? root;
  if (!rawUser || typeof rawUser !== "object") return null;

  const firstName = rawUser.firstName ?? rawUser.FirstName ?? "";
  const lastName = rawUser.lastName ?? rawUser.LastName ?? "";
  const email = rawUser.email ?? root.email ?? "";
  const phoneNumber = rawUser.phoneNumber ?? rawUser.phone ?? rawUser.mobile ?? "";
  const id = rawUser.id ?? rawUser.userId ?? rawUser.Id ?? root.id ?? root.userId ?? root.Id ?? null;
  if (!id && !firstName && !lastName && !email && !phoneNumber) return null;

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
  const [authView, setAuthView] = useState("login");
  const [loginMethod, setLoginMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiMessage, setApiMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors = {};
    const emailError = validateLowercaseEmail(email);
    const passwordError = validatePasswordNoSpaces(password);
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiMessage("");

    try {
      const deviceInfo = getDeviceHostInfo();
      if (__DEV__ && deviceInfo.isPhysicalDevice && isLocalhostUrl(AUTH_API_BASE_URL)) {
        throw new Error("Invalid local API base URL for Expo Go on a physical device.");
      }

      const data = await requestAuth(
        "/api/Auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password }),
        },
        "Invalid email or password.",
        {
          timeoutMs: 15000,
          timeoutMessage: "Login request timed out. Please try again.",
          networkMessage: "Network unavailable. Check Wi-Fi, mobile data, or backend URL.",
          malformedMessage: "Login response was malformed. Please contact support.",
        }
      );

      if (!data || typeof data !== "object") throw new Error("Malformed login response.");
      const token = data?.token || data?.Token;
      const storedUser = extractStoredUser(data);
      if (!token) throw new Error("Login succeeded but no token was returned by the API.");

      await SecureStore.setItemAsync("token", String(token));
      await SecureStore.setItemAsync("isLoggedIn", "true");
      if (storedUser) await SecureStore.setItemAsync("user", JSON.stringify(storedUser));
      else await SecureStore.deleteItemAsync("user");

      await Promise.all([
        SecureStore.deleteItemAsync("profileImage"),
        SecureStore.deleteItemAsync("challengeId"),
        SecureStore.deleteItemAsync("role"),
        SecureStore.deleteItemAsync("x-user-id"),
        SecureStore.deleteItemAsync("X-User-Id"),
      ]);

      const storedToken = await SecureStore.getItemAsync("token");
      const storedUserValue = await SecureStore.getItemAsync("user");
      if (!storedToken) throw new Error("Token storage verification failed.");
      if (storedUser && !storedUserValue) throw new Error("User storage verification failed.");

      setApiMessage("Login successful.");
      signIn();
      navigation.reset({ index: 0, routes: [{ name: "DashBoard" }] });
    } catch (error) {
      const statusCode = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.Message ||
        error?.message ||
        "Something went wrong.";

      if (statusCode === 401 || /invalid credentials/i.test(message)) {
        setApiMessage("Invalid credentials. Please check your email and password.");
      } else if (/timed out/i.test(message)) {
        setApiMessage("Login timed out. Please retry.");
      } else if (/network/i.test(message)) {
        setApiMessage("Network unavailable. Confirm the backend is reachable from your device.");
      } else if (/missing token|no token/i.test(message)) {
        setApiMessage("Login response did not include a token.");
      } else {
        setApiMessage(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const success = /successful/i.test(apiMessage);

  return (
    <AuthScreenLayout
      login
      subtitle="Sign in to manage your trips, travels and bookings"
      footer={<LegalEntityFooter variant="overlay" />}
      ticketFooter={authView === "login" ? (
        <View style={styles.createRow}>
          <Text style={styles.createText}>New to Pick&Book?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("CreateAccount")} style={styles.createHit} accessibilityRole="button">
            <Text style={styles.createLink}>Create account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.backToLogin} onPress={() => setAuthView("login")} accessibilityRole="button">
          <Ionicons name="arrow-back" size={16} color={authTheme.colors.redDeep} />
          <Text style={styles.createLink}>Back to sign in</Text>
        </TouchableOpacity>
      )}
    >
      <View style={authView === "login" ? undefined : styles.hidden}>
        <AuthMethodTabs
          value={loginMethod}
          onChange={(method) => {
            setLoginMethod(method);
            setApiMessage("");
          }}
        />

        <View style={loginMethod === "email" ? undefined : styles.hidden}>
          {!!apiMessage && (
            <View style={[styles.messageBox, success ? styles.successBox : styles.errorBox]}>
              <Ionicons
                name={success ? "checkmark-circle-outline" : "alert-circle-outline"}
                size={18}
                color={success ? authTheme.colors.good : authTheme.colors.error}
              />
              <Text
                style={[styles.messageText, success ? styles.successText : styles.errorText]}
                numberOfLines={3}
              >
                {apiMessage}
              </Text>
            </View>
          )}

          <AuthTextInput
            label="Email address"
            icon="mail-outline"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            error={errors.email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors((prev) => ({ ...prev, email: text ? validateLowercaseEmail(text) : "" }));
            }}
          />
          <AuthTextInput
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            value={password}
            error={errors.password}
            rightIcon={showPassword ? "eye-outline" : "eye-off-outline"}
            onRightPress={() => setShowPassword((visible) => !visible)}
            containerStyle={styles.passwordField}
            onChangeText={(text) => {
              setPassword(text);
              setErrors((prev) => ({ ...prev, password: text ? validatePasswordNoSpaces(text) : "" }));
            }}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            onPress={() => setAuthView("forgot")}
            style={styles.forgotPasswordHit}
            accessibilityRole="button"
          >
            <Text style={styles.inlineLink}>Forgot password?</Text>
          </TouchableOpacity>
          <AuthPrimaryButton title="Sign In" onPress={handleLogin} loading={loading} />
        </View>

        <View style={loginMethod === "phone" ? undefined : styles.hidden}>
          <PhoneLoginForm navigation={navigation} />
        </View>

      </View>

      <View style={authView === "forgot" ? undefined : styles.hidden}>
        <ForgotPasswordForm navigation={navigation} onBack={() => setAuthView("login")} showBackAction={false} />
      </View>
    </AuthScreenLayout>
  );
};

export default UserLoginScreen;

const styles = StyleSheet.create({
  hidden: { display: "none" },
  messageBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  successBox: { backgroundColor: authTheme.colors.successSoft, borderColor: "#C8EBDD" },
  errorBox: { backgroundColor: authTheme.colors.errorSoft, borderColor: "#F5CDD2" },
  messageText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  successText: { color: "#147A58" },
  errorText: { color: authTheme.colors.error },
  passwordField: { marginBottom: 0 },
  forgotPasswordHit: {
    minHeight: 38,
    alignSelf: "flex-end",
    justifyContent: "center",
    paddingLeft: 12,
    marginBottom: 8,
  },
  inlineLink: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: authTheme.colors.redDeep },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 0,
    gap: 3,
  },
  backToLogin: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  createText: { fontFamily: "Inter_400Regular", color: authTheme.colors.slate, fontSize: 13 },
  createHit: { minHeight: 40, justifyContent: "center", paddingHorizontal: 4 },
  createLink: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep, fontSize: 13 },
});
