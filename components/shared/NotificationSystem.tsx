import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface Notification {
  id: string;
  type: 'payment' | 'status' | 'quote' | 'epr' | 'complaint';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  service_request_id?: string;
  payment_id?: string;
  customer_id: string;
}

interface NotificationSystemProps {
  user: any;
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ user, onNotificationClick }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.role === 'customer' && user?.id) {
      // Fetch initial notifications
      fetchNotifications();
      
      // Set up real-time subscription for new notifications
      const subscription = api.subscribeToCustomerNotifications(user.id, (payload) => {
        console.log('Real-time notification received:', payload);
        if (payload.eventType === 'INSERT') {
          // New notification added
          const newNotification = payload.new;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        } else if (payload.eventType === 'UPDATE') {
          // Notification updated (e.g., marked as read)
          const updatedNotification = payload.new;
          setNotifications(prev => 
            prev.map(notification => 
              notification.id === updatedNotification.id ? updatedNotification : notification
            )
          );
          setUnreadCount(prev => 
            prev - (payload.old.read === false && updatedNotification.read === true ? 1 : 0)
          );
        }
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (user?.role !== 'customer' || !user?.id) return;
    
    try {
      const customerNotifications = await api.getCustomerNotifications(user.id);
      setNotifications(customerNotifications);
      setUnreadCount(customerNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to empty array if there's an error
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (user?.role !== 'customer' || !user?.id) return;
    
    try {
      await api.markAllNotificationsAsRead(user.id);
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💰';
      case 'status':
        return '📋';
      case 'quote':
        return '📄';
      case 'epr':
        return '🔧';
      case 'complaint':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment':
        return 'text-green-600 dark:text-green-400';
      case 'status':
        return 'text-blue-600 dark:text-blue-400';
      case 'quote':
        return 'text-purple-600 dark:text-purple-400';
      case 'epr':
        return 'text-orange-600 dark:text-orange-400';
      case 'complaint':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Only render for customers
  if (user?.role !== 'customer') {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 2c-1.1 0-2 .9-2 2v.29C7.12 4.84 5 7.87 5 11.29V16l-2 2v1h18v-1l-2-2v-4.71c0-3.42-2.12-6.45-5-6.99V4c0-1.1-.9-2-2-2zm-2 18c0 1.1.9 2 2 2s2-.9 2-2h-4z" />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    markAsRead(notification.id);
                    onNotificationClick?.(notification);
                  }}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${getNotificationColor(notification.type)}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <div className="mt-2">
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                // Navigate to full notifications page
                console.log('View all notifications');
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;

