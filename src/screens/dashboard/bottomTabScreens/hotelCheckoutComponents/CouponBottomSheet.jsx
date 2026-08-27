import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CouponBottomSheet({ visible, onClose, availableCoupons, handleApplyCoupon, validatingCoupon }) {
  if (!availableCoupons || availableCoupons.length === 0) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Available Offers</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </Pressable>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {availableCoupons.map((coupon, idx) => (
              <View key={coupon.couponCode || idx} style={styles.couponCard}>
                <View style={styles.couponIconBox}>
                  <Ionicons name="pricetag" size={20} color="#EF4444" />
                </View>
                <View style={styles.couponInfo}>
                  <Text style={styles.couponCode}>{coupon.couponCode}</Text>
                  {coupon.couponType && coupon.value ? (
                    <Text style={styles.couponDesc}>
                      Get {coupon.couponType === "Percentage" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  style={styles.applyBtn}
                  onPress={() => {
                    handleApplyCoupon(coupon.couponCode);
                    onClose();
                  }}
                  disabled={validatingCoupon}
                >
                  <Text style={styles.applyBtnText}>APPLY</Text>
                </Pressable>
              </View>
            ))}
            <SafeAreaView />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "60%", 
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  couponCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  couponIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  couponInfo: {
    flex: 1,
  },
  couponCode: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  couponDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  }
});
