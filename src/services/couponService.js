import axios from "axios";
import { API_BASE_URL } from "../constants/config";

const client = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
const cache = new Map();
const unwrap = (payload) => Array.isArray(payload) ? payload : (payload?.data || payload?.results || payload?.coupons || payload?.items || []);
const isActive = (coupon) => {
  const now = Date.now();
  const start = coupon?.startDate ? new Date(coupon.startDate).getTime() : null;
  const expiry = coupon?.expiryDate ? new Date(coupon.expiryDate).getTime() : null;
  return (!start || Number.isNaN(start) || now >= start) && (!expiry || Number.isNaN(expiry) || now <= expiry);
};

export function getCouponImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(String(imageUrl))) return String(imageUrl);
  return `${API_BASE_URL.replace(/\/+$/, "")}/${String(imageUrl).replace(/^\/+/, "")}`;
}

export async function getCoupons(serviceType) {
  const type = String(serviceType || "").toLowerCase();
  if (!type) return [];
  if (cache.has(type)) {
    const cachedCoupons = cache.get(type);
    console.log(`[couponService] ${type} offers (cached):`, {
      isArray: Array.isArray(cachedCoupons),
      count: cachedCoupons.length,
      data: cachedCoupons,
    });
    return cachedCoupons;
  }
  try {
    const response = await client.get("/api/Coupons", { params: { serviceType: type } });
    const coupons = unwrap(response?.data)
      .filter((coupon) => String(coupon?.serviceType || type).toLowerCase() === type)
      .filter(isActive)
      .sort((a, b) => {
        const ap = Number(a?.priority); const bp = Number(b?.priority);
        return Number.isNaN(ap) || Number.isNaN(bp) ? 0 : ap - bp;
      });
    console.log(`[couponService] ${type} offers:`, {
      isArray: Array.isArray(coupons),
      count: coupons.length,
      data: coupons,
    });
    cache.set(type, coupons);
    return coupons;
  } catch (error) {
    console.warn(`[couponService] Failed to load ${type} coupons:`, error?.message || error);
    return [];
  }
}

export default { getCoupons, getCouponImageUrl };
