/**
 * Service Worker Manager
 * Handles service worker registration and background notifications
 */

const SW_PATH = '/sw.js'
const CHECK_INTERVAL = 60 * 1000 // Check reminders every minute

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null
let checkInterval: number | null = null

/**
 * Register service worker
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    })

    serviceWorkerRegistration = registration

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New service worker available')
          }
        })
      }
    })

    // Start periodic reminder checking
    startPeriodicReminderCheck()

    console.log('Service Worker registered successfully')
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

/**
 * Unregister service worker
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const unregistered = await registration.unregister()
    
    if (unregistered) {
      stopPeriodicReminderCheck()
      serviceWorkerRegistration = null
    }
    
    return unregistered
  } catch (error) {
    console.error('Service Worker unregistration failed:', error)
    return false
  }
}

/**
 * Start periodic reminder checking
 */
export const startPeriodicReminderCheck = (): void => {
  if (checkInterval) {
    return // Already started
  }

  // Check immediately
  checkRemindersAndNotify()

  // Then check every minute
  checkInterval = window.setInterval(() => {
    checkRemindersAndNotify()
  }, CHECK_INTERVAL)

  // Also use background sync if available
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    registerBackgroundSync()
  }

  // Use periodic background sync if available
  if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
    registerPeriodicBackgroundSync()
  }
}

/**
 * Stop periodic reminder checking
 */
export const stopPeriodicReminderCheck = (): void => {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
}

/**
 * Check reminders and send notification via service worker
 */
export const checkRemindersAndNotify = async (): Promise<void> => {
  if (!serviceWorkerRegistration) {
    return
  }

  try {
    // Import reminder service
    const { fetchReminders } = await import('./reminderService')
    const reminders = await fetchReminders({
      status: 'pending',
      is_active: true,
    })

    // Send reminders to service worker for immediate check and storage
    const activeWorker = serviceWorkerRegistration.active || await navigator.serviceWorker.ready.then(reg => reg.active)
    if (activeWorker) {
      // Store reminders for background checking
      activeWorker.postMessage({
        type: 'STORE_REMINDERS',
        reminders,
      })
      
      // Also check immediately
      activeWorker.postMessage({
        type: 'CHECK_REMINDERS',
        reminders,
      })
    }
  } catch (error) {
    console.error('Error checking reminders:', error)
  }
}

/**
 * Register background sync
 */
const registerBackgroundSync = async (): Promise<void> => {
  if (!serviceWorkerRegistration) {
    return
  }

  try {
    // @ts-ignore - sync API may not be available in all browsers
    if ('sync' in serviceWorkerRegistration) {
      await (serviceWorkerRegistration as any).sync.register('check-reminders')
      console.log('Background sync registered')
    }
  } catch (error) {
    console.warn('Background sync registration failed:', error)
  }
}

/**
 * Register periodic background sync
 */
const registerPeriodicBackgroundSync = async (): Promise<void> => {
  if (!serviceWorkerRegistration) {
    return
  }

  try {
    // @ts-ignore - periodicSync API may not be available in all browsers
    if ('periodicSync' in serviceWorkerRegistration) {
      const status = await (serviceWorkerRegistration as any).periodicSync.getStatus()
      if (status === 'denied') {
        console.warn('Periodic background sync permission denied')
        return
      }

      await (serviceWorkerRegistration as any).periodicSync.register('check-reminders-periodic', {
        minInterval: 60 * 1000, // Minimum 1 minute
      })
      console.log('Periodic background sync registered')
    }
  } catch (error) {
    console.warn('Periodic background sync registration failed:', error)
  }
}

/**
 * Send notification via service worker
 */
export const sendNotificationViaSW = async (
  title: string,
  options?: NotificationOptions
): Promise<void> => {
  if (!serviceWorkerRegistration) {
    return
  }

  try {
    if (serviceWorkerRegistration.active) {
      serviceWorkerRegistration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options,
      })
    } else {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready
      if (registration.active) {
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options,
        })
      }
    }
  } catch (error) {
    console.error('Error sending notification via service worker:', error)
  }
}

/**
 * Get service worker registration
 */
export const getServiceWorkerRegistration = (): ServiceWorkerRegistration | null => {
  return serviceWorkerRegistration
}


