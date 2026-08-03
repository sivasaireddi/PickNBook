import React from "react";
import { StyleSheet, Text, TextInput, View, Pressable } from "react-native";

const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Mstr", "Miss"];

export default function GuestDetailsForm({
  roomIndex = 1,
  roomTypeName = "Standard Room",
  paxIndex = 1,
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
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>
          Room {roomIndex} Pax {paxIndex} {isLead ? "(Lead Guest)" : isChild ? "(Child)" : "(Adult)"}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>{roomTypeName}</Text>
      </View>

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
      <View style={styles.nameRow}>
        <View style={{ flex: 1 }}>
          <Input label="First Name *" value={firstName} onChangeText={onChangeFirstName} placeholder="First Name" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Last Name *" value={lastName} onChangeText={onChangeLastName} placeholder="Last Name" />
        </View>
      </View>

      {/* Age for child */}
      {isChild && (
        <Input
          label="Child Age (Years) *"
          value={String(age || "")}
          onChangeText={onChangeAge}
          placeholder="e.g. 5"
          keyboardType="number-pad"
          maxLength={2}
        />
      )}

      {/* Contact details for Lead Passenger or Primary Input */}
      {isLead && (
        <>
          <Input
            label="Email Address *"
            value={email}
            onChangeText={onChangeEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Mobile Number *"
            value={phone}
            onChangeText={onChangePhone}
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </>
      )}

      {/* Conditional Mandatory PAN */}
      {isPANMandatory && (
        <Input
          label="PAN Number (Mandatory) *"
          value={pan}
          onChangeText={(val) => onChangePan && onChangePan(val.toUpperCase())}
          placeholder="e.g. DITPA7136P or ABCPS1234K"
          autoCapitalize="characters"
          maxLength={10}
        />
      )}

      {/* Conditional Mandatory Passport */}
      {isPassportMandatory && (
        <Input
          label="Passport Number (Mandatory) *"
          value={passport}
          onChangeText={(val) => onChangePassport && onChangePassport(val.toUpperCase())}
          placeholder="e.g. A1234567"
          autoCapitalize="characters"
        />
      )}
    </View>
  );
}

function Input(props) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput {...props} style={styles.input} placeholderTextColor="#94A3B8" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    marginBottom: 10,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    paddingBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  nameRow: {
    flexDirection: "row",
    gap: 10,
  },
  inputWrap: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  titleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  titleChipActive: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  titleChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  titleChipTextActive: {
    color: "#EF4444",
  },
});
