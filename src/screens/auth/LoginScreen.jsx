// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   useWindowDimensions,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   TouchableWithoutFeedback,
//   Keyboard,
// } from "react-native";
// import { LinearGradient } from "expo-linear-gradient";
// import { Ionicons } from "@expo/vector-icons";

// export default function LoginScreen() {
//   const { width } = useWindowDimensions();
//   const isTablet = width >= 768;

//   const [passwordVisible, setPasswordVisible] = useState(false);
//   const [captcha, setCaptcha] = useState("3138B");

//   const refreshCaptcha = () => {
//     const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//     let newCaptcha = "";
//     for (let i = 0; i < 5; i++) {
//       newCaptcha += chars.charAt(Math.floor(Math.random() * chars.length));
//     }
//     setCaptcha(newCaptcha);
//   };

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === "ios" ? "padding" : "height"}
//     >
//       <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//         <ScrollView
//           contentContainerStyle={{ flexGrow: 1 }}
//           keyboardShouldPersistTaps="handled"
//         >
//           <View
//             style={[
//               styles.container,
//               { flexDirection: isTablet ? "row" : "column" },
//             ]}
//           >
//             {/* LEFT */}
//             <View
//               style={[
//                 styles.leftContainer,
//                 { flex: isTablet ? 1 : 0.5 },
//               ]}
//             >
//               <Image
//                 source={{
//                   uri: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
//                 }}
//                 style={[
//                   styles.logo,
//                   {
//                     width: isTablet ? 100 : 70,
//                     height: isTablet ? 100 : 70,
//                   },
//                 ]}
//               />
//               <Text
//                 style={[
//                   styles.brandText,
//                   { fontSize: isTablet ? 30 : 22 },
//                 ]}
//               >
//                 travel
//               </Text>
//             </View>

//             {/* RIGHT */}
//             <View style={styles.rightContainer}>
//               <View
//                 style={[
//                   styles.card,
//                   {
//                     width: isTablet ? "70%" : "90%",
//                     padding: isTablet ? 25 : 15,
//                   },
//                 ]}
//               >
//                 <Text
//                   style={[
//                     styles.title,
//                     { fontSize: isTablet ? 28 : 22 },
//                   ]}
//                 >
//                   Welcome
//                 </Text>

//                 <Text style={styles.subtitle}>
//                   Please login to Admin Dashboard
//                 </Text>

//                 <Text style={styles.label}>Username</Text>
//                 <TextInput style={styles.input} />

//                 <Text style={styles.label}>Password</Text>
//                 <View style={styles.passwordContainer}>
//                   <TextInput
//                     style={styles.passwordInput}
//                     secureTextEntry={!passwordVisible}
//                   />
//                   <TouchableOpacity
//                     onPress={() =>
//                       setPasswordVisible(!passwordVisible)
//                     }
//                   >
//                     <Ionicons
//                       name={passwordVisible ? "eye-off" : "eye"}
//                       size={20}
//                     />
//                   </TouchableOpacity>
//                 </View>

//                 {/* CAPTCHA */}
//                 <View style={styles.captchaRow}>
//                   <View style={styles.captchaBox}>
//                     <Text style={styles.captchaText}>{captcha}</Text>
//                   </View>

//                   <TouchableOpacity
//                     style={styles.refreshBtn}
//                     onPress={refreshCaptcha}
//                   >
//                     <Text style={styles.refreshText}>Refresh</Text>
//                   </TouchableOpacity>
//                 </View>

//                 <TextInput
//                   style={styles.input}
//                   placeholder="Enter captcha"
//                 />

//                 <Text style={styles.forgot}>Forgot Password ?</Text>

//                 <TouchableOpacity>
//                   <LinearGradient
//                     colors={["#ff2d00", "#ff8c00"]}
//                     style={styles.loginBtn}
//                   >
//                     <Text style={styles.loginText}>Login</Text>
//                   </LinearGradient>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         </ScrollView>
//       </TouchableWithoutFeedback>
//     </KeyboardAvoidingView>
//   );
// }
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#d39a6a",
//   },

//   leftContainer: {
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20,
//   },

//   logo: {
//     marginBottom: 10,
//   },

