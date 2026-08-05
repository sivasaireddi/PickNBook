import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS } from "../theme/passengerDetailsTheme";
import InputField from "./InputField";

export const ContactCard = React.memo(({ contact, errors, onUpdateContact }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Ionicons name="call" size={20} color={COLORS.primaryRed} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.cardTitle}>Contact Details</Text>
          <Text style={styles.cardSubtitle}>
            Booking receipt & e-ticket will be sent here.
          </Text>
        </View>
      </View>

      <InputField
        label="EMAIL ADDRESS"
        value={contact.email}
        onChangeText={(val) => onUpdateContact("email", val)}
        placeholder="name@example.com"
        iconName="mail-outline"
        error={errors["email"]}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <InputField
        label="MOBILE NUMBER"
        value={contact.mobile}
        onChangeText={(val) => onUpdateContact("mobile", val)}
        placeholder="10-digit mobile number"
        iconName="call-outline"
        error={errors["mobile"]}
        keyboardType="phone-pad"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADII.card,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 16,
    ...SHADOWS.glassCard,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: RADII.cardSmall,
    backgroundColor: COLORS.badgeBg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.textDark,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
});

export default ContactCard;
