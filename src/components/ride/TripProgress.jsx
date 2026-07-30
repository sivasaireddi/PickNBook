import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";

const STAGES = [
  { key: "accepted", label: "Accepted" },
  { key: "arriving", label: "Arriving" },
  { key: "arrived", label: "Arrived" },
  { key: "started", label: "In Trip" },
  { key: "completed", label: "Reached" },
];

const TripProgress = ({ currentStage = "accepted" }) => {
  const getStageIndex = (stage) => {
    return STAGES.findIndex((s) => s.key === stage);
  };

  const activeIndex = getStageIndex(currentStage);

  return (
    <View style={styles.container}>
      <View style={styles.timelineRow}>
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < activeIndex;
          const isActive = idx === activeIndex;
          const isPending = idx > activeIndex;

          return (
            <React.Fragment key={stage.key}>
              {/* Connector line */}
              {idx > 0 && (
                <View
                  style={[
                    styles.line,
                    idx <= activeIndex ? styles.lineActive : styles.linePending,
                  ]}
                />
              )}

              {/* Node */}
              <View style={styles.nodeContainer}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isActive && styles.circleActive,
                    isPending && styles.circlePending,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  ) : isActive ? (
                    <View style={styles.innerDot} />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.label,
                    isCompleted && styles.labelCompleted,
                    isActive && styles.labelActive,
                    isPending && styles.labelPending,
                  ]}
                >
                  {stage.label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

export default React.memo(TripProgress);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
  },
  nodeContainer: {
    alignItems: "center",
    position: "relative",
    width: 50,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    zIndex: 2,
  },
  circleCompleted: {
    backgroundColor: "#10B981", // green
    borderColor: "#10B981",
  },
  circleActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#3B82F6", // blue
  },
  circlePending: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1", // slate-300
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: -15,
    zIndex: 1,
  },
  lineActive: {
    backgroundColor: "#10B981",
  },
  linePending: {
    backgroundColor: "#E2E8F0",
  },
  label: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  labelCompleted: {
    color: "#10B981",
  },
  labelActive: {
    color: "#3B82F6",
  },
  labelPending: {
    color: "#64748B",
  },
});
