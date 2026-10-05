import { requestAuth } from "./authService";
import { getStoredAuthToken } from "../utils/authSession";

const withAuth = async (endpoint, options = {}, fallback) => {
  const token = await getStoredAuthToken();
  if (!token) throw new Error("Session expired. Please sign in again.");

  return requestAuth(
    endpoint,
    { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } },
    fallback
  );
};

export const getUnreadNotificationCount = () =>
  withAuth("/api/notifications/unread-count", {}, "Unable to load notifications.");

export const getNotifications = ({ page = 1, pageSize = 20, unreadOnly, category, severity } = {}) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (typeof unreadOnly === "boolean") params.set("unreadOnly", String(unreadOnly));
  if (category) params.set("category", category);
  if (severity) params.set("severity", severity);

  return withAuth(`/api/notifications?${params.toString()}`, {}, "Unable to load notifications.");
};

export const markNotificationRead = (id) =>
  withAuth(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PUT" }, "Unable to mark notification as read.");

export const markAllNotificationsRead = () =>
  withAuth("/api/notifications/mark-all-read", { method: "PUT" }, "Unable to mark notifications as read.");

