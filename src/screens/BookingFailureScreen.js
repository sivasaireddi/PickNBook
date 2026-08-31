import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const BookingFailureScreen = ({ error, orderId, onRetry }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.errorIcon}>❌</Text>
      <Text style={styles.title}>Payment Failed</Text>
      
      <View style={styles.detailsContainer}>
        <Text style={styles.errorText}>
          {error || 'An unexpected error occurred during payment.'}
        </Text>
        {orderId && (
          <Text style={styles.orderIdText}>Order ID: {orderId}</Text>
        )}
      </View>
      
      <Text style={styles.message}>
        No amount has been deducted, or if it has, it will be refunded automatically.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.supportButton]} 
          onPress={() => console.log("Contact Support")}
        >
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
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
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 20,
  },
  detailsContainer: {
    backgroundColor: '#fff3f3',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  orderIdText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007bff',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  supportButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default BookingFailureScreen;
