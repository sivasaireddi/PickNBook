import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons as Icon } from "@expo/vector-icons";

const menuData = [
  {
    title: "Dashboard",
    icon: "home",
    screen: "DashBoards",
  },
  {
    title: "B2C Bus Management",
    icon: "bus",
    children: [
      { name: "Booking List", route: "BookingList" },
      { name: "Markup List", route: "MarkupList" },
      { name: "Discount List", route: "DiscountList" },
      { name: "Coupon List", route: "CouponList" },
      { name: "Used Coupon List", route: "UsedCouponList" },
      { name: "Convenience Fee", route: "ConvenienceFee" },
      { name: "Cancellation List", route: "CancellationList" },
      { name: "Popular Bus Routes", route: "PopularRoutes" },
      { name: "Search History", route: "SearchHistory" },
      { name: "Voucher Setting", route: "VoucherSetting" },
    ],
  },
];

export default function CustomDrawer({ navigation }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [activeItem, setActiveItem] = useState("Dashboard");

  const toggleMenu = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <ScrollView style={styles.container}>
      
      {/* Header */}
      <Text style={styles.logo}>Pick N Book</Text>

      {/* Search */}
      <View style={styles.searchBox}>
        <Icon name="search" size={16} />
        <TextInput
          placeholder="Search In Menu..."
          style={{ marginLeft: 5, flex: 1 }}
        />
      </View>

      {/* Menu */}
      {menuData.map((item, index) => (
        <View key={index}>
          
          {/* Parent Item */}
          <TouchableOpacity
            style={[
              styles.menuItem,
              openIndex === index && styles.activeParent,
            ]}
            onPress={() => {
              if (item.children) {
                toggleMenu(index); // ✅ ONLY EXPAND (NO NAVIGATION)
              } else {
                setActiveItem(item.screen);
                navigation.navigate(item.screen);
              }
            }}
          >
            <View style={styles.row}>
              <Icon name={item.icon} size={18} color="#fff" />
              <Text style={styles.menuText}>{item.title}</Text>
            </View>

            {item.children && (
              <Icon
                name={openIndex === index ? "remove" : "add"}
                size={18}
                color="#fff"
              />
            )}
          </TouchableOpacity>

          {/* Sub Menu */}
          {openIndex === index &&
            item.children?.map((child, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.subItem,
                  activeItem === child.route && styles.activeSub,
                ]}
                onPress={() => {
                  setActiveItem(child.route);
                  navigation.navigate(child.route);
                }}
              >
                <Icon name="menu" size={14} />
                <Text style={styles.subText}>{child.name}</Text>
              </TouchableOpacity>
            ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },

  logo: {
    fontSize: 18,
    fontWeight: "bold",
    padding: 15,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f0f3",
    margin: 10,
    padding: 8,
    borderRadius: 20,
  },

  menuItem: {
    backgroundColor: "#e74c3c",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },

  activeParent: {
    backgroundColor: "#d35400",
  },

  menuText: {
    color: "#fff",
    marginLeft: 10,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  subItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingLeft: 25,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
  },

  activeSub: {
    backgroundColor: "#ffe5d0",
  },

  subText: {
    marginLeft: 10,
  },
});