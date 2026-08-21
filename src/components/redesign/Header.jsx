import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';
import { scale } from '../../utils/responsive';

export default function Header() {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <LinearGradient
          colors={[theme.colors.red, theme.colors.redDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoSquare}
        >
          <Ionicons name="airplane" size={scale(20)} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
        </LinearGradient>
        <View style={styles.brandTextCol}>
          <Text style={styles.brandName}>PickNBook</Text>
          <Text style={styles.tagline}>Your smart travel companion</Text>
        </View>
      </View>

      <View style={styles.headlineWrapper}>
        <Text style={styles.headlineText}>
          Chase the{' '}
          <MaskedView
            maskElement={<Text style={styles.headlineText}>horizon.</Text>}
          >
            <LinearGradient
              colors={[theme.colors.red, theme.colors.redDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.headlineText, { opacity: 0 }]}>horizon.</Text>
            </LinearGradient>
          </MaskedView>
        </Text>
        <Text style={styles.headlineText}>Book the way there.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  logoSquare: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    // Soft shadow
    shadowColor: theme.colors.redDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.display.bold,
    fontSize: scale(18),
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  tagline: {
    fontFamily: theme.typography.fontFamily.body.medium,
    fontSize: scale(12),
    color: theme.colors.slate,
    marginTop: 2,
  },
  headlineWrapper: {
    marginTop: theme.spacing.xs,
  },
  headlineText: {
    fontFamily: theme.typography.fontFamily.display.bold,
    fontSize: scale(30),
    color: theme.colors.ink,
    lineHeight: scale(36),
    letterSpacing: -0.5,
  },
});
