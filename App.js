import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from '@react-navigation/native';
import StackNavigation from './src/navigation/StackNavigation';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { HotelBookingProvider } from "./src/context/HotelBookingContext";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <HotelBookingProvider>
          <NavigationContainer>
            <StackNavigation />
          </NavigationContainer>
        </HotelBookingProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
