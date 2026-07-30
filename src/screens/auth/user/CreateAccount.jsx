import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Alert
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";

const COUNTRY_CODE_OPTIONS = [
  { value: "", label: "Select code", mobileLength: null },
  { value: "+91", label: "+91 (India)", mobileLength: 10 }
];

const NAME_REGEX = /^[A-Za-z]+$/;
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

const validateForm = (form) => {
  const errors = {};

  if (!form.firstName) errors.firstName = "First name required";
  else if (!NAME_REGEX.test(form.firstName)) errors.firstName = "Only letters";

  if (!form.lastName) errors.lastName = "Last name required";

  if (!form.countryCode) errors.countryCode = "Select code";

  if (!form.mobile) errors.mobile = "Mobile required";

  if (!form.email || !EMAIL_REGEX.test(form.email))
    errors.email = "Invalid email";

  if (!form.password || !STRONG_PASSWORD_REGEX.test(form.password))
    errors.password = "Weak password";

  if (form.password !== form.confirmPassword)
    errors.confirmPassword = "Passwords do not match";

  if (!form.agree) errors.agree = "Accept terms";

  return errors;
};

export default function CreateAccount () {
  const navigation = useNavigation();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    countryCode: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validationErrors = useMemo(() => validateForm(form), [form]);

  const handleChange = (name, value) => {
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async () => {
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const response = await fetch(
        "https://paycheck-baton-overfull.ngrok-free.dev/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            phoneNumber: form.countryCode + form.mobile,
            email: form.email,
            password: form.password
          })
        }
      );

      if (response.ok) {
        Alert.alert("Success", "User registered!");
        navigation.navigate("Login");
      } else {
        Alert.alert("Error", "Registration failed");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong");
    }
  };

  return (
    <ImageBackground
     source={require("../../../../assets/loginimage.png")}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        <TextInput
          placeholder="First Name"
          style={styles.input}
          value={form.firstName}
          onChangeText={(v) => handleChange("firstName", v)}
        />
        <Text style={styles.error}>{errors.firstName}</Text>

        <TextInput
          placeholder="Last Name"
          style={styles.input}
          value={form.lastName}
          onChangeText={(v) => handleChange("lastName", v)}
        />

        <Picker
          selectedValue={form.countryCode}
          onValueChange={(v) => handleChange("countryCode", v)}
          style={styles.input}
        >
          {COUNTRY_CODE_OPTIONS.map((c) => (
            <Picker.Item key={c.value} label={c.label} value={c.value} />
          ))}
        </Picker>

        <TextInput
          placeholder="Mobile"
          keyboardType="numeric"
          style={styles.input}
          value={form.mobile}
          onChangeText={(v) => handleChange("mobile", v)}
        />

        <TextInput
          placeholder="Email"
          style={styles.input}
          value={form.email}
          onChangeText={(v) => handleChange("email", v)}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry={!showPassword}
          style={styles.input}
          value={form.password}
          onChangeText={(v) => handleChange("password", v)}
        />

        <TextInput
          placeholder="Confirm Password"
          secureTextEntry={!showPassword}
          style={styles.input}
          value={form.confirmPassword}
          onChangeText={(v) => handleChange("confirmPassword", v)}
        />

        <TouchableOpacity
          onPress={() => setForm({ ...form, agree: !form.agree })}
        >
          <Text style={styles.checkbox}>
            {form.agree ? "☑" : "☐"} I agree to Terms
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Already have account? Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    padding: 20,
    justifyContent: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },
  error: {
    color: "red",
    marginBottom: 5
  },
  checkbox: {
    marginVertical: 10
  },
  button: {
    backgroundColor: "#f4b400",
    padding: 15,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold"
  },
  link: {
    marginTop: 15,
    textAlign: "center",
    color: "blue"
  }
});