import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { parseRawFareRules } from "../utils/fareRuleParser";

const PRIMARY_RED = "#D11A2A";
const TEXT_DARK = "#0F172A";
const TEXT_MUTED = "#64748B";

export default function FareRuleModal({
  visible,
  onClose,
  loading = false,
  fareRuleData = null,
  origin = "DEL",
  destination = "BOM",
  airline = "Flight",
}) {
  const parsedData = useMemo(() => {
    return parseRawFareRules(fareRuleData);
  }, [fareRuleData]);

  const { specialRules = [], sections = [] } = parsedData;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>

          {/* Pull Handle Decor */}
          <View style={styles.handleWrap}>
            <View style={styles.handleBar} />
          </View>

          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="document-text-outline" size={20} color={PRIMARY_RED} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{airline} Fare Rules</Text>
                <View style={styles.routeBadgeRow}>
                  <Text style={styles.routeText}>{origin}</Text>
                  <Ionicons name="arrow-forward" size={12} color={PRIMARY_RED} style={styles.arrowIcon} />
                  <Text style={styles.routeText}>{destination}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PRIMARY_RED} />
                <Text style={styles.loadingText}>Fetching live fare rules & penalties...</Text>
              </View>
            ) : (
              <>
                {/* Special Rules Notice Card */}
                {specialRules.length > 0 && (
                  <View style={styles.specialNoticeCard}>
                    <View style={styles.specialHeader}>
                      <Ionicons name="information-circle" size={18} color="#D97706" />
                      <Text style={styles.specialTitle}>Special Note</Text>
                    </View>
                    {specialRules.map((rule, idx) => (
                      <Text key={idx} style={styles.specialText}>
                        {rule}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Section Cards List */}
                {sections.length > 0 ? (
                  sections.map((section, sIdx) => (
                    <View key={sIdx} style={styles.sectionCard}>
                      
                      {/* Section Title Header */}
                      <View style={[styles.sectionHeader, { backgroundColor: section.badgeBg || "#F8FAFC" }]}>
                        <View style={styles.sectionTitleLeft}>
                          <Ionicons name={section.icon || "paper-plane-outline"} size={18} color={section.color || PRIMARY_RED} />
                          <Text style={[styles.sectionTitle, { color: section.color || TEXT_DARK }]}>
                            {section.title}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.sectionBody}>
                        {/* Timeframe & Fee Rows */}
                        {section.rows.map((row, rIdx) => (
                          <View key={rIdx} style={styles.tableRow}>
                            <View style={styles.colTimeframe}>
                              <Text style={styles.timeframeLabel}>Time Frame</Text>
                              <Text style={styles.timeframeVal}>{row.timeframe}</Text>
                            </View>
                            
                            <View style={[styles.colFeeBadge, { backgroundColor: section.badgeBg || "#F1F5F9" }]}>
                              <Text style={[styles.feeVal, { color: section.color || PRIMARY_RED }]}>
                                {row.fee}
                              </Text>
                            </View>
                          </View>
                        ))}

                        {/* Policy Notes / Bullet Rules */}
                        {section.notes.length > 0 && (
                          <View style={styles.notesContainer}>
                            {section.notes.map((note, nIdx) => (
                              <View key={nIdx} style={styles.noteItemRow}>
                                <Ionicons name="ellipse" size={5} color={section.color || PRIMARY_RED} style={styles.noteDot} />
                                <Text style={styles.noteText}>{note}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="shield-checkmark-outline" size={40} color="#059669" />
                    <Text style={styles.emptyTitle}>Standard Policy Applies</Text>
                    <Text style={styles.emptyText}>
                      Standard airline cancellation, date change penalties, and statutory taxes refund policies apply to this booking segment.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.footerWrap}>
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={styles.gotItBtn}>
              <Text style={styles.gotItBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 20,
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handleBar: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  routeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  routeText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_RED,
  },
  arrowIcon: {
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  specialNoticeCard: {
    backgroundColor: "#FEFCE8",
    borderWidth: 1,
    borderColor: "#FDE047",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  specialHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  specialTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  specialText: {
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  sectionBody: {
    padding: 16,
    gap: 12,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  colTimeframe: {
    flex: 1,
  },
  timeframeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeframeVal: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 2,
  },
  colFeeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  feeVal: {
    fontSize: 13,
    fontWeight: "800",
  },
  notesContainer: {
    gap: 6,
    marginTop: 4,
    paddingLeft: 4,
  },
  noteItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteDot: {
    marginTop: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#047857",
  },
  emptyText: {
    fontSize: 12,
    color: "#065F46",
    textAlign: "center",
    lineHeight: 18,
  },
  footerWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  gotItBtn: {
    height: 48,
    backgroundColor: PRIMARY_RED,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gotItBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
