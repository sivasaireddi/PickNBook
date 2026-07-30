import React from "react";
import { Picker } from "@react-native-picker/picker";
import { StyleSheet, Text, TextInput, View } from "react-native";

export default function GuestDetailsForm({
  mode,
  selectedTraveler,
  onSelectedTravelerChange,
  guestName,
  guestEmail,
  guestPhone,
  onChangeGuestName,
  onChangeGuestEmail,
  onChangeGuestPhone,
  travelers = [],
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Guest Details</Text>
      <View style={styles.toggle}>
        <Text style={[styles.toggleItem, mode === "existing" && styles.toggleActive]}>Existing Traveler</Text>
        <Text style={[styles.toggleItem, mode === "new" && styles.toggleActive]}>Add New Guest</Text>
      </View>

      {mode === "existing" ? (
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Select Traveler</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={selectedTraveler} onValueChange={onSelectedTravelerChange}>
              <Picker.Item label="Choose a traveler" value="" />
              {travelers.map((traveler) => (
                <Picker.Item key={traveler.value} label={traveler.label} value={traveler.value} />
              ))}
            </Picker>
          </View>
        </View>
      ) : (
        <>
          <Input label="Primary Guest Name" value={guestName} onChangeText={onChangeGuestName} placeholder="Enter full name" />
          <Input label="Email" value={guestEmail} onChangeText={onChangeGuestEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Mobile Number" value={guestPhone} onChangeText={onChangeGuestPhone} placeholder="10-digit mobile" keyboardType="phone-pad" />
        </>
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
    backgroundColor: "#FAFAFA",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121",
    letterSpacing: 0.3,
  },
  toggle: {
    flexDirection: "row",
    gap: 10,
  },
  toggleItem: {
    flex: 1,
    backgroundColor: "#EEEEEE",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    textAlign: "center",
    fontWeight: "750",
    color: "#757575",
    fontSize: 13,
  },
  toggleActive: {
    backgroundColor: "#FFEBEE",
    color: "#E53935",
  },
  inputWrap: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#757575",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: "#212121",
    fontWeight: "700",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
});
