import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function GuestAccordion({ title, subtitle, isExpandedDefault, children }) {
  const [isExpanded, setIsExpanded] = useState(isExpandedDefault || false);

  const toggleAccordion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggleAccordion}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && !isExpanded ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#64748B" 
        />
      </Pressable>
      
      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8FAFC",
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  content: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  }
});
