import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationService";

const NotificationContext = createContext(null);

const getCount = (payload) => Number(payload?.unreadCount ?? payload?.data?.unreadCount ?? 0);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const mounted = useRef(true);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const payload = await getUnreadNotificationCount();
      if (mounted.current) setUnreadCount(Math.max(0, getCount(payload)));
    } catch {
      // Notifications are non-blocking; keep the last known badge value.
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [refreshUnreadCount]);

  const markRead = useCallback(async (notification) => {
    if (!notification || notification.isRead) return;
    await markNotificationRead(notification.id);
    if (mounted.current) setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    if (mounted.current) setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);

