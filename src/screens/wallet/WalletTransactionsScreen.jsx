import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getWalletTransactions } from "../../services/WalletService";
import { formatCurrency, formatDate } from "./walletUtils";
import { BUS_FLOW_COLORS as COLORS } from "../../constants/colors";

const FILTERS = ["All", "Credit", "Debit", "Refund"];

export default function WalletTransactionsScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.min(screenWidth * 0.06, 24));
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async (page = 1, append = false) => {
    if (append) { if (loadingMoreRef.current || page > totalPagesRef.current) return; loadingMoreRef.current = true; setLoadingMore(true); }
    else { setLoading(true); setError(""); }
    try {
      const result = await getWalletTransactions(page, 20, filter);
      pageRef.current = result.page;
      totalPagesRef.current = result.totalPages;
      setItems((current) => append ? [...current, ...result.items] : result.items);
    } catch (requestError) {
      console.warn("[WalletTransactionsScreen] load failed:", requestError.message);
      if (!append) setError("Unable to load wallet information. Please try again.");
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false); loadingMoreRef.current = false;
    }
  }, [filter]);

  useEffect(() => { pageRef.current = 1; totalPagesRef.current = 1; setItems([]); load(1); }, [filter, load]);
  const refresh = () => { setRefreshing(true); pageRef.current = 1; totalPagesRef.current = 1; load(1); };
  const nextPage = () => load(pageRef.current + 1, true);

  return <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
    <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}><TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity><Text style={styles.title}>Transactions</Text><View style={styles.back} /></View>
    <View style={[styles.filters, { paddingHorizontal: horizontalPadding }]}>{FILTERS.map((item) => <TouchableOpacity key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && { backgroundColor: COLORS.accentLight }]}><Text style={[styles.filterText, filter === item && { color: COLORS.primary }]}>{item}</Text></TouchableOpacity>)}</View>
    {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View> : error ? <View style={styles.empty}><Ionicons name="cloud-offline-outline" size={30} color={COLORS.primary} /><Text style={styles.emptyText}>{error}</Text></View> : <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />} onScroll={({ nativeEvent }) => { const nearBottom = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 80; if (nearBottom) nextPage(); }} scrollEventThrottle={250}>
      {items.length === 0 ? <View style={styles.empty}><Ionicons name="receipt-outline" size={30} color="#94A3B8" /><Text style={styles.emptyText}>No transactions yet.</Text></View> : items.map((item) => <TransactionRow key={`${item.id}-${item.createdAt}`} item={item} />)}
      {loadingMore && <ActivityIndicator style={styles.more} color="#2563EB" />}
    </ScrollView>}
  </SafeAreaView>;
}

function TransactionRow({ item }) {
  const normalized = String(item.transactionType || "").toLowerCase();
  const positive = normalized === "credit" || normalized === "refund";
  const color = positive ? "#16A34A" : "#DC2626";
  const icon = normalized === "refund" ? "refresh-outline" : positive ? "arrow-down-outline" : "arrow-up-outline";
  return <View style={styles.row}><View style={[styles.icon, { backgroundColor: `${color}16` }]}><Ionicons name={icon} size={20} color={color} /></View><View style={styles.rowMain}><View style={styles.rowTop}><Text style={styles.type}>{item.transactionType || "Transaction"}</Text><Text style={[styles.amount, { color }]}>{positive ? "+" : "-"} {formatCurrency(item.amount)}</Text></View><Text style={styles.description}>{item.description || "Wallet transaction"}</Text><Text style={styles.meta}>{item.referenceType || "Wallet"}{item.refCode ? ` · ${item.refCode}` : ""}</Text><Text style={styles.meta}>{formatDate(item.createdAt)} · {item.status || "—"} · Balance: {formatCurrency(item.runningBalance)}</Text></View></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#F8FAFC" }, header: { height: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 38, height: 38, alignItems: "center", justifyContent: "center" }, title: { color: "#0F172A", fontSize: 20, fontWeight: "800" }, filters: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 4 }, filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: "#E2E8F0" }, filterActive: { backgroundColor: "#DBEAFE" }, filterText: { color: "#64748B", fontSize: 12, fontWeight: "700" }, filterTextActive: { color: "#1D4ED8" }, content: { padding: 20, paddingTop: 12, paddingBottom: 35 }, loading: { flex: 1, alignItems: "center", justifyContent: "center" }, row: { flexDirection: "row", padding: 14, borderRadius: 15, backgroundColor: "#FFFFFF", marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" }, icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, rowMain: { flex: 1, marginLeft: 12 }, rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, type: { color: "#0F172A", fontSize: 14, fontWeight: "800" }, amount: { fontSize: 14, fontWeight: "900" }, description: { color: "#334155", fontSize: 13, marginTop: 5 }, meta: { color: "#64748B", fontSize: 11, marginTop: 4 }, more: { paddingVertical: 12 }, empty: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", padding: 30 }, emptyText: { color: "#64748B", textAlign: "center", marginTop: 10, fontSize: 14 },
});
