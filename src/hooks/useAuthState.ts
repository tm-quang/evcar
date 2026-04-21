import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
}

// ── Module-level singleton ──────────────────────────────────────────────────
// Keeps auth state alive across route changes so ProtectedRoute never
// incorrectly redirects to /login while the session is being re-checked.
let _cachedAuthState: AuthState = {
  user: null,
  session: null,
  loading: true,
  initialized: false,
}
let _listeners: Array<(s: AuthState) => void> = []
let _bootstrapped = false  // only run the Supabase init once

const setGlobalAuth = (state: AuthState) => {
  _cachedAuthState = state
  _listeners.forEach(fn => fn(state))
}

/** Call this right after signInWithPassword succeeds to update auth state before navigate() */
export const setAuthStateOnLogin = (user: User, session: Session) => {
  setGlobalAuth({ user, session, loading: false, initialized: true })
}

/**
 * Hook to monitor authentication state and automatically restore session
 * This ensures users stay logged in across page refreshes and browser sessions
 */
export const useAuthState = () => {
  // Start from cached state so ProtectedRoute never flashes /login
  // while the session is being re-validated on remount
  const [authState, setAuthState] = useState<AuthState>(() => _cachedAuthState)
  const navigate = useNavigate()

  useEffect(() => {
    // Subscribe to global auth state updates
    const listener = (s: AuthState) => setAuthState(s)
    _listeners.push(listener)

    // Only one instance boots the Supabase listener
    if (_bootstrapped) {
      return () => {
        _listeners = _listeners.filter(l => l !== listener)
      }
    }
    _bootstrapped = true

    const supabase = getSupabaseClient()

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          // Don't throw, just set to null
        }

        // Populate user cache ngay khi có session
        if (session?.user) {
          const { setCachedUser } = await import('../lib/userCache')
          setCachedUser(session.user)
        }

        setGlobalAuth({
          user: session?.user ?? null,
          session,
          loading: false,
          initialized: true,
        })

        // Try to refresh the session to ensure it's valid
        if (session) {
          const { data: { session: refreshedSession }, error: refreshError } =
            await supabase.auth.refreshSession()

          if (refreshError) {
            // Chỉ logout nếu lỗi thực sự từ server (token hết hạn, bị revoke)
            // Không logout nếu lỗi mạng tạm thời
            const isAuthError = refreshError.status === 400 || 
                               refreshError.status === 401 ||
                               refreshError.message?.includes('invalid_grant') ||
                               refreshError.message?.includes('Invalid Refresh Token') ||
                               refreshError.message?.includes('token is expired') ||
                               refreshError.message?.includes('Refresh Token Not Found')

            if (isAuthError) {
              console.warn('Session refresh failed with auth error (token invalid/expired):', refreshError.message)
              setGlobalAuth({ user: null, session: null, loading: false, initialized: true })
            } else {
              // Lỗi mạng hoặc lỗi server tạm thời → giữ nguyên session hiện tại
              console.warn('Session refresh failed (network/temp error), keeping existing session:', refreshError.message)
              // Giữ nguyên setGlobalAuth với session cũ (không logout)
            }
          } else if (refreshedSession) {
            if (refreshedSession?.user) {
              const { setCachedUser } = await import('../lib/userCache')
              setCachedUser(refreshedSession.user)
            }
            setGlobalAuth({
              user: refreshedSession.user,
              session: refreshedSession,
              loading: false,
              initialized: true,
            })
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setGlobalAuth({ user: null, session: null, loading: false, initialized: true })
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

      console.log('Auth state changed:', event, session?.user?.email)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // QUAN TRỌNG: Populate user cache NGAY LẬP TỨC khi SIGNED_IN
        // Điều này đảm bảo user cache có sẵn trước khi các component load data
        if (session?.user) {
          const { setCachedUser } = await import('../lib/userCache')
          setCachedUser(session.user)
          console.log('✅ User cache populated immediately on SIGNED_IN')
        }

        setGlobalAuth({
          user: session?.user ?? null,
          session,
          loading: false,
          initialized: true,
        })



        // Clear cache khi SIGNED_IN (chỉ khi có flag đánh dấu login mới)
        // Điều này đảm bảo chỉ clear cache khi login, không phải khi refresh token
        if (event === 'SIGNED_IN') {
          const justLoggedIn = sessionStorage.getItem('bofin_just_logged_in')
          if (justLoggedIn === 'true') {
            // Clear flag trước để tránh clear cache nhiều lần
            sessionStorage.removeItem('bofin_just_logged_in')

            // Clear toàn bộ cache và reload dữ liệu mới khi đăng nhập
            // KHÔNG clear user cache và KHÔNG reset client để tránh lỗi "Bạn cần đăng nhập"
            try {
              const { clearAllCacheAndState } = await import('../utils/reloadData')
              await clearAllCacheAndState(false, false) // false, false = không clear user cache, không reset client


              // Đảm bảo user cache vẫn còn sau khi clear cache
              // (vì clearAllCacheAndState không clear user cache)
              if (session?.user) {
                const { setCachedUser } = await import('../lib/userCache')
                setCachedUser(session.user)
              }

              console.log('✅ Cache cleared after login - user cache preserved and reloading fresh data')
            } catch (e) {
              console.warn('Error clearing cache on login:', e)
              // Không block auth flow nếu clear cache thất bại
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setGlobalAuth({
          user: null,
          session: null,
          loading: false,
          initialized: true,
        })
        // Clear all caches on sign out
        try {
          const { clearUserCache } = await import('../lib/userCache')
          const { queryClient } = await import('../lib/react-query')

          clearUserCache()
          queryClient.clear()
        } catch (e) {
          console.warn('Error clearing cache on sign out:', e)
        }
        navigate('/login', { replace: true })
      } else if (event === 'USER_UPDATED') {
        setAuthState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          session,
        }))
      }
    })

    return () => {
      _listeners = _listeners.filter(l => l !== listener)
      subscription.unsubscribe()
    }
  }, [navigate])

  return authState
}


