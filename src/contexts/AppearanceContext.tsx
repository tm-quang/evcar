import React, { createContext, useContext, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'
import { getCachedUser } from '../lib/userCache'

export type AppearanceSettings = {
  home_bg_color: string
  accent_color: string
  font_family: string
}

const defaultSettings: AppearanceSettings = {
  home_bg_color: '#F7F9FC',
  accent_color: '#2563eb',
  font_family: "'Roboto', sans-serif",
}

interface AppearanceContextType {
  settings: AppearanceSettings
  updateSettings: (newSettings: Partial<AppearanceSettings>) => Promise<void>
  resetSettings: () => Promise<void>
  isLoading: boolean
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (value: boolean) => void
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined)

/**
 * Apply dark mode CSS variables to :root
 */
function applyDarkModeVars(dark: boolean) {
  const root = document.documentElement
  if (dark) {
    root.classList.add('dark')
    root.style.setProperty('--app-home-bg', '#0F172A')
    root.style.setProperty('--app-card-bg', '#1E293B')
    root.style.setProperty('--app-card-border', '#334155')
    root.style.setProperty('--app-text-primary', '#F1F5F9')
    root.style.setProperty('--app-text-secondary', '#94A3B8')
    root.style.setProperty('--app-text-muted', '#64748B')
    root.style.setProperty('--app-input-bg', '#1E293B')
    root.style.setProperty('--app-input-border', '#334155')
    root.style.setProperty('--app-separator', '#1E293B')
    root.style.setProperty('--app-overlay', 'rgba(0,0,0,0.7)')
    root.style.setProperty('color-scheme', 'dark')
  } else {
    root.classList.remove('dark')
    root.style.setProperty('--app-card-bg', '#FFFFFF')
    root.style.setProperty('--app-card-border', '#E2E8F0')
    root.style.setProperty('--app-text-primary', '#0F172A')
    root.style.setProperty('--app-text-secondary', '#64748B')
    root.style.setProperty('--app-text-muted', '#94A3B8')
    root.style.setProperty('--app-input-bg', '#FFFFFF')
    root.style.setProperty('--app-input-border', '#CBD5E1')
    root.style.setProperty('--app-separator', '#F1F5F9')
    root.style.setProperty('--app-overlay', 'rgba(0,0,0,0.5)')
    root.style.setProperty('color-scheme', 'light')
  }
}

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('evngo-dark-mode') === 'true'
    } catch {
      return false
    }
  })

  const TABLE_NAME = 'user_appearance_settings'

  // Apply dark mode class on mount and whenever it changes
  useEffect(() => {
    applyDarkModeVars(isDarkMode)
    try {
      localStorage.setItem('evngo-dark-mode', String(isDarkMode))
    } catch { /* ignore */ }
  }, [isDarkMode])

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      try {
        const user = await getCachedUser()
        if (!user) {
          setSettings(defaultSettings)
          setIsLoading(false)
          return
        }

        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('settings')
          .eq('user_id', user.id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('No appearance settings found, using defaults.')
          } else {
            console.error('Error loading appearance settings:', error)
          }
        } else if (data?.settings) {
          setSettings({ ...defaultSettings, ...data.settings })
        }
      } catch (err) {
        console.error('Failed to load appearance settings:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    // In dark mode, override the home bg to dark regardless of user color choice
    if (isDarkMode) {
      root.style.setProperty('--app-home-bg', '#0F172A')
    } else {
      root.style.setProperty('--app-home-bg', settings.home_bg_color)
    }
    root.style.setProperty('--app-accent', settings.accent_color)
    root.style.setProperty('--app-font', settings.font_family)
    document.body.style.fontFamily = settings.font_family
  }, [settings, isDarkMode])

  const updateSettings = async (newSettings: Partial<AppearanceSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)

    try {
      const user = await getCachedUser()
      if (!user) return

      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert({
          user_id: user.id,
          settings: updated,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
    } catch (err) {
      console.error('Failed to save appearance settings:', err)
    }
  }

  const resetSettings = async () => {
    await updateSettings(defaultSettings)
  }

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value)
  }

  return (
    <AppearanceContext.Provider value={{ settings, updateSettings, resetSettings, isLoading, isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export const useAppearance = () => {
  const context = useContext(AppearanceContext)
  if (context === undefined) {
    throw new Error('useAppearance must be used within an AppearanceProvider')
  }
  return context
}
