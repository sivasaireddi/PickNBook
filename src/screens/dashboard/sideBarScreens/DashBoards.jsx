import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const DashBoards = () => {

  const renderBars = (data, color) => (
    <Svg height="60" width="100%">
      {data.map((val, index) => (
        <Rect
          key={index}
          x={index * 20}
          y={60 - val}
          width="12"
          height={val}
          rx="3"
          fill={color}
        />
      ))}
    </Svg>
  );

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <LinearGradient
        colors={['#8B0000', '#FF3B3B']}
        style={styles.statusBar}
      >
        <Text style={styles.statusText}>
          42 Bookings • 8 Pending • 3 Failed • ₹1,25,000 Revenue
        </Text>
      </LinearGradient>

      {/* INFO CARDS */}
      <View style={styles.row}>
        <View style={styles.infoCard}>
          <Icon name="security" size={20} color="green" />
          <Text style={styles.title}>Last Login IP</Text>
          <Text>103.214.56.21</Text>
        </View>

        <View style={styles.infoCard}>
          <Icon name="access-time" size={20} color="#333" />
          <Text style={styles.title}>Last Login</Text>
          <Text>13 Mar 2026</Text>
          <Text>10:32 AM</Text>
        </View>

        <View style={styles.infoCard}>
          <Icon name="currency-rupee" size={20} color="green" />
          <Text style={styles.title}>Revenue Today</Text>
          <Text style={styles.green}>₹52,430</Text>
          <Text style={styles.green}>+18%</Text>
        </View>
      </View>

      {/* MAIN CARDS */}
      <View style={styles.row}>

        {/* SUCCESS */}
        <View style={styles.bigCard}>
          <Text style={styles.title}>Successful Bookings</Text>
          <Text style={styles.bigGreen}>128</Text>
          {renderBars([20, 30, 25, 40, 50, 45, 55], '#ff4d4d')}
        </View>

        {/* FAILED */}
        <View style={styles.bigCard}>
          <Text style={styles.title}>Failed Bookings</Text>
          <Text style={styles.bigRed}>9</Text>
          {renderBars([5, 10, 8, 12, 9, 7, 11], '#8B0000')}
        </View>

        {/* PENDING */}
        <View style={styles.bigCard}>
          <Text style={styles.title}>Pending Works</Text>
          <Text style={styles.bigGray}>14</Text>

          <View style={styles.listItem}>
            <Icon name="payment" size={16} />
            <Text> Payment Review (5)</Text>
          </View>

          <View style={styles.listItem}>
            <Icon name="verified" size={16} />
            <Text> Booking Verification (3)</Text>
          </View>

          <View style={styles.listItem}>
            <Icon name="warning" size={16} />
            <Text> Dispute Resolution (2)</Text>
          </View>

          <View style={styles.listItem}>
            <Icon name="support-agent" size={16} />
            <Text> Customer Response (4)</Text>
          </View>
        </View>

      </View>

      {/* QUICK ACTIONS */}
      <Text style={styles.section}>Quick Actions</Text>

      <View style={styles.row}>
        <View style={styles.actionCard}>
          <Icon name="people" size={20} />
          <Text style={styles.title}>Customer</Text>
          <Text>Customer List</Text>
          <Text>Add Customer</Text>
        </View>

        <View style={styles.actionCard}>
          <Icon name="directions-bus" size={20} />
          <Text style={styles.title}>Bus</Text>
          <Text>Booking List</Text>
          <Text>Cancellation</Text>
        </View>
      </View>

    </ScrollView>
  );
};

export default DashBoards;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 10,
  },

  statusBar: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  statusText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  row: {
    flexDirection: isTablet ? 'row' : 'column',
    justifyContent: 'space-between',
  },

  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    margin: 5,
    borderRadius: 12,
    elevation: 4,
  },

  bigCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    margin: 5,
    borderRadius: 12,
    elevation: 4,
  },

  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    margin: 5,
    borderRadius: 12,
    elevation: 4,
  },

  title: {
    fontWeight: 'bold',
    marginVertical: 5,
  },

  bigGreen: {
    fontSize: 26,
    color: 'green',
    fontWeight: 'bold',
  },

  bigRed: {
    fontSize: 26,
    color: 'red',
    fontWeight: 'bold',
  },

  bigGray: {
    fontSize: 26,
    color: '#444',
    fontWeight: 'bold',
  },

  green: {
    color: 'green',
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  section: {
    fontWeight: 'bold',
    marginTop: 15,
    marginLeft: 5,
  },
});
