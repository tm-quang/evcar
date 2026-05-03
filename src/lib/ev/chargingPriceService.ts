import { getSupabaseClient } from '../supabaseClient'
import { getCachedUser } from '../userCache'

export type ChargingType = 'petrol_a95' | 'petrol_e5' | 'diesel' | 'electric'

export type ChargingPriceSetting = {
    id: string
    user_id: string
    charging_type: ChargingType
    price: number
    created_at: string
    updated_at: string
}

// Default prices when no settings found
const DEFAULT_PRICES: Record<ChargingType, number> = {
    petrol_a95: 25000,
    petrol_e5: 23000,
    diesel: 21000,
    electric: 3858, // Default EV price
}

/**
 * Get charging price for a specific type
 * Returns user's saved price or default price
 */
export async function getChargingPrice(chargingType: ChargingType): Promise<number> {
    try {
        const supabase = getSupabaseClient()
        const user = await getCachedUser()

        if (!user) {
            return DEFAULT_PRICES[chargingType]
        }

        const { data, error } = await supabase
            .from('charging_price_settings')
            .select('price')
            .eq('user_id', user.id)
            .eq('charging_type', chargingType)
            .maybeSingle() // Use maybeSingle instead of single to avoid 406

        if (error) {
            console.error('Error fetching charging price:', error)
            return DEFAULT_PRICES[chargingType]
        }

        // Return saved price or default
        return data?.price || DEFAULT_PRICES[chargingType]
    } catch (error) {
        console.error('Error getting charging price:', error)
        return DEFAULT_PRICES[chargingType]
    }
}

/**
 * Get all charging prices for current user
 * Returns object with all types and their prices
 */
export async function getAllChargingPrices(): Promise<Record<ChargingType, number>> {
    try {
        const supabase = getSupabaseClient()
        const user = await getCachedUser()

        if (!user) {
            return DEFAULT_PRICES
        }

        const { data, error } = await supabase
            .from('charging_price_settings')
            .select('charging_type, price')
            .eq('user_id', user.id)

        if (error || !data) {
            return DEFAULT_PRICES
        }

        // Merge with defaults (in case some types are missing)
        const prices = { ...DEFAULT_PRICES }
        data.forEach((item) => {
            prices[item.charging_type as ChargingType] = item.price
        })

        return prices
    } catch (error) {
        console.error('Error getting all charging prices:', error)
        return DEFAULT_PRICES
    }
}

/**
 * Update charging price for a specific type
 * Uses UPSERT to insert or update
 */
export async function updateChargingPrice(
    chargingType: ChargingType,
    price: number
): Promise<void> {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
        throw new Error('Bạn cần đăng nhập để cập nhật giá.')
    }

    if (price <= 0) {
        throw new Error('Giá phải lớn hơn 0.')
    }

    const { error } = await supabase
        .from('charging_price_settings')
        .upsert(
            {
                user_id: user.id,
                charging_type: chargingType,
                price: price,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: 'user_id,charging_type',
            }
        )

    if (error) {
        console.error('Error updating charging price:', error)
        throw new Error('Không thể cập nhật giá. Vui lòng thử lại.')
    }
}

/**
 * Update multiple charging prices at once
 */
export async function updateAllChargingPrices(
    prices: Partial<Record<ChargingType, number>>
): Promise<void> {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
        throw new Error('Bạn cần đăng nhập để cập nhật giá.')
    }

    // Validate all prices
    Object.entries(prices).forEach(([type, price]) => {
        if (price !== undefined && price <= 0) {
            throw new Error(`Giá ${type} phải lớn hơn 0.`)
        }
    })

    // Create upsert records
    const records = Object.entries(prices)
        .filter(([, price]) => price !== undefined)
        .map(([chargingType, price]) => ({
            user_id: user.id,
            charging_type: chargingType as ChargingType,
            price: price!,
            updated_at: new Date().toISOString(),
        }))

    if (records.length === 0) {
        return
    }

    const { error } = await supabase
        .from('charging_price_settings')
        .upsert(records, {
            onConflict: 'user_id,charging_type',
        })

    if (error) {
        console.error('Error updating charging prices:', error)
        throw new Error('Không thể cập nhật giá. Vui lòng thử lại.')
    }
}

/**
 * Get default price for a charging type
 */
export function getDefaultChargingPrice(chargingType: ChargingType): number {
    return DEFAULT_PRICES[chargingType]
}

/**
 * Initialize default prices for a new user
 */
export async function initializeDefaultChargingPrices(): Promise<void> {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
        throw new Error('Bạn cần đăng nhập.')
    }

    const records = [
        {
            user_id: user.id,
            charging_type: 'electric' as ChargingType,
            price: DEFAULT_PRICES.electric,
        }
    ]

    const { error } = await supabase
        .from('charging_price_settings')
        .upsert(records, {
            onConflict: 'user_id,charging_type',
            ignoreDuplicates: true,
        })

    if (error) {
        console.error('Error initializing default prices:', error)
        throw new Error('Không thể khởi tạo giá mặc định.')
    }
}

/**
 * Get electric default discount settings from Database
 */
export async function getElectricDiscountSettings(): Promise<{ mode: 'pct' | 'vnd'; value: string }> {
    try {
        const supabase = getSupabaseClient()
        const user = await getCachedUser()

        if (!user) {
            return { mode: 'vnd', value: '' }
        }

        const { data, error } = await supabase
            .from('charging_price_settings')
            .select('discount_mode, discount_value')
            .eq('user_id', user.id)
            .eq('charging_type', 'electric')
            .maybeSingle()

        if (error || !data) {
            // Fallback to localStorage for migration or return default
            const local = localStorage.getItem('BOFIN_ELECTRIC_DISCOUNT_PREFS')
            return local ? JSON.parse(local) : { mode: 'vnd', value: '' }
        }

        return {
            mode: (data.discount_mode as 'pct' | 'vnd') || 'vnd',
            value: data.discount_value || ''
        }
    } catch (error) {
        console.error('Error getting discount settings:', error)
        return { mode: 'vnd', value: '' }
    }
}

/**
 * Set electric default discount settings in Database
 */
export async function setElectricDiscountSettings(prefs: { mode: 'pct' | 'vnd'; value: string }): Promise<void> {
    try {
        const supabase = getSupabaseClient()
        const user = await getCachedUser()

        if (!user) return

        // Also update the database record for electric fuel type
        await supabase
            .from('charging_price_settings')
            .upsert({
                user_id: user.id,
                charging_type: 'electric',
                discount_mode: prefs.mode,
                discount_value: prefs.value,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,charging_type'
            })

        // Keep localStorage as temporary backup for current session
        localStorage.setItem('BOFIN_ELECTRIC_DISCOUNT_PREFS', JSON.stringify(prefs))
    } catch (error) {
        console.error('Error saving discount settings:', error)
    }
}

