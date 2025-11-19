import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';

interface NotificationBadgeContextType {
  unreadCount: number;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  autoMarkAsReadOnEntry: boolean;
  setAutoMarkAsReadOnEntry: (value: boolean) => void;
}

const NotificationBadgeContext = createContext<NotificationBadgeContextType | undefined>(undefined);

export const NotificationBadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [autoMarkAsReadOnEntry, setAutoMarkAsReadOnEntry] = useState(true); // Par défaut activé

  const loadUnreadCount = useCallback(async () => {
    try {
      const unreadNotifications = await notificationService.getUnreadNotifications();
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Error loading unread count:', error);
      setUnreadCount(0);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadUnreadCount();
  }, [loadUnreadCount]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadUnreadCount(); // Refresh count after marking as read
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [loadUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      await loadUnreadCount(); // Refresh count after marking all as read
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [loadUnreadCount]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // Refresh more frequently for better real-time updates
  useEffect(() => {
    const interval = setInterval(loadUnreadCount, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  return (
    <NotificationBadgeContext.Provider value={{ 
      unreadCount, 
      refresh, 
      markAsRead, 
      markAllAsRead, 
      autoMarkAsReadOnEntry, 
      setAutoMarkAsReadOnEntry 
    }}>
      {children}
    </NotificationBadgeContext.Provider>
  );
};

export const useNotificationBadge = (): NotificationBadgeContextType => {
  const context = useContext(NotificationBadgeContext);
  if (context === undefined) {
    throw new Error('useNotificationBadge must be used within a NotificationBadgeProvider');
  }
  return context;
}; 