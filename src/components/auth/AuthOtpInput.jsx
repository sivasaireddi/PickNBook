import React, { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { authTheme } from "./authStyles";

const OTP_LENGTH = 6;

export default function AuthOtpInput({ value, onChangeText, error, onSubmitEditing }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const digits = String(value || "").slice(0, OTP_LENGTH).split("");

  const handleChange = (text) => onChangeText(text.replace(/\D/g, "").slice(0, OTP_LENGTH));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>One-time password</Text>
      <Pressable
        style={styles.cells}
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="button"
        accessibilityLabel="Enter six digit one-time password"
      >
        {Array.from({ length: OTP_LENGTH }, (_, index) => {
          const active = focused && Math.min(digits.length, OTP_LENGTH - 1) === index;
          return (
            <View key={index} style={[styles.cell, active && styles.cellActive, !!error && styles.cellError]}>
              <Text style={styles.digit}>{digits[index] || ""}</Text>
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={String(value || "")}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          textContentType={Platform.OS === "ios" ? "oneTimeCode" : undefined}
          autoComplete={Platform.OS === "android" ? "sms-otp" : undefined}
          importantForAutofill={Platform.OS === "android" ? "yes" : undefined}
          autoCorrect={false}
          caretHidden
          contextMenuHidden={false}
          returnKeyType="done"
          style={styles.nativeInput}
        />
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 10 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: authTheme.colors.inkSoft,
    marginBottom: 8,
  },
  cells: { position: "relative", flexDirection: "row", gap: 7, width: "100%" },
  cell: {
    flex: 1,
    minWidth: 0,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authTheme.colors.authBorder,
    backgroundColor: authTheme.colors.authField,
  },
  cellActive: { borderWidth: 2, borderColor: authTheme.colors.red },
  cellError: { borderColor: authTheme.colors.error },
  digit: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    color: authTheme.colors.ink,
  },
  nativeInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
    color: "transparent",
  },
  error: {
    fontFamily: "Inter_500Medium",
    color: authTheme.colors.error,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
  },
});
