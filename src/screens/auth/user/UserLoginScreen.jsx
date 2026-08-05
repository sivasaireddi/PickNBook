import React, { useContext, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
  NativeModules,
  Animated,
  Image,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";


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

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [captchaFocused, setCaptchaFocused] = useState(false);

  // Animated refs
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Logo Scale & Fade
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoFade = useRef(new Animated.Value(0)).current;

  // Input Focus Scales
  const emailScale = useRef(new Animated.Value(1)).current;
  const passwordScale = useRef(new Animated.Value(1)).current;
  const captchaInputScale = useRef(new Animated.Value(1)).current;

  // Background Blob Float Positions
  const blob1XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blob2XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blob3XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Sequential inputs animations
  const emailAnimFade = useRef(new Animated.Value(0)).current;
  const emailAnimY = useRef(new Animated.Value(15)).current;
  const passAnimFade = useRef(new Animated.Value(0)).current;
  const passAnimY = useRef(new Animated.Value(15)).current;
  const captchaAnimFade = useRef(new Animated.Value(0)).current;
  const captchaAnimY = useRef(new Animated.Value(15)).current;
  const buttonAnimFade = useRef(new Animated.Value(0)).current;
  const buttonAnimY = useRef(new Animated.Value(15)).current;

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

  const handleFocus = (animVal) => {
    Animated.timing(animVal, {
      toValue: 1.015,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = (animVal) => {
    Animated.timing(animVal, {
      toValue: 1.0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    refreshCaptcha();

    const loopFloat = (animVal, targetX, targetY, duration) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animVal, {
            toValue: { x: targetX, y: targetY },
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animVal, {
            toValue: { x: -targetX, y: -targetY },
            duration: duration * 1.2,
            useNativeDriver: true,
          }),
          Animated.timing(animVal, {
            toValue: { x: 0, y: 0 },
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    // Slower continuous floating animations (10-15 seconds)
    loopFloat(blob1XY, 55, -45, 12000);
    loopFloat(blob2XY, -45, 55, 14000);
    loopFloat(blob3XY, 35, 35, 13000);

    // Sequence card fade/slide up, logo animation, and then sequential field fades
    Animated.sequence([
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.0,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(logoFade, {
          toValue: 1.0,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(100, [
        Animated.parallel([
          Animated.timing(emailAnimFade, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(emailAnimY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(passAnimFade, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(passAnimY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(captchaAnimFade, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(captchaAnimY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(buttonAnimFade, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(buttonAnimY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
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
      const requestUrl = `${String(AUTH_API_BASE_URL).replace(/\/+$/, "")}/api/Auth/login`;
      const deviceInfo = getDeviceHostInfo();

      console.log("Request URL:", requestUrl);
      console.log("Expo host info:", deviceInfo);

      if (deviceInfo.isPhysicalDevice && isLocalhostUrl(AUTH_API_BASE_URL)) {
        throw new Error(
          "Invalid API base URL for Expo Go on a physical device. Replace localhost with your LAN IP or ngrok URL."
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

      console.log("Response:", JSON.stringify(data, null, 2));

      if (!data || typeof data !== "object") {
        throw new Error("Malformed login response.");
      }

      console.log("Status:", 200);

      const token = data?.token || data?.Token;
      const storedUser = extractStoredUser(data);

      console.log("==========================================");
      console.log("[UserLoginScreen] LOGIN SUCCESSFUL!");
      console.log("[UserLoginScreen] JWT TOKEN:", token);
      console.log("[UserLoginScreen] USER DETAILS:", JSON.stringify(storedUser, null, 2));
      console.log("==========================================");

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
      console.log("Error:", error);
      console.log("Response:", error?.response?.data);
      console.log("Status:", error?.response?.status);

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

  return (
    <View style={styles.container}>
      {/* Background Floating Blobs */}
      <Animated.View style={[styles.bgBlob, styles.blob1, { transform: blob1XY.getTranslateTransform() }]} />
      <Animated.View style={[styles.bgBlob, styles.blob2, { transform: blob2XY.getTranslateTransform() }]} />
      <Animated.View style={[styles.bgBlob, styles.blob3, { transform: blob3XY.getTranslateTransform() }]} />

      {/* Subtle curved background track/road decorator */}
      <View style={styles.decorLineContainer} pointerEvents="none">
        <View style={styles.decorCircle} />
        <View style={styles.decorCircle2} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={[
                styles.card,
                { 
                  opacity: cardFade,
                  transform: [{ translateY: cardTranslateY }]
                }
              ]}
            >
              {/* Brand Logo & Header */}
              <View style={styles.headerContainer}>
                <Animated.View style={[
                  styles.logoOuterContainer,
                  {
                    opacity: logoFade,
                    transform: [{ scale: logoScale }]
                  }
                ]}>
                  <Image 
                    source={require("../../../../assets/icon.png")} 
                    style={styles.logoImage} 
                    resizeMode="cover"
                  />
                </Animated.View>
                <Text style={styles.title}>Sign In</Text>
                <Text style={styles.subtitle}>
                  Welcome back! Continue your journey with PickNBook.
                </Text>
              </View>

              {apiMessage ? (
                <View style={[
                  styles.messageContainer,
                  apiMessage.includes("Successful")
                    ? styles.successContainer
                    : styles.errorContainer,
                ]}>
                  <Ionicons 
                    name={apiMessage.includes("Successful") ? "checkmark-circle-outline" : "alert-circle-outline"} 
                    size={16} 
                    color={apiMessage.includes("Successful") ? "#16A34A" : "#D11A2A"} 
                  />
                  <Text
                    style={[
                      styles.message,
                      apiMessage.includes("Successful")
                        ? styles.success
                        : styles.errorText,
                    ]}
                  >
                    {apiMessage}
                  </Text>
                </View>
              ) : null}

              {/* Email Field */}
              <Animated.View style={{ opacity: emailAnimFade, transform: [{ translateY: emailAnimY }] }}>
                <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                <Animated.View style={[
                  styles.inputRow, 
                  emailFocused && styles.inputRowFocused,
                  { transform: [{ scale: emailScale }] }
                ]}>
                  <Ionicons name="mail-outline" size={20} color={emailFocused ? "#D11A2A" : "#94A3B8"} style={styles.prefixIcon} />
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputField}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onFocus={() => {
                      setEmailFocused(true);
                      handleFocus(emailScale);
                    }}
                    onBlur={() => {
                      setEmailFocused(false);
                      handleBlur(emailScale);
                    }}
                    onChangeText={(text) => {
                      setEmail(text);
                      setErrors((prev) => ({
                        ...prev,
                        email: text ? validateLowercaseEmail(text) : "",
                      }));
                    }}
                  />
                </Animated.View>
                {errors.email && <Text style={styles.error}>{errors.email}</Text>}
              </Animated.View>

              {/* Password Field */}
              <Animated.View style={[styles.marginField, { opacity: passAnimFade, transform: [{ translateY: passAnimY }] }]}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <Animated.View style={[
                  styles.inputRow, 
                  passwordFocused && styles.inputRowFocused,
                  { transform: [{ scale: passwordScale }] }
                ]}>
                  <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? "#D11A2A" : "#94A3B8"} style={styles.prefixIcon} />
                  <TextInput
                    placeholder="Enter password"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputField}
                    secureTextEntry={!showPassword}
                    value={password}
                    onFocus={() => {
                      setPasswordFocused(true);
                      handleFocus(passwordScale);
                    }}
                    onBlur={() => {
                      setPasswordFocused(false);
                      handleBlur(passwordScale);
                    }}
                    onChangeText={(text) => {
                      setPassword(text);
                      setErrors((prev) => ({
                        ...prev,
                        password: text ? validatePasswordNoSpaces(text) : "",
                      }));
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                    style={styles.eyeBtn}
                  >
                    <FontAwesome
                      name={showPassword ? "eye-slash" : "eye"}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </Animated.View>
                {errors.password && (
                  <Text style={styles.error}>{errors.password}</Text>
                )}
              </Animated.View>

              {/* Captcha Section */}
              <Animated.View style={[styles.marginField, { opacity: captchaAnimFade, transform: [{ translateY: captchaAnimY }] }]}>
                <Text style={styles.fieldLabel}>CAPTCHA VERIFICATION</Text>
                
                {/* Single Horizontal Captcha Display Bar */}
                <View style={styles.captchaDisplayBar}>
                  <Text style={styles.captchaText}>{generatedCaptcha}</Text>
                  <TouchableOpacity 
                    onPress={handleCaptchaRefresh}
                    activeOpacity={0.7}
                    style={styles.refreshBarBtn}
                  >
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <MaterialIcons name="refresh" size={18} color="#D11A2A" />
                    </Animated.View>
                    <Text style={styles.refreshBarBtnText}>Refresh</Text>
                  </TouchableOpacity>
                </View>

                <Animated.View style={[
                  styles.inputRow, 
                  captchaFocused && styles.inputRowFocused,
                  { transform: [{ scale: captchaInputScale }] }
                ]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={captchaFocused ? "#D11A2A" : "#94A3B8"} style={styles.prefixIcon} />
                  <TextInput
                    placeholder="Enter captcha"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputField}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={captcha}
                    onFocus={() => {
                      setCaptchaFocused(true);
                      handleFocus(captchaInputScale);
                    }}
                    onBlur={() => {
                      setCaptchaFocused(false);
                      handleBlur(captchaInputScale);
                    }}
                    onChangeText={(text) => {
                      setCaptcha(text);
                      setErrors((prev) => ({
                        ...prev,
                        captcha: text
                          ? validateCaptcha(text, generatedCaptcha)
                          : "",
                      }));
                    }}
                  />
                </Animated.View>
                {errors.captcha && (
                  <Text style={styles.error}>{errors.captcha}</Text>
                )}
              </Animated.View>

              {/* Sign In Button */}
              <Animated.View style={{ opacity: buttonAnimFade, transform: [{ translateY: buttonAnimY }] }}>
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={["#E53935", "#B71C1C"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>

              {/* Navigation Links to Forgot Password & Create Account */}
              <View style={styles.authLinksContainer}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("ForgotPassword")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.authLinkText}>Forgot Password?</Text>
                </TouchableOpacity>

                <View style={styles.authDotSeparator} />

                <TouchableOpacity
                  onPress={() => navigation.navigate("CreateAccount")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.authLinkTextBold}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

export default UserLoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFC",
  },
  bgBlob: {
    position: "absolute",
    borderRadius: 200,
    opacity: 0.03,
  },
  blob1: {
    width: 320,
    height: 320,
    backgroundColor: "#E53935",
    top: -80,
    left: -60,
  },
  blob2: {
    width: 260,
    height: 260,
    backgroundColor: "#C62828",
    bottom: -60,
    right: -60,
  },
  blob3: {
    width: 180,
    height: 180,
    backgroundColor: "#EF5350",
    top: "45%",
    right: -80,
  },
  decorLineContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  decorCircle: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    borderWidth: 1.5,
    borderColor: "rgba(229, 57, 53, 0.03)",
    top: "12%",
    left: "-15%",
  },
  decorCircle2: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: 250,
    borderWidth: 1.5,
    borderColor: "rgba(229, 57, 53, 0.02)",
    bottom: "8%",
    right: "-20%",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    width: "90%",
    alignSelf: "center",
    paddingHorizontal: 26,
    paddingVertical: 32,
    borderRadius: 30,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 8,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoOuterContainer: {
    backgroundColor: "#FFFFFF",
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 54,
  },
  inputRowFocused: {
    borderColor: "#D11A2A",
    backgroundColor: "#FFFFFF",
    shadowColor: "#D11A2A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  prefixIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  eyeBtn: {
    padding: 6,
  },
  marginField: {
    marginTop: 16,
  },
  captchaDisplayBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 12,
  },
  captchaText: {
    fontWeight: "900",
    fontSize: 20,
    color: "#D11A2A",
    letterSpacing: 4,
  },
  refreshBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  refreshBarBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D11A2A",
  },
  buttonGradient: {
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D11A2A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  links: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  error: {
    color: "#D11A2A",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
  },
  successContainer: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  success: {
    color: "#16A34A",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
    flex: 1,
  },
  errorText: {
    color: "#D11A2A",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
    flex: 1,
  },
  message: {
    fontSize: 13,
  },
  authLinksContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    gap: 12,
  },
  authLinkText: {
    color: "#64748B",
    fontSize: 13.5,
    fontWeight: "600",
  },
  authDotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#94A3B8",
  },
  authLinkTextBold: {
    color: "#D11A2A",
    fontSize: 14,
    fontWeight: "800",
  },
});
