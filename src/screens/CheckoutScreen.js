import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useCashfreePayment } from '../hooks/useCashfreePayment';
import BookingConfirmationScreen from './BookingConfirmationScreen';
import BookingFailureScreen from './BookingFailureScreen';

const CheckoutScreen = ({ route, navigation }) => {
  // Extract token and booking details from navigation route or context
  // Fallbacks provided for demonstration
  const { userToken, bookingDetails, customerDetails, amount, bookingType } = route?.params || { 
    userToken: 'dummy_token', 
    amount: 100,
    bookingDetails: {},
    customerDetails: {},
    bookingType: 'Bus'
  };

  const { status, error, orderId, startPayment, reset } = useCashfreePayment(userToken);

  const handlePayPress = () => {
    // Construct the payload as required by the backend
    const payload = {
      orderAmount: amount,
      orderCurrency: "INR",
      customerId: (customerDetails?.id || customerDetails?.phone || "cust_123").replace(/[^a-zA-Z0-9_-]/g, ''), // Strip '+' and other non-alphanumeric chars for Cashfree
      customerPhone: customerDetails?.phone || "9999999999",
      customerName: customerDetails?.name || "Guest User",
      customerEmail: customerDetails?.email || "guest@example.com",
      bookingType: bookingType || "Bus",
      couponCode: customerDetails?.couponCode || null,
      promotionId: null, // As specified in guide
      returnUrl: "https://api.picknbook.com/return", 
      bookingPayloadJson: JSON.stringify(bookingDetails),
    };

    startPayment(payload);
  };

  if (status === 'success') {
    return <BookingConfirmationScreen orderId={orderId} />;
  }

  if (status === 'failed') {
    return <BookingFailureScreen error={error} orderId={orderId} onRetry={reset} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Checkout</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Total Amount: ₹{amount}</Text>
      </View>

      {(status === 'creating_order' || status === 'awaiting_payment' || status === 'verifying') ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>
            {status === 'creating_order' && 'Initializing payment...'}
            {status === 'awaiting_payment' && 'Awaiting payment completion...'}
            {status === 'verifying' && 'Verifying payment securely...'}
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.payButton} onPress={handlePayPress}>
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  summaryCard: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 30,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  payButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  }
});

export default CheckoutScreen;
