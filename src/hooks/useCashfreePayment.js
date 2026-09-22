import { useState, useEffect, useRef } from 'react';
import { CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';
import { CFSession, CFEnvironment } from 'cashfree-pg-api-contract';
import { createOrder, verifyPayment } from '../services/cashfreeApi';

const getCashfreeResponseValue = (response, keys) => {
  const candidates = [
    response,
    response?.data,
    response?.result,
    response?.data?.data,
    response?.data?.result,
    response?.result?.data,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    for (const key of keys) {
      if (candidate[key]) return candidate[key];
    }
  }

  return null;
};

export const useCashfreePayment = (userToken) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'creating_order' | 'awaiting_payment' | 'verifying' | 'success' | 'failed'
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const onVerify = async (orderIdFromCallback) => {
      if (!isMounted.current) return;
      console.log("[Payment] Cashfree verify callback:", { orderId: orderIdFromCallback });
      try {
        setStatus('verifying');
        // Do server-side verification using the backend API.
        // DO NOT trust the SDK's success callback as final.
        await verifyPayment(orderIdFromCallback, userToken);
        
        if (isMounted.current) {
          setStatus('success');
        }
      } catch (err) {
        console.log("[Payment] payment verification error:", err?.message);
        if (isMounted.current) {
          setError(err.message || 'Payment verification failed on server.');
          setStatus('failed');
        }
      }
    };

    const onError = (errorFromCallback, orderIdFromCallback) => {
      if (!isMounted.current) return;
      console.log("[Payment] Cashfree payment error:", {
        orderId: orderIdFromCallback,
        message: errorFromCallback?.message,
      });
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
      console.log("[Payment] payment flow started:", {
        amount: bookingInput?.orderAmount,
        bookingType: bookingInput?.bookingType,
      });
      setStatus('creating_order');
      setError(null);
      
      // Step 1: Create the order securely via the backend
      const response = await createOrder(bookingInput, userToken);
      
      if (!isMounted.current) return;
      
      // Cashfree responses can be returned directly or wrapped in data/result.
      const returnedOrderId = getCashfreeResponseValue(response, [
        'order_id',
        'orderId',
        'cashfreeOrderId',
      ]);
      const paymentSessionId = getCashfreeResponseValue(response, [
        'payment_session_id',
        'paymentSessionId',
        'session_id',
        'sessionId',
      ]);
      
      // Check if we actually got the token before calling Cashfree
      if (!paymentSessionId) {
        throw new Error("Failed to receive payment session token from backend: " + JSON.stringify(response));
      }

      if (!returnedOrderId) {
        console.error('[Cashfree] create-order response did not include order_id:', response);
        throw new Error('Cashfree order_id is missing from the create-order response.');
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
      console.log("[Payment] Cashfree checkout opened:", { orderId: returnedOrderId });

    } catch (err) {
      console.log("[Payment] payment flow error:", err?.message);
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
