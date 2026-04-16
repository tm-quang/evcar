import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface SwipeBackOptions {
  enabled?: boolean
  threshold?: number
  edgeWidth?: number
}

export const useSwipeBack = (options: SwipeBackOptions = {}) => {
  const {
    enabled = true,
    threshold = 100,
    edgeWidth = 50
  } = options

  const navigate = useNavigate()
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const isTrackingSwipe = useRef<boolean>(false)
  const hasDetectedHorizontal = useRef<boolean>(false)

  useEffect(() => {
    if (!enabled) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      const target = e.target as HTMLElement
      
      // Don't interfere with inputs, buttons, or scrollable elements
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[role="button"]')
      ) {
        return
      }

      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY

      // Only enable swipe if starting from left edge (very strict)
      if (touch.clientX < edgeWidth) {
        isTrackingSwipe.current = true
        hasDetectedHorizontal.current = false
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTrackingSwipe.current) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartX.current
      const absDeltaX = Math.abs(deltaX)
      const deltaY = Math.abs(touch.clientY - touchStartY.current)

      // Immediately cancel if vertical movement is dominant (allow normal scroll)
      if (deltaY > absDeltaX * 1.2 || deltaY > 20) {
        isTrackingSwipe.current = false
        hasDetectedHorizontal.current = false
        return
      }

      // Only prevent default if we have a clear horizontal swipe (swipe right)
      // Require minimum horizontal movement and ensure vertical is minimal
      if (deltaX > 15 && absDeltaX > deltaY * 2) {
        hasDetectedHorizontal.current = true
        e.preventDefault()
      } else if (deltaX <= 0 || absDeltaX < 15) {
        // If moving left or not enough movement, cancel tracking
        isTrackingSwipe.current = false
        hasDetectedHorizontal.current = false
      }
    }

    const resetTracking = () => {
      isTrackingSwipe.current = false
      hasDetectedHorizontal.current = false
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTrackingSwipe.current && !hasDetectedHorizontal.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = Math.abs(touch.clientY - touchStartY.current)

      // Swipe right from left edge = go back (only if clearly horizontal)
      if (hasDetectedHorizontal.current && deltaX > threshold && deltaY < deltaX * 0.5) {
        navigate(-1)
      }

      resetTracking()
    }

    const handleTouchCancel = () => {
      resetTracking()
    }

    // Use capture phase and passive for touchstart/touchend to avoid conflicts
    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: false })
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true, capture: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [enabled, threshold, edgeWidth, navigate])
}

