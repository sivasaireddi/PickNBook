import axios from "axios";
import Constants from "expo-constants";
import { getStoredAuthToken } from "../utils/authSession";
import { API_BASE_URL } from "../constants/config";

const runtimeEnv = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
const BASE_URL = API_BASE_URL;

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
  const gender = genderRaw.toLowerCase().startsWith("f")
    ? "Female"
    : genderRaw.toLowerCase().startsWith("o")
    ? "Other"
    : "Male";

  const age = item.age || item.Age || (item.dateOfBirth ? calculateAgeFromDob(item.dateOfBirth) : 25);
  const phoneNumber = String(item.phoneNumber || item.PhoneNumber || item.phone || item.Phone || item.phoneNo || item.mobileNumber || "").trim();
  const email = String(item.email || item.Email || "").trim();

  // Additional fields required by Saved Travelers feature
  const type = item.type || item.Type || item.travelerType || "Adult";
  const title = item.title || item.Title || "Mr";
  const country = item.country || item.Country || "";
  const passportNo = item.passportNo || item.PassportNo || item.passportNumber || null;
  const phoneNo = phoneNumber; // Alias for API consistency

  return {
    id: String(id),
    firstName,
    lastName,
    fullName,
    gender,
    age: Number(age) || 25,
    phoneNumber,
    phoneNo,
    email,
    type,
    title,
    country,
    passportNo,
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
 * Fetches saved travelers from GET /api/travelers (with /api/Travelers & /api/user/travelers fallbacks).
 * Supports optional filters object: { type, phoneNo, email, query, limit }
 */
export async function getTravelers(filtersOrToken) {
  // Backward compatible: if a string is passed, treat it as customToken
  let customToken = null;
  let filters = {};
  if (typeof filtersOrToken === "string") {
    customToken = filtersOrToken;
  } else if (filtersOrToken && typeof filtersOrToken === "object") {
    filters = filtersOrToken;
  }

  const token = customToken || (await getStoredAuthToken());
  const headers = {};

  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  // Build query params from filters
  const params = {};
  if (filters.type) params.type = filters.type;
  if (filters.phoneNo) params.phoneNo = filters.phoneNo;
  if (filters.email) params.email = filters.email;
  if (filters.query) params.query = filters.query;
  if (filters.limit) params.limit = filters.limit;

  const endpoints = ["/api/travelers", "/api/Travelers", "/api/user/travelers"];

  for (const ep of endpoints) {
    try {
      console.log(`[TravelerService] Trying GET ${ep} with headers:`, headers);
      const response = await client.get(ep, { headers, params });
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
 * Normalizes optional fields to empty strings before sending to the API.
 * The backend rejects null values for email, phoneNo, and passportNo.
 */
function normalizePayloadForApi(payload) {
  if (!payload || typeof payload !== "object") return payload;
  return {
    ...payload,
    email: (payload.email ?? "").toString().trim() || "",
    phoneNo: (payload.phoneNo ?? "").toString().trim() || "",
    passportNo: (payload.passportNo ?? "").toString().trim() || "",
  };
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

  // Normalize optional fields to "" (never null)
  const normalizedPayload = normalizePayloadForApi(travelerPayload);

  const endpoints = ["/api/travelers", "/api/Travelers", "/api/user/travelers"];

  for (const ep of endpoints) {
    try {
      console.log(`[TravelerService] Trying POST ${ep} payload:`, normalizedPayload);
      const response = await client.post(ep, normalizedPayload, { headers });
      console.log(`[TravelerService] POST ${ep} response:`, response.data);

      return normalizeTraveler(response.data?.data || response.data || travelerPayload);
    } catch (error) {
      console.warn(`[TravelerService] POST ${ep} failed (${error?.message}), checking fallbacks...`);
    }
  }

  return normalizeTraveler(travelerPayload);
}

/**
 * Fetches a single traveler by ID via GET /api/travelers/{id}
 */
export async function getTravelerById(id, customToken) {
  const token = customToken || (await getStoredAuthToken());
  const headers = {};

  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  try {
    console.log(`[TravelerService] GET /api/travelers/${id}`);
    const response = await client.get(`/api/travelers/${id}`, { headers });
    return normalizeTraveler(response.data?.data || response.data);
  } catch (error) {
    console.error(`[TravelerService] GET /api/travelers/${id} failed:`, error?.message);
    throw error;
  }
}

/**
 * Updates an existing traveler via PUT /api/travelers/{id}
 */
export async function updateTraveler(id, travelerPayload, customToken) {
  const token = customToken || (await getStoredAuthToken());
  const headers = {};

  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  // Normalize optional fields to "" (never null)
  const normalizedPayload = normalizePayloadForApi(travelerPayload);

  try {
    console.log(`[TravelerService] PUT /api/travelers/${id} payload:`, normalizedPayload);
    const response = await client.put(`/api/travelers/${id}`, normalizedPayload, { headers });
    return normalizeTraveler(response.data?.data || response.data);
  } catch (error) {
    console.error(`[TravelerService] PUT /api/travelers/${id} failed:`, error?.message);
    throw error;
  }
}

/**
 * Deletes a traveler via DELETE /api/travelers/{id}
 */
export async function deleteTraveler(id, customToken) {
  const token = customToken || (await getStoredAuthToken());
  const headers = {};

  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  try {
    console.log(`[TravelerService] DELETE /api/travelers/${id}`);
    const response = await client.delete(`/api/travelers/${id}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`[TravelerService] DELETE /api/travelers/${id} failed:`, error?.message);
    throw error;
  }
}

/**
 * Searches travelers via GET /api/travelers?query={searchText}
 */
export async function searchTravelers(query, customToken) {
  return getTravelers({ query });
}

