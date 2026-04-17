/**
 * Native App Behavior
 * Make PWA behave exactly like a native Android app
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

/**
 * Prevent zoom on double tap and pinch
 */
export const preventZoom = () => {
  // Prevent pinch zoom
  document.addEventListener('gesturestart', (e) => {
    if (e.cancelable) e.preventDefault()
  })

  document.addEventListener('gesturechange', (e) => {
    if (e.cancelable) e.preventDefault()
  })

  document.addEventListener('gestureend', (e) => {
    if (e.cancelable) e.preventDefault()
  })

  // Prevent double-tap zoom
  let lastTouchEnd = 0
  document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      if (e.cancelable) e.preventDefault()
    }
    lastTouchEnd = now
  }, { passive: false })

  // Prevent zoom via keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === '+' || e.key === '-' || e.key === '=')
    ) {
      e.preventDefault()
    }
  })

  // Prevent zoom via mouse wheel
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
    }
  }, { passive: false })
}

/**
 * Prevent pull-to-refresh (Chrome mobile)
 */
export const preventPullToRefresh = () => {
  let startY = 0
  let startX = 0
  let isScrolling = false
  let hasMoved = false

  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].pageY
    startX = e.touches[0].pageX
    isScrolling = window.scrollY > 0 || document.documentElement.scrollTop > 0
    hasMoved = false
  }, { passive: true })

  document.addEventListener('touchmove', (e) => {
    if (!hasMoved) {
      const currentY = e.touches[0].pageY
      const currentX = e.touches[0].pageX
      const deltaY = currentY - startY
      const deltaX = Math.abs(currentX - startX)

      // Only prevent if it's clearly a vertical pull down (not horizontal swipe)
      // And only if we're at the very top of the page
      const isAtTop = window.scrollY === 0 && document.documentElement.scrollTop === 0
      const isVerticalPull = deltaY > 0 && deltaY > deltaX * 2

      if (!isScrolling && isAtTop && isVerticalPull && deltaY > 10) {
        if (e.cancelable) e.preventDefault()
        hasMoved = true
      } else {
        hasMoved = true
      }
    }
  }, { passive: false })
}

/**
 * Prevent context menu (long press)
 */
export const preventContextMenu = () => {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })
}

/**
 * Prevent text selection on long press (except inputs)
 */
export const preventTextSelection = () => {
  document.addEventListener('selectstart', (e) => {
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable

    if (!isInput) {
      e.preventDefault()
    }
  })
}

/**
 * Handle back button (Android)
 * This works with React Router's BrowserRouter
 */
export const handleBackButton = (callback: () => void) => {
  window.addEventListener('popstate', () => {
    callback()
  })
}

/**
 * Enhanced Android back button handler for PWA
 * Handles hardware back button on Android devices
 */
export const setupAndroidBackButton = (onBack: () => boolean) => {
  // Handle browser back button (works with React Router)
  window.addEventListener('popstate', () => {
    const shouldPreventDefault = onBack()
    if (shouldPreventDefault) {
      // Push state back if we want to prevent navigation
      window.history.pushState(null, '', window.location.href)
    }
  })

  // Push initial state to enable back button
  window.history.pushState(null, '', window.location.href)

  // Handle hardware back button on Android (via beforeunload)
  // Note: This is handled by React Router's BrowserRouter automatically
  // but we add this for additional control
}

/**
 * Prevent overscroll (rubber band effect)
 */
export const preventOverscroll = () => {
  document.body.style.overscrollBehavior = 'none'
  document.documentElement.style.overscrollBehavior = 'none'
}

/**
 * Lock orientation to portrait (if supported)
 */
export const lockOrientation = async (orientation: 'portrait' | 'landscape' = 'portrait') => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orientationLock = (screen.orientation as any)?.lock
    if (screen.orientation && orientationLock) {
      await orientationLock(orientation)
    }
  } catch {
    // Orientation lock not supported - silently fail
  }
}

/**
 * Hide splash screen after app loads
 */
export const hideSplashScreen = () => {
  const splash = document.getElementById('splash-screen')
  if (splash) {
    splash.style.opacity = '0'
    setTimeout(() => {
      splash.remove()
    }, 300)
  }
}

/**
 * Initialize all native app behaviors
 */
export const initNativeAppBehavior = () => {
  preventZoom()
  preventPullToRefresh()
  preventContextMenu()
  preventOverscroll()

  // Optional: Uncomment if needed
  // preventTextSelection()
  // lockOrientation('portrait')

  // Native app behavior initialized (log removed for security)
}

/**
 * Check if running as installed PWA
 */
export const isInstalledPWA = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = window.navigator as any
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true ||
    document.referrer.includes('android-app://')
  )
}

/**
 * Show install prompt for PWA
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null

export const setupInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    // PWA install prompt ready (log removed for security)
  })
}

export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    return false
  }

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null

  return outcome === 'accepted'
}

/**
 * Add haptic feedback to buttons
 * Excludes footer navigation buttons
 * DISABLED: Haptic feedback/vibration removed
 */
export const addHapticFeedback = () => {
  // Haptic feedback disabled - no vibration on button clicks
  // document.addEventListener('click', (e) => {
  //   const target = e.target as HTMLElement

  //   // Skip haptic feedback for footer navigation and buttons with data-no-haptic
  //   if (
  //     target.closest('[class*="FooterNav"]') ||
  //     target.closest('footer') ||
  //     target.closest('[data-no-haptic="true"]') ||
  //     target.hasAttribute('data-no-haptic')
  //   ) {
  //     return
  //   }

  //   if (
  //     target.tagName === 'BUTTON' ||
  //     target.closest('button') ||
  //     target.classList.contains('clickable')
  //   ) {
  //     if ('vibrate' in navigator) {
  //       navigator.vibrate(10)
  //     }
  //   }
  // })
}

/**
 * Optimize for performance
 */
export const optimizePerformance = () => {
  // Enable hardware acceleration
  document.body.style.transform = 'translateZ(0)'
  document.body.style.backfaceVisibility = 'hidden'

  // Reduce motion if user prefers
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.scrollBehavior = 'auto'
  }
}

