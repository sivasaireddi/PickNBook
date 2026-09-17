import Constants from "expo-constants";
import { API_BASE_URL } from "../constants/config";

const runtimeEnv = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
export const BASE_URL = (API_BASE_URL || '').replace(/\/+$/, "");

// Helper regex to check for bare time strings like "01:15" or "01:15:00"
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

/**
 * Validates the booking payload to ensure datetime fields are either null or full ISO-8601.
 * Bare time strings crash the C# backend parser.
 */
const validateDatetimeFields = (payloadJson) => {
  if (!payloadJson) return;
  try {
    const obj = JSON.parse(payloadJson);
    
    const checkFields = (o) => {
      for (const key in o) {
        if (o[key] && typeof o[key] === 'object') {
          checkFields(o[key]);
        } else if (typeof o[key] === 'string') {
          // Check if it's a bare time string
          if (timeRegex.test(o[key])) {
            throw new Error(`Invalid datetime format for field "${key}": "${o[key]}". Please use a full ISO-8601 string or null.`);
          }
        }
      }
    };
    
    checkFields(obj);
  } catch (e) {
    // If it's our validation error, rethrow it
    if (e.message.includes('Invalid datetime format')) {
      throw e;
    }
    // If it's just a JSON parse error, ignore it and let the backend handle malformed JSON
  }
};

/**
 * Creates an order on the backend via Cashfree.
 * @param {Object} payload The order creation payload
 * @param {string} userToken User's authorization token
 * @returns {Promise<{order_id: string, payment_session_id: string}>}
 */
export const createOrder = async (payload, userToken) => {
  // Validate datetime fields client-side before sending
  if (payload.bookingPayloadJson) {
    validateDatetimeFields(payload.bookingPayloadJson);
  }

  // Ensure notifyUrl is set to the correct absolute URL as an async safety net
  const payloadToSend = {
    ...payload,
    notifyUrl: 'https://api.picknbook.com/api/cashfree/webhook',
  };

  const response = await fetch(`${BASE_URL}/api/cashfree/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify(payloadToSend),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Surface backend's message field (e.g. "Price mismatch") to the user
    throw new Error(data.message || `Failed to create order (status: ${response.status})`);
  }

  return data; // Expected { order_id, payment_session_id }
};

/**
 * Verifies the payment status securely from the backend.
 * @param {string} orderId The order ID returned from createOrder
 * @param {string} userToken User's authorization token
 * @returns {Promise<Object>} Verification result
 */
export const verifyPayment = async (orderId, userToken) => {
  const response = await fetch(`${BASE_URL}/api/cashfree/orders/${orderId}/payments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`, // MUST use the same Authorization header
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Failed to verify payment (status: ${response.status})`);
  }

  return data;
};
