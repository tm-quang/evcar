import { useEffect, useState } from 'react'
import { getPublicSettings, getSettingsByKeys } from '../lib/settingsService'

/**
 * Hook to load and use system settings
 */
export const useSystemSettings = (keys?: string[]) => {
  const [settings, setSettings] = useState<Record<string, string | null>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      try {
        if (keys && keys.length > 0) {
          // Load specific settings
          const settingsData = await getSettingsByKeys(keys)
          const result: Record<string, string | null> = {}
          Object.values(settingsData).forEach((setting) => {
            result[setting.setting_key] = setting.setting_value
          })
          setSettings(result)
        } else {
          // Load all public settings
          const publicSettings = await getPublicSettings()
          setSettings(publicSettings)
        }
      } catch (error) {
        console.error('Error loading system settings:', error)
        // Fallback to empty settings
        setSettings({})
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [keys?.join(',')])

  return { settings, isLoading }
}

/**
 * Hook to get a single setting value
 */
export const useSystemSetting = (key: string, defaultValue: string | null = null) => {
  const { settings, isLoading } = useSystemSettings([key])
  return { value: settings[key] || defaultValue, isLoading }
}


