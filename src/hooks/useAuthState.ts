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

/**
 * Hook to monitor authentication state and automatically restore session
 * This ensures users stay logged in across page refreshes and browser sessions
 */
export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  })
  const navigate = useNavigate()

  useEffect(() => {
    const supabase = getSupabaseClient()
    let mounted = true

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          // Don't throw, just set to null
        }

        if (mounted) {
          // Populate user cache ngay khi có session (kể cả khi refresh page)
          if (session?.user) {
            const { setCachedUser } = await import('../lib/userCache')
            setCachedUser(session.user)
          }

          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
            initialized: true,
          })

          // If we have a session, try to refresh it to ensure it's valid
          if (session) {
            const { data: { session: refreshedSession }, error: refreshError } =
              await supabase.auth.refreshSession()

            if (refreshError) {
              console.warn('Session refresh failed:', refreshError)
              // If refresh fails, clear the session
              if (mounted) {
                setAuthState({
                  user: null,
                  session: null,
                  loading: false,
                  initialized: true,
                })
              }
            } else if (mounted && refreshedSession) {
              // Populate user cache với refreshed session
              if (refreshedSession?.user) {
                const { setCachedUser } = await import('../lib/userCache')
                setCachedUser(refreshedSession.user)
              }

              setAuthState({
                user: refreshedSession.user,
                session: refreshedSession,
                loading: false,
                initialized: true,
              })
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          })
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state changed:', event, session?.user?.email)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // QUAN TRỌNG: Populate user cache NGAY LẬP TỨC khi SIGNED_IN
        // Điều này đảm bảo user cache có sẵn trước khi các component load data
        if (session?.user) {
          const { setCachedUser } = await import('../lib/userCache')
          setCachedUser(session.user)
          console.log('✅ User cache populated immediately on SIGNED_IN')
        }

        setAuthState({
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
        setAuthState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
        })
        // Clear all caches on sign out
        try {
          const { clearUserCache } = await import('../lib/userCache')
          const { clearPreloadTimestamp } = await import('../lib/dataPreloader')
          const { queryClient } = await import('../lib/react-query')

          clearUserCache()
          await clearPreloadTimestamp()
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
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate])

  return authState
}


