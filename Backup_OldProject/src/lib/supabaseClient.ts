import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

/**
 * Validate Supabase URL format
 */
const validateSupabaseUrl = (url: string): void => {
  try {
    const urlObj = new URL(url)
    
    // Check if URL is valid HTTPS
    if (urlObj.protocol !== 'https:') {
      throw new Error('Supabase URL must use HTTPS protocol')
    }
    
    // Check if it's a Supabase domain
    if (!urlObj.hostname.includes('.supabase.co') && !urlObj.hostname.includes('supabase')) {
      console.warn('Supabase URL does not appear to be a valid Supabase domain:', urlObj.hostname)
    }
    
    // Check for common URL corruption patterns
    if (urlObj.hostname.endsWith(':1') || url.includes('/auth/v1/user:1')) {
      throw new Error('Supabase URL appears to be corrupted (contains :1 suffix)')
    }
    
    if (urlObj.hostname.includes('_e.co') && !urlObj.hostname.includes('supabase')) {
      throw new Error('Supabase URL appears to be corrupted or malformed')
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid Supabase URL format: ${url}. URL must be a valid HTTPS URL.`)
    }
    throw error
  }
}

/**
 * Reset Supabase client (useful for debugging or when URL changes)
 */
export const resetSupabaseClient = (): void => {
  supabase = null
}

export const getSupabaseClient = (): SupabaseClient => {
  if (supabase) {
    return supabase
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  // Validate URL format
  try {
    validateSupabaseUrl(supabaseUrl)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Invalid Supabase URL'
    console.error('Supabase URL validation failed:', errorMsg)
    console.error('Current URL value:', supabaseUrl)
    console.error('Please check your .env file and ensure VITE_SUPABASE_URL is set correctly.')
    throw new Error(errorMsg)
  }

  // Log URL (masked for security)
  const maskedUrl = supabaseUrl.replace(/https:\/\/([^.]+)\.supabase\.co/, 'https://***.supabase.co')
  console.log('Initializing Supabase client with URL:', maskedUrl)

  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'bofin-auth-token',
        // Không set flowType để Supabase tự chọn flow phù hợp
        // Với signInWithPassword, Supabase sẽ tự động chọn flow tốt nhất
      },
      global: {
        headers: {
          'x-client-info': 'bofin-app@1.0.0',
        },
      },
    })
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw new Error(
      `Failed to initialize Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  return supabase
}


