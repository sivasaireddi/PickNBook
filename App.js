import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import StackNavigation from './src/navigation/StackNavigation';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { HotelBookingProvider } from "./src/context/HotelBookingContext";
import { NotificationProvider } from "./src/context/NotificationContext";

import {
  useFonts,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { getStoredAuthToken, isJwtExpired } from './src/utils/authSession';
import { isRecoverableFlightPayment, readFlightPaymentRecovery } from './src/screens/dashboard/bottomTabScreens/flights/services/flightPaymentRecoveryStore';

const navigationRef = createNavigationContainerRef();

// Prevent auto-hiding the splash screen while fonts are loading
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore error if already hidden
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const resumeFlightPayment = async () => {
    const [token, recovery] = await Promise.all([getStoredAuthToken(), readFlightPaymentRecovery()]);
    if (!token || isJwtExpired(token) || !isRecoverableFlightPayment(recovery) || !navigationRef.isReady()) return;
    const current = navigationRef.getCurrentRoute()?.name;
    if (current === 'FlightPaymentProcessingScreen' || current === 'FlightConfirmationScreen') return;
    navigationRef.navigate('FlightPaymentProcessingScreen', recovery);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <HotelBookingProvider>
          <NotificationProvider>
            <NavigationContainer ref={navigationRef} onReady={() => setTimeout(resumeFlightPayment, 2500)}>
              <StackNavigation />
            </NavigationContainer>
          </NotificationProvider>
        </HotelBookingProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
