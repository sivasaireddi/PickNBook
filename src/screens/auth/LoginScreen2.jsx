import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
 import axios from "axios";

export default function LoginScreen2() {
  const navigation = useNavigation();

  const [captcha, setCaptcha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
    captchaInput: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const generateCaptcha = () => {
    const chars = "ABCDEFG123456789";
    let code = "";

    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    setCaptcha(code);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const refreshCaptcha = () => {
    generateCaptcha();
  };

  const handleChange = (name, value) => {
    setForm({
      ...form,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
      api: "",
    });
  };

  const validate = () => {
    let err = {};

    if (!form.username) err.username = "Email required";
    if (!form.password) err.password = "Password required";

    if (!form.captchaInput) {
      err.captchaInput = "Enter captcha";
    } else if (form.captchaInput !== captcha) {
      err.captchaInput = "Captcha incorrect";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // const handleSubmit = async () => {
  //   if (!validate()) return;

  //   try {
  //     setLoading(true);

  //     const res = await fetch(
  //       "https://paycheck-baton-overfull.ngrok-free.dev/api/Auth/admin/login/request-otp",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           email: form.username,
  //           password: form.password,
  //         }),
  //       }
  //     );

  //     const data = await res.json();

  //     if (res.ok) {
  //       await SecureStore.setItemAsync("challengeId", data.challengeId);

  //       if (data.role) {
  //         await SecureStore.setItemAsync("role", data.role);
  //       }

  //       navigation.navigate("OTP");
  //     } else {
  //       setErrors({
  //         api: data.message || "Login failed",
  //       });
  //     }
  //   } catch {
  //     setErrors({
  //       api: "Invalid credentials",
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  // add this at top

const handleSubmit = async () => {
  if (!validate()) return;

  try {
    setLoading(true);


    
    const res = await axios.post(
   "https://paycheck-baton-overfull.ngrok-free.dev/api/Auth/admin/login/request-otp",
      {
        email: form.username,
        password: form.password,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = res.data;

    // same as your existing logic
    await SecureStore.setItemAsync("challengeId", data.challengeId);

    if (data.role) {
      await SecureStore.setItemAsync("role", data.role);
    }

    navigation.navigate("OTP");

  } catch (error) {
    // keep same behavior as fetch (handle API + fallback)
    setErrors({
      api:
        error.response?.data?.message ||
        "Invalid credentials",
    });
  } finally {
    setLoading(false);
  }
};
  return (
    <View style={styles.container}>
      {/* LEFT SIDE */}
      {/* <View style={styles.leftContainer}>
        <Image
          source={require("../imagesadmin/adminlogo.png")}
          style={styles.logo}
        />
        <Text style={styles.logoText}>travel</Text>
      </View> */}

      {/* RIGHT SIDE */}
      <View style={styles.rightContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>
            Please login to Admin Dashboard
          </Text>

          {/* Username */}
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={form.username}
            onChangeText={(text) => handleChange("username", text)}
          />
          <Text style={styles.error}>{errors.username}</Text>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordBox}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(text) => handleChange("password", text)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={22}
                color="#333"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.error}>{errors.password}</Text>

          {/* Captcha */}
          <View style={styles.captchaRow}>
            <LinearGradient
              colors={["#ff3d00", "#ff8c00"]}
              style={styles.captchaBox}
            >
              <Text style={styles.captchaText}>{captcha}</Text>
            </LinearGradient>

            <TouchableOpacity onPress={refreshCaptcha}>
              <LinearGradient
                colors={["#ff8c00", "#ff3d00"]}
                style={styles.refreshBtn}
              >
                <Text style={styles.refreshText}>Refresh</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter captcha"
            value={form.captchaInput}
            onChangeText={(text) =>
              handleChange("captchaInput", text)
            }
          />
          <Text style={styles.error}>{errors.captchaInput}</Text>

          <Text style={styles.forgot}>Forgot Password ?</Text>

          {/* API Error */}
          <Text style={styles.error}>{errors.api}</Text>

          {/* Login Button */}
          <TouchableOpacity onPress={handleSubmit} style={{ marginTop: 20 }}>
            <LinearGradient
              colors={["#ff3d00", "#ff8c00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>Login</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#d59a6f",
  },

  leftContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "bold",
  },

  rightContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "80%",
    backgroundColor: "#d59a6f",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#fff",
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ff4d00",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#000",
  },

  label: {
    fontWeight: "bold",
    marginTop: 10,
  },

  input: {
    backgroundColor: "#e5e5e5",
    borderRadius: 6,
    padding: 12,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#000",
  },

  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e5e5e5",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#000",
    paddingHorizontal: 10,
    marginTop: 5,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
  },

  captchaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    alignItems: "center",
  },

  captchaBox: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },

  captchaText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },

  refreshBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },

  refreshText: {
    color: "#fff",
    fontWeight: "bold",
  },

  forgot: {
    marginTop: 10,
    color: "#333",
  },

  loginBtn: {
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
  },

  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  error: {
    color: "red",
    fontSize: 12,
  },
});