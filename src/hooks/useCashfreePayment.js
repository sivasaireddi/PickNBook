import { useEffect, useRef, useState } from 'react';
import { CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';
import { createOrder, verifyPayment } from '../services/cashfreeApi';

const getResponseValue = (response, keys) => {
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
      if (candidate[key] !== undefined && candidate[key] !== null) return candidate[key];
    }
  }
  return null;
};

export const classifyVerification = (response, requestedBookingType) => {
  const paymentStatus = String(getResponseValue(response, ['status', 'Status', 'paymentStatus', 'PaymentStatus']) || '').trim().toLowerCase();
  const fulfillmentStatus = String(getResponseValue(response, ['fulfillmentStatus', 'FulfillmentStatus']) || '').trim().toLowerCase();
  const bookingType = String(
    getResponseValue(response, ['bookingType', 'BookingType']) || requestedBookingType || ''
  ).trim().toLowerCase();

  if (['failed', 'cancelled', 'canceled', 'expired'].includes(paymentStatus)) return 'failed';
  if (!['success', 'paid'].includes(paymentStatus)) return 'payment_pending';
  if (bookingType !== 'bus') return 'success';
  if (fulfillmentStatus === 'success') return 'success';
  if (fulfillmentStatus.startsWith('failed')) return 'booking_failed';
  return 'booking_pending';
};

const TERMINAL_VERIFICATION_STATES = new Set(['success', 'booking_failed', 'failed']);

export const useCashfreePayment = (userToken) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const isMounted = useRef(true);
  const launchInProgress = useRef(false);
  const processingOrderRef = useRef(null);
  const processedOrdersRef = useRef(new Set());
  const orderIdRef = useRef(null);
  const bookingTypeRef = useRef(null);

  const verifyOrder = async (id) => {
    const orderToVerify = id || orderIdRef.current;
    if (!orderToVerify) return;

    const orderKey = String(orderToVerify);
    const activeOrderKey = orderIdRef.current ? String(orderIdRef.current) : null;
    if (
      (activeOrderKey && activeOrderKey !== orderKey) ||
      processedOrdersRef.current.has(orderKey) ||
      processingOrderRef.current === orderKey
    ) {
      return;
    }

    processingOrderRef.current = orderKey;
    try {
      if (isMounted.current) setStatus('verifying');
      const result = await verifyPayment(orderToVerify, userToken);
      const nextStatus = classifyVerification(result, bookingTypeRef.current);
      if (TERMINAL_VERIFICATION_STATES.has(nextStatus)) {
        processedOrdersRef.current.add(orderKey);
      }
      if (isMounted.current) {
        setVerificationResult(result);
        setError(nextStatus === 'failed' ? (result?.failureReason || result?.FailureReason || 'Payment was not completed.') : null);
        setStatus(nextStatus);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err?.message || 'Unable to verify payment status.');
        setStatus('verification_error');
      }
    } finally {
      if (processingOrderRef.current === orderKey) {
        processingOrderRef.current = null;
      }
      launchInProgress.current = false;
    }
  };

  useEffect(() => {
    isMounted.current = true;
    const onVerify = (callbackOrderId) => verifyOrder(callbackOrderId);
    const onError = (callbackError, callbackOrderId) => {
      if (!isMounted.current) return;
      const message = callbackError?.message || 'Payment was cancelled or failed.';
      const wasCancelled = /cancel|drop|abort/i.test(message);
      if (callbackOrderId) {
        const callbackOrderKey = String(callbackOrderId);
        const activeOrderKey = orderIdRef.current ? String(orderIdRef.current) : null;
        if (
          (activeOrderKey && activeOrderKey !== callbackOrderKey) ||
          processedOrdersRef.current.has(callbackOrderKey)
        ) {
          return;
        }
        orderIdRef.current = callbackOrderId;
        setOrderId(callbackOrderId);
        if (wasCancelled) {
          processedOrdersRef.current.add(callbackOrderKey);
        }
      }
      if (callbackOrderId && !wasCancelled) {
        setError(message);
        verifyOrder(callbackOrderId);
        return;
      }
      setError(message);
      setStatus(wasCancelled ? 'cancelled' : 'failed');
      launchInProgress.current = false;
    };

    CFPaymentGatewayService.setCallback({ onVerify, onError });
    return () => {
      isMounted.current = false;
      CFPaymentGatewayService.removeCallback();
    };
  }, [userToken]);

  const startPayment = async (bookingInput) => {
    if (launchInProgress.current) return;
    launchInProgress.current = true;
    bookingTypeRef.current = bookingInput?.bookingType || null;
    try {
      setStatus('creating_order');
      setError(null);
      setVerificationResult(null);
      const response = await createOrder(bookingInput, userToken);
      if (!isMounted.current) return;

      const returnedOrderId = getResponseValue(response, ['order_id', 'orderId', 'cashfreeOrderId']);
      const paymentSessionId = getResponseValue(response, ['payment_session_id', 'paymentSessionId', 'session_id', 'sessionId']);
      if (!paymentSessionId || !returnedOrderId) {
        throw new Error('The payment session could not be initialized. Please try again.');
      }

      orderIdRef.current = returnedOrderId;
      setOrderId(returnedOrderId);
      setStatus('awaiting_payment');
      const session = new CFSession(paymentSessionId, returnedOrderId, CFEnvironment.PRODUCTION);
      CFPaymentGatewayService.doWebPayment(session);
    } catch (err) {
      launchInProgress.current = false;
      if (isMounted.current) {
        setError(err?.message || 'Unable to initialize payment.');
        setStatus('failed');
      }
    }
  };

  const reset = () => {
    launchInProgress.current = false;
    processingOrderRef.current = null;
    orderIdRef.current = null;
    bookingTypeRef.current = null;
    setStatus('idle');
    setError(null);
    setOrderId(null);
    setVerificationResult(null);
  };

  return {
    status,
    error,
    orderId,
    verificationResult,
    startPayment,
    recheckPayment: () => verifyOrder(),
    reset,
  };
};
