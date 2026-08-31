import { useState } from 'react';
import { Alert } from 'react-native';

export const useCashfreePayment = (userToken) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);

  const startPayment = async (bookingInput) => {
    setStatus('failed');
    setError('Cashfree SDK is not supported on the Web platform. Please test on an Android or iOS device.');
    Alert.alert('Unsupported Platform', 'Cashfree SDK is not supported on the Web platform. Please test on an Android or iOS device.');
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
    setOrderId(null);
  };

  return { status, error, orderId, startPayment, reset };
};
