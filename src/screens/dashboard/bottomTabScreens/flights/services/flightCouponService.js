/**
 * Flight Coupon Service & Fare Calculator
 * Provides pure unit-testable fare calculation functions and coupon validation logic.
 */

import axios from "axios";
import { FLIGHT_API_BASE_URL } from "../../../../../services/FlightService";

const DEFAULT_OFFERS = [];

/**
 * Pure function to recalculate fare breakdown and total payable amount.
 */
export function calculateFareBreakdown({
  baseFare = 0,
  taxes = 0,
  seatSurcharge = 0,
  ssrSurcharge = 0,
  convenienceFee = 0,
  appliedCoupon = null,
}) {
  const subtotal = Number(baseFare || 0) + Number(taxes || 0);
  let discountAmount = 0;

  if (appliedCoupon && appliedCoupon.discountAmount !== undefined) {
    discountAmount = Number(appliedCoupon.discountAmount || 0);
  } else if (appliedCoupon) {
    const val = Number(appliedCoupon.discountValue || appliedCoupon.discountAmount || 0);
    const type = String(appliedCoupon.discountType || "flat").toLowerCase();
    const cap = Number(appliedCoupon.maxDiscountCap || Infinity);

    if (type.includes("percent")) {
      discountAmount = (subtotal * val) / 100;
      if (cap && cap > 0) {
        discountAmount = Math.min(discountAmount, cap);
      }
    } else {
      discountAmount = val;
    }
  }

  discountAmount = Math.max(0, Math.round(discountAmount));
  const grandTotal = Math.max(
    0,
    Number(baseFare || 0) +
      Number(taxes || 0) +
      Number(seatSurcharge || 0) +
      Number(ssrSurcharge || 0) +
      Number(convenienceFee || 0) -
      discountAmount
  );

  return {
    baseFare: Number(baseFare || 0),
    taxes: Number(taxes || 0),
    seatSurcharge: Number(seatSurcharge || 0),
    ssrSurcharge: Number(ssrSurcharge || 0),
    convenienceFee: Number(convenienceFee || 0),
    discountAmount,
    grandTotal,
  };
}

/**
 * Validates a coupon code against client/server rules.
 */
export async function validateCoupon({ code, cartTotal = 0, userId = "", routeId = "", availableOffers = [] }) {
  const cleanCode = String(code || "").trim().toUpperCase();
  console.log(`[flightCouponService] 🏷️ Validating coupon code: '${cleanCode}' for cart total: ₹${cartTotal}`);
  if (!cleanCode) {
    console.log("[flightCouponService] Coupon code empty.");
    return { valid: false, reason: "Please enter a valid coupon code." };
  }

  // 1. Check if the coupon exists in the live API availableOffers list
  const liveOffer = (Array.isArray(availableOffers) ? availableOffers : []).find((o) => {
    const offerCode = String(
      o?.code || o?.Code || o?.title || o?.Title || o?.couponCode || o?.CouponCode || o?.offerCode || o?.OfferCode || ""
    ).toUpperCase();
    return offerCode === cleanCode;
  });

  if (liveOffer) {
    const rawVal = Number(
      liveOffer.discountValue ?? liveOffer.DiscountValue ?? liveOffer.discountAmount ?? liveOffer.DiscountAmount ?? 500
    ) || 500;
    const rawType = String(
      liveOffer.discountType ?? liveOffer.DiscountType ?? liveOffer.type ?? liveOffer.Type ?? "flat"
    ).toLowerCase();
    const minFare = Number(
      liveOffer.minBookingAmount ?? liveOffer.MinBookingAmount ?? liveOffer.minFare ?? liveOffer.MinFare ?? 0
    );
    const cap = Number(
      liveOffer.maxDiscountAmount ?? liveOffer.MaxDiscountAmount ?? liveOffer.maxDiscountCap ?? liveOffer.MaxDiscountCap ?? Infinity
    );

    if (minFare > 0 && cartTotal < minFare) {
      console.log(`[flightCouponService] ❌ Coupon '${cleanCode}' failed: cart total ₹${cartTotal} < minFare ₹${minFare}`);
      return {
        valid: false,
        reason: `Minimum fare of ₹${minFare.toLocaleString()} required for coupon ${cleanCode}.`,
      };
    }

    let calculatedDiscount = 0;
    if (rawType.includes("percent")) {
      calculatedDiscount = (cartTotal * rawVal) / 100;
      if (cap && cap > 0) {
        calculatedDiscount = Math.min(calculatedDiscount, cap);
      }
    } else {
      calculatedDiscount = rawVal;
    }

    const resObj = {
      valid: true,
      code: String(liveOffer.code || liveOffer.Code || liveOffer.title || liveOffer.Title || cleanCode),
      type: rawType,
      discountAmount: Math.round(calculatedDiscount),
      discountValue: rawVal,
      maxDiscountCap: cap < Infinity ? cap : null,
      title: String(liveOffer.title || liveOffer.Title || liveOffer.code || liveOffer.Code || cleanCode),
      description: String(liveOffer.description || liveOffer.Description || "Flat ₹500 instant discount on summer flights"),
    };
    console.log(`[flightCouponService] ✅ Coupon '${cleanCode}' validated successfully! Discount: ₹${resObj.discountAmount}`);
    return resObj;
  }

  // 2. Try server-side validation if endpoint is available
  try {
    const response = await axios.post(
      `${FLIGHT_API_BASE_URL}/api/coupons/validate`,
      { code: cleanCode, cartTotal, userId, routeId },
      { headers: { "ngrok-skip-browser-warning": "true" }, timeout: 6000 }
    );
    if (response?.data && response.data.valid !== undefined) {
      console.log(`[flightCouponService] Server coupon validation response:`, response.data);
      return response.data;
    }
  } catch (err) {
    console.log("[flightCouponService] Server coupon validation fallback error:", err?.message);
  }

  // 3. Fallback matching DEFAULT_OFFERS if any
  const offer = DEFAULT_OFFERS.find((o) => (o.code || o.title || "").toUpperCase() === cleanCode);
  if (!offer) {
    return { valid: false, reason: `Coupon code '${cleanCode}' does not exist or is invalid.` };
  }

  if (cartTotal < offer.minFare) {
    return {
      valid: false,
      reason: `Minimum fare of ₹${offer.minFare.toLocaleString()} required for coupon ${cleanCode}.`,
    };
  }

  let calculatedDiscount = 0;
  if (offer.discountType === "percentage") {
    calculatedDiscount = (cartTotal * offer.discountValue) / 100;
    if (offer.maxDiscountCap) {
      calculatedDiscount = Math.min(calculatedDiscount, offer.maxDiscountCap);
    }
  } else {
    calculatedDiscount = offer.discountValue;
  }

  return {
    valid: true,
    code: offer.code,
    type: offer.discountType,
    discountAmount: Math.round(calculatedDiscount),
    discountValue: offer.discountValue,
    maxDiscountCap: offer.maxDiscountCap || null,
    title: offer.title,
    description: offer.description,
  };
}

export function getDefaultAvailableOffers() {
  return DEFAULT_OFFERS;
}
