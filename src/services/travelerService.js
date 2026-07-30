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
 * Fetches saved travelers from GET /api/Travelers
 */
export async function getTravelers(customToken) {
  try {
    const token = customToken || (await getStoredAuthToken());
    const headers = {};

    if (token) {
      headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }

    console.log("[TravelerService] GET /api/Travelers with headers:", headers);

    const response = await client.get("/api/Travelers", { headers });
    console.log("[TravelerService] GET /api/Travelers status:", response.status);
    console.log("[TravelerService] GET /api/Travelers data:", JSON.stringify(response.data, null, 2));

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
    console.warn("[TravelerService] getTravelers Error:", error?.message, error?.response?.data);
    throw error;
  }
}

/**
 * Creates a new traveler via POST /api/Travelers
 */
export async function createTraveler(travelerPayload, customToken) {
  try {
    const token = customToken || (await getStoredAuthToken());
    const headers = {};

    if (token) {
      headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }

    console.log("[TravelerService] POST /api/Travelers payload:", travelerPayload);

    const response = await client.post("/api/Travelers", travelerPayload, { headers });
    console.log("[TravelerService] POST /api/Travelers response:", response.data);

    return normalizeTraveler(response.data?.data || response.data || travelerPayload);
  } catch (error) {
    console.warn("[TravelerService] createTraveler Error:", error?.message, error?.response?.data);
    throw error;
  }
}
