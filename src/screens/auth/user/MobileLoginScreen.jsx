import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import PhoneLoginForm from "../../../components/auth/PhoneLoginForm";
import { authTheme } from "../../../components/auth/authStyles";

const MobileLoginScreen = ({ navigation }) => {
  const goBack = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login");

  return (
    <AuthScreenLayout
      eyebrow="QUICK ACCESS"
      title="Sign in with mobile"
      subtitle="We’ll send a secure one-time code to your registered mobile number."
      onBack={goBack}
    >
      <PhoneLoginForm navigation={navigation} />
      <View style={styles.createRow}>
        <Text style={styles.createText}>New to Pick&Book?</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("CreateAccount")}
          style={styles.createHit}
          accessibilityRole="button"
        >
          <Text style={styles.createLink}>Create account</Text>
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
};

export default MobileLoginScreen;

const styles = StyleSheet.create({
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 14,
    gap: 3,
  },
  createText: { fontFamily: "Inter_400Regular", color: authTheme.colors.slate, fontSize: 13 },
  createHit: { minHeight: 40, justifyContent: "center", paddingHorizontal: 4 },
  createLink: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep, fontSize: 13 },
});
