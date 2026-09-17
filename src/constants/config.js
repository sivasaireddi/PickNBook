import Constants from "expo-constants";

const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim();
  }

  const extraUrl =
    Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL ||
    Constants?.expoConfig?.extra?.apiBaseUrl ||
    Constants?.manifest?.extra?.EXPO_PUBLIC_API_BASE_URL ||
    Constants?.manifest?.extra?.apiBaseUrl;

  if (extraUrl && typeof extraUrl === "string" && extraUrl.trim()) {
    return extraUrl.trim();
  }

  throw new Error(
    "EXPO_PUBLIC_API_BASE_URL is not configured in your .env file! Please set EXPO_PUBLIC_API_BASE_URL in .env"
  );
};

const API_BASE_URL = getApiBaseUrl();

export { API_BASE_URL };


