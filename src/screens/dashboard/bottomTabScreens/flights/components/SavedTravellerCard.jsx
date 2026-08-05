import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { COLORS, RADII, SHADOWS } from "../theme/passengerDetailsTheme";

export const SavedTravellerCard = React.memo(({
  savedTravelers,
  travelersLoading,
  travelersError,
  selectedTravelerId,
  onSelectTraveler,
  onAddNewTraveler,
  onRetryFetch,
}) => {
  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarBadge}>
          <MaterialCommunityIcons name="account-group" size={22} color={COLORS.primaryRed} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.cardTitle}>Saved Travellers</Text>
          <Text style={styles.cardSubtitle}>Choose from your saved passengers</Text>
        </View>
      </View>

      {/* Content States */}
      {travelersLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primaryRed} />
          <Text style={styles.loadingText}>Fetching saved travellers...</Text>
        </View>
      ) : travelersError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={22} color={COLORS.errorRed} />
          <Text style={styles.errorText}>{travelersError}</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={onRetryFetch} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : savedTravelers.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="person-add-outline" size={24} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No saved travellers found</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={onAddNewTraveler} style={styles.addNewBtn}>
            <Ionicons name="add" size={18} color={COLORS.primaryRed} />
            <Text style={styles.addNewBtnText}>Add New Traveller</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pickerFloatingWrapper}>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={selectedTravelerId ? String(selectedTravelerId) : ""}
              onValueChange={(itemValue) => {
                if (!itemValue || itemValue === "NEW_TRAVELER") {
                  onAddNewTraveler();
                } else {
                  const selected = savedTravelers.find(
                    (t) => String(t.id) === String(itemValue)
                  );
                  if (selected) {
                    onSelectTraveler(selected);
                  }
                }
              }}
              style={styles.pickerControl}
              accessibilityLabel="Saved Travellers Selection"
              dropdownIconColor={COLORS.primaryRed}
            >
              <Picker.Item label="Choose a Saved Traveller" value="" color={COLORS.textDark} />
              {savedTravelers.map((traveler) => (
                <Picker.Item
                  key={traveler.id}
                  label={`${traveler.fullName} (${traveler.gender}, ${traveler.age} yrs${traveler.phoneNumber ? ` • 📞 ${traveler.phoneNumber}` : ""})`}
                  value={String(traveler.id)}
                  color={COLORS.textDark}
                />
              ))}
              <Picker.Item label="+ Add New Traveller" value="NEW_TRAVELER" color={COLORS.primaryRed} />
            </Picker>
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
    gap: 16,
    ...SHADOWS.glassCard,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarBadge: {
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
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADII.input,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  errorBox: {
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.errorBg,
    borderRadius: RADII.input,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.errorRed,
    fontWeight: "600",
  },
  retryBtn: {
    backgroundColor: COLORS.primaryRed,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    marginTop: 4,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 12,
  },
  emptyBox: {
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADII.input,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primaryRed,
    marginTop: 4,
  },
  addNewBtnText: {
    color: COLORS.primaryRed,
    fontSize: 13,
    fontWeight: "800",
  },
  pickerFloatingWrapper: {
    borderRadius: RADII.input,
    overflow: "hidden",
  },
  pickerShell: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    borderRadius: RADII.input,
    overflow: "hidden",
  },
  pickerControl: {
    color: COLORS.textDark,
    backgroundColor: "transparent",
    height: 52,
  },
});

export default SavedTravellerCard;
