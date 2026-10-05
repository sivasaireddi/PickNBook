import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationBell({ navigation }) {
  const { unreadCount } = useNotifications();

  return (
    <Pressable
      onPress={() => navigation.navigate("NotificationsScreen")}
      style={styles.button}
      accessibilityLabel="Notifications"
    >
      <Ionicons name="notifications-outline" size={24} color="#E52332" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: "absolute", right: 24, zIndex: 3, alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.9)" },
  badge: { position: "absolute", top: 1, right: 0, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#E52332", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFF9FA" },
  badgeText: { color: "white", fontSize: 9, fontWeight: "800" },
});
