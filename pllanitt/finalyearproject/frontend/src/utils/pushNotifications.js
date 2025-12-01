/**
 * Browser Push Notifications Utility
 * Handles Web Push API for desktop notifications
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Check if browser supports push notifications
 */
export const isPushSupported = () => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Request notification permission
 */
export const requestPermission = async () => {
  if (!isPushSupported()) {
    return { granted: false, error: 'Push notifications not supported' };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      permission
    };
  } catch (error) {
    return {
      granted: false,
      error: error.message
    };
  }
};

/**
 * Check current notification permission
 */
export const getPermission = () => {
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  return Notification.permission;
};

/**
 * Show a browser notification
 */
export const showNotification = (title, options = {}) => {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  const notificationOptions = {
    body: options.body || '',
    icon: options.icon || '/favicon.ico',
    badge: options.badge || '/favicon.ico',
    tag: options.tag || 'default',
    requireInteraction: options.requireInteraction || false,
    silent: options.silent || false,
    ...options
  };

  try {
    const notification = new Notification(title, notificationOptions);
    
    // Handle click
    if (options.onClick) {
      notification.onclick = (event) => {
        event.preventDefault();
        options.onClick();
        notification.close();
      };
    }

    // Auto-close after timeout
    if (options.duration) {
      setTimeout(() => {
        notification.close();
      }, options.duration);
    }

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

/**
 * Register service worker for push notifications
 */
export const registerServiceWorker = async () => {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered:', registration);
    return { success: true, registration };
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async () => {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    return { success: false, error: 'Push notifications not available' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Send subscription to backend
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(subscription)
    });

    if (response.ok) {
      return { success: true, subscription };
    } else {
      return { success: false, error: 'Failed to save subscription' };
    }
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Notify backend
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      
      return { success: true };
    }
    
    return { success: false, error: 'No active subscription' };
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Convert VAPID key from base64 URL to Uint8Array
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Initialize push notifications
 */
export const initializePushNotifications = async () => {
  if (!isPushSupported()) {
    return { success: false, error: 'Not supported' };
  }

  // Check permission
  const permission = getPermission();
  
  if (permission === 'default') {
    // Request permission
    const result = await requestPermission();
    if (!result.granted) {
      return { success: false, error: 'Permission denied' };
    }
  } else if (permission === 'denied') {
    return { success: false, error: 'Permission denied' };
  }

  // Register service worker
  const swResult = await registerServiceWorker();
  if (!swResult.success) {
    return swResult;
  }

  // Subscribe to push
  return await subscribeToPush();
};

export default {
  isPushSupported,
  requestPermission,
  getPermission,
  showNotification,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  initializePushNotifications
};

