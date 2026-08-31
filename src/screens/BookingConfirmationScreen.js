import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const BookingConfirmationScreen = ({ orderId, bookingId }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.title}>Payment Successful!</Text>
      
      <View style={styles.detailsContainer}>
        {orderId && <Text style={styles.detailText}>Order ID: {orderId}</Text>}
        {bookingId && <Text style={styles.detailText}>Booking ID: {bookingId}</Text>}
      </View>
      
      <Text style={styles.message}>
        Your booking has been confirmed successfully.
      </Text>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate("DashBoard", { screen: "Bookings" })}
      >
        <Text style={styles.buttonText}>Go to My Bookings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 20,
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default BookingConfirmationScreen;
