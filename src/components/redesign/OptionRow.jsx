import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';
import { scale } from '../../utils/responsive';

export default function OptionRow({ icon, eyebrow, value, onPress, accessibilityLabel }) {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={scale(18)} color={theme.colors.redDeep} />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      
      <Ionicons name="chevron-down" size={scale(20)} color={theme.colors.slateSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: scale(16),
    padding: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    minHeight: scale(64),
    // Soft shadow
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  iconCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(229, 56, 63, 0.1)', // soft red tint
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.body.semiBold,
    fontSize: scale(11),
    color: theme.colors.slateSoft,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: scale(2),
  },
  value: {
    fontFamily: theme.typography.fontFamily.body.medium,
    fontSize: scale(15),
    color: theme.colors.ink,
  },
});
