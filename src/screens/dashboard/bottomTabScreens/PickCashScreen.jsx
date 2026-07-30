import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#D11A2A",
  primaryLight: "#FEE2E2",
  text: "#0F172A",
  textSecondary: "#475569",
  background: "#F8F9FB",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  success: "#16A34A",
  warning: "#D97706",
};

export default function PickCashScreen() {
  const transactions = [
    {
      id: "1",
      title: "Booking Cashback",
      date: "24 Jul 2026, 04:30 PM",
      amount: "+ ₹50.00",
      type: "credit",
      desc: "Earned on Bus Booking #PNB9842",
    },
    {
      id: "2",
      title: "Refund Processed",
      date: "18 Jul 2026, 11:15 AM",
      amount: "+ ₹200.00",
      type: "credit",
      desc: "Instant Refund for cancelled seat",
    },
    {
      id: "3",
      title: "Used for Bus Ticket",
      date: "10 Jul 2026, 09:20 AM",
      amount: "- ₹100.00",
      type: "debit",
      desc: "Applied on Booking #PNB7710",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <AppHeader />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PickCash Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.walletBadge}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              <Text style={styles.walletBadgeText}>PickCash Balance</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Active</Text>
            </View>
          </View>

          <Text style={styles.balanceValue}>₹250.00</Text>
          <Text style={styles.balanceSubtext}>Use PickCash for instant discounts on your next booking</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Add Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.actionButtonOutline]} activeOpacity={0.8}>
              <Ionicons name="gift-outline" size={18} color={COLORS.primary} />
              <Text style={styles.actionBtnOutlineText}>Refer & Earn</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Use PickCash?</Text>
          
          <View style={styles.benefitItem}>
            <View style={[styles.iconBox, { backgroundColor: "#FEF2F2" }]}>
              <Ionicons name="flash-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.benefitTextContent}>
              <Text style={styles.benefitTitle}>Instant Refunds</Text>
              <Text style={styles.benefitDesc}>Get immediate refunds credited back into your PickCash wallet upon cancellation.</Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.iconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="pricetag-outline" size={20} color={COLORS.success} />
            </View>
            <View style={styles.benefitTextContent}>
              <Text style={styles.benefitTitle}>Exclusive Discounts</Text>
              <Text style={styles.benefitDesc}>Earn bonus cash on eligible bus and flight bookings automatically.</Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.iconBox, { backgroundColor: "#FFFBEB" }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.warning} />
            </View>
            <View style={styles.benefitTextContent}>
              <Text style={styles.benefitTitle}>100% Safe & Express Checkout</Text>
              <Text style={styles.benefitDesc}>1-click payment with zero gateway failures.</Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.transactionsContainer}>
            {transactions.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.transactionRow,
                  index < transactions.length - 1 && styles.rowBorder,
                ]}
              >
                <View style={styles.txLeft}>
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor:
                          item.type === "credit" ? "#DCFCE7" : "#FEE2E2",
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.type === "credit" ? "arrow-down-outline" : "arrow-up-outline"}
                      size={18}
                      color={item.type === "credit" ? COLORS.success : COLORS.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.txTitle}>{item.title}</Text>
                    <Text style={styles.txDate}>{item.date}</Text>
                    <Text style={styles.txDesc}>{item.desc}</Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.txAmount,
                    {
                      color:
                        item.type === "credit" ? COLORS.success : COLORS.text,
                    },
                  ]}
                >
                  {item.amount}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  balanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  walletBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  walletBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  tag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  actionButtonOutline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  actionBtnOutlineText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  benefitTextContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  transactionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  txDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
});
