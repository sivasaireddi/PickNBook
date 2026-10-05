import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const RED = "#E11D2E";
const NAVY = "#102A43";
const MUTED = "#526581";

const ITEMS = [
  {
    title: "Travel Guidelines",
    icon: "document-text-outline",
    points: [
      "Carry a valid government-issued photo ID such as Aadhaar, passport, driving licence, or voter ID.",
      "For international travel, make sure your passport is valid for at least 6 months and you have required visas.",
      "Report at the airport at least 2 hours before domestic departures and 3 hours before international departures.",
    ],
  },
  {
    title: "Baggage Rules",
    icon: "briefcase-outline",
    points: [
      "Cabin and check-in baggage allowances are supplied by the selected fare and shown in the live fare details.",
      "Prohibited items such as power banks, batteries, and liquids above 100ml must not be carried in check-in baggage.",
    ],
  },
  {
    title: "Boarding Pass & Check-in",
    icon: "ticket-outline",
    points: [
      "Web check-in is mandated by airlines and generally opens 48 hours to 60 minutes before departure.",
      "A boarding pass is generated after successful check-in and can be downloaded or printed before arriving at the airport.",
      "Boarding passes may also be collected at the airline counter; fees may apply.",
    ],
  },
  {
    title: "Unaccompanied Minors",
    icon: "people-outline",
    points: [
      "Children aged 5–12 years travelling alone may be classified as unaccompanied minors.",
      "Direct booking and separate coordination with the airline may be required for escort services.",
      "Parent or guardian contact details may be required at airport check-in.",
    ],
  },
];

export default function ImportantInformationCard() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <Ionicons name="information-circle-outline" size={19} color={NAVY} />
        <Text style={styles.heading}>Important Information</Text>
      </View>
      {ITEMS.map((item, index) => {
        const open = openIndex === index;
        return (
          <View key={item.title} style={styles.item}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setOpenIndex(open ? null : index)}
              style={styles.itemHeader}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <View style={styles.itemTitleWrap}>
                <Ionicons name={item.icon} size={16} color={RED} />
                <Text style={styles.itemTitle}>{item.title}</Text>
              </View>
              <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={MUTED} />
            </TouchableOpacity>
            {open && (
              <View style={styles.points}>
                {item.points.map((point) => (
                  <View key={point} style={styles.pointRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.point}>{point}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E1E7EF", marginBottom: 10, borderLeftWidth: 3, borderLeftColor: RED },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  heading: { color: NAVY, fontSize: 16, fontWeight: "800" },
  item: { borderTopWidth: 1, borderTopColor: "#EEF2F6" },
  itemHeader: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  itemTitle: { color: NAVY, fontSize: 13, fontWeight: "800" },
  points: { paddingBottom: 10, paddingLeft: 25, paddingRight: 4, gap: 6 },
  pointRow: { flexDirection: "row", alignItems: "flex-start" },
  bullet: { color: RED, fontSize: 16, lineHeight: 20, marginRight: 7 },
  point: { flex: 1, color: MUTED, fontSize: 12, lineHeight: 17 },
});
