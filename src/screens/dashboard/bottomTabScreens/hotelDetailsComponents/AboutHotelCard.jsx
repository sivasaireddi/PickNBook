import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const normalizeKey = (value) => String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");

const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const extractText = (value) => {
  if (value === null || value === undefined) return [];
  if (typeof value === "string" || typeof value === "number") {
    const text = cleanText(value);
    if (!text) return [];

    // Some suppliers return JSON only inside non-Default fields. Render its
    // values as readable text instead of exposing the raw JSON string.
    if (text.startsWith("{") || text.startsWith("[")) {
      try {
        return extractText(JSON.parse(text));
      } catch {
        return [text];
      }
    }
    return [text];
  }
  if (Array.isArray(value)) return value.flatMap(extractText);
  if (typeof value === "object") {
    return Object.values(value).flatMap(extractText);
  }
  return [];
};

const unique = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeDescription = (description) => {
  if (!Array.isArray(description)) return {};

  return description.reduce((result, item) => {
    const key = normalizeKey(item?.name);
    if (!key || key === "default" || key === "attractions") return result;

    const values = unique(extractText(item?.detail || item?.description || item?.value));
    if (values.length > 0 && !result[key]) result[key] = values;
    return result;
  }, {});
};

const firstValue = (entries, keys) => {
  for (const key of keys) {
    if (entries[key]?.length) return entries[key][0];
  }
  return "";
};

const splitReadableItems = (values) => unique(values.flatMap((value) =>
  value.split(/\s*[·•|]\s*|\s*,\s*(?=[A-Z])/).map(cleanText)
));

const Highlight = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.highlightCard}>
      <View style={styles.highlightIcon}>
        <Ionicons name={icon} size={17} color="#B4232C" />
      </View>
      <Text style={styles.highlightLabel}>{label}</Text>
      <Text style={styles.highlightValue} numberOfLines={2}>{value}</Text>
    </View>
  );
};

const DetailBlock = ({ icon, title, values, chips = false }) => {
  if (!values?.length) return null;
  return (
    <View style={styles.detailBlock}>
      <View style={styles.detailHeading}>
        <Ionicons name={icon} size={16} color="#B4232C" />
        <Text style={styles.detailTitle}>{title}</Text>
      </View>
      {chips ? (
        <View style={styles.chipRow}>
          {values.map((value, index) => (
            <View style={styles.chip} key={`${value}-${index}`}>
              <Text style={styles.chipText}>{value}</Text>
            </View>
          ))}
        </View>
      ) : (
        values.map((value, index) => (
          <Text style={styles.detailText} key={`${value}-${index}`}>{value}</Text>
        ))
      )}
    </View>
  );
};