//   brandText: {
//     color: "#fff",
//     fontWeight: "bold",
//   },

//   rightContainer: {
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   card: {
//     backgroundColor: "#d39a6a",
//     borderWidth: 1,
//     borderColor: "#fff",
//     borderRadius: 12,
//   },

//   title: {
//     color: "#ff3d00",
//     fontWeight: "bold",
//     textAlign: "center",
//   },

//   subtitle: {
//     textAlign: "center",
//     color: "red",
//     marginBottom: 20,
//   },

//   label: {
//     marginTop: 10,
//     fontWeight: "bold",
//   },

//   input: {
//     backgroundColor: "#eee",
//     borderRadius: 6,
//     padding: 10,
//     marginTop: 5,
//     borderWidth: 1,
//   },

//   passwordContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#eee",
//     borderRadius: 6,
//     paddingHorizontal: 10,
//     borderWidth: 1,
//     marginTop: 5,
//   },

//   passwordInput: {
//     flex: 1,
//     paddingVertical: 10,
//   },

//   captchaRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 15,
//     justifyContent: "space-between",
//   },

//   captchaBox: {
//     backgroundColor: "#ff5a00",
//     padding: 10,
//     borderRadius: 8,
//   },

//   captchaText: {
//     color: "#fff",
//     fontWeight: "bold",
//   },

//   refreshBtn: {
//     backgroundColor: "#ff8c00",
//     padding: 10,
//     borderRadius: 20,
//   },

//   refreshText: {
//     color: "#fff",
//   },

//   forgot: {
//     marginTop: 10,
//     color: "#333",
//   },

//   loginBtn: {
//     marginTop: 20,
//     padding: 15,
//     borderRadius: 30,
//     alignItems: "center",
//   },

//   loginText: {
//     color: "#fff",
//     fontWeight: "bold",
//   },
// });




























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

export default function LoginScreen() {
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

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
      const res = await fetch(
        `${API_BASE_URL}/api/Auth/admin/login/request-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: form.username,
            password: form.password,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        // ✅ Store securely
        await SecureStore.setItemAsync(
          "challengeId",
          data.challengeId
        );

        if (data.role) {
          await SecureStore.setItemAsync("role", data.role);
        }

        navigation.navigate("OTP");
      } else {
        setErrors({
          api: data.message || "Login failed",
        });
      }
    } catch {
      setErrors({
        api: "Invalid credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoBox}>
        <Image
        //   source={require("../imagesadmin/adminlogo.png")}
          style={styles.logo}
        />
        <Text style={styles.logoText}>travel</Text>
      </View>

      {/* Form */}
      <View style={styles.formBox}>
        <Text style={styles.title}>Welcome</Text>
        <Text>Please login to Admin Dashboard</Text>

        {/* Username */}
        <Text>Username</Text>
        <TextInput
          style={styles.input}
          value={form.username}
          onChangeText={(text) => handleChange("username", text)}
        />
        <Text style={styles.error}>{errors.username}</Text>

        {/* Password */}
        <Text>Password</Text>
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
              color="black"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.error}>{errors.password}</Text>

        {/* Captcha */}
        <View style={styles.captchaRow}>
          <Text style={styles.captcha}>{captcha}</Text>
          <TouchableOpacity onPress={refreshCaptcha}>
            <Text style={styles.refresh}>Refresh</Text>
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

        {/* Forgot */}
        {/* <TouchableOpacity
          onPress={() => navigation.navigate("AdminForgot")}
        >
          <Text style={styles.forgot}>Forgot Password ?</Text>
        </TouchableOpacity> */}

        {/* API Error */}
        <Text style={styles.error}>{errors.api}</Text>

        {/* Button */}
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  logoBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  formBox: {
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  captchaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  captcha: {
    fontSize: 18,
    fontWeight: "bold",
  },
  refresh: {
    color: "blue",
  },
  forgot: {
    color: "blue",
    marginVertical: 10,
  },
  loginBtn: {
    backgroundColor: "black",
    padding: 15,
    alignItems: "center",
    borderRadius: 5,
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
  },
  error: {
    color: "red",
    fontSize: 12,
  },
});