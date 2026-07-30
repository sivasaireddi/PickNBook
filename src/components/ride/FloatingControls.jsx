import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Navigation,
  Compass,
  ZoomIn,
  ZoomOut,
  Layers,
  Crosshair,
} from "lucide-react-native";

const FloatingControls = ({
  onLocateMe,
  onRecenter,
  onZoomIn,
  onZoomOut,
  onToggleTraffic,
  showTraffic,
  onResetBearing,
}) => {
  return (
    <View style={styles.container}>
      {/* Recenter / Fit View */}
      <TouchableOpacity
        style={styles.button}
        onPress={onRecenter}
        activeOpacity={0.7}
      >
        <Crosshair size={20} color="#1E293B" />
      </TouchableOpacity>

      {/* Locate Me */}
      <TouchableOpacity
        style={styles.button}
        onPress={onLocateMe}
        activeOpacity={0.7}
      >
        <Navigation size={20} color="#1E293B" />
      </TouchableOpacity>

      {/* Zoom In */}
      <TouchableOpacity
        style={styles.button}
        onPress={onZoomIn}
        activeOpacity={0.7}
      >
        <ZoomIn size={20} color="#1E293B" />
      </TouchableOpacity>

      {/* Zoom Out */}
      <TouchableOpacity
        style={styles.button}
        onPress={onZoomOut}
        activeOpacity={0.7}
      >
        <ZoomOut size={20} color="#1E293B" />
      </TouchableOpacity>

      {/* Traffic Toggle */}
      <TouchableOpacity
        style={[styles.button, showTraffic && styles.activeButton]}
        onPress={onToggleTraffic}
        activeOpacity={0.7}
      >
        <Layers size={20} color={showTraffic ? "#FFFFFF" : "#1E293B"} />
      </TouchableOpacity>

      {/* Compass / Reset North */}
      <TouchableOpacity
        style={styles.button}
        onPress={onResetBearing}
        activeOpacity={0.7}
      >
        <Compass size={20} color="#1E293B" />
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(FloatingControls);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    top: 100,
    backgroundColor: "transparent",
    gap: 12,
    zIndex: 20,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  activeButton: {
    backgroundColor: "#3B82F6",
    borderColor: "#2563EB",
  },
});
