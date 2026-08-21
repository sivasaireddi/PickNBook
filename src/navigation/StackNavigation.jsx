import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OTPScreen from "../screens/auth/OTPScreen";
import CreateAccount from "../screens/auth/user/CreateAccount";
import ChangePassword from "../screens/auth/user/ChangePassword";
import ForgotPassword from "../screens/auth/user/ForgotPassword";
import UserLoginScreen from "../screens/auth/user/UserLoginScreen";
import VerifyOtp from "../screens/auth/user/VerifyOtp";
import SearchScreen from "../screens/dashboard/bottomTabScreens/SearchScreen";
import BusListScreen from "../screens/dashboard/bottomTabScreens/BusListScreen";
import BusSeats from "../screens/dashboard/bottomTabScreens/BusSeats";
import HotelSearchResultsScreen from "../screens/dashboard/bottomTabScreens/HotelSearchResultsScreen";
import HotelPassengerDetailsScreen from "../screens/HotelPassengerDetailsScreen";
import HotelOfferDetailsScreen from "../screens/dashboard/bottomTabScreens/HotelOfferDetailsScreen";
import HotelBookingConfirmationScreen from "../screens/dashboard/bottomTabScreens/HotelBookingConfirmationScreen";
import BordingNDroppingPoints from "../screens/dashboard/bottomTabScreens/BordingNDroppingPoints";
import FlightListingScreen from "../screens/dashboard/bottomTabScreens/flights/FlightListingScreen";
import FlightPassengerDetailsScreen from "../screens/dashboard/bottomTabScreens/flights/FlightPassengerDetailsScreen";
import FlightSeatSelectionScreen from "../screens/dashboard/bottomTabScreens/flights/FlightSeatSelectionScreen";
import FlightPaymentScreen from "../screens/dashboard/bottomTabScreens/flights/FlightPaymentScreen";
import FlightConfirmationScreen from "../screens/dashboard/bottomTabScreens/flights/FlightConfirmationScreen";
import FlightDetailsScreen from "../screens/dashboard/bottomTabScreens/flights/FlightDetailsScreen";
import BottomTabNavigation from "./BottomTabNavigation";
import SideBarNavigation from "./SideBarNavigation";
import SplashScreen from "../screens/auth/SplashScreen";    
import TravelScreen from "../screens/dashboard/bottomTabScreens/TravelScreen";
import HotelsScreen from "../screens/dashboard/bottomTabScreens/HotelsScreen";
import BusScreen from "../screens/dashboard/bottomTabScreens/BusScreen";
import FlightScreen from "../screens/dashboard/bottomTabScreens/FlightScreen";

import Sleeper from "../practice/Sleeper";
import SeaterSleeper2Plus1Hybrid from "../practice/SeaterSleeper2Plus1Hybrid";
import SeaterSleeper2Plus1Standard from "../practice/SeaterSleeper2Plus1Standard";
import PostBusBookingScreen from "../practice/PostBusBookingScreen";
import BookingDetailsScreen from "../screens/booking/BookingDetailsScreen";
import Seater from "../practice/Seater";

const Stack = createNativeStackNavigator();

const StackNavigation = () => {
  return (
    <Stack.Navigator
      initialRouteName="SplashScreen"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SplashScreen" component={SplashScreen} />
      <Stack.Screen name="Login" component={UserLoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtp} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="search" component={SearchScreen} />
      <Stack.Screen
        name="HotelSearchResultsScreen"
        component={HotelSearchResultsScreen}
      />
      <Stack.Screen
        name="HotelOfferDetails"
        component={HotelOfferDetailsScreen}
      />
      <Stack.Screen
        name="HotelPassengerDetails"
        component={HotelPassengerDetailsScreen}
      />
      <Stack.Screen
        name="HotelBookingConfirmation"
        component={HotelBookingConfirmationScreen}
      />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen
        name="DashBoard"
        component={BottomTabNavigation}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Register" component={CreateAccount} />
      <Stack.Screen name="CreateAccount" component={CreateAccount} />
      <Stack.Screen name="sidebar" component={SideBarNavigation} />
      <Stack.Screen name="Travel" component={TravelScreen} />
      <Stack.Screen name="Hotels" component={HotelsScreen} />
      <Stack.Screen name="BusScreen" component={BusScreen} />
      <Stack.Screen name="FlightScreen" component={FlightScreen} />
      <Stack.Screen name="BusListScreen" component={BusListScreen} />
      <Stack.Screen
        name="BordingNDroppingPoints"
        component={BordingNDroppingPoints}
      />
      <Stack.Screen name="BusSeats" component={BusSeats} />
      <Stack.Screen name="FlightListingScreen" component={FlightListingScreen} />
      <Stack.Screen name="FlightPassengerDetailsScreen" component={FlightPassengerDetailsScreen} />
      <Stack.Screen name="FlightSeatSelectionScreen" component={FlightSeatSelectionScreen} />
      <Stack.Screen name="FlightPaymentScreen" component={FlightPaymentScreen} />
      <Stack.Screen name="FlightConfirmationScreen" component={FlightConfirmationScreen} />
      <Stack.Screen name="FlightDetailsScreen" component={FlightDetailsScreen} />
      <Stack.Screen name="Seater" component={Seater} />
      <Stack.Screen name="Sleeper" component={Sleeper} />

      <Stack.Screen
        name="SeaterSleeper2Plus1Standard"
        component={SeaterSleeper2Plus1Standard}
      />
      <Stack.Screen
        name="SeaterSleeper2Plus1Hybrid"
        component={SeaterSleeper2Plus1Hybrid}
      />
      <Stack.Screen
        name="SeaterSleeper"
        component={SeaterSleeper2Plus1Standard}
      />
      <Stack.Screen name="PostBusBooking" component={PostBusBookingScreen} />
      <Stack.Screen
        name="BookingDetailsScreen"
        component={BookingDetailsScreen}
      />
    </Stack.Navigator>
  );
};

export default StackNavigation;
