import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
  Animated,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { verifyLoginOtp } from "../../../services/authService";
import AuthContext from "../../../context/AuthContext";

const buildFullName = (firstName, lastName) =>
  [firstName, lastName].filter(Boolean).join(" ").trim();

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
  const id =
    rawUser.id ?? rawUser.userId ?? rawUser.Id ?? root.id ?? root.userId ?? root.Id ?? null;

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

const VerifyMobileOtpScreen = ({ navigation, route }) => {
  const { signIn } = useContext(AuthContext);
  const phoneNumber = route.params?.phoneNumber || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(297); // 04:57

  // Animated refs
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const otpScale = useRef(new Animated.Value(1)).current;

  // Background Blob Float Positions
  const blob1XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blob2XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blob3XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const otpAnimFade = useRef(new Animated.Value(0)).current;
  const otpAnimY = useRef(new Animated.Value(15)).current;
  const buttonAnimFade = useRef(new Animated.Value(0)).current;
  const buttonAnimY = useRef(new Animated.Value(15)).current;

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
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    const loopFloat = (animVal, targetX, targetY, duration) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animVal, { toValue: { x: targetX, y: targetY }, duration, useNativeDriver: true }),
          Animated.timing(animVal, { toValue: { x: -targetX, y: -targetY }, duration: duration * 1.2, useNativeDriver: true }),
          Animated.timing(animVal, { toValue: { x: 0, y: 0 }, duration, useNativeDriver: true }),
        ])
      ).start();
    };

    loopFloat(blob1XY, 55, -45, 12000);
    loopFloat(blob2XY, -45, 55, 14000);
    loopFloat(blob3XY, 35, 35, 13000);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(cardTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1.0, duration: 650, useNativeDriver: true }),
        Animated.timing(logoFade, { toValue: 1.0, duration: 650, useNativeDriver: true }),
      ]),
      Animated.stagger(100, [
        Animated.parallel([
          Animated.timing(otpAnimFade, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(otpAnimY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(buttonAnimFade, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(buttonAnimY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    setApiMessage("");

    try {
      // Look for any guest IDs in secure store to pass
      const guestId = await SecureStore.getItemAsync("guestId") || 
                      await SecureStore.getItemAsync("X-Guest-Id") || 
                      await SecureStore.getItemAsync("x-guest-id");

      const data = await verifyLoginOtp(phoneNumber, otp, guestId);
      
      const token = data?.token || data?.Token;
      const storedUser = extractStoredUser(data);

      if (!token) {
        throw new Error("Login succeeded but no token was returned by the API.");
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

      setApiMessage("Login successful.");
      signIn();
      navigation.reset({
        index: 0,
        routes: [{ name: "DashBoard" }],
      });
    } catch (err) {
      setApiMessage(err.message || "Invalid or expired OTP.");
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

      <View style={styles.decorLineContainer} pointerEvents="none">
        <View style={styles.decorCircle} />
        <View style={styles.decorCircle2} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("MobileLoginScreen");
              }
            }}
        >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>

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
              <View style={styles.headerContainer}>
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                  We have sent a 6-digit OTP to {phoneNumber}.
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
                        ? styles.successText
                        : styles.errorText,
                    ]}
                  >
                    {apiMessage}
                  </Text>
                </View>
              ) : null}

              {/* OTP Field */}
              <Animated.View style={{ opacity: otpAnimFade, transform: [{ translateY: otpAnimY }] }}>
                <Text style={styles.fieldLabel}>ENTER OTP</Text>
                <Animated.View style={[
                  styles.inputRow, 
                  otpFocused && styles.inputRowFocused,
                  { transform: [{ scale: otpScale }] }
                ]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={otpFocused ? "#D11A2A" : "#94A3B8"} style={styles.prefixIcon} />
                  <TextInput
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputField}
                    keyboardType="numeric"
                    maxLength={6}
                    value={otp}
                    onFocus={() => {
                      setOtpFocused(true);
                      handleFocus(otpScale);
                    }}
                    onBlur={() => {
                      setOtpFocused(false);
                      handleBlur(otpScale);
                    }}
                    onChangeText={(text) => {
                      setOtp(text.replace(/[^0-9]/g, ''));
                      setError("");
                    }}
                  />
                </Animated.View>
                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Text style={styles.timerText}>
                  Expires in <Text style={styles.timerRed}>{formatTime(timeLeft)}</Text>
                </Text>
              </Animated.View>

              {/* Verify OTP Button */}
              <Animated.View style={{ opacity: buttonAnimFade, transform: [{ translateY: buttonAnimY }] }}>
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={loading || timeLeft === 0}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={timeLeft > 0 ? ["#E53935", "#B71C1C"] : ["#94A3B8", "#64748B"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Verify OTP</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>

            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

export default VerifyMobileOtpScreen;

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
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
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
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputRowFocused: {
    borderColor: "#D11A2A",
    backgroundColor: "#FFFFFF",
    shadowColor: "#D11A2A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  prefixIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    height: "100%",
  },
  error: {
    color: "#D11A2A",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: "500",
  },
  timerText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  timerRed: {
    color: "#D11A2A",
    fontWeight: "700",
  },
  buttonGradient: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D11A2A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    gap: 8,
  },
  successContainer: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  message: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  successText: {
    color: "#16A34A",
  },
  errorText: {
    color: "#D11A2A",
  },
});
