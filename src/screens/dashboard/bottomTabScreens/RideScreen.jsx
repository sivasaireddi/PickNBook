import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, AnimatedRegion } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import axios from "axios";
import { AUTH_API_BASE_URL } from "../../../services/authService";
import {
  requestLocationPermissions,
  startBackgroundTracking,
  stopBackgroundTracking,
} from "../../../services/locationService";

import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../../components/AppHeader";
import carImage from "../../../../assets/car.jpg";

const GOOGLE_MAPS_APIKEY = "AIzaSyB9xc0jsXjB47ClikNaJ4Po0cQRLYaONio";
const DEVIATION_THRESHOLD = 40;

const MOVEMENT_UPLOAD_THRESHOLD = 10;
const HARDCODED_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJ2aWppdGhhQGdtYWlsLmNvbSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiMiIsIlJvbGVJZCI6IjIiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJFbXBsb3llZSIsIkVtcGxveWVlSWQiOiJQMjU5IiwiZXhwIjoxNzg0MDI4MzQ0LCJpc3MiOiJFTVMiLCJhdWQiOiJFTVNVc2VycyJ9.2eIWR_YSH63ayyB7TtYtfcT8KwX2QU2OnY1vR8eZijc";

const RideScreen = () => {
  const mapRef = useRef(null);

  const location = useRef(
    new AnimatedRegion({
      latitude: 17.385,
      longitude: 78.4867,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    })
  ).current;

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const prevLocation = useRef(null);
  const lastUploadedLocation = useRef(null);
  const currentHeading = useRef(0);

  const [ready, setReady] = useState(false);
  const [routeKey, setRouteKey] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [destination, setDestination] = useState(null);

  const [trackingStatus, setTrackingStatus] = useState("initializing");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const updateQueue = useRef([]);
  const isAnimating = useRef(false);

  const saveLocationWithHardcodedJwt = async (
    latitude,
    longitude,
    source = "foreground"
  ) => {
    try {
      const url = `${AUTH_API_BASE_URL.replace(/\/+$/, "")}/api/Attendance/checkin`;
      const requestBody = {
        latitude,
        longitude,
        address: "Unknown Location",
      };

      await axios.post(url, requestBody, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HARDCODED_JWT}`,
        },
        timeout: 10000,
      });

      console.log(`[RideScreen] Successfully posted location. Source: ${source}`);
      return true;
    } catch (error) {
      console.warn(
        `[RideScreen] Location upload failed from ${source}:`,
        error.response?.data || error.message
      );
      return false;
    }
  };

  const getDistance = (loc1, loc2) => {
    const R = 6371e3;
    const f1 = (loc1.latitude * Math.PI) / 180;
    const f2 = (loc2.latitude * Math.PI) / 180;
    const deltaLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const deltaLng = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(f1) * Math.cos(f2) * Math.sin(deltaLng / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const getBearing = (start, end) => {
    const lat1 = (start.latitude * Math.PI) / 180;
    const lon1 = (start.longitude * Math.PI) / 180;
    const lat2 = (end.latitude * Math.PI) / 180;
    const lon2 = (end.longitude * Math.PI) / 180;

    const dLon = lon2 - lon1;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  const getSmoothRotation = (current, target) => {
    let diff = target - current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return current + diff;
  };

  const interpolatePoints = (start, end, steps = 10) => {
    const latDiff = (end.latitude - start.latitude) / steps;
    const lonDiff = (end.longitude - start.longitude) / steps;

    let points = [];
    for (let i = 1; i <= steps; i++) {
      points.push({
        latitude: start.latitude + latDiff * i,
        longitude: start.longitude + lonDiff * i,
      });
    }
    return points;
  };

  const animateCar = (points, onComplete) => {
    let i = 0;

    const move = () => {
      if (i >= points.length) {
        if (onComplete) onComplete();
        return;
      }

      const point = points[i];

      location.timing({
        latitude: point.latitude,
        longitude: point.longitude,
        duration: 80,
        useNativeDriver: false,
      }).start();

      if (i > 0) {
        const angle = getBearing(points[i - 1], point);
        const smooth = getSmoothRotation(currentHeading.current, angle);

        currentHeading.current = smooth;

        Animated.timing(rotateAnim, {
          toValue: smooth,
          duration: 80,
          useNativeDriver: true,
        }).start();
      }

      mapRef.current?.animateCamera(
        {
          center: {
            latitude: point.latitude,
            longitude: point.longitude,
          },
        },
        { duration: 80 }
      );

      i++;
      setTimeout(move, 80);
    };

    move();
  };

  const processQueue = () => {
    if (isAnimating.current || updateQueue.current.length === 0) return;
    isAnimating.current = true;
    const nextPoints = updateQueue.current.shift();
    animateCar(nextPoints, () => {
      isAnimating.current = false;
      processQueue();
    });
  };

  const triggerLocationUpload = async (coords, source = "foreground_movement") => {
    setTrackingStatus("syncing");
    const maxRetries = 3;
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const success = await saveLocationWithHardcodedJwt(
          coords.latitude,
          coords.longitude,
          source
        );
        if (success) {
          setTrackingStatus("active");
          setReconnectAttempts(0);
          return true;
        }
      } catch (err) {
        console.warn(`[RideScreen] Upload attempt ${attempt} failed:`, err.message);
      }

      if (attempt < maxRetries) {
        setReconnectAttempts(attempt);
        setTrackingStatus("reconnecting");
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    setTrackingStatus("error");
    return false;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "initializing": return "#f59e0b";
      case "active": return "#10b981";
      case "syncing": return "#3b82f6";
      case "reconnecting": return "#ef4444";
      case "error": return "#64748b";
      default: return "#10b981";
    }
  };

  const getStatusMessage = (status, attempts) => {
    switch (status) {
      case "initializing": return "Initializing GPS Tracker...";
      case "active": return "Tracking Active (Live)";
      case "syncing": return "Syncing location...";
      case "reconnecting": return `Sync failed. Retrying (${attempts})...`;
      case "error": return "Offline. Check connection.";
      default: return "Tracking Active";
    }
  };

  useEffect(() => {
    let subscription;
    let intervalId;

    (async () => {
      setTrackingStatus("initializing");

      const permissions = await requestLocationPermissions();
      if (!permissions.foreground) {
        console.log("Location permissions denied.");
        setTrackingStatus("error");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const start = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      prevLocation.current = start;
      lastUploadedLocation.current = start;
      setCurrentPosition(start);

      location.setValue({
        ...start,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });

      setReady(true);
      setTrackingStatus("active");

      await saveLocationWithHardcodedJwt(
        start.latitude,
        start.longitude,
        "foreground_immediate"
      );

      if (permissions.background) {
        try {
          await startBackgroundTracking();
        } catch (bgError) {
          console.error("Error starting background location updates:", bgError.message);
        }
      } else {
        console.log("Background location permission not granted.");
      }

      intervalId = setInterval(async () => {
        if (prevLocation.current) {
          await triggerLocationUpload(prevLocation.current, "foreground_periodic_10s");
        }
      }, 10 * 1000);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 3,
        },
        (locUpdate) => {
          const newLocation = {
            latitude: locUpdate.coords.latitude,
            longitude: locUpdate.coords.longitude,
          };

          setCurrentPosition(newLocation);

          if (prevLocation.current) {
            const distance = getDistance(prevLocation.current, newLocation);

            if (distance > DEVIATION_THRESHOLD && destination) {
              console.log("Re-routing...");
              setRouteKey((prev) => prev + 1);
            }

            if (lastUploadedLocation.current) {
              const distanceMoved = getDistance(lastUploadedLocation.current, newLocation);
              if (distanceMoved >= MOVEMENT_UPLOAD_THRESHOLD) {
                console.log(`[RideScreen] Significant movement: ${distanceMoved.toFixed(1)}m. Syncing...`);
                lastUploadedLocation.current = newLocation;
                triggerLocationUpload(newLocation, "foreground_movement");
              }
            }

            const points = interpolatePoints(prevLocation.current, newLocation);
            updateQueue.current.push(points);
            processQueue();
          }

          prevLocation.current = newLocation;
        }
      );
    })();

    return () => {
      if (subscription) subscription.remove();
      if (intervalId) clearInterval(intervalId);
      stopBackgroundTracking();
    };
  }, [destination]);

  if (!ready || !currentPosition) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Fetching location...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <AppHeader title="Ride" />
      <MapView
        ref={mapRef}
        style={styles.map}
        provider="google"
        mapType="terrain"
        initialRegion={{
          ...currentPosition,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        <Marker.Animated coordinate={location}>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            }}
          >
            <Image source={carImage} style={{ width: 40, height: 40, resizeMode: "contain" }}
            />
          </Animated.View>
        </Marker.Animated>

        {destination && (
          <Marker coordinate={destination} title="Destination" />
        )}

        {destination && (
          <MapViewDirections
            key={routeKey}
            origin={currentPosition}
            destination={destination}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor="blue"
          />
        )}
      </MapView>

      <View style={styles.statusPill}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(trackingStatus) }]} />
        <Text style={styles.statusText}>{getStatusMessage(trackingStatus, reconnectAttempts)}</Text>
      </View>
    </SafeAreaView>
  );
};

export default RideScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusPill: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(241, 245, 249, 0.8)",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
});

