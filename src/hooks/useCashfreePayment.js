import { useState, useEffect, useRef } from 'react';
import { CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';
import { CFSession, CFEnvironment } from 'cashfree-pg-api-contract';
import { createOrder, verifyPayment } from '../services/cashfreeApi';

export const useCashfreePayment = (userToken) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'creating_order' | 'awaiting_payment' | 'verifying' | 'success' | 'failed'
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const onVerify = async (orderIdFromCallback) => {
      if (!isMounted.current) return;
      try {
        setStatus('verifying');
        // Do server-side verification using the backend API.
        // DO NOT trust the SDK's success callback as final.
        await verifyPayment(orderIdFromCallback, userToken);
        
        if (isMounted.current) {
          setStatus('success');
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err.message || 'Payment verification failed on server.');
          setStatus('failed');
        }
      }
    };

    const onError = (errorFromCallback, orderIdFromCallback) => {
      if (!isMounted.current) return;
      setError(errorFromCallback?.message || 'Payment cancelled or failed');
      setStatus('failed');
    };

    // Set up SDK callbacks
    CFPaymentGatewayService.setCallback({ onVerify, onError });

    return () => {
      isMounted.current = false;
      // Cleanup on unmount
      CFPaymentGatewayService.removeCallback();
    };
  }, [userToken]);

  const startPayment = async (bookingInput) => {
    try {
      setStatus('creating_order');
      setError(null);
      
      // Step 1: Create the order securely via the backend
      const response = await createOrder(bookingInput, userToken);
      
      if (!isMounted.current) return;
      
      // Look for both snake_case and camelCase!
      const returnedOrderId = response.order_id || response.orderId;
      const paymentSessionId = response.payment_session_id || response.paymentSessionId;
      
      // Check if we actually got the token before calling Cashfree
      if (!paymentSessionId) {
        throw new Error("Failed to receive payment session token from backend: " + JSON.stringify(response));
      }

      if (!returnedOrderId) {
        throw new Error("Cashfree order_id is missing");
      }

      console.log("[Cashfree] Environment:", "PRODUCTION");
      console.log("[Cashfree] Order ID:", returnedOrderId);
      console.log("[Cashfree] Payment Session ID present:", !!paymentSessionId);
      
      setOrderId(returnedOrderId);
      setStatus('awaiting_payment');

      // Step 2: Initialize Cashfree SDK with the session
      const session = new CFSession(paymentSessionId, returnedOrderId, CFEnvironment.PRODUCTION);
      
      // Open the Cashfree payment gateway UI using web checkout
      CFPaymentGatewayService.doWebPayment(session);
      
    } catch (err) {
      if (isMounted.current) {
        setError(err.message || 'Failed to create order');
        setStatus('failed');
      }
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
    setOrderId(null);
  };

  return { status, error, orderId, startPayment, reset };
};
