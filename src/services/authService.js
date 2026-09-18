import Constants from "expo-constants";
import { API_BASE_URL } from "../constants/config";

// Base URL is provided by EXPO_PUBLIC_API_BASE_URL and validated centrally.
const DEFAULT_API_BASE_URL = API_BASE_URL;

export let AUTH_API_BASE_URL = DEFAULT_API_BASE_URL;

export function toAuthUrl(endpoint) {
  const baseUrl = String(AUTH_API_BASE_URL || "").replace(/\/+$/, "");
  const safeEndpoint = String(endpoint || "").startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${baseUrl}${safeEndpoint}`;
}

const getObjectValue = (value) =>
  value && typeof value === "object" ? value : null;

const getFirstString = (values) =>
  values.find(
    (value) => typeof value === "string" && value.trim()
  ) || "";

const extractValidationMessage = (errors) => {
  if (!errors) {
    return "";
  }

  if (Array.isArray(errors)) {
    return getFirstString(errors);
  }

  if (typeof errors === "object") {
    for (const value of Object.values(errors)) {
      const message = extractValidationMessage(value);

      if (message) {
        return message;
      }
    }
  }

  return "";
};

const parseResponsePayload = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const isTimeoutError = (error) =>
  error?.name === "AbortError" ||
  /timeout/i.test(String(error?.message || ""));

const isNetworkError = (error) =>
  /network|failed to fetch|load failed|network request failed/i.test(
    String(error?.message || "")
  );

const buildRequestUrl = (endpoint) => {
  return toAuthUrl(endpoint);
};

const createTimeoutController = (timeoutMs = 15000) => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return { controller, timeoutId };
};

export function readApiMessage(payload, fallbackMessage = "") {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  const root = getObjectValue(payload);

  if (!root) {
    return fallbackMessage;
  }

  const directMessage = getFirstString([
    root.message,
    root.Message,
    root.error,
    root.Error,
    root.title,
    root.Title,
    root.detail,
    root.Detail,
    root.msg,
    root.Msg,
    root.data?.message,
    root.data?.Message,
    root.result?.message,
    root.result?.Message,
  ]);

  if (directMessage) {
    return directMessage;
  }

  const validationMessage = extractValidationMessage(
    root.errors ?? root.data?.errors ?? root.result?.errors
  );

  return validationMessage || fallbackMessage;
}

export async function requestAuth(
  endpoint,
  options = {},
  fallbackErrorMessage = "Request failed.",
  config = {}
) {
  const url = buildRequestUrl(endpoint);
  const timeoutMs = Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : 15000;
  const { controller, timeoutId } = createTimeoutController(timeoutMs);

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(
        config.timeoutMessage || "Request timed out. Please try again."
      );
    }

    if (isNetworkError(error)) {
      throw new Error(
        config.networkMessage || "Network error. Please check your connection."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  let payload;

  try {
    payload = await parseResponsePayload(response);
  } catch (error) {
    throw new Error(
      config.parseMessage || "Unable to read server response."
    );
  }

  if (!response.ok) {
    const apiError = new Error(
      readApiMessage(payload, fallbackErrorMessage)
    );
    apiError.response = {
      status: response.status,
      data: payload,
    };
    throw apiError;
  }

  if (!payload || (typeof payload !== "object" && typeof payload !== "string")) {
    const malformedError = new Error(
      config.malformedMessage || "Malformed API response."
    );
    malformedError.response = {
      status: response.status,
      data: payload,
    };
    throw malformedError;
  }

  return payload;
}

export async function sendLoginOtp(phoneNumber) {
  return await requestAuth(
    "/api/Auth/send-login-otp",
    {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    },
    "Failed to send OTP. Please check the mobile number."
  );
}

export async function verifyLoginOtp(phoneNumber, otp, guestId = null) {
  const headers = {};
  if (guestId) {
    headers["X-Guest-Id"] = guestId;
  }

  return await requestAuth(
    "/api/Auth/verify-login-otp",
    {
      method: "POST",
      headers,
      body: JSON.stringify({ phoneNumber: format10DigitPhoneNumber(phoneNumber), otp }),
    },
    "Invalid or expired OTP."
  );
}

export function format10DigitPhoneNumber(phone) {
  if (!phone) return "";
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned.slice(2);
  }
  if (cleaned.length > 10) {
    return cleaned.slice(-10);
  }
  return cleaned;
}

export async function sendRegistrationOtp({ channel = "Mobile", phoneNumber, email }) {
  const formattedChannel = channel === "Email" || channel === "email" ? "Email" : "Mobile";
  const bodyPayload = {
    channel: formattedChannel,
  };

  if (formattedChannel === "Mobile") {
    bodyPayload.phoneNumber = format10DigitPhoneNumber(phoneNumber);
  } else {
    bodyPayload.email = String(email || "").trim().toLowerCase();
  }

  return await requestAuth(
    "/api/Auth/send-registration-otp",
    {
      method: "POST",
      body: JSON.stringify(bodyPayload),
    },
    "Failed to send registration OTP.",
    { timeoutMs: 45000 }
  );
}

export async function verifyRegistrationOtp({ channel = "Mobile", phoneNumber, email, otp }) {
  const formattedChannel = channel === "Email" || channel === "email" ? "Email" : "Mobile";
  const bodyPayload = {
    channel: formattedChannel,
    otp: String(otp || "").trim(),
  };

  if (formattedChannel === "Mobile") {
    bodyPayload.phoneNumber = format10DigitPhoneNumber(phoneNumber);
  } else {
    bodyPayload.email = String(email || "").trim().toLowerCase();
  }

  return await requestAuth(
    "/api/Auth/verify-registration-otp",
    {
      method: "POST",
      body: JSON.stringify(bodyPayload),
    },
    "OTP verification failed. Please check the entered code."
  );
}

export async function registerUser(
  { firstName, lastName, phoneNumber, email, password },
  guestId = null
) {
  const headers = {};
  if (guestId) {
    headers["X-Guest-Id"] = guestId;
  }

  return await requestAuth(
    "/api/Auth/register",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        firstName: String(firstName || "").trim(),
        lastName: String(lastName || "").trim(),
        phoneNumber: format10DigitPhoneNumber(phoneNumber),
        email: String(email || "").trim().toLowerCase(),
        password: String(password || ""),
      }),
    },
    "User registration failed. Please try again."
  );
}
