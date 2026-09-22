import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const asText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return asText(value.detail || value.description || value.name || value.value || value.data);
  }
  return "";
};

const uniqueTexts = (values) => {
  const seen = new Set();
  return values
    .flatMap((value) => asText(value).split(/\r?\n/))
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value.toLowerCase())) return false;
      seen.add(value.toLowerCase());
      return true;
    });
};

const collectPolicyTexts = (value) => {
  if (!value) return [];
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
      .split("|")
      .flatMap((part) => {
        const text = part.trim();
        if (!text) return [];
        try {
          const parsed = JSON.parse(text);
          return typeof parsed === "object" ? collectPolicyTexts(parsed) : [text];
        } catch {
          return [text];
        }
      });
  }
  if (Array.isArray(value)) return value.flatMap(collectPolicyTexts);
  if (typeof value === "object") {
    return [
      ...collectPolicyTexts(value.detail),
      ...collectPolicyTexts(value.data),
      ...collectPolicyTexts(value.value),
    ];
  }
  return [];
};

const Section = ({ title, icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color="#B4232C" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

export function HotelOverviewSection({ hotel }) {
  const descriptionValues = Array.isArray(hotel?.description)
    ? hotel.description.flatMap((item) => item?.detail || item?.description || item)
    : [hotel?.description];
  const values = uniqueTexts([...descriptionValues, hotel?.otherDetails]);
  if (!values.length) return null;

  return (
    <Section title="ABOUT THIS HOTEL" icon="information-circle-outline">
      {values.map((value, index) => (
        <Text key={`${value}-${index}`} style={styles.bodyText}>{value}</Text>
      ))}
    </Section>
  );
}

export function HotelPoliciesSection({ hotel }) {
  const values = uniqueTexts([
    ...collectPolicyTexts(hotel?.hotelPolicy),
    ...collectPolicyTexts(hotel?.policyAndInstruction),
    ...collectPolicyTexts(hotel?.specialInstructions),
  ]);
  if (!values.length) return null;

  return (
    <Section title="HOTEL POLICIES" icon="document-text-outline">
      {values.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.policyRow}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#15803D" />
          <Text style={styles.bodyText}>{value}</Text>
        </View>
      ))}
    </Section>
  );
}

export function HotelAttractionsSection({ attractions }) {
  if (!Array.isArray(attractions) || attractions.length === 0) return null;
  const values = uniqueTexts(attractions);
  if (!values.length) return null;

  return (
    <Section title="ATTRACTIONS" icon="location-outline">
      {values.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.policyRow}>
          <Ionicons name="navigate-circle-outline" size={16} color="#B4232C" />
          <Text style={styles.bodyText}>{value}</Text>
        </View>
      ))}
    </Section>
  );
}

export function HotelInformationSection({ hotel }) {
  const url = String(hotel?.hotelURL || "").trim();
  const services = Array.isArray(hotel?.servicesStatus) ? hotel.servicesStatus : [];
  const serviceValues = services
    .map((service) => `${asText(service?.name)}: ${asText(service?.value)}`.replace(/: $/, ""))
    .filter(Boolean);
  if (!url && !serviceValues.length) return null;

  return (
    <Section title="HOTEL INFORMATION" icon="business-outline">
      {url && /^https?:\/\//i.test(url) ? (
        <Pressable style={styles.linkRow} onPress={() => Linking.openURL(url)}>
          <Ionicons name="open-outline" size={16} color="#B4232C" />
          <Text style={styles.linkText}>Visit hotel website</Text>
        </Pressable>
      ) : null}
      {serviceValues.map((value, index) => (
        <Text key={`${value}-${index}`} style={styles.bodyText}>{value}</Text>
      ))}
    </Section>
  );
}

export function CancellationDetails({ room, formatCurrency }) {
  const policies = Array.isArray(room?.cancellationPolicies) ? room.cancellationPolicies : [];
  const hasDetails = policies.length > 0 || room?.lastCancellationDate || room?.fullRefundAllowed !== undefined || room?.cancellationPolicy;
  if (!hasDetails) return null;

  return (
    <View style={styles.cancellationBox}>
      <Text style={styles.subheading}>Cancellation policy</Text>
      {room?.fullRefundAllowed !== undefined ? (
        <Text style={styles.detailText}>{room.fullRefundAllowed ? "Full refund available" : "Full refund not available"}</Text>
      ) : null}
      {room?.lastCancellationDate ? (
        <Text style={styles.detailText}>Last cancellation date: {room.lastCancellationDate}</Text>
      ) : null}
      {room?.cancellationPolicy ? (
        <Text style={styles.detailText}>{room.cancellationPolicy}</Text>
      ) : null}
      {policies.map((policy, index) => {
        const charge = Number(policy?.charge);
        const chargeText = Number.isFinite(charge) && charge >= 0
          ? formatCurrency(charge, policy?.currency || "INR")
          : "Charge not specified";
        const period = [policy?.fromDate, policy?.toDate].filter(Boolean).join(" to ");
        return (
          <View key={`${period}-${index}`} style={styles.policyRow}>
            <Ionicons name="calendar-outline" size={16} color="#B45309" />
            <Text style={styles.detailText}>
              {period || "Cancellation period"} · {chargeText}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export const infoSectionStyles = styles;

const styles = {
  section: {
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 9 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#334155", letterSpacing: 0.4 },
  bodyText: { fontSize: 13, lineHeight: 20, color: "#475569", flex: 1 },
  policyRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  linkText: { color: "#B4232C", fontSize: 13, fontWeight: "700" },
  cancellationBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: "#E2E8F0", gap: 5 },
  subheading: { fontSize: 11, fontWeight: "800", color: "#64748B", textTransform: "uppercase" },
  detailText: { fontSize: 11, lineHeight: 17, color: "#64748B", flex: 1 },
};
