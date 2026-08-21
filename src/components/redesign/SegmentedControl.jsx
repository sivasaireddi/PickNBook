import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { theme } from '../../theme/tokens';
import { scale } from '../../utils/responsive';

const TRIPS = [
  { id: 'oneway', label: 'One way' },
  { id: 'roundtrip', label: 'Round trip' },
  { id: 'multicity', label: 'Multi-city' },
];

export default function SegmentedControl({ selected, onChange }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const tabWidth = containerWidth / TRIPS.length;
  
  const translateX = useSharedValue(0);

  useEffect(() => {
    const index = TRIPS.findIndex((t) => t.id === selected);
    if (index >= 0 && tabWidth > 0) {
      translateX.value = withSpring(index * tabWidth, {
        stiffness: 200,
        damping: 20,
        mass: 1,
      });
    }
  }, [selected, tabWidth]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: tabWidth,
    };
  });

  return (
    <View 
      style={styles.container} 
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {tabWidth > 0 && (
        <Animated.View style={[styles.activePill, animatedStyle]} />
      )}
      {TRIPS.map((trip) => {
        const isActive = selected === trip.id;
        return (
          <TouchableOpacity
            key={trip.id}
            style={styles.tab}
            onPress={() => onChange(trip.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={trip.label}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {trip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cloud,
    borderRadius: scale(12),
    padding: scale(4),
    marginBottom: theme.spacing.xl,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  activePill: {
    position: 'absolute',
    top: scale(4),
    bottom: scale(4),
    left: scale(4),
    backgroundColor: theme.colors.ink,
    borderRadius: scale(8),
    // iOS shadow
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    // Android shadow
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(44),
  },
  label: {
    fontFamily: theme.typography.fontFamily.body.medium,
    fontSize: scale(14),
    color: theme.colors.slate,
  },
  activeLabel: {
    fontFamily: theme.typography.fontFamily.body.semiBold,
    color: theme.colors.card,
  },
});
