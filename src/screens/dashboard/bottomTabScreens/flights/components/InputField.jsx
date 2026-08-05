import React, { useRef, useState } from "react";
import { Animated, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS } from "../theme/passengerDetailsTheme";

export const InputField = React.memo(({
  label,
  value,
  onChangeText,
  placeholder,
  iconName,
  error,
  keyboardType = "default",
  autoCapitalize = "words",
  containerStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? COLORS.errorRed : COLORS.borderMedium, COLORS.borderFocused],
  });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <Animated.View
        style={[
          styles.inputContainer,
          { borderColor },
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {iconName && (
          <Ionicons
            name={iconName}
            size={20}
            color={isFocused ? COLORS.primaryRed : error ? COLORS.errorRed : COLORS.textMuted}
            style={styles.icon}
          />
        )}
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSubtle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: RADII.input,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
  },
  inputFocused: {
    backgroundColor: COLORS.inputBgFocused,
    ...SHADOWS.focusedInput,
  },
  inputError: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorRed,
  },
  icon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
    paddingVertical: 0,
  },
  errorText: {
    color: COLORS.errorRed,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});

export default InputField;
