import React, { useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const PALETTE = {
  primaryRed: "#E53935",
  darkRed: "#C62828",
  lightRed: "#FDECEC",
  borderRed: "#F5C2C0",
  accentRed: "#FF6B6B",
  textDark: "#1F2937",
  secondaryText: "#6B7280",
  darkGray: "#4B5563",
  veryLightRed: "#FFF5F5",
  white: "#FFFFFF",
};

const getTimeRangeLabel = (policy) => {
  if (!policy) return "Policy Rule";
  if (typeof policy === "string") return policy;

  const str = policy.PolicyString || policy.policyString || "";

  // Try matching "between X to Y hours"
  const betweenMatch = str.match(/between\s+(\d+)\s+to\s+(\d+)\s+hours/i);
  if (betweenMatch) {
    return `Between ${betweenMatch[1]}–${betweenMatch[2]} Hours`;
  }

  // Try matching "anytime before Z hours"
  const beforeMatch = str.match(/anytime before\s+(\d+)\s+hours/i);
  if (beforeMatch) {
    return `Before ${beforeMatch[1]} Hours`;
  }

  const time = String(policy.TimeBeforeDept ?? policy.timeBeforeDept ?? "");
  if (time === "-1" || Number(time) < 0) {
    return "More than 7 days before departure";
  }
  if (time && time !== "0") {
    return `Up to ${time} Hours before departure`;
  }

  return str || "Cancellation Policy";
};

const getChargeText = (policy) => {
  if (!policy) return "--";
  const charge = policy.CancellationCharge ?? policy.cancellationCharge ?? "0";
  const chargeType = (
    policy.CancellationChargeType ??
    policy.cancellationChargeType ??
    "Percentage"
  ).toLowerCase();

  if (chargeType.includes("percentage") || chargeType === "percent") {
    return `${charge}%`;
  }
  return `₹${charge}`;
};

const getRefundText = (policy) => {
  if (!policy) return null;
  const chargeStr = policy.CancellationCharge ?? policy.cancellationCharge;
  const chargeType = (
    policy.CancellationChargeType ??
    policy.cancellationChargeType ??
    "Percentage"
  ).toLowerCase();

  if (chargeType.includes("percentage") || chargeType === "percent") {
    const chargeVal = Number(chargeStr);
    if (!Number.isNaN(chargeVal)) {
      const refund = Math.max(0, 100 - chargeVal);
      return `${refund}% Refund`;
    }
  }
  return null;
};

// Red palette severity badge mapping
const getBadgeStyle = (chargeStr) => {
  const val = Number(chargeStr);
  if (val >= 100) {
    return { bg: "#E53935", border: "#E53935", text: "#FFFFFF" };
  }
  if (val >= 70) {
    return { bg: "#EF5350", border: "#EF5350", text: "#FFFFFF" };
  }
  if (val >= 50) {
    return { bg: "#FF8A80", border: "#FF8A80", text: "#8B0000" };
  }
  if (val >= 30) {
    return { bg: "#FDECEC", border: "#F5C2C0", text: "#C62828" };
  }
  if (val >= 20) {
    return { bg: "#FDECEC", border: "#F5C2C0", text: "#C62828" };
  }
  return { bg: "#FFF5F5", border: "#F5C2C0", text: "#C62828" };
};

export default function BusPoliciesModal({ visible, bus, onClose }) {
  const buttonScale = useRef(new Animated.Value(1)).current;

  if (!bus && !visible) return null;

  const operatorName =
    bus?.operatorName || bus?.TravelsName || bus?.travelsName || "Bus Operator";
  const busType = bus?.busType || bus?.BusType || "";

  const rawPolicies =
    bus?.CancellationPolicies ??
    bus?.cancellationPolicies ??
    bus?.CancellationPolicy ??
    bus?.cancellationPolicy ??
    [];

  const policiesList = Array.isArray(rawPolicies) ? rawPolicies : [];

  const partialCancellation = String(
    bus?.PartialCancellationAllowed ??
      bus?.partialCancellationAllowed ??
      "true",
  ).toLowerCase();

  const isPartialAllowed =
    partialCancellation === "true" || partialCancellation === "1";

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <LinearGradient
                colors={["#FF6B6B", "#E53935"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIconWrap}
              >
                <MaterialCommunityIcons
                  name="bus-clock"
                  size={20}
                  color={PALETTE.white}
                />
              </LinearGradient>

              <View style={styles.titleTextGroup}>
                <Text style={styles.title}>Cancellation Policy</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  Know the cancellation charges before booking
                </Text>
                {operatorName ? (
                  <Text style={styles.operator} numberOfLines={1}>
                    {operatorName} {busType ? `• ${busType}` : ""}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={PALETTE.darkRed} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Partial Cancellation Status Card */}
            <View style={styles.partialBanner}>
              <View style={styles.partialIconCircle}>
                <Ionicons
                  name={isPartialAllowed ? "checkmark" : "close"}
                  size={16}
                  color={PALETTE.white}
                />
              </View>
              <View style={styles.partialBannerTextWrap}>
                <Text style={styles.partialBannerTitle}>
                  {isPartialAllowed
                    ? "Partial Cancellation Allowed"
                    : "Partial Cancellation Not Allowed"}
                </Text>
                <Text style={styles.partialBannerSub}>
                  {isPartialAllowed
                    ? "You can cancel individual seat tickets from this booking."
                    : "All seats in this booking ticket must be cancelled together."}
                </Text>
              </View>
            </View>

            {/* Policy Section Heading */}
            <Text style={styles.sectionHeading}>Cancellation Charges</Text>

            {/* Policies Timeline List */}
            {policiesList.length > 0 ? (
              <View style={styles.timelineContainer}>
                {policiesList.map((policy, index) => {
                  const timeLabel = getTimeRangeLabel(policy);
                  const chargeText = getChargeText(policy);
                  const refundText = getRefundText(policy);
                  const badgeStyle = getBadgeStyle(
                    policy?.CancellationCharge ?? policy?.cancellationCharge,
                  );

                  const isLast = index === policiesList.length - 1;

                  return (
                    <View key={`policy-${index}`} style={styles.policyRow}>
                      {/* Red Timeline Connector Node */}
                      <View style={styles.timelineNodeCol}>
                        <View style={styles.timelineDotRing}>
                          <View style={styles.timelineDot} />
                        </View>
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>

                      {/* Policy Card Container */}
                      <View style={styles.policyCard}>
                        <View style={styles.policyCardHeader}>
                          <View style={styles.timeGroup}>
                            <Ionicons
                              name="time-outline"
                              size={15}
                              color={PALETTE.primaryRed}
                            />
                            <Text style={styles.timeLabel}>{timeLabel}</Text>
                          </View>

                          <View
                            style={[
                              styles.chargeBadge,
                              {
                                backgroundColor: badgeStyle.bg,
                                borderColor: badgeStyle.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.chargeText,
                                { color: badgeStyle.text },
                              ]}
                            >
                              {chargeText} Fee
                            </Text>
                          </View>
                        </View>

                        {/* Detail description if available */}
                        {policy.PolicyString ? (
                          <Text style={styles.policyDetailString}>
                            {policy.PolicyString}
                          </Text>
                        ) : null}

                        {/* Estimated Refund Text in Red */}
                        {refundText && (
                          <View style={styles.refundRow}>
                            <Ionicons
                              name="swap-horizontal"
                              size={14}
                              color={PALETTE.primaryRed}
                            />
                            <Text style={styles.refundTextLabel}>
                              Estimated Refund:{" "}
                              <Text style={styles.refundTextValue}>
                                {refundText}
                              </Text>
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : typeof rawPolicies === "string" && rawPolicies.trim() ? (
              <View style={styles.fallbackBox}>
                <Text style={styles.fallbackText}>{rawPolicies}</Text>
              </View>
            ) : (
              <View style={styles.fallbackBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={28}
                  color={PALETTE.primaryRed}
                />
                <Text style={styles.fallbackTitle}>No Cancellation Policy</Text>
                <Text style={styles.fallbackText}>
                  No cancellation policy available for this operator.
                </Text>
              </View>
            )}

            {/* Important Terms Card (Red Themed) */}
            <View style={styles.termsCard}>
              <View style={styles.termsHeader}>
                <View style={styles.termsIconCircle}>
                  <Ionicons
                    name="information"
                    size={14}
                    color={PALETTE.white}
                  />
                </View>
                <Text style={styles.termsTitle}>Important Terms</Text>
              </View>

              <View style={styles.termsList}>
                <View style={styles.termsItemRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.termsItemText}>
                    Cancellation charges are calculated based on the bus departure
                    time from the origin point.
                  </Text>
                </View>

                <View style={styles.termsItemRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.termsItemText}>
                    These charges are defined by the bus operator. Convenience fee may be non-refundable.
                  </Text>
                </View>

                <View style={styles.termsItemRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.termsItemText}>
                    Refunds will be credited back to your source account or PickCash
                    wallet within 3-5 business days.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Button (Gradient Red Height 56) */}
          <View style={styles.footer}>
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={onClose}
              style={styles.doneBtnWrapper}
            >
              <Animated.View
                style={[
                  styles.doneBtnAnimated,
                  { transform: [{ scale: buttonScale }] },
                ]}
              >
                <LinearGradient
                  colors={[PALETTE.primaryRed, PALETTE.darkRed]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.doneBtnGradient}
                >
                  <Text style={styles.doneBtnText}>Got It</Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: PALETTE.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: "50%",
    paddingTop: 10,
    shadowColor: PALETTE.darkRed,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PALETTE.primaryRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  titleTextGroup: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: PALETTE.textDark,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: PALETTE.secondaryText,
    marginTop: 1,
  },
  operator: {
    fontSize: 11,
    fontWeight: "600",
    color: PALETTE.darkRed,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PALETTE.lightRed,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  partialBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: PALETTE.lightRed,
    borderWidth: 1,
    borderColor: PALETTE.borderRed,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  partialIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE.primaryRed,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  partialBannerTextWrap: {
    flex: 1,
  },
  partialBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: PALETTE.darkRed,
    marginBottom: 2,
  },
  partialBannerSub: {
    fontSize: 12,
    fontWeight: "400",
    color: PALETTE.darkGray,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textDark,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  timelineContainer: {
    marginBottom: 20,
  },
  policyRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  timelineNodeCol: {
    width: 24,
    alignItems: "center",
    marginRight: 10,
  },
  timelineDotRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(229, 57, 53, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PALETTE.primaryRed,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: PALETTE.borderRed,
    marginTop: 4,
  },
  policyCard: {
    flex: 1,
    backgroundColor: PALETTE.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  policyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  chargeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chargeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  policyDetailString: {
    fontSize: 12,
    color: PALETTE.darkGray,
    marginTop: 8,
    lineHeight: 16,
  },
  refundRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  refundTextLabel: {
    fontSize: 12,
    color: PALETTE.darkGray,
  },
  refundTextValue: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.darkRed,
  },
  fallbackBox: {
    backgroundColor: PALETTE.veryLightRed,
    borderWidth: 1,
    borderColor: PALETTE.borderRed,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.darkRed,
    marginTop: 8,
    marginBottom: 4,
  },
  fallbackText: {
    fontSize: 12,
    color: PALETTE.darkGray,
    textAlign: "center",
    lineHeight: 18,
  },
  termsCard: {
    backgroundColor: PALETTE.veryLightRed,
    borderWidth: 1,
    borderColor: PALETTE.borderRed,
    borderRadius: 18,
    padding: 16,
  },
  termsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  termsIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PALETTE.primaryRed,
    justifyContent: "center",
    alignItems: "center",
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: PALETTE.darkRed,
  },
  termsList: {
    gap: 8,
  },
  termsItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.primaryRed,
    marginTop: 5,
  },
  termsItemText: {
    flex: 1,
    fontSize: 12,
    color: PALETTE.darkGray,
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  doneBtnWrapper: {
    width: "100%",
  },
  doneBtnAnimated: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: PALETTE.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  doneBtnGradient: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  doneBtnText: {
    color: PALETTE.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
