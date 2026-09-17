import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useCashfreePayment } from '../hooks/useCashfreePayment';
import { getStoredAuthToken } from '../utils/authSession';
import BookingConfirmationScreen from './BookingConfirmationScreen';
import BookingFailureScreen from './BookingFailureScreen';

const CheckoutScreen = ({ route, navigation }) => {
  // Extract token and booking details from navigation route or context
  const { userToken, bookingDetails, customerDetails, amount, bookingType } = route?.params || {};

  const [authToken, setAuthToken] = useState(userToken || "");

  useEffect(() => {
    if (!authToken) {
      getStoredAuthToken()
        .then((tok) => {
          if (tok) setAuthToken(tok);
        })
        .catch((err) => console.log("[CheckoutScreen] Error loading token:", err));
    }
  }, [authToken]);

  const { status, error, orderId, startPayment, reset } = useCashfreePayment(authToken);

  const handlePayPress = async () => {
    let tokenToUse = authToken;
    if (!tokenToUse) {
      tokenToUse = await getStoredAuthToken().catch(() => "");
      if (tokenToUse) setAuthToken(tokenToUse);
    }

    if (!tokenToUse) {
      Alert.alert("Authentication Required", "Session expired or auth token is missing. Please log in again.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      Alert.alert("Invalid Amount", "Missing or invalid checkout amount.");
      return;
    }

    if (!bookingDetails) {
      Alert.alert("Missing Details", "Missing booking details for checkout.");
      return;
    }

    if (!customerDetails) {
      Alert.alert("Missing Customer Details", "Customer information is missing.");
      return;
    }

    if (!customerDetails.phone || !customerDetails.name || !customerDetails.email) {
      Alert.alert("Missing Customer Info", "Please ensure customer name, phone number, and email address are all provided.");
      return;
    }

    const effectiveBookingType = bookingType || (
      bookingDetails?.HotelName || bookingDetails?.HotelRoomsDetails ? "Hotel" : "Bus"
    );

    const custId = customerDetails.id || customerDetails.phone;
    if (!custId) {
      Alert.alert("Missing Customer ID", "Customer phone or ID is missing.");
      return;
    }

    // Construct the payload as required by the backend
    const payload = {
      orderAmount: amount,
      orderCurrency: "INR",
      customerId: custId.replace(/[^a-zA-Z0-9_-]/g, ''), // Strip '+' and other non-alphanumeric chars for Cashfree
      customerPhone: customerDetails.phone,
      customerName: customerDetails.name,
      customerEmail: customerDetails.email,
      bookingType: effectiveBookingType,
      couponCode: customerDetails.couponCode || null,
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
