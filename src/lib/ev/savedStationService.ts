import { getSupabaseClient } from '../supabaseClient'
import { getCachedUser } from '../userCache'

export type SavedStation = {
    id: string
    user_id: string
    name: string
    address: string
    lat?: number
    lng?: number
    created_at: string
}

/**
 * Fetch all saved stations for the current user
 */
export async function fetchSavedStations(): Promise<SavedStation[]> {
    try {
        const supabase = getSupabaseClient()
        const user = await getCachedUser()

        if (!user) return []

        const { data, error } = await supabase
            .from('saved_charging_stations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching saved stations:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Error in fetchSavedStations:', error)
        return []
    }
}

/**
 * Create a new saved station
 */
export async function createSavedStation(station: Omit<SavedStation, 'id' | 'user_id' | 'created_at'>): Promise<SavedStation | null> {
    try {
        const supabase = getSupabaseClient()
        const user = await getCachedUser()

        if (!user) throw new Error('User not authenticated')

        const { data, error } = await supabase
            .from('saved_charging_stations')
            .insert({
                ...station,
                user_id: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating saved station:', error)
            throw error
        }

        return data
    } catch (error) {
        console.error('Error in createSavedStation:', error)
        return null
    }
}

/**
 * Delete a saved station
 */
export async function deleteSavedStation(id: string): Promise<void> {
    try {
        const supabase = getSupabaseClient()
        const { error } = await supabase
            .from('saved_charging_stations')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting saved station:', error)
            throw error
        }
    } catch (error) {
        console.error('Error in deleteSavedStation:', error)
    }
}
