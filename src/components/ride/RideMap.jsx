import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import MapView from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import DriverMarker from "./DriverMarker";
import { PickupMarker, DestinationMarker } from "./CustomMarkers";

const RideMap = ({
  mapRef,
  driverLocation,
  rotateAnim,
  passengerLocation,
  destination,
  routeOrigin,
  routeDestination,
  onDirectionsReady,
  routeKey = 0,
  showTraffic = false,
  googleMapsApiKey,
  onMapReady,
  driverName = "Philip",
}) => {
  // Automatically fit passenger, driver, and destination in view when active
  useEffect(() => {
    if (!mapRef.current) return;

    const fitTimer = setTimeout(() => {
      const coords = [];
      if (passengerLocation) {
        coords.push({
          latitude: passengerLocation.latitude,
          longitude: passengerLocation.longitude,
        });
      }
      if (destination) {
        coords.push({
          latitude: destination.latitude,
          longitude: destination.longitude,
        });
      }
      if (driverLocation) {
        // Read current AnimatedRegion values
        coords.push({
          latitude: typeof driverLocation.latitude.__getValue === "function"
            ? driverLocation.latitude.__getValue()
            : driverLocation.latitude,
          longitude: typeof driverLocation.longitude.__getValue === "function"
            ? driverLocation.longitude.__getValue()
            : driverLocation.longitude,
        });
      }

      if (coords.length >= 2) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 120, right: 60, bottom: 420, left: 60 },
          animated: true,
        });
      }
    }, 1000);

    return () => clearTimeout(fitTimer);
  }, [passengerLocation, destination, driverLocation, routeKey]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider="google"
        mapType="terrain"
        showsTraffic={showTraffic}
        onMapReady={onMapReady}
        initialRegion={
          passengerLocation
            ? {
                ...passengerLocation,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }
            : {
                latitude: 17.385,
                longitude: 78.4867,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }
        }
      >
        {/* Route Drawing */}
        {routeOrigin && routeDestination && (
          <MapViewDirections
            key={routeKey}
            origin={routeOrigin}
            destination={routeDestination}
            apikey={googleMapsApiKey}
            strokeWidth={5}
            strokeColor="#3B82F6" // Modern Blue
            lineJoin="round"
            optimizeWaypoints={true}
            onReady={onDirectionsReady}
          />
        )}

        {/* Custom Pickup Marker */}
        {passengerLocation && (
          <PickupMarker coordinate={passengerLocation} label="Pickup Point" />
        )}

        {/* Custom Destination Marker */}
        {destination && (
          <DestinationMarker coordinate={destination} label="Dropoff Point" />
        )}

        {/* Custom Animated Driver Marker */}
        {driverLocation && (
          <DriverMarker
            coordinate={driverLocation}
            rotateAnim={rotateAnim}
            driverName={driverName}
          />
        )}
      </MapView>
    </View>
  );
};

export default React.memo(RideMap);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
