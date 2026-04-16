import { startTransition, useCallback, useEffect, useState } from 'react'

import { getSupabaseClient } from '../lib/supabaseClient'

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error'

type HealthState = {
  status: ConnectionState
  message: string
}

const initialState: HealthState = {
  status: 'idle',
  message: 'Chưa kiểm tra kết nối Supabase.',
}

export const useSupabaseHealth = () => {
  const [state, setState] = useState<HealthState>(initialState)

  const checkHealth = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()

      setState({
        status: 'connecting',
        message: 'Đang kiểm tra kết nối Supabase...',
      })

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setState({
          status: 'error',
          message: error.message,
        })
        return
      }

      setState({
        status: 'connected',
        message: data.session
          ? `Đang có phiên đăng nhập của ${data.session.user.email ?? 'người dùng Supabase'}.`
          : 'Mọi thứ đã sẵn sàng chờ bạn khám phá.',
      })
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Thiếu cấu hình Supabase. Kiểm tra biến môi trường VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.',
      })
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      void checkHealth()
    })
  }, [checkHealth])

  return {
    ...state,
    refresh: checkHealth,
  }
}


