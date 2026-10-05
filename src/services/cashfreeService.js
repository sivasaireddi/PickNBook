/**
 * cashfreeService.js
 * -------------------
 * API service for:
 *  1. Listing available flight coupons  (GET /api/Coupons?serviceType=flight)
 *  2. Validating a coupon server-side   (POST /api/Coupons/validate)
 *  3. Creating a Cashfree order         (POST /api/cashfree/create-order)
 *  4. Polling payment verification      (GET /api/cashfree/orders/{orderId}/payments)
 *  5. Fetching confirmed SRDV bookings  (GET /api/flight/srdv/my-bookings)
 */

import axios from "axios";
import { getStoredAuthToken } from "../utils/authSession";
import { API_BASE_URL } from "../constants/config";
import { getCoupons } from "./couponService";

// --------------------------------------------------------------------------
// Shared authenticated client
// --------------------------------------------------------------------------
export const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Inject JWT token on every request
client.interceptors.request.use(async (config) => {
  try {
    const token = await getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn("[cashfreeService] Token injection failed:", e.message);
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = `${err.config?.baseURL || ""}${err.config?.url || ""}`;
    const status = err.response?.status || "Network Error";
    console.error(`[cashfreeService] ❌ ${err.config?.method?.toUpperCase()} ${url} (${status})`);
    return Promise.reject(err);
  }
);

// --------------------------------------------------------------------------
// 1. List Available Flight Coupons
//    GET /api/Coupons?serviceType=flight
//    Auth: None (public)
// --------------------------------------------------------------------------
/**
 * @returns {Promise<Array>} Array of coupon objects
 */
export async function getFlightCoupons() {
  return getCoupons("flight");
}

// --------------------------------------------------------------------------
// 2. Validate / Apply a Coupon
//    POST /api/Coupons/validate
//    Auth: None (public)
// --------------------------------------------------------------------------
/**
 * @param {Object} params
 * @param {string} params.serviceType  e.g. "flight"
 * @param {string} params.couponCode   e.g. "FLIGHT500"
 * @param {number} params.totalAmount  cart total before discount
 * @returns {Promise<{isValid, discountAmount, finalTotal, message}>}
 */
export async function validateFlightCoupon({ serviceType = "flight", couponCode, totalAmount }) {
  const cleanCode = String(couponCode || "").trim().toUpperCase();
  if (!cleanCode) {
    return { isValid: false, discountAmount: 0, finalTotal: totalAmount, message: "Please enter a coupon code." };
  }

  try {
    const response = await client.post("/api/Coupons/validate", {
      serviceType,
      couponCode: cleanCode,
      totalAmount: Number(totalAmount || 0),
    });

    const data = response?.data;
    // Normalize server response keys
    return {
      isValid: Boolean(data?.isValid ?? data?.IsValid ?? false),
      discountAmount: Number(data?.discountAmount ?? data?.DiscountAmount ?? 0),
      finalTotal: Number(data?.finalTotal ?? data?.FinalTotal ?? totalAmount),
      message: String(data?.message ?? data?.Message ?? ""),
    };
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.Message ||
      err?.message ||
      "Coupon validation failed.";
    console.error("[cashfreeService] validateFlightCoupon failed:", msg);
    return { isValid: false, discountAmount: 0, finalTotal: totalAmount, message: msg };
  }
}

// --------------------------------------------------------------------------
// 3. Create Cashfree Order
//    POST /api/cashfree/create-order
//    Auth: Bearer JWT required
// --------------------------------------------------------------------------
/**
 * @param {Object} payload
 * @param {number}  payload.orderAmount
 * @param {string}  payload.orderCurrency  default "INR"
 * @param {string}  payload.customerId
 * @param {string}  payload.customerName
 * @param {string}  payload.customerEmail
 * @param {string}  payload.customerPhone
 * @param {string}  [payload.couponCode]
 * @param {number|null} [payload.promotionId]
 * @param {boolean} [payload.useWallet]
 * @param {string}  payload.bookingPayloadJson  stringified booking payload
 * @returns {Promise<{
 *   totalAmount, walletUsedAmount, gatewayPaidAmount, paymentMethod,
 *   isWalletFullyPaid, cashfreeOrderId, paymentSessionId, cfOrderId, orderStatus
 * }>}
 */
export async function createCashfreeOrder(payload) {
  try {
    const response = await client.post("/api/cashfree/create-order", {
      orderAmount: Number(payload.orderAmount || 0),
      orderCurrency: String(payload.orderCurrency || "INR"),
      customerId: String(payload.customerId || ""),
      customerName: String(payload.customerName || ""),
      customerEmail: String(payload.customerEmail || ""),
      customerPhone: String(payload.customerPhone || ""),
      returnUrl: payload.returnUrl || "",
      notifyUrl: payload.notifyUrl || "",
      bookingType: "Flight",
      couponCode: payload.couponCode || null,
      promotionId: payload.promotionId || null,
      useWallet: Boolean(payload.useWallet ?? false),
      bookingPayloadJson: String(payload.bookingPayloadJson || "{}"),
    });

    const data = response?.data;
    if (!data) throw new Error("Empty response from create-order.");

    return {
      totalAmount: Number(data.totalAmount ?? data.TotalAmount ?? 0),
      walletUsedAmount: Number(data.walletUsedAmount ?? data.WalletUsedAmount ?? 0),
      gatewayPaidAmount: Number(data.gatewayPaidAmount ?? data.GatewayPaidAmount ?? 0),
      paymentMethod: String(data.paymentMethod ?? data.PaymentMethod ?? "Cashfree"),
      isWalletFullyPaid: Boolean(data.isWalletFullyPaid ?? data.IsWalletFullyPaid ?? false),
      cashfreeOrderId: String(data.cashfreeOrderId ?? data.CashfreeOrderId ?? data.orderId ?? ""),
      paymentSessionId: String(data.paymentSessionId ?? data.PaymentSessionId ?? data.sessionId ?? ""),
      cfOrderId: String(data.cfOrderId ?? data.CfOrderId ?? data.cf_order_id ?? ""),
      orderStatus: String(data.orderStatus ?? data.OrderStatus ?? "ACTIVE"),
    };
  } catch (err) {
    const errData = err?.response?.data;
    const msg =
      errData?.message ||
      errData?.title ||
      errData?.error ||
      err?.message ||
      "Failed to create payment order.";
    const status = err?.response?.status;
    console.error(`[cashfreeService] createCashfreeOrder failed (${status}):`, msg);
    throw new Error(msg);
  }
}

// --------------------------------------------------------------------------
// 4. Poll / Verify Payment
//    GET /api/cashfree/orders/{cashfreeOrderId}/payments
//    Auth: Bearer JWT required
// --------------------------------------------------------------------------
/**
 * @param {string} cashfreeOrderId
 * @returns {Promise<{
 *   paymentReference, cashfreeOrderId, status, bookingType,
 *   amount, paymentMethod, paidAt, failureReason
 * }>}
 */
export async function verifyFlightPayment(cashfreeOrderId) {
  const cleanId = String(cashfreeOrderId || "").trim();
  if (!cleanId) throw new Error("cashfreeOrderId is required for payment verification.");

  try {
    const response = await client.get(`/api/cashfree/orders/${cleanId}/payments`);
    const data = response?.data;

    const rawStatus = String(
      data?.status ?? data?.Status ?? data?.paymentStatus ?? data?.PaymentStatus ?? "Pending"
    );

    // Normalize status to: "Pending" | "Success" | "Failed"
    let status = "Pending";
    const sl = rawStatus.toLowerCase();
    if (sl === "success" || sl === "paid" || sl === "completed") status = "Success";
    else if (sl === "failed" || sl === "cancelled" || sl === "expired") status = "Failed";

    return {
      paymentReference: String(data?.paymentReference ?? data?.PaymentReference ?? cleanId),
      cashfreeOrderId: String(data?.cashfreeOrderId ?? data?.CashfreeOrderId ?? cleanId),
      status,
      bookingType: String(data?.bookingType ?? data?.BookingType ?? "Flight"),
      amount: Number(data?.amount ?? data?.Amount ?? 0),
      paymentMethod: String(data?.paymentMethod ?? data?.PaymentMethod ?? ""),
      paidAt: String(data?.paidAt ?? data?.PaidAt ?? ""),
      failureReason: String(data?.failureReason ?? data?.FailureReason ?? data?.reason ?? ""),
    };
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || "Payment verification failed.";
    console.error("[cashfreeService] verifyFlightPayment failed:", msg);
    throw new Error(msg);
  }
}

// --------------------------------------------------------------------------
// 5. Fetch My Confirmed SRDV Bookings
//    GET /api/flight/srdv/my-bookings
//    Auth: Bearer JWT required
// --------------------------------------------------------------------------
/**
 * @returns {Promise<Array>}  Array of confirmed booking objects, newest first
 */
export async function getMyFlightBookings() {
  try {
    const response = await client.get("/api/flight/srdv/my-bookings");
    const data = response?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.bookings)) return data.bookings;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || "Failed to fetch bookings.";
    console.warn("[cashfreeService] getMyFlightBookings failed:", msg);
    return [];
  }
}

export default {
  getFlightCoupons,
  validateFlightCoupon,
  createCashfreeOrder,
  verifyFlightPayment,
  getMyFlightBookings,
};
