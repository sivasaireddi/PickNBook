import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Animated,
  Linking,
  Alert,
} from "react-native";
import { Phone, MessageSquare, AlertTriangle, ShieldCheck } from "lucide-react-native";

import PhilipImage from "../../../assets/Philip.png";
import carImage from "../../../assets/car.jpg";
import TripProgress from "./TripProgress";
import TripStats from "./TripStats";

const RideBottomSheet = ({
  driverName = "Philip",
  driverRating = "4.9",
  vehicleModel = "Toyota Camry (Black)",
  vehiclePlate = "TS 09 EC 7845",
  eta = "4 mins",
  distance = "0.8 km",
  rideStage = "accepted", // 'accepted', 'arriving', 'arrived', 'started', 'completed'
  trackingStatus = "active", // 'initializing', 'active', 'syncing', 'reconnecting', 'error'
  reconnectAttempts = 0,
  speed = 0,
  distanceTravelled = 0,
  remainingDistance = 0,
  remainingDuration = 0,
  elapsedDuration = 0,
  onCancelRide,
}) => {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide up bottom sheet on mount
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    // Pulsing animation for the connection indicator dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const getConnectionColor = (status) => {
    switch (status) {
      case "active": return "#10B981"; // Green (Live)
      case "syncing": return "#3B82F6"; // Blue (Syncing)
      case "reconnecting": return "#F59E0B"; // Orange (Reconnecting)
      case "error": return "#EF4444"; // Red (Offline)
      default: return "#10B981";
    }
  };

  const getConnectionLabel = (status) => {
    switch (status) {
      case "active": return "Live";
      case "syncing": return "Syncing";
      case "reconnecting": return "Reconnecting";
      case "error": return "Offline";
      default: return "Live";
    }
  };

  const getStageTitle = (stage) => {
    switch (stage) {
      case "accepted": return "Ride Accepted";
      case "arriving": return "Driver is Arriving";
      case "arrived": return "Driver Reached Pickup";
      case "started": return "Ride In Progress";
      case "completed": return "Trip Finished";
      default: return "Booking Confirmed";
    }
  };

  const handleCallDriver = () => {
    Alert.alert("Calling Driver", "Connecting to Philip +91 98765 43210...");
  };

  const handleChatDriver = () => {
    Alert.alert("Chat Open", "Opening chat window with driver...");
  };

  return (
    <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
      {/* Handle Bar */}
      <View style={styles.handle} />

      {/* Top Section: Header & Live Status */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.stageTitle}>{getStageTitle(rideStage)}</Text>
          <Text style={styles.etaText}>ETA: {eta} • {distance} away</Text>
        </View>

        {/* Live Sync Status Indicator */}
        <View style={styles.connectionBadge}>
          <Animated.View
            style={[
              styles.connectionDot,
              {
                backgroundColor: getConnectionColor(trackingStatus),
                opacity: pulseAnim,
              },
            ]}
          />
          <Text style={styles.connectionLabel}>
            {getConnectionLabel(trackingStatus)}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Driver & Car Details Profile Row */}
      <View style={styles.profileRow}>
        {/* Left: Driver profile */}
        <View style={styles.driverCol}>
          <Image source={PhilipImage} style={styles.driverAvatar} />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driverName}</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {driverRating}</Text>
            </View>
          </View>
        </View>

        {/* Right: Car Details */}
        <View style={styles.carCol}>
          <Image source={carImage} style={styles.carPhoto} />
          <View style={styles.carDetails}>
            <Text style={styles.carModel} numberOfLines={1}>{vehicleModel}</Text>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{vehiclePlate}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Timeline Steps Progress */}
      <TripProgress currentStage={rideStage} />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Live Trip Statistics */}
      <TripStats
        speed={speed}
        distanceTravelled={distanceTravelled}
        remainingDistance={remainingDistance}
        remainingDuration={remainingDuration}
        elapsedDuration={elapsedDuration}
        status={rideStage}
      />

      {/* Action Buttons: Cancel, Call, Chat */}
      <View style={styles.actionRow}>
        {/* Call Driver */}
        <TouchableOpacity style={styles.circleBtn} onPress={handleCallDriver}>
          <Phone size={20} color="#1E293B" />
        </TouchableOpacity>

        {/* Chat Driver */}
        <TouchableOpacity style={styles.circleBtn} onPress={handleChatDriver}>
          <MessageSquare size={20} color="#1E293B" />
        </TouchableOpacity>

        {/* Cancel Ride */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancelRide}>
          <Text style={styles.cancelBtnText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default React.memo(RideBottomSheet);

const styles = StyleSheet.create({
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  etaText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionLabel: {
    fontSize: 10,
    fontWeight: "750",
    color: "#475569",
    textTransform: "uppercase",
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  driverCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  driverInfo: {
    gap: 4,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  ratingBadge: {
    backgroundColor: "#FEF3C7", // gold tint
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  ratingText: {
    fontSize: 10,
    color: "#D97706",
    fontWeight: "800",
  },
  carCol: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    flex: 1.2,
  },
  carPhoto: {
    width: 54,
    height: 38,
    borderRadius: 6,
    resizeMode: "contain",
  },
  carDetails: {
    alignItems: "flex-end",
    gap: 4,
  },
  carModel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "right",
  },
  plateBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  plateText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
