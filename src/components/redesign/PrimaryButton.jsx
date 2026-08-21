import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';
import { scale } from '../../utils/responsive';

export default function PrimaryButton({ title, onPress, loading, disabled, style }) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.container, style, isDisabled && styles.disabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <LinearGradient
        colors={[theme.colors.red, theme.colors.redDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.card} size="small" />
        ) : (
          <View style={styles.contentRow}>
            <Text style={styles.label}>{title}</Text>
            <Ionicons name="arrow-forward" size={scale(20)} color={theme.colors.card} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: scale(16),
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    // Platform-specific shadow
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.redDeep,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  disabled: {
    opacity: 0.5,
  },
  gradient: {
    width: '100%',
    minHeight: scale(56),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: theme.typography.fontFamily.display.semiBold,
    fontSize: scale(16),
    color: theme.colors.card,
    marginRight: theme.spacing.sm,
  },
});
