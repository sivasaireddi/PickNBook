import React, { useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View, Pressable, useWindowDimensions } from "react-native";

const TITLE_OPTIONS = ["Mr", "Mrs", "Ms"];

export default function GuestForm({
  isLead = false,
  isChild = false,
  title = "",
  firstName = "",
  lastName = "",
  email = "",
  phone = "",
  pan = "",
  passport = "",
  age = "",
  isPANMandatory = false,
  isPassportMandatory = false,
  onChangeTitle,
  onChangeFirstName,
  onChangeLastName,
  onChangeEmail,
  onChangePhone,
  onChangePan,
  onChangePassport,
  onChangeAge,
  onBlurField,
  onFocusField,
  onSubmitField,
  registerInput,
  errors = {} // Object containing validation error messages for fields
}) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;

  return (
    <View style={styles.formContainer}>
      {/* Title selector */}
      <View ref={(ref) => registerInput?.("title", ref)} collapsable={false} style={styles.inputWrap}>
        <Text style={styles.label}>Title</Text>
        <View style={styles.titleRow}>
          {TITLE_OPTIONS.map((t) => (
            <Pressable
              key={t}
              style={[styles.titleChip, title === t && styles.titleChipActive]}
              onPress={() => {
                onChangeTitle && onChangeTitle(t);
                onBlurField && onBlurField("title");
              }}
            >
              <Text style={[styles.titleChipText, title === t && styles.titleChipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        {errors.title ? <Text style={styles.errorText}>⚠ {errors.title}</Text> : null}
      </View>

      {/* Name inputs */}
      <View style={[styles.nameRow, isSmallScreen && styles.nameRowVertical]}>
        <View style={{ flex: 1 }}>
          <Input 
            label="First Name" 
            value={firstName} 
            onChangeText={onChangeFirstName} 
            placeholder="First Name" 
            error={errors.firstName}
            inputRef={(ref) => registerInput?.("firstName", ref)}
            onFocus={() => onFocusField?.("firstName")}
            onBlur={() => onBlurField?.("firstName")}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => onSubmitField?.("firstName")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input 
            label="Last Name" 
            value={lastName} 
            onChangeText={onChangeLastName} 
            placeholder="Last Name" 
            error={errors.lastName}
            inputRef={(ref) => registerInput?.("lastName", ref)}
            onFocus={() => onFocusField?.("lastName")}
            onBlur={() => onBlurField?.("lastName")}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => onSubmitField?.("lastName")}
          />
        </View>
      </View>

      <Input
        label={isChild ? "Child Age (Years)" : "Age (Years)"}
        value={String(age ?? "")}
        onChangeText={onChangeAge}
        placeholder={isChild ? "e.g. 5" : "e.g. 30"}
        keyboardType="number-pad"
        maxLength={2}
        error={errors.age}
        inputRef={(ref) => registerInput?.("age", ref)}
        onFocus={() => onFocusField?.("age")}
        onBlur={() => onBlurField?.("age")}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => onSubmitField?.("age")}
      />

      {/* Contact details for Lead Passenger or Primary Input */}
      {isLead && (
        <>
          <Input
            label="Email Address"
            value={email}
            onChangeText={onChangeEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            inputRef={(ref) => registerInput?.("email", ref)}
            onFocus={() => onFocusField?.("email")}
            onBlur={() => onBlurField?.("email")}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => onSubmitField?.("email")}
          />
          <PhoneInput
            value={phone}
            onChangeText={onChangePhone}
            error={errors.phone}
            inputRef={(ref) => registerInput?.("phone", ref)}
            onFocus={() => onFocusField?.("phone")}
            onBlur={() => onBlurField?.("phone")}
          />
        </>
      )}

      {/* Conditional Mandatory PAN */}
      {isPANMandatory && (
        <Input
          label="PAN Number"
          value={pan}
          onChangeText={(val) => onChangePan && onChangePan(val.toUpperCase())}
          placeholder="e.g. DITPA7136P"
          autoCapitalize="characters"
          maxLength={10}
          error={errors.pan}
        />
      )}

      {/* Conditional Mandatory Passport */}
      {isPassportMandatory && (
        <Input
          label="Passport Number"
          value={passport}
          onChangeText={(val) => onChangePassport && onChangePassport(val.toUpperCase())}
          placeholder="e.g. A1234567"
          autoCapitalize="characters"
          error={errors.passport}
        />
      )}
    </View>
  );
}

function Input(props) {
  const [isFocused, setIsFocused] = useState(false);
  const { inputRef, error, label, onFocus, onBlur, ...inputProps } = props;
  
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput 
        {...inputProps}
        ref={inputRef}
        style={[
          styles.input, 
          isFocused && styles.inputFocused,
          error && styles.inputError
        ]} 
        placeholderTextColor="#94A3B8" 
        onFocus={(event) => { setIsFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setIsFocused(false); onBlur?.(event); }}
      />
      {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}
    </View>
  );
}

function PhoneInput({ value, onChangeText, error, inputRef, onFocus, onBlur }) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>Mobile Number</Text>
      <View style={[styles.phoneShell, isFocused && styles.inputFocused, error && styles.inputError]}>
        <Text style={styles.phonePrefix}>+91</Text>
        <View style={styles.phoneDivider} />
        <TextInput
          ref={inputRef}
          style={styles.phoneInput}
          value={value}
          onChangeText={onChangeText}
          placeholder="10-digit mobile"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={Keyboard.dismiss}
          onFocus={(event) => { setIsFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setIsFocused(false); onBlur?.(event); }}
        />
      </View>
      {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 14,
    paddingTop: 8,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameRowVertical: {
    flexDirection: "column",
  },
  inputWrap: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  inputFocused: {
    borderColor: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  phoneShell: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
  },
  phonePrefix: {
    paddingHorizontal: 14,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
  phoneDivider: {
    width: 1,
    height: 26,
    backgroundColor: "#CBD5E1",
  },
  phoneInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 11,
    color: "#EF4444",
    marginTop: 2,
    fontWeight: "600",
  },
  titleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  titleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  titleChipActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  titleChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  titleChipTextActive: {
    color: "#EF4444",
  },
});
