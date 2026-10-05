import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { NavigationContainer } from '@react-navigation/native';
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <HotelBookingProvider>
          <NotificationProvider>
            <NavigationContainer>
              <StackNavigation />
            </NavigationContainer>
          </NotificationProvider>
        </HotelBookingProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
