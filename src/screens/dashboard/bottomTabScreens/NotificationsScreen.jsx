import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getNotifications } from "../../../services/notificationService";
import { useNotifications } from "../../../context/NotificationContext";

const colors = { Success: "#16A34A", Info: "#2563EB", Warning: "#D97706", Error: "#DC2626" };

export default function NotificationsScreen({ navigation }) {
  const { markRead, markAllRead } = useNotifications();
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError("");
    try { const data = await getNotifications({ page: 1, pageSize: 100 }); setItems(data?.items || data?.data?.items || []); }
    catch (e) { setError(e.message || "Unable to load notifications."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const openItem = async (item) => { try { await markRead(item); } catch {} setItems((list) => list.map((x) => x.id === item.id ? { ...x, isRead: true } : x)); if (item.actionUrl && /booking/i.test(item.actionUrl)) navigation.navigate("Bookings"); };
  const markEverythingRead = async () => { try { await markAllRead(); setItems((list) => list.map((x) => ({ ...x, isRead: true }))); } catch {} };
  return <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
    <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={24} color="#0F172A" /></TouchableOpacity><Text style={styles.headerTitle}>Notifications</Text><View style={{ width: 24 }} /></View>
    <View style={styles.toolbar}><Text style={styles.subtitle}>{items.length ? `${items.length} notification${items.length === 1 ? "" : "s"}` : "Stay up to date"}</Text>{items.some((x) => !x.isRead) && <TouchableOpacity onPress={markEverythingRead}><Text style={styles.markAll}>Mark all as read</Text></TouchableOpacity>}</View>
    {loading ? <ActivityIndicator size="large" color="#E52332" style={styles.center} /> : error ? <View style={styles.center}><Text style={styles.subtitle}>{error}</Text><TouchableOpacity onPress={() => load()}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View> : <FlatList data={items} keyExtractor={(x) => String(x.id)} contentContainerStyle={items.length ? styles.list : styles.emptyList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#E52332" />} renderItem={({ item }) => <TouchableOpacity onPress={() => openItem(item)} style={[styles.card, !item.isRead && styles.unread]}><View style={[styles.icon, { backgroundColor: `${colors[item.severity] || colors.Info}18` }]}><Ionicons name={item.severity === "Error" ? "alert-circle-outline" : "notifications-outline"} size={22} color={colors[item.severity] || colors.Info} /></View><View style={styles.copy}><View style={styles.row}><Text style={styles.itemTitle}>{item.title}</Text>{!item.isRead && <View style={styles.dot} />}</View><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{item.createdAtUtc ? new Date(item.createdAtUtc).toLocaleString() : ""}</Text></View></TouchableOpacity>} ListEmptyComponent={<View style={styles.empty}><Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" /><Text style={styles.emptyTitle}>No notifications yet</Text><Text style={styles.subtitle}>We'll let you know when something important happens.</Text></View>} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: "#F4F7FC" }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }, back: { padding: 4 }, headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" }, toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 }, subtitle: { color: "#64748B", fontSize: 13 }, markAll: { color: "#E52332", fontSize: 13, fontWeight: "700" }, list: { padding: 16, paddingTop: 0 }, card: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 }, unread: { borderLeftWidth: 3, borderLeftColor: "#E52332" }, icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, row: { flexDirection: "row", alignItems: "center" }, itemTitle: { flex: 1, color: "#1E293B", fontSize: 14, fontWeight: "700" }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E52332", marginLeft: 6 }, message: { color: "#64748B", fontSize: 13, lineHeight: 19, marginTop: 5 }, date: { color: "#94A3B8", fontSize: 11, marginTop: 7 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, retry: { color: "#E52332", fontWeight: "700", marginTop: 12 }, emptyList: { flexGrow: 1 }, empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }, emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155", marginTop: 16, marginBottom: 8 }
});
