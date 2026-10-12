import React from "react";
import { useNavigation } from "@react-navigation/native";
import AuthScreenLayout from "../../../components/auth/AuthScreenLayout";
import ForgotPasswordForm from "../../../components/auth/ForgotPasswordForm";

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
    >
      <ForgotPasswordForm navigation={navigation} onBack={goBack} showHeading={false} />
    </AuthScreenLayout>
  );
}
