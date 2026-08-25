import Constants from "expo-constants";

// Base URL resolution order:
// 1. EXPO_PUBLIC_API_BASE_URL (recommended for Expo Go)
// 2. app.json / app.config extra.apiBaseUrl
// 3. Expo manifest extra.apiBaseUrl
// 4. Default ngrok URL
//
// This keeps the app configurable for:
// - local network IP: http://192.168.x.x:5207
// - ngrok tunnel: https://xxxx.ngrok-free.dev
// - emulator/simulator host aliases when appropriate
const DEFAULT_API_BASE_URL =
  "https://paycheck-baton-overfull.ngrok-free.dev";

const readExtraBaseUrl = () =>
  Constants?.expoConfig?.extra?.apiBaseUrl ||
  Constants?.manifest?.extra?.apiBaseUrl ||
  Constants?.manifest2?.extra?.apiBaseUrl ||
  "";

export let AUTH_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  readExtraBaseUrl() ||
  DEFAULT_API_BASE_URL;

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
    console.log(`\n========== AUTH API REQUEST ==========`);
    console.log(`[${options.method || "GET"}] ${url}`);
    if (options.body) {
      console.log(`Payload:`, JSON.stringify(JSON.parse(options.body), null, 2));
    }
    console.log(`======================================\n`);
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

  console.log(`\n========== AUTH API RESPONSE ==========`);
  console.log(`[${response?.status}] ${url}`);
  console.log(`Response Data:`, JSON.stringify(payload, null, 2));
  console.log(`=======================================\n`);

  if (!response.ok) {
    const apiError = new Error(
      readApiMessage(payload, fallbackErrorMessage)
    );
    apiError.response = {
      status: response.status,
      data: payload,
    };
    console.log("Error:", apiError);
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
    console.log("Error:", malformedError);
    throw malformedError;
  }

  return payload;
}
