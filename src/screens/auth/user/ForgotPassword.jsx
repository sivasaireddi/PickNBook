import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import ForgotPasswordForm from "../../../components/auth/ForgotPasswordForm";
import { authTheme } from "../../../components/auth/authStyles";

export default function ForgotPassword() {
  const navigation = useNavigation();
  const goBack = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login");

  return (
    <AuthScreenLayout
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password"
      subtitle="Choose where you’d like to receive your secure reset code."
      onBack={goBack}
      ticketFooter={(
        <TouchableOpacity style={styles.backAction} onPress={goBack} accessibilityRole="button">
          <Ionicons name="arrow-back" size={16} color={authTheme.colors.redDeep} />
          <Text style={styles.backText}>Back to sign in</Text>
        </TouchableOpacity>
      )}
    >
      <ForgotPasswordForm navigation={navigation} onBack={goBack} showHeading={false} showBackAction={false} />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  backAction: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  backText: { fontFamily: "Inter_600SemiBold", color: authTheme.colors.redDeep, fontSize: 13 },
});
