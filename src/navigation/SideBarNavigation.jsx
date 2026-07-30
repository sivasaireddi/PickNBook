// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import { createDrawerNavigator } from '@react-navigation/drawer';
// import DashBoards from '../screens/dashboard/sideBarScreens/DashBoards';
// import B2CBusMangement from '../screens/dashboard/sideBarScreens/B2CBusMangement';

// const Drawer = createDrawerNavigator();



// const ProfileScreen = () => (
//   <View style={styles.screen}>
//     <Text>Profile Screen</Text>
//   </View>
// );

// const SettingsScreen = () => (
//   <View style={styles.screen}>
//     <Text>Settings Screen</Text>
//   </View>
// );

// // Sidebar Navigation
// const SideBarNavigation = () => {
//   return (
//     <Drawer.Navigator
//       initialRouteName="DashBoards"
//       screenOptions={{
//         headerStyle: { backgroundColor: '#6200ee' },
//         headerTintColor: '#fff',
//         drawerActiveTintColor: '#6200ee',
//       }}
//     >
//       <Drawer.Screen name="DashBoards" component={DashBoards} />
//       <Drawer.Screen name="B2CBusMangement" component={B2CBusMangement} />
//       {/* <Drawer.Screen name="Settings" component={SettingsScreen} /> */}
//     </Drawer.Navigator>
//   );
// };

// export default SideBarNavigation;

// const styles = StyleSheet.create({
//   screen: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });



import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';

// Screens
import DashBoards from '../screens/dashboard/sideBarScreens/DashBoards';
import BookingList from '../screens/dashboard/sideBarScreens/B2CBusManagement/BookingList';
import MarkupList from '../screens/dashboard/sideBarScreens/B2CBusManagement/MarkupList';
import DiscountList from '../screens/dashboard/sideBarScreens/B2CBusManagement/DiscountList';
import CouponList from '../screens/dashboard/sideBarScreens/B2CBusManagement/CouponList';
import UsedCouponList from '../screens/dashboard/sideBarScreens/B2CBusManagement/UsedCouponList';
import ConvenienceFee from '../screens/dashboard/sideBarScreens/B2CBusManagement/ConvenienceFee';
import CancellationList from '../screens/dashboard/sideBarScreens/B2CBusManagement/CancellationList';
import PopularRoutes from '../screens/dashboard/sideBarScreens/B2CBusManagement/PopularRoutes';
import SearchHistory from '../screens/dashboard/sideBarScreens/B2CBusManagement/SearchHistory';
import VoucherSetting from '../screens/dashboard/sideBarScreens/B2CBusManagement/VoucherSetting';


// Custom Drawer
import CustomDrawer from './CustomDrawer';

const Drawer = createDrawerNavigator();

const SideBarNavigation = () => {
  return (
    <Drawer.Navigator
      initialRouteName="DashBoards"
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#6200ee' },
        headerTintColor: '#fff',
      }}
    >
      {/* Dashboard */}
      <Drawer.Screen name="DashBoards" component={DashBoards} />

      {/* ✅ ONLY REAL SCREENS */}
      <Drawer.Screen name="BookingList" component={BookingList} />
      <Drawer.Screen name="MarkupList" component={MarkupList} />
      <Drawer.Screen name="DiscountList" component={DiscountList} />
      <Drawer.Screen name="CouponList" component={CouponList} />
      <Drawer.Screen name="UsedCouponList" component={UsedCouponList} />
      <Drawer.Screen name="ConvenienceFee" component={ConvenienceFee} />
      <Drawer.Screen name="CancellationList" component={CancellationList} />
      <Drawer.Screen name="PopularRoutes" component={PopularRoutes} />
      <Drawer.Screen name="SearchHistory" component={SearchHistory} />
      <Drawer.Screen name="VoucherSetting" component={VoucherSetting} />
    </Drawer.Navigator>
  );
};

export default SideBarNavigation;