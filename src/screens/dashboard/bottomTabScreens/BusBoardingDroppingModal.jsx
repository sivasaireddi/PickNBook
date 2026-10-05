import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBoardingPoints } from "../../../services/busService";

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
};

const textValue = (value) => String(value ?? "").trim();

const normalizePoints = (value, kind) =>
  asList(value)
    .map((point, index) => {
      if (point === null || point === undefined || point === "") return null;
      if (typeof point !== "object") {
        return { id: `${kind}-${index}`, name: textValue(point), address: "", time: "" };
      }

      const name = textValue(
        point.Name ?? point.name ?? point.pointName ?? point.PointName ??
        point.Location ?? point.location ?? point.stopName ?? point.label ??
        point.Address ?? point.address,
      );
      const address = textValue(
        point.Address ?? point.address ?? point.Landmark ?? point.landmark ??
        point.description ?? point.stopAddress ?? point.pointAddress ?? point.city,
      );
      const time = textValue(
        point.Time ?? point.time ?? point.departureTime ?? point.arrivalTime ??
        point.scheduleTime ?? point.departureTimeUtc ?? point.arrivalTimeUtc,
      );

      return {
        id: String(point.CityPointIndex ?? point.cityPointIndex ?? point.Id ?? point.id ?? `${kind}-${index}`),
        name: name || `${kind === "boarding" ? "Boarding" : "Dropping"} point ${index + 1}`,
        address: address && address !== name ? address : "",
        time,
      };
    })
    .filter(Boolean);

const extractPoints = (payload, kind) => {
  const bus = payload?.bus || {};
  const keys = kind === "boarding"
    ? ["BoardingPoints", "BoardingPointsDetails", "boardingPoints", "boardingPointsDetails", "boardingStops"]
    : ["DroppingPoints", "DroppingPointsDetails", "droppingPoints", "droppingPointsDetails", "droppingStops"];

  for (const key of keys) {
    const value = payload?.[key] ?? bus?.[key];
    if (asList(value).length) return normalizePoints(value, kind);
  }
  return [];
};

function PointSection({ title, points, color, loading }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator color="#D11A2A" style={styles.loader} />
      ) : points.length ? (
        points.map((point, index) => (
          <View key={`${point.id}-${index}`} style={styles.pointRow}>
            <View style={[styles.pointRule, { backgroundColor: color }]} />
            <Text style={styles.pointTime}>{point.time || "—"}</Text>
            <View style={styles.pointCopy}>
              <Text style={styles.pointName} numberOfLines={2}>{point.name}</Text>
              {point.address ? <Text style={styles.pointAddress} numberOfLines={2}>– {point.address}</Text> : null}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No {title.toLowerCase()} available.</Text>
      )}
    </View>
  );
}

export default function BusBoardingDroppingModal({ visible, bus, fromCity, toCity, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [boardingPoints, setBoardingPoints] = useState([]);
  const [droppingPoints, setDroppingPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const routeBus = bus || {};
  const operatorName = textValue(routeBus.operatorName || routeBus.travelName || routeBus.busName) || "Bus Details";

  useEffect(() => {
    if (!visible || !bus) return undefined;

    let mounted = true;
    const initialBoarding = extractPoints({ bus }, "boarding");
    const initialDropping = extractPoints({ bus }, "dropping");
    setBoardingPoints(initialBoarding);
    setDroppingPoints(initialDropping);

    const traceId = bus.traceId ?? bus.TraceId;
    const resultIndex = bus.resultIndex ?? bus.ResultIndex;
    const srdvIndex = bus.srdvIndex ?? bus.SrdvIndex;
    if ((!traceId || !resultIndex) || (initialBoarding.length && initialDropping.length)) {
      setLoading(false);
      return () => { mounted = false; };
    }

    setLoading(true);
    getBoardingPoints({ traceId: String(traceId), srdvIndex: String(srdvIndex ?? ""), resultIndex: String(resultIndex) })
      .then((response) => {
        if (!mounted) return;
        const payload = response?.Result ?? response?.result ?? response?.data ?? response ?? {};
        const nextBoarding = extractPoints(payload, "boarding");
        const nextDropping = extractPoints(payload, "dropping");
        if (nextBoarding.length) setBoardingPoints(nextBoarding);
        if (nextDropping.length) setDroppingPoints(nextDropping);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [visible, bus]);

  const routeLabel = useMemo(() => {
    const from = textValue(fromCity || routeBus.source || routeBus.fromCity);
    const to = textValue(toCity || routeBus.destination || routeBus.toCity);
    return from && to ? `${from} → ${to}` : "Boarding & dropping itinerary";
  }, [fromCity, routeBus, toCity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <View style={[styles.modalCard, { maxHeight: Math.min(height - insets.top - insets.bottom - 16, 760) }]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Bus Details</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>{operatorName} · {routeLabel}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={23} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={[styles.content, width >= 700 && styles.contentWide]} showsVerticalScrollIndicator={false}>
            <PointSection title="Boarding Points" points={boardingPoints} color="#3B82F6" loading={loading && !boardingPoints.length} />
            <PointSection title="Dropping Points" points={droppingPoints} color="#EF4444" loading={loading && !droppingPoints.length} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.58)", justifyContent: "center", paddingHorizontal: 12 },
  modalCard: { width: "100%", backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", elevation: 10 },
  header: { minHeight: 76, backgroundColor: "#D11A2A", flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12 },
  headerCopy: { flex: 1, paddingRight: 12 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  headerSubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 11, fontWeight: "600", marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  content: { padding: 14, gap: 18 },
  contentWide: { flexDirection: "row", alignItems: "flex-start" },
  section: { flex: 1 },
  sectionTitle: { color: "#172554", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  pointRow: { minHeight: 34, flexDirection: "row", alignItems: "center" },
  pointRule: { width: 3, height: 24, borderRadius: 2, marginRight: 9 },
  pointTime: { width: 50, color: "#111827", fontSize: 12.5, fontWeight: "800" },
  pointCopy: { flex: 1, flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" },
  pointName: { color: "#111827", fontSize: 12.5, fontWeight: "800" },
  pointAddress: { color: "#64748B", fontSize: 11.5, marginLeft: 4 },
  loader: { marginVertical: 18 },
  emptyText: { color: "#64748B", fontSize: 13, paddingVertical: 12 },
});
