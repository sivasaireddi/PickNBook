import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getWalletDeposits, getWalletSummary } from "../../services/WalletService";
import { formatCurrency, formatDate, walletStatusColor } from "./walletUtils";
import { BUS_FLOW_COLORS as COLORS } from "../../constants/colors";

export default function WalletScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.min(screenWidth * 0.06, 24));
  const [summary, setSummary] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadWallet = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [nextSummary, nextDeposits] = await Promise.all([
        getWalletSummary(),
        getWalletDeposits(),
      ]);
      setSummary(nextSummary);
      setDeposits(nextDeposits);
    } catch (requestError) {
      console.warn("[WalletScreen] load failed:", requestError.message);
      setError("Unable to load wallet information. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadWallet();
  }, [loadWallet]));

  const isActive = String(summary?.walletStatus || "").toLowerCase() === "active";

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity onPress={() => loadWallet(true)} style={styles.headerButton}>
          <Ionicons name="refresh-outline" size={21} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWallet(true)} tintColor="#2563EB" />}
      >
        {loading && !summary ? (
          <View style={styles.loadingBox}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : error && !summary ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={30} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: COLORS.primary }]} onPress={() => loadWallet()}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <LinearGradient colors={[COLORS.primary, "#B91C1C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
              <View style={styles.balanceTop}><Text style={styles.balanceLabel}>Wallet Balance</Text><Ionicons name="wallet-outline" size={25} color="#DBEAFE" /></View>
              <Text style={styles.balanceValue}>{formatCurrency(summary?.availableBalance)}</Text>
              <Text style={styles.availableText}>Available Balance</Text>
              <View style={styles.balanceDetails}>
                <View><Text style={styles.detailLabel}>PickNBook Coins</Text><Text style={styles.detailValue}>{summary?.picknbookCoins ?? 0}</Text></View>
                <View><Text style={styles.detailLabel}>Wallet Status</Text><Text style={[styles.detailValue, { color: "#BBF7D0" }]}>{summary?.walletStatus || "Unavailable"}</Text></View>
              </View>
            </LinearGradient>

            {!isActive && <View style={styles.warning}><Ionicons name="warning-outline" size={20} color="#B45309" /><Text style={styles.warningText}>Your wallet is currently unavailable.</Text></View>}

            <View style={styles.statsRow}>
              <Stat label="Total Added" value={formatCurrency(summary?.totalAdded)} />
              <Stat label="Total Used" value={formatCurrency(summary?.totalUsed)} />
              <Stat label="Refunded" value={formatCurrency(summary?.totalRefunded)} />
            </View>

            <View style={styles.actionsRow}>
              <Action icon="list-outline" title="Transactions" onPress={() => navigation.navigate("WalletTransactionsScreen")} />
            </View>

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Deposit History</Text><Text style={styles.sectionHint}>{deposits.length} request{deposits.length === 1 ? "" : "s"}</Text></View>
            {deposits.length === 0 ? <EmptyState icon="document-text-outline" text="No deposit requests yet." /> : deposits.map((deposit) => <DepositRow key={String(deposit.id)} deposit={deposit} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }
function Action({ icon, title, onPress, disabled }) { return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.action, { borderColor: disabled ? "#E2E8F0" : COLORS.primary }, disabled && styles.disabledAction]}><Ionicons name={icon} size={22} color={disabled ? "#94A3B8" : COLORS.primary} /><Text style={[styles.actionText, { color: disabled ? "#94A3B8" : COLORS.primary }]}>{title}</Text></TouchableOpacity>; }
function DepositRow({ deposit }) { const color = walletStatusColor(deposit.status); return <View style={styles.depositRow}><View style={styles.depositIcon}><Ionicons name="arrow-down-outline" size={20} color="#2563EB" /></View><View style={styles.depositInfo}><Text style={styles.depositAmount}>{formatCurrency(deposit.amount)}</Text><Text style={styles.depositMeta}>{deposit.type} · {formatDate(deposit.transactionDate)}</Text>{deposit.adminRemark ? <Text style={styles.remark}>{deposit.adminRemark}</Text> : null}</View><Text style={[styles.status, { color, backgroundColor: `${color}18` }]}>{deposit.status}</Text></View>; }
function EmptyState({ icon, text }) { return <View style={styles.empty}><Ionicons name={icon} size={28} color="#94A3B8" /><Text style={styles.emptyText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" }, header: { height: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8FAFC" }, headerButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" }, content: { padding: 20, paddingBottom: 36 }, loadingBox: { height: 420, alignItems: "center", justifyContent: "center" }, errorBox: { alignItems: "center", justifyContent: "center", paddingVertical: 100 }, errorText: { color: "#475569", textAlign: "center", marginTop: 12, fontSize: 14 }, retryButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: "#2563EB" }, retryText: { color: "#FFFFFF", fontWeight: "700" }, balanceCard: { borderRadius: 22, padding: 22, shadowColor: "#1E3A8A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 5 }, balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, balanceLabel: { color: "#DBEAFE", fontSize: 14, fontWeight: "700" }, balanceValue: { color: "#FFFFFF", fontSize: 32, fontWeight: "900", marginTop: 18 }, availableText: { color: "#BFDBFE", fontSize: 12, marginTop: 2 }, balanceDetails: { flexDirection: "row", justifyContent: "space-between", marginTop: 26, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }, detailLabel: { color: "#BFDBFE", fontSize: 11, marginBottom: 4 }, detailValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" }, warning: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: "#FEF3C7" }, warningText: { flex: 1, color: "#92400E", fontSize: 13, fontWeight: "600" }, statsRow: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 16, marginTop: 16, paddingVertical: 15, borderWidth: 1, borderColor: "#E2E8F0" }, stat: { flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: "#E2E8F0" }, statLabel: { color: "#64748B", fontSize: 10 }, statValue: { color: "#0F172A", fontSize: 12, fontWeight: "800", marginTop: 5 }, actionsRow: { flexDirection: "row", gap: 12, marginTop: 18 }, action: { flex: 1, height: 52, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#BFDBFE", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }, actionText: { color: "#1D4ED8", fontWeight: "800", fontSize: 13 }, disabledAction: { borderColor: "#E2E8F0", backgroundColor: "#F1F5F9" }, disabledText: { color: "#94A3B8" }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 12 }, sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" }, sectionHint: { color: "#94A3B8", fontSize: 12 }, depositRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 15, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" }, depositIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" }, depositInfo: { flex: 1, marginLeft: 12 }, depositAmount: { color: "#0F172A", fontSize: 15, fontWeight: "800" }, depositMeta: { color: "#64748B", fontSize: 12, marginTop: 3 }, remark: { color: "#64748B", fontSize: 11, marginTop: 3 }, status: { fontSize: 11, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }, empty: { alignItems: "center", paddingVertical: 42, backgroundColor: "#FFFFFF", borderRadius: 15 }, emptyText: { color: "#64748B", marginTop: 8, fontSize: 14 },
});
