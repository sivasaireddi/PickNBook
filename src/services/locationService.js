import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { AUTH_API_BASE_URL } from './authService';

export const BACKGROUND_LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TRACKING';
const LAST_SENT_TIME_KEY = 'attendance_last_sent_time';
const LAST_SENT_LAT_KEY = 'attendance_last_sent_lat';
const LAST_SENT_LNG_KEY = 'attendance_last_sent_lng';

// 14 minutes in milliseconds (slightly under 15 minutes to allow minor timer drifts)
const API_CALL_MIN_INTERVAL = 14 * 60 * 1000; 

// Resolve Base URL: Prefer AUTH_API_BASE_URL, fallback to the RideScreen hardcoded url
const BASE_URL = AUTH_API_BASE_URL || 'https://marian-undeported-shanon.ngrok-free.dev';

// In-memory cache in case SecureStore is slow or not writing properly (double safety)
let inMemoryLastSentTime = 0;
let inMemoryLastSentCoords = null;
let isSending = false;

/**
 * Request all permissions needed for location tracking
 */
export async function requestLocationPermissions() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return { foreground: false, background: false };
  }

  // Request background permission
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  return {
    foreground: true,
    background: backgroundStatus === 'granted'
  };
}

/**
 * Starts background location tracking
 */
export async function startBackgroundTracking() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
  if (hasStarted) {
    console.log('[LocationService] Background tracking is already running.');
    return;
  }

  console.log('[LocationService] Starting background location tracking...');
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    // Request updates approximately every 15 minutes
    timeInterval: 15 * 60 * 1000, 
    // Android specific configurations for foreground service notification
    foregroundService: {
      notificationTitle: "Attendance Tracking Active",
      notificationBody: "Your location is being updated for attendance in the background.",
      notificationColor: "#2196F3",
    },
    // iOS specific configurations
    pausesLocationUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

/**
 * Stops background location tracking
 */
export async function stopBackgroundTracking() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    if (hasStarted) {
      console.log('[LocationService] Stopping background location tracking...');
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    }
  } catch (error) {
    console.warn('[LocationService] Error stopping background tracking:', error.message);
  }
}

/**
 * Core API call function with retry logic, error handling and rate-limiting / duplication checks.
 */
export async function saveLocationApi(latitude, longitude, source = 'foreground', force = false) {
  // Prevent parallel API updates
  if (isSending) {
    console.log(`[LocationService] API call in progress. Skipping duplicate from ${source}.`);
    return false;
  }

  // 1. Dynamic JWT Token Check
  let token;
  try {
    token = await SecureStore.getItemAsync("token");
  } catch (err) {
    console.warn("Error reading JWT token from SecureStore:", err.message);
  }

  if (!token) {
    console.warn("JWT token not found.");
    return false;
  }

  const now = Date.now();

  // Retrieve last sent state from SecureStore/In-memory
  let lastSentTime = inMemoryLastSentTime;
  let lastLat = inMemoryLastSentCoords?.latitude;
  let lastLng = inMemoryLastSentCoords?.longitude;

  try {
    const savedTimeStr = await SecureStore.getItemAsync(LAST_SENT_TIME_KEY);
    if (savedTimeStr) {
      lastSentTime = parseInt(savedTimeStr, 10);
    }
    const savedLatStr = await SecureStore.getItemAsync(LAST_SENT_LAT_KEY);
    const savedLngStr = await SecureStore.getItemAsync(LAST_SENT_LNG_KEY);
    if (savedLatStr && savedLngStr) {
      lastLat = parseFloat(savedLatStr);
      lastLng = parseFloat(savedLngStr);
    }
  } catch (err) {
    console.warn('[LocationService] Error reading from SecureStore:', err.message);
  }

  // If this is a normal timed update (not forced first update)
  if (!force) {
    const timeDiff = now - lastSentTime;
    
    let distanceMoved = 0;
    if (lastLat != null && lastLng != null) {
      // Calculate distance using Haversine formula
      const R = 6371e3; // Earth radius in meters
      const φ1 = (lastLat * Math.PI) / 180;
      const φ2 = (latitude * Math.PI) / 180;
      const Δφ = ((latitude - lastLat) * Math.PI) / 180;
      const Δλ = ((longitude - lastLng) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

      distanceMoved = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    } else {
      distanceMoved = 999; // Treat as significant movement if no previous coordinates exist
    }

    // Only skip if the movement is less than 10 meters AND the last sent time is less than 9 seconds ago
    if (distanceMoved < 10 && timeDiff < 9000) {
      console.log(
        `[LocationService] Skip sending location. Last sent ${Math.round(timeDiff / 1000)}s ago (moved: ${distanceMoved.toFixed(1)}m). Source: ${source}`
      );
      return false;
    }
  }

  isSending = true;

  // 2. Dynamic Address via Reverse Geocoding
  let address = "Unknown Location";
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    if (addresses && addresses.length > 0) {
      const place = addresses[0];
      address = [
        place.name,
        place.street,
        place.district,
        place.city,
        place.region,
        place.postalCode,
        place.country
      ]
      .filter(Boolean)
      .join(", ");
    }
  } catch (geoError) {
    console.warn("Reverse geocoding failed, falling back to Unknown Location:", geoError.message);
    address = "Unknown Location";
  }

  // Implement simple retry (1 retry after 5 seconds if first attempt fails)
  const maxAttempts = 2;
  let attempt = 0;
  let success = false;

  while (attempt < maxAttempts && !success) {
    try {
      attempt++;
      
      // Logging requirements before request
      console.log("Latitude:", latitude);
      console.log("Longitude:", longitude);
      console.log("Address:", address);
      console.log("JWT:", token);

      const url = 'https://marian-undeported-shanon.ngrok-free.dev/api/Attendance/checkin';
      const requestBody = {
        latitude,
        longitude,
        address
      };
      
      console.log("Request body:", JSON.stringify(requestBody));

      const response = await axios.post(
        url,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000, // 10s timeout
        }
      );

      console.log("Response body:", JSON.stringify(response.data));
      console.log("HTTP status code:", response.status);
      console.log(`[LocationService] Successfully posted location. Source: ${source}`);
      success = true;
    } catch (error) {
      if (error.response?.status === 401) {
        console.warn("Session expired. Please login again.");
      }
      console.log("Status:", error.response?.status);
      console.log("URL:", error.config?.url);
      console.log("Response:", error.response?.data);
      console.log("Method:", error.config?.method);
      console.error(
        `[LocationService] API error on attempt ${attempt}/${maxAttempts}:`,
        error.response?.data || error.message
      );
      
      // If we have more attempts, wait 5 seconds before retrying
      if (attempt < maxAttempts) {
        console.log('[LocationService] Retrying API request in 5 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  isSending = false;

  if (success) {
    // Update local state
    inMemoryLastSentTime = now;
    inMemoryLastSentCoords = { latitude, longitude };

    // Persist last sent state in SecureStore
    try {
      await SecureStore.setItemAsync(LAST_SENT_TIME_KEY, now.toString());
      await SecureStore.setItemAsync(LAST_SENT_LAT_KEY, latitude.toString());
      await SecureStore.setItemAsync(LAST_SENT_LNG_KEY, longitude.toString());
    } catch (err) {
      console.warn('[LocationService] Error saving to SecureStore:', err.message);
    }
  }

  return success;
}
