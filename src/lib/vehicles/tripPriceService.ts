import { getSupabaseClient } from '../supabaseClient'
import { getCachedUser } from '../userCache'

const STORAGE_KEY_PREFIX = 'trip_price_per_km_'

/**
 * Get the trip price per km from database or fallback to localStorage
 */
export async function getTripPricePerKm(vehicleId: string): Promise<number> {
    const defaultPrice = 0
    try {
        const supabase = getSupabaseClient()
        const user = await getCachedUser()

        if (!user) {
            // Fallback to local storage if not logged in
            const localPrice = localStorage.getItem(`${STORAGE_KEY_PREFIX}${vehicleId}`)
            return localPrice ? Number(localPrice) : defaultPrice
        }

        // We attempt to use the fuel_price_settings table as a key-value store 
        // using a special fuel_type 'trip_price_[vehicleId]'
        const { data, error } = await supabase
            .from('fuel_price_settings')
            .select('price')
            .eq('user_id', user.id)
            .eq('fuel_type', `trip_price_${vehicleId}`)
            .maybeSingle()

        if (error || !data) {
            // Fallback to localStorage
            const localPrice = localStorage.getItem(`${STORAGE_KEY_PREFIX}${vehicleId}`)
            return localPrice ? Number(localPrice) : defaultPrice
        }

        return data.price
    } catch (error) {
        console.warn('Error reading trip price from DB, falling back to local storage', error)
        const localPrice = localStorage.getItem(`${STORAGE_KEY_PREFIX}${vehicleId}`)
        return localPrice ? Number(localPrice) : defaultPrice
    }
}

/**
 * Update the trip price per km in database and sync to localStorage
 */
export async function updateTripPricePerKm(
    vehicleId: string,
    price: number
): Promise<void> {
    // Always sync to local storage immediately
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${vehicleId}`, price.toString())

    try {
        const supabase = getSupabaseClient()
        const user = await getCachedUser()

        if (!user) {
            return // Skip DB save if not logged in
        }

        const { error } = await supabase
            .from('fuel_price_settings')
            .upsert(
                {
                    user_id: user.id,
                    fuel_type: `trip_price_${vehicleId}`, // Abuse fuel_type constraint if it is loose text
                    price: price,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: 'user_id,fuel_type',
                }
            )

        if (error) {
            // Might fail if DB strictly enforces an ENUM. In that case we rely on localStorage.
            console.warn('Failed to save trip price to DB, relying on localStorage:', error)
        }
    } catch (error) {
        console.warn('Error saving trip price to DB:', error)
    }
}
