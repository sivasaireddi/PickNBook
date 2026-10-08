import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authTheme } from "./authStyles";

export default function AuthTextInput({
  label,
  icon,
  error,
  rightIcon,
  onRightPress,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  dense = false,
  ...inputProps
}) {
  return (
    <View style={[styles.field, dense && styles.fieldDense, containerStyle]}>
      {!!label && <Text style={[styles.label, dense && styles.labelDense]}>{label}</Text>}
      <View style={[styles.inputRow, dense && styles.inputRowDense, !!error && styles.errored]}>
        {!!icon && (
          <Ionicons
            name={icon}
            size={19}
            color={authTheme.colors.slate}
            style={styles.icon}
          />
        )}
        <TextInput
          {...inputProps}
          style={[styles.input, inputStyle]}
          placeholderTextColor="#99A1B3"
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {!!rightIcon && (
          <TouchableOpacity
            onPress={onRightPress}
            style={[styles.rightAction, dense && styles.rightActionDense]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Toggle password visibility"
          >
            <Ionicons name={rightIcon} size={20} color={authTheme.colors.inkSoft} />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={[styles.error, dense && styles.errorDense]} numberOfLines={dense ? 1 : 2}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 10 },
  fieldDense: { marginBottom: 6 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: authTheme.colors.inkSoft,
    marginBottom: 5,
    letterSpacing: 0.15,
  },
  labelDense: { fontSize: 10.5, marginBottom: 3 },
  inputRow: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: authTheme.radii.medium,
    borderWidth: 1,
    borderColor: authTheme.colors.line,
    backgroundColor: "#F8F8FB",
    paddingHorizontal: 14,
  },
  inputRowDense: { height: 46, borderRadius: 12, paddingHorizontal: 11 },
  errored: { borderColor: authTheme.colors.error, backgroundColor: authTheme.colors.errorSoft },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    height: "100%",
    fontFamily: "Inter_500Medium",
    color: authTheme.colors.ink,
    fontSize: 15,
  },
  rightAction: { width: 38, height: 46, alignItems: "flex-end", justifyContent: "center" },
  rightActionDense: { height: 42 },
  error: {
    fontFamily: "Inter_500Medium",
    color: authTheme.colors.error,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },
  errorDense: { fontSize: 10, lineHeight: 12, marginTop: 2 },
});