export default function AboutHotelCard({ description }) {
  const [expanded, setExpanded] = useState(false);
  const entries = useMemo(() => normalizeDescription(description), [description]);

  const headline = firstValue(entries, ["headline"]);
  const introduction = firstValue(entries, ["amenities", "shortdescription", "overview"]);
  const rooms = firstValue(entries, ["rooms"]);
  const dining = firstValue(entries, ["dining"]);
  const payments = splitReadableItems(entries["onsite payments"] || entries["onsite payment"] || []);
  const languages = splitReadableItems(entries["spoken languages"] || entries["languages"] || []);
  const services = splitReadableItems(entries["business amenities"] || entries["business amenity"] || []);
  const location = entries["location"] || [];

  const detailEntries = Object.entries(entries).filter(([key]) => (
    !["headline", "amenities", "shortdescription", "overview", "default", "attractions"].includes(key)
  ));

  const hasDetails = detailEntries.length > 0 || introduction.length > 0;
  if (!headline && !introduction && !hasDetails) return null;

  const servicePreview = services.slice(0, 3);

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded((current) => !current)}>
        <View style={styles.headerIcon}>
          <Ionicons name="information-circle-outline" size={20} color="#B4232C" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>ABOUT THIS HOTEL</Text>
          <Text style={styles.subtitle}>Everything you need to know</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
      </Pressable>

      {headline ? (
        <View style={styles.headlineRow}>
          <Ionicons name="location-outline" size={17} color="#B4232C" />
          <Text style={styles.headline}>{headline}</Text>
        </View>
      ) : null}

      {introduction ? (
        <Text style={styles.introduction} numberOfLines={expanded ? undefined : 3}>
          {introduction}
        </Text>
      ) : null}

      <View style={styles.highlightsGrid}>
        <Highlight icon="bed-outline" label="ROOMS" value={rooms} />
        <Highlight icon="restaurant-outline" label="DINING" value={dining} />
        <Highlight icon="card-outline" label="PAYMENTS" value={payments.join(" · ")} />
        <Highlight icon="globe-outline" label="LANGUAGES" value={languages.join(" · ")} />
      </View>

      {servicePreview.length > 0 ? (
        <View style={styles.servicesPreview}>
          <View style={styles.detailHeading}>
            <Ionicons name="sparkles-outline" size={16} color="#B4232C" />
            <Text style={styles.detailTitle}>HOTEL SERVICES</Text>
          </View>
          <Text style={styles.serviceText}>{servicePreview.join(" · ")}</Text>
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.expandedContent}>
          <DetailBlock icon="bed-outline" title="ROOMS" values={entries.rooms} />
          <DetailBlock icon="document-text-outline" title="HOTEL OVERVIEW" values={entries.overview} />
          <DetailBlock icon="restaurant-outline" title="DINING" values={dining ? [dining] : []} />
          <DetailBlock icon="sparkles-outline" title="HOTEL SERVICES" values={services} />
          <DetailBlock icon="card-outline" title="PAYMENT OPTIONS" values={payments} chips />
          <DetailBlock icon="globe-outline" title="LANGUAGES" values={languages} chips />
          <DetailBlock icon="location-outline" title="LOCATION" values={location} />
        </View>
      ) : null}

      <Pressable style={styles.readMoreButton} onPress={() => setExpanded((current) => !current)}>
        <Text style={styles.readMoreText}>{expanded ? "Read less" : "Read more"}</Text>
        <Ionicons name={expanded ? "arrow-up" : "arrow-down"} size={16} color="#B4232C" />
      </Pressable>
    </View>
  );
}

const styles = {
  container: {
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    marginHorizontal: 16,
    padding: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: "800", color: "#334155", letterSpacing: 0.25 },
  subtitle: { fontSize: 12, color: "#94A3B8", marginTop: 3 },
  headlineRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginTop: 17 },
  headline: { flex: 1, fontSize: 14, lineHeight: 20, color: "#B4232C", fontWeight: "700" },
  introduction: { fontSize: 14, lineHeight: 21, color: "#475569", marginTop: 12 },
  highlightsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  highlightCard: {
    width: "48.5%",
    minHeight: 92,
    padding: 11,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  highlightIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  highlightLabel: { fontSize: 10, fontWeight: "800", color: "#64748B", letterSpacing: 0.35 },
  highlightValue: { fontSize: 12, lineHeight: 17, color: "#1F2937", fontWeight: "700", marginTop: 3 },
  servicesPreview: { marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderColor: "#F1F5F9" },
  detailHeading: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7 },
  detailTitle: { fontSize: 11, fontWeight: "800", color: "#64748B", letterSpacing: 0.45 },
  serviceText: { fontSize: 13, lineHeight: 19, color: "#475569" },
  expandedContent: { marginTop: 5, borderTopWidth: 1, borderColor: "#F1F5F9" },
  detailBlock: { paddingTop: 14 },
  detailText: { fontSize: 13, lineHeight: 20, color: "#475569", marginBottom: 5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { backgroundColor: "#FFF5F5", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: "#B4232C", fontSize: 12, fontWeight: "700" },
  readMoreButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingTop: 16 },
  readMoreText: { color: "#B4232C", fontSize: 13, fontWeight: "800" },
};
