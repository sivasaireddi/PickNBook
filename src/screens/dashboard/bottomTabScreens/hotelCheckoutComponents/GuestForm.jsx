import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View, Pressable, useWindowDimensions } from "react-native";

const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Mstr", "Miss"];

export default function GuestForm({
  isLead = false,
  isChild = false,
  title = "Mr",
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
  errors = {} // Object containing validation error messages for fields
}) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;

  return (
    <View style={styles.formContainer}>
      {/* Title selector */}
      <View style={styles.inputWrap}>
        <Text style={styles.label}>Title</Text>
        <View style={styles.titleRow}>
          {TITLE_OPTIONS.map((t) => (
            <Pressable
              key={t}
              style={[styles.titleChip, title === t && styles.titleChipActive]}
              onPress={() => onChangeTitle && onChangeTitle(t)}
            >
              <Text style={[styles.titleChipText, title === t && styles.titleChipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
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
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input 
            label="Last Name" 
            value={lastName} 
            onChangeText={onChangeLastName} 
            placeholder="Last Name" 
            error={errors.lastName}
          />
        </View>
      </View>

      {/* Age for child */}
      {isChild && (
        <Input
          label="Child Age (Years)"
          value={String(age || "")}
          onChangeText={onChangeAge}
          placeholder="e.g. 5"
          keyboardType="number-pad"
          maxLength={2}
          error={errors.age}
        />
      )}

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
          />
          <Input
            label="Mobile Number"
            value={phone}
            onChangeText={onChangePhone}
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phone}
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
  
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput 
        {...props} 
        style={[
          styles.input, 
          isFocused && styles.inputFocused,
          props.error && styles.inputError
        ]} 
        placeholderTextColor="#94A3B8" 
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {props.error ? <Text style={styles.errorText}>⚠ {props.error}</Text> : null}
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
