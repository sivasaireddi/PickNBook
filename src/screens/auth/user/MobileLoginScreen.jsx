import React, { useState, useRef, useEffect } from "react";
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
import { sendLoginOtp } from "../../../services/authService";

const MobileLoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  // Animated refs
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const phoneScale = useRef(new Animated.Value(1)).current;

  // Background Blob Float Positions
  const blob1XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blob2XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blob3XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const phoneAnimFade = useRef(new Animated.Value(0)).current;
  const phoneAnimY = useRef(new Animated.Value(15)).current;
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

    loopFloat(blob1XY, 55, -45, 12000);
    loopFloat(blob2XY, -45, 55, 14000);
    loopFloat(blob3XY, 35, 35, 13000);

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
          Animated.timing(phoneAnimFade, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(phoneAnimY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(buttonAnimFade, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(buttonAnimY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const validate = () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSendOtp = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiMessage("");

    try {
      await sendLoginOtp(phoneNumber);
      setApiMessage("OTP Sent Successfully.");
      setTimeout(() => {
        navigation.navigate("VerifyMobileOtpScreen", { phoneNumber });
      }, 500);
    } catch (err) {
      setApiMessage(err.message || "Something went wrong.");
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
                navigation.navigate("Login");
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
                <Text style={styles.title}>Mobile Login</Text>
                <Text style={styles.subtitle}>
                  Enter your mobile number to receive an OTP.
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

              {/* Phone Field */}
              <Animated.View style={{ opacity: phoneAnimFade, transform: [{ translateY: phoneAnimY }] }}>
                <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                <Animated.View style={[
                  styles.inputRow, 
                  phoneFocused && styles.inputRowFocused,
                  { transform: [{ scale: phoneScale }] }
                ]}>
                  <Ionicons name="call-outline" size={20} color={phoneFocused ? "#D11A2A" : "#94A3B8"} style={styles.prefixIcon} />
                  <TextInput
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputField}
                    keyboardType="numeric"
                    maxLength={10}
                    value={phoneNumber}
                    onFocus={() => {
                      setPhoneFocused(true);
                      handleFocus(phoneScale);
                    }}
                    onBlur={() => {
                      setPhoneFocused(false);
                      handleBlur(phoneScale);
                    }}
                    onChangeText={(text) => {
                      setPhoneNumber(text.replace(/[^0-9]/g, ''));
                      setError("");
                    }}
                  />
                </Animated.View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </Animated.View>

              {/* Send OTP Button */}
              <Animated.View style={{ opacity: buttonAnimFade, transform: [{ translateY: buttonAnimY }], marginTop: 20 }}>
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    onPress={handleSendOtp}
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
                        <Text style={styles.buttonText}>Send OTP</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>

              {/* Navigation Links */}
              <View style={styles.authLinksContainer}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Login")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.authLinkTextBold}>Login with Email</Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

export default MobileLoginScreen;

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
  authLinksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  authLinkTextBold: {
    fontSize: 14,
    color: "#D11A2A",
    fontWeight: "700",
  },
});
