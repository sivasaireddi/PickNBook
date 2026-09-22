import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const INTRO_TEXT = /distances are displayed to the nearest 0?\.1 mile and kilometer\.?/i;

const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const parseDistanceText = (value) => {
  const text = cleanText(value);
  const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*km/i);
  const milesMatch = text.match(/(\d+(?:\.\d+)?)\s*mi(?:le|les)?/i);
  return {
    distanceKm: kmMatch ? `${kmMatch[1]} km` : "",
    distanceMiles: milesMatch ? `${milesMatch[1]} mi` : "",
  };
};

const parseCombinedText = (value) => {
  if (Array.isArray(value)) return value.flatMap(parseCombinedText);
  const text = cleanText(value).replace(INTRO_TEXT, "").trim();
  if (!text) return [];

  const result = [];
  const entryPattern = /(.+?)\s*-\s*(\d+(?:\.\d+)?)\s*km(?:\s*\/\s*(\d+(?:\.\d+)?)\s*mi(?:le|les)?)?/gi;
  let match;

  while ((match = entryPattern.exec(text)) !== null) {
    const name = cleanText(match[1]).replace(/^[|,;]+|[|,;]+$/g, "");
    if (!name || INTRO_TEXT.test(name)) continue;

    result.push({
      name,
      distanceKm: `${match[2]} km`,
      distanceMiles: match[3] ? `${match[3]} mi` : "",
    });
  }

  return result;
};

const normalizeStructuredAttraction = (value) => {
  if (!value || typeof value !== "object") return [];

  const name = value.name || value.title || value.attractionName || value.placeName;
  const distanceValue = value.distance || value.distanceText || value.distanceKm || value.km;
  const milesValue = value.distanceMiles || value.miles || value.mi;
  const parsedDistance = parseDistanceText(distanceValue);
  const parsedMiles = parseDistanceText(milesValue);

  if (name) {
    const nameText = cleanText(name);
    const parsedName = parseCombinedText(nameText);
    if (parsedName.length > 0) return parsedName;

    return [{
      name: nameText,
      distanceKm: parsedDistance.distanceKm || (typeof distanceValue === "number" ? `${distanceValue} km` : cleanText(distanceValue)),
      distanceMiles: parsedMiles.distanceMiles || (typeof milesValue === "number" ? `${milesValue} mi` : cleanText(milesValue)),
    }];
  }

  return parseCombinedText(value.detail || value.description || value.value || value.text || "");
};

export const normalizeAttractions = (attractions) => {
  const source = Array.isArray(attractions) ? attractions : [attractions];
  const entries = source.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number") return parseCombinedText(item);
    return normalizeStructuredAttraction(item);
  });

  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.name}|${entry.distanceKm}|${entry.distanceMiles}`.toLowerCase();
    if (!entry.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const AttractionRow = ({ attraction }) => (
  <View style={styles.row}>
    <View style={styles.rowIcon}>
      <Ionicons name="navigate-outline" size={16} color="#B4232C" />
    </View>
    <Text style={styles.name} numberOfLines={3}>{attraction.name}</Text>
    <View style={styles.distanceBlock}>
      {attraction.distanceKm ? <Text style={styles.distanceKm}>{attraction.distanceKm}</Text> : null}
      {attraction.distanceMiles ? <Text style={styles.distanceMiles}>{attraction.distanceMiles}</Text> : null}
    </View>
  </View>
);

export default function AttractionsPreview({ attractions }) {
  const [showAll, setShowAll] = useState(false);
  const normalizedAttractions = useMemo(() => normalizeAttractions(attractions), [attractions]);

  if (normalizedAttractions.length === 0) return null;

  const visibleAttractions = normalizedAttractions.slice(0, 5);
  const hasMore = normalizedAttractions.length > visibleAttractions.length;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="location-outline" size={19} color="#B4232C" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>ATTRACTIONS</Text>
            <Text style={styles.subtitle}>Popular places near this hotel</Text>
          </View>
        </View>

        <Text style={styles.infoText}>Distances are approximate</Text>

        <View style={styles.list}>
          {visibleAttractions.map((attraction, index) => (
            <AttractionRow
              key={`${attraction.name}-${index}`}
              attraction={attraction}
            />
          ))}
        </View>

        {hasMore ? (
          <Pressable style={styles.viewAllButton} onPress={() => setShowAll(true)}>
            <Text style={styles.viewAllText}>View all attractions</Text>
            <Ionicons name="arrow-forward" size={17} color="#B4232C" />
          </Pressable>
        ) : null}
      </View>

      <Modal visible={showAll} animationType="slide" transparent onRequestClose={() => setShowAll(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nearby attractions</Text>
                <Text style={styles.modalSubtitle}>{normalizedAttractions.length} places nearby</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setShowAll(false)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
              {normalizedAttractions.map((attraction, index) => (
                <AttractionRow key={`${attraction.name}-all-${index}`} attraction={attraction} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = {
  container: {
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: "800", color: "#334155", letterSpacing: 0.3 },
  subtitle: { fontSize: 12, color: "#94A3B8", marginTop: 3 },
  infoText: { fontSize: 11, color: "#94A3B8", marginTop: 14, marginBottom: 4 },
  list: { marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    gap: 10,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { flex: 1, fontSize: 13, lineHeight: 19, color: "#1F2937", fontWeight: "600" },
  distanceBlock: { minWidth: 54, alignItems: "flex-end" },
  distanceKm: { fontSize: 12, color: "#334155", fontWeight: "800" },
  distanceMiles: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 14,
  },
  viewAllText: { color: "#B4232C", fontSize: 13, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    height: "78%",
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  modalSubtitle: { fontSize: 12, color: "#64748B", marginTop: 3 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalList: { padding: 16, paddingBottom: 32 },
};
