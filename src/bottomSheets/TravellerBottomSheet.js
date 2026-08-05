import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { RADIUS, SPACING } from "../constants/spacing";
import GradientButton from "../components/GradientButton";

export function TravellerBottomSheet({
  visible,
  onClose,
  travellers,
  onApply,
}) {
  const [counts, setCounts] = useState(
    travellers || { adults: 1, children: 0, infants: 0 }
  );

  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setCounts(travellers || { adults: 1, children: 0, infants: 0 });
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, travellers, slideAnim]);

  const totalPax = counts.adults + counts.children + counts.infants;

  const updateCount = (type, delta) => {
    setCounts((prev) => {
      const current = prev[type] || 0;
      const next = current + delta;

      if (type === "adults" && next < 1) return prev;
      if (next < 0) return prev;

      const nextTotal =
        (type === "adults" ? next : prev.adults) +
        (type === "children" ? next : prev.children) +
        (type === "infants" ? next : prev.infants);

      if (nextTotal > 9) return prev;
      if (type === "infants" && next > (type === "adults" ? next : prev.adults))
        return prev;

      return {
        ...prev,
        [type]: next,
      };
    });
  };

  const handleDone = () => {
    onApply(counts);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheetContainer,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Top Handle */}
              <View style={styles.handleBar} />

              <View style={styles.header}>
                <Text style={styles.title}>Select Travellers</Text>
                <TouchableOpacity onPress={onClose} hitSlop={10}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>Maximum 9 travellers per booking</Text>

              {/* Steppers */}
              <View style={styles.stepperList}>
                {/* Adults */}
                <View style={styles.stepperRow}>
                  <View>
                    <Text style={styles.paxLabel}>Adults</Text>
                    <Text style={styles.paxSub}>12+ years</Text>
                  </View>
                  <View style={styles.counterGroup}>
                    <TouchableOpacity
                      disabled={counts.adults <= 1}
                      onPress={() => updateCount("adults", -1)}
                      style={[
                        styles.counterBtn,
                        counts.adults <= 1 && styles.counterBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={counts.adults <= 1 ? COLORS.placeholder : COLORS.textPrimary}
                      />
                    </TouchableOpacity>
                    <Text style={styles.counterVal}>{counts.adults}</Text>
                    <TouchableOpacity
                      disabled={totalPax >= 9}
                      onPress={() => updateCount("adults", 1)}
                      style={[
                        styles.counterBtn,
                        totalPax >= 9 && styles.counterBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={totalPax >= 9 ? COLORS.placeholder : COLORS.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Children */}
                <View style={styles.stepperRow}>
                  <View>
                    <Text style={styles.paxLabel}>Children</Text>
                    <Text style={styles.paxSub}>2 - 11 years</Text>
                  </View>
                  <View style={styles.counterGroup}>
                    <TouchableOpacity
                      disabled={counts.children <= 0}
                      onPress={() => updateCount("children", -1)}
                      style={[
                        styles.counterBtn,
                        counts.children <= 0 && styles.counterBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={counts.children <= 0 ? COLORS.placeholder : COLORS.textPrimary}
                      />
                    </TouchableOpacity>
                    <Text style={styles.counterVal}>{counts.children}</Text>
                    <TouchableOpacity
                      disabled={totalPax >= 9}
                      onPress={() => updateCount("children", 1)}
                      style={[
                        styles.counterBtn,
                        totalPax >= 9 && styles.counterBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={totalPax >= 9 ? COLORS.placeholder : COLORS.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Infants */}
                <View style={styles.stepperRow}>
                  <View>
                    <Text style={styles.paxLabel}>Infants</Text>
                    <Text style={styles.paxSub}>Below 2 years (on lap)</Text>
                  </View>
                  <View style={styles.counterGroup}>
                    <TouchableOpacity
                      disabled={counts.infants <= 0}
                      onPress={() => updateCount("infants", -1)}
                      style={[
                        styles.counterBtn,
                        counts.infants <= 0 && styles.counterBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={counts.infants <= 0 ? COLORS.placeholder : COLORS.textPrimary}
                      />
                    </TouchableOpacity>
                    <Text style={styles.counterVal}>{counts.infants}</Text>
                    <TouchableOpacity
                      disabled={totalPax >= 9 || counts.infants >= counts.adults}
                      onPress={() => updateCount("infants", 1)}
                      style={[
                        styles.counterBtn,
                        (totalPax >= 9 || counts.infants >= counts.adults) &&
                          styles.counterBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={
                          totalPax >= 9 || counts.infants >= counts.adults
                            ? COLORS.placeholder
                            : COLORS.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <GradientButton
                title={`Apply (${totalPax} Traveller${totalPax > 1 ? "s" : ""})`}
                showArrow={false}
                onPress={handleDone}
                style={{ marginTop: SPACING.md }}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlayBg,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  stepperList: {
    marginVertical: SPACING.sm,
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  paxLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  paxSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  counterGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.chipBg,
  },
  counterBtnDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  counterVal: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    width: 38,
    textAlign: "center",
  },
});

export default TravellerBottomSheet;
