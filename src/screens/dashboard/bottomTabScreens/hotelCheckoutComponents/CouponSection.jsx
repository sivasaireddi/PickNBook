import React from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CouponSection({ 
  couponCodeInput, 
  setCouponCodeInput, 
  pricingPreview, 
  validatingCoupon, 
  couponMessage, 
  handleApplyCoupon, 
  handleRemoveCoupon,
  availableCouponsCount,
  onViewAvailableCoupons
}) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="pricetag" size={18} color="#EF4444" />
        <Text style={styles.sectionTitle}>Offers & Coupons</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter coupon code"
          placeholderTextColor="#94A3B8"
          value={couponCodeInput}
          onChangeText={setCouponCodeInput}
          autoCapitalize="characters"
          editable={!pricingPreview?.appliedCoupon}
        />
        <Pressable
          style={[styles.applyBtn, pricingPreview?.appliedCoupon && styles.applyBtnApplied]}
          onPress={() => pricingPreview?.appliedCoupon ? handleRemoveCoupon() : handleApplyCoupon()}
          disabled={validatingCoupon}
        >
          {validatingCoupon ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.applyBtnText}>
              {pricingPreview?.appliedCoupon ? "Remove" : "Apply"}
            </Text>
          )}
        </Pressable>
      </View>

      {couponMessage ? (
        <Text style={[styles.couponMsg, pricingPreview?.couponDiscount > 0 ? styles.successMsg : styles.errorMsg]}>
          {couponMessage}
        </Text>
      ) : null}

      {availableCouponsCount > 0 && !pricingPreview?.appliedCoupon && (
        <Pressable style={styles.viewOffersBtn} onPress={onViewAvailableCoupons}>
          <Text style={styles.viewOffersText}>{availableCouponsCount} offers available</Text>
          <Ionicons name="chevron-forward" size={14} color="#EF4444" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  inputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
  },
  applyBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnApplied: {
    backgroundColor: "#64748B",
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  couponMsg: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  successMsg: {
    color: "#166534",
  },
  errorMsg: {
    color: "#DC2626",
  },
  viewOffersBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 4,
  },
  viewOffersText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  }
});
