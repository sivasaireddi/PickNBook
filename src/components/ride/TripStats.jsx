import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gauge, Milestone, Clock, Activity } from "lucide-react-native";

const TripStats = ({
  speed = 0,
  distanceTravelled = 0,
  remainingDistance = 0,
  remainingDuration = 0,
  elapsedDuration = 0,
  status = "Active",
}) => {
  const formatDistance = (m) => {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  };

  const formatDuration = (mins) => {
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = Math.round(mins % 60);
      return `${hrs}h ${remMins}m`;
    }
    return `${Math.round(mins)} mins`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* Speed */}
        <View style={styles.card}>
          <Gauge size={16} color="#3B82F6" style={styles.icon} />
          <Text style={styles.label}>Speed</Text>
          <Text style={styles.value}>{Math.round(speed)} km/h</Text>
        </View>

        {/* Distance Travelled */}
        <View style={styles.card}>
          <Milestone size={16} color="#10B981" style={styles.icon} />
          <Text style={styles.label}>Travelled</Text>
          <Text style={styles.value}>{formatDistance(distanceTravelled)}</Text>
        </View>

        {/* Remaining Distance */}
        <View style={styles.card}>
          <Milestone size={16} color="#EF4444" style={styles.icon} />
          <Text style={styles.label}>Remaining</Text>
          <Text style={styles.value}>{formatDistance(remainingDistance)}</Text>
        </View>

        {/* ETA */}
        <View style={styles.card}>
          <Clock size={16} color="#F59E0B" style={styles.icon} />
          <Text style={styles.label}>ETA / Duration</Text>
          <Text style={styles.value}>
            {formatDuration(remainingDuration)} ({formatDuration(elapsedDuration)})
          </Text>
        </View>
      </View>
    </View>
  );
};

export default React.memo(TripStats);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "transparent",
    marginVertical: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 13,
    fontWeight: "750",
    color: "#0F172A",
  },
});
