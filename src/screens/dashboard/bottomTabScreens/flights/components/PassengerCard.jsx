import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { COLORS, RADII, SHADOWS } from "../theme/passengerDetailsTheme";
import SegmentControl from "./SegmentControl";
import InputField from "./InputField";

export const PassengerCard = React.memo(({
  passenger,
  index,
  isInternational,
  errors,
  onUpdatePassenger,
}) => {
  const passengerIndex = index + 1;
  const isAdult = passenger.passengerType === "Adult";

  return (
    <View style={styles.card}>
      {/* Passenger Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBadge}>
            <Ionicons
              name={isAdult ? "person" : "happy"}
              size={20}
              color={COLORS.primaryRed}
            />
          </View>
          <Text style={styles.cardTitle}>
            {passenger.passengerType || "Adult"} Passenger {passengerIndex}
          </Text>
        </View>

        <View style={styles.passportBadge}>
          <FontAwesome5 name="id-card" size={14} color={COLORS.primaryRed} />
          <Text style={styles.passportBadgeText}>
            {isInternational ? "Passport Req." : "ID Verified"}
          </Text>
        </View>
      </View>

      {/* Title Segmented Selection */}
      <SegmentControl
        label="TITLE"
        options={["Mr", "Mrs", "Ms"]}
        selectedValue={passenger.title}
        onSelect={(titleOpt) => onUpdatePassenger(index, "title", titleOpt)}
      />

      {/* Names Row */}
      <View style={styles.row}>
        <InputField
          label="FIRST NAME"
          value={passenger.firstName}
          onChangeText={(val) => onUpdatePassenger(index, "firstName", val)}
          placeholder="First name"
          iconName="person-outline"
          error={errors[`p-${index}-firstName`]}
          containerStyle={styles.flex1}
        />

        <InputField
          label="LAST NAME"
          value={passenger.lastName}
          onChangeText={(val) => onUpdatePassenger(index, "lastName", val)}
          placeholder="Last name"
          iconName="person-outline"
          error={errors[`p-${index}-lastName`]}
          containerStyle={styles.flex1}
        />
      </View>

      {/* Gender Segmented Selection */}
      <SegmentControl
        label="GENDER"
        options={["Male", "Female", "Transgender"]}
        selectedValue={passenger.gender}
        onSelect={(gOpt) => onUpdatePassenger(index, "gender", gOpt)}
      />

      {/* DOB & Nationality Row */}
      <View style={styles.row}>
        <InputField
          label={isInternational ? "DATE OF BIRTH" : "DATE OF BIRTH (OPTIONAL)"}
          value={passenger.dob}
          onChangeText={(val) => onUpdatePassenger(index, "dob", val)}
          placeholder="YYYY-MM-DD"
          iconName="calendar-outline"
          error={errors[`p-${index}-dob`]}
          keyboardType="numeric"
          containerStyle={styles.flex1}
        />

        <InputField
          label="NATIONALITY"
          value={passenger.nationality}
          onChangeText={(val) => onUpdatePassenger(index, "nationality", val)}
          placeholder="e.g. Indian"
          iconName="globe-outline"
          containerStyle={styles.flex1}
        />
      </View>

      {/* International Flight Passport Details */}
      {isInternational && (
        <View style={styles.passportContainer}>
          <Text style={styles.sectionDividerText}>PASSPORT INFORMATION</Text>
          <View style={styles.row}>
            <InputField
              label="PASSPORT NUMBER"
              value={passenger.passportNo}
              onChangeText={(val) => onUpdatePassenger(index, "passportNo", val)}
              placeholder="e.g. Z1234567"
              iconName="card-outline"
              autoCapitalize="characters"
              error={errors[`p-${index}-passportNo`]}
              containerStyle={styles.flex1}
            />

            <InputField
              label="PASSPORT EXPIRY"
              value={passenger.passportExpiry}
              onChangeText={(val) => onUpdatePassenger(index, "passportExpiry", val)}
              placeholder="YYYY-MM-DD"
              iconName="calendar-outline"
              keyboardType="numeric"
              error={errors[`p-${index}-passportExpiry`]}
              containerStyle={styles.flex1}
            />
          </View>
          
          <View style={styles.row}>
            <InputField
              label="ISSUE DATE"
              value={passenger.passportIssueDate}
              onChangeText={(val) => onUpdatePassenger(index, "passportIssueDate", val)}
              placeholder="YYYY-MM-DD"
              iconName="calendar-outline"
              keyboardType="numeric"
              error={errors[`p-${index}-passportIssueDate`]}
              containerStyle={styles.flex1}
            />

            <InputField
              label="ISSUE COUNTRY"
              value={passenger.passportIssueCountryCode}
              onChangeText={(val) => onUpdatePassenger(index, "passportIssueCountryCode", val)}
              placeholder="Code e.g. IN"
              iconName="globe-outline"
              autoCapitalize="characters"
              error={errors[`p-${index}-passportIssueCountryCode`]}
              containerStyle={styles.flex1}
            />
          </View>
        </View>
      )}
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
    gap: 18,
    ...SHADOWS.glassCard,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: RADII.cardSmall,
    backgroundColor: COLORS.badgeBg,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.textDark,
    letterSpacing: -0.2,
  },
  passportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.pill,
  },
  passportBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primaryRed,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  passportContainer: {
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  sectionDividerText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.primaryRed,
    letterSpacing: 1,
  },
});

export default PassengerCard;
