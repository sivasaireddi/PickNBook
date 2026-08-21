import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';
import { scale } from '../../utils/responsive';

// A simple dashed line component using flex boxes
const DashedLine = () => {
  return (
    <View style={styles.dashedLineContainer}>
      {[...Array(30)].map((_, i) => (
        <View key={i} style={styles.dash} />
      ))}
    </View>
  );
};

export default function TicketCard({
  origin,
  destination,
  departureDate,
  returnDate,
  tripType,
  onPressOrigin,
  onPressDestination,
  onSwap,
  onPressDeparture,
  onPressReturn,
}) {
  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    const date = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.card}>
      {/* Route Section */}
      <View style={styles.routeSection}>
        <TouchableOpacity style={styles.airportBlock} onPress={onPressOrigin}>
          <Text style={styles.eyebrow}>FROM</Text>
          <Text style={styles.cityName} numberOfLines={1}>
            {origin?.city || 'Delhi'}
          </Text>
          <Text style={styles.airportCode}>{origin?.airportCode || 'DEL'}</Text>
        </TouchableOpacity>

        <View style={styles.swapWrapper}>
          <TouchableOpacity 
            style={styles.swapButton} 
            onPress={onSwap}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Swap origin and destination"
          >
            <Ionicons name="swap-vertical" size={scale(20)} color={theme.colors.card} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.airportBlock, { alignItems: 'flex-end' }]} onPress={onPressDestination}>
          <Text style={styles.eyebrow}>TO</Text>
          <Text style={styles.cityName} numberOfLines={1}>
            {destination?.city || 'Mumbai'}
          </Text>
          <Text style={styles.airportCode}>{destination?.airportCode || 'BOM'}</Text>
        </TouchableOpacity>
      </View>

      {/* Perforation Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.perforationHoleLeft} />
        <DashedLine />
        <View style={styles.perforationHoleRight} />
      </View>

      {/* Date Section */}
      <View style={styles.dateSection}>
        <TouchableOpacity style={styles.dateBlock} onPress={onPressDeparture}>
          <Text style={styles.eyebrow}>DEPARTURE</Text>
          <Text style={styles.dateValue}>
            {departureDate ? formatDate(departureDate) : 'Select date'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dateDivider} />

        <TouchableOpacity 
          style={styles.dateBlock} 
          onPress={onPressReturn}
        >
          <Text style={styles.eyebrow}>RETURN</Text>
          {tripType === 'roundtrip' && returnDate ? (
            <Text style={styles.dateValue}>{formatDate(returnDate)}</Text>
          ) : (
            <Text style={styles.addReturnText}>+ Add return</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: scale(20),
    marginBottom: theme.spacing.xl,
    // Soft shadow
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  routeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    position: 'relative',
  },
  airportBlock: {
    flex: 1,
    minHeight: scale(44),
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.body.semiBold,
    fontSize: scale(11),
    color: theme.colors.slateSoft,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: scale(4),
  },
  cityName: {
    fontFamily: theme.typography.fontFamily.body.medium,
    fontSize: scale(14),
    color: theme.colors.slate,
    marginBottom: scale(2),
  },
  airportCode: {
    fontFamily: theme.typography.fontFamily.display.bold,
    fontSize: scale(28),
    color: theme.colors.ink,
    lineHeight: scale(32),
  },
  swapWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  swapButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: theme.colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scale(20),
    position: 'relative',
    overflow: 'hidden',
  },
  perforationHoleLeft: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: theme.colors.cloud,
    position: 'absolute',
    left: -scale(10),
    zIndex: 2,
  },
  perforationHoleRight: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: theme.colors.cloud,
    position: 'absolute',
    right: -scale(10),
    zIndex: 2,
  },
  dashedLineContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    zIndex: 1,
  },
  dash: {
    width: scale(6),
    height: 1,
    backgroundColor: theme.colors.line,
  },
  dateSection: {
    flexDirection: 'row',
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  dateBlock: {
    flex: 1,
    minHeight: scale(44),
  },
  dateDivider: {
    width: 1,
    backgroundColor: theme.colors.line,
    marginHorizontal: theme.spacing.lg,
  },
  dateValue: {
    fontFamily: theme.typography.fontFamily.display.semiBold,
    fontSize: scale(16),
    color: theme.colors.ink,
  },
  addReturnText: {
    fontFamily: theme.typography.fontFamily.display.semiBold,
    fontSize: scale(16),
    color: theme.colors.redDeep,
  },
});
