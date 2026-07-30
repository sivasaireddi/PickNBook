import React, { useState } from 'react';
import {
  View,
  Button,
  TextInput,
  Alert,
  StyleSheet,
  Text
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { clearAuthSession } from '../../utils/authSession';

export default function LoginScreen1() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

//   const handleLogin = async () => {
//     // ✅ Validation
//     if (!email || !password) {
//       Alert.alert("Error", "Please enter email and password");
//       return;
//     }

//     try {
//       const res = await axios.post('https://reqres.in/api/login', {
//         email: email.trim(),
//         password: password.trim(),
//       });

//       // 🔐 Save token securely
//       await SecureStore.setItemAsync('token', res.data.token);

//       Alert.alert("Login Success", "Token saved securely");

//     } catch (err) {
//       Alert.alert(
//         "Login Failed",
//         err.response?.data?.error || "Something went wrong"
//       );
//     }
//   };

  // ✅ Check stored token
  
  
 const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Please enter email and password");
    return;
  }

  try {
    const res = await axios.post(
      'https://dummyjson.com/auth/login',
      {
        username: email,
        password: password,
      }
    );

    console.log("SUCCESS:", res.data);

    // ✅ FIXED LINE
    await SecureStore.setItemAsync('token', res.data.accessToken);

    Alert.alert("Login Success", "Token saved securely");

  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);

    Alert.alert(
      "Login Failed",
      err.response?.data?.message || err.message
    );
  }
};
  
  
  const checkToken = async () => {
    const token = await SecureStore.getItemAsync('token');
    Alert.alert("Stored Token", token || "No token found");
    console.log("Stored Token:", token);
  };

  // ✅ Logout (delete token)
  const handleLogout = async () => {
    await clearAuthSession();
    Alert.alert("Logged out", "Token removed");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back 👋</Text>

      <TextInput
        placeholder="Enter Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholderTextColor="#888"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Enter Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#888"
      />

      <View style={styles.buttonContainer}>
        <Button title="Login" onPress={handleLogin} color="#4CAF50" />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Check Token" onPress={checkToken} />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  buttonContainer: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
