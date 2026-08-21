import axios from "axios";
import Constants from "expo-constants";
import { getStoredAuthToken } from "../utils/authSession";

const runtimeEnv = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  runtimeEnv.EXPO_PUBLIC_API_BASE_URL ||
  runtimeEnv.apiBaseUrl ||
  "https://paycheck-baton-overfull.ngrok-free.dev";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Interceptors for rich console logging
client.interceptors.request.use(
  (config) => {
    const fullUrl = `${config.baseURL || ""}${config.url || ""}`;
    console.log(`\n==================================================`);
    console.log(`🚀 [TRAVELER API REQUEST] ${config.method?.toUpperCase()} ${fullUrl}`);
    if (config.params) console.log("📌 Request Params:", JSON.stringify(config.params, null, 2));
    if (config.data) console.log("📦 Request Payload:", typeof config.data === "string" ? config.data : JSON.stringify(config.data, null, 2));
    console.log(`==================================================\n`);
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => {
    const fullUrl = `${response.config?.baseURL || ""}${response.config?.url || ""}`;
    console.log(`\n==================================================`);
    console.log(`✅ [TRAVELER API RESPONSE] ${response.config?.method?.toUpperCase()} ${fullUrl} (Status: ${response.status})`);
    console.log("📥 Response Data:", JSON.stringify(response.data, null, 2));
    console.log(`==================================================\n`);
    return response;
  },
  (error) => {
    const fullUrl = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
    console.error(`\n==================================================`);
    console.error(`❌ [TRAVELER API ERROR] ${error.config?.method?.toUpperCase()} ${fullUrl} (Status: ${error.response?.status || "Network/Timeout Error"})`);
    console.error("⚠️ Error Message:", error.message);
    if (error.response?.data) {
      console.error("📄 Error Response Data:", JSON.stringify(error.response.data, null, 2));
    }
    console.error(`==================================================\n`);
    return Promise.reject(error);
  }
);


/**
 * Normalizes raw API traveler item into clean UI traveler object
 */
export function normalizeTraveler(item) {
  if (!item || typeof item !== "object") return null;

  const id = item.id || item.travelerId || item.Id || Math.random().toString();
  const firstName = item.firstName || item.FirstName || "";
  const lastName = item.lastName || item.LastName || "";
  const fullName = (
    item.fullName ||
    item.FullName ||
    item.name ||
    item.Name ||
    `${firstName} ${lastName}`.trim() ||
    "Traveler"
  ).trim();

  const genderRaw = String(item.gender || item.Gender || item.sex || item.Sex || "Male").trim();
  const gender = genderRaw.toLowerCase().startsWith("f") ? "Female" : "Male";

  const age = item.age || item.Age || (item.dateOfBirth ? calculateAgeFromDob(item.dateOfBirth) : 25);
  const phoneNumber = String(item.phoneNumber || item.PhoneNumber || item.phone || item.Phone || item.mobileNumber || "").trim();
  const email = String(item.email || item.Email || "").trim();

  return {
    id: String(id),
    firstName,
    lastName,
    fullName,
    gender,
    age: Number(age) || 25,
    phoneNumber,
    email,
    raw: item,
  };
}

function calculateAgeFromDob(dobString) {
  try {
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 25;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : 25;
  } catch {
    return 25;
  }
}

/**
 * Fetches saved travelers from GET /api/travelers (with /api/Travelers & /api/user/travelers fallbacks)
 */
export async function getTravelers(customToken) {
  const token = customToken || (await getStoredAuthToken());
  const headers = {};

  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  const endpoints = ["/api/travelers", "/api/Travelers", "/api/user/travelers"];

  for (const ep of endpoints) {
    try {
      console.log(`[TravelerService] Trying GET ${ep} with headers:`, headers);
      const response = await client.get(ep, { headers });
      console.log(`[TravelerService] GET ${ep} status:`, response.status);

      const rawList = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.travelers)
        ? response.data.travelers
        : Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data?.items)
        ? response.data.items
        : [];

      return rawList.map(normalizeTraveler).filter(Boolean);
    } catch (error) {
      console.warn(`[TravelerService] GET ${ep} failed (${error?.message}), checking fallbacks...`);
    }
  }

  return [];
}

/**
 * Creates a new traveler via POST /api/travelers (with /api/Travelers & /api/user/travelers fallbacks)
 */
export async function createTraveler(travelerPayload, customToken) {
  const token = customToken || (await getStoredAuthToken());
  const headers = {};

  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  const endpoints = ["/api/travelers", "/api/Travelers", "/api/user/travelers"];

  for (const ep of endpoints) {
    try {
      console.log(`[TravelerService] Trying POST ${ep} payload:`, travelerPayload);
      const response = await client.post(ep, travelerPayload, { headers });
      console.log(`[TravelerService] POST ${ep} response:`, response.data);

      return normalizeTraveler(response.data?.data || response.data || travelerPayload);
    } catch (error) {
      console.warn(`[TravelerService] POST ${ep} failed (${error?.message}), checking fallbacks...`);
    }
  }

  return normalizeTraveler(travelerPayload);
}

