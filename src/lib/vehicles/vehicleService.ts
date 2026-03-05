import { getSupabaseClient } from '../supabaseClient'
import { applyArchiveFilter } from '../../store/useArchiveStore'

// ============================================
// TYPES & INTERFACES
// ============================================

export interface VehicleRecord {
    id: string
    user_id: string
    license_plate: string
    model: string
    vehicle_type: 'motorcycle' | 'car'
    brand?: string
    year?: number
    color?: string
    current_odometer: number
    fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid'
    insurance_expiry_date?: string
    inspection_expiry_date?: string
    next_maintenance_km?: number
    next_maintenance_date?: string
    maintenance_interval_km?: number      // Bổ sung chu kỳ km
    maintenance_interval_months?: number  // Bổ sung chu kỳ tháng
    is_active: boolean
    is_default?: boolean
    image_url?: string
    created_at: string
    updated_at: string
}

export interface TripRecord {
    id: string
    vehicle_id: string
    user_id: string
    trip_date: string
    trip_time?: string
    trip_type: 'work' | 'business' | 'leisure' | 'hometown' | 'service' | 'shopping' | 'family' | 'roadtrip' | 'repair' | 'other' | string
    start_km: number
    end_km: number
    distance_km?: number
    start_location?: string
    end_location?: string
    notes?: string
    created_at: string
    updated_at: string
}

export interface FuelLogRecord {
    id: string
    vehicle_id: string
    user_id: string
    refuel_date: string
    refuel_time?: string
    odometer_at_refuel: number
    fuel_type: 'petrol_a95' | 'petrol_e5' | 'diesel' | 'electric'
    fuel_category?: 'fuel' | 'electric' // NEW: Category for filtering
    liters?: number
    price_per_liter?: number
    unit_price?: number // NEW: Price per unit (VND/lít or VND/kWh)
    total_cost?: number // NEW: Auto-calculated total
    kwh?: number
    charge_duration_minutes?: number
    battery_start_percent?: number
    battery_end_percent?: number
    total_amount: number // Backward compatibility
    station_name?: string
    location?: string
    receipt_image_url?: string // NEW: Cloudinary URL for receipt image
    notes?: string
    created_at: string
    updated_at: string
}

export interface MaintenanceRecord {
    id: string
    vehicle_id: string
    user_id: string
    maintenance_date: string
    odometer: number
    maintenance_type: 'scheduled' | 'repair'
    service_items: string[]
    description?: string
    service_provider?: string
    parts_cost: number
    labor_cost: number
    total_cost?: number
    invoice_images?: string[]
    next_reminder_km?: number
    next_reminder_date?: string
    notes?: string
    created_at: string
    updated_at: string
}

export interface ExpenseRecord {
    id: string
    vehicle_id: string
    user_id: string
    expense_date: string
    expense_type: 'toll' | 'parking' | 'insurance' | 'inspection' | 'wash' | 'fine' | 'other'
    amount: number
    description?: string
    location?: string
    receipt_images?: string[]
    notes?: string
    created_at: string
    updated_at: string
}

// ============================================
// VEHICLE CRUD
// ============================================

export async function fetchVehicles(activeOnly = true): Promise<VehicleRecord[]> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    let query = supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)

    if (activeOnly) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

export async function getVehicleById(id: string): Promise<VehicleRecord> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    if (!data) throw new Error('Vehicle not found')
    return data
}

export async function createVehicle(vehicle: Omit<VehicleRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<VehicleRecord> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    const payload = { ...vehicle, user_id: user.id }
    console.log('Creating vehicle with payload:', payload)

    const { data, error } = await supabase
        .from('vehicles')
        .insert(payload)
        .select()
        .single()

    if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message || 'Failed to create vehicle')
    }
    return data
}

export async function updateVehicle(id: string, updates: Partial<VehicleRecord>): Promise<VehicleRecord> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteVehicle(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

    if (error) throw error
    if (error) throw error
}

export async function setVehicleAsDefault(id: string, isDefault: boolean): Promise<void> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    // Nếu đặt làm mặc định
    if (isDefault) {
        // 1. Reset tất cả xe của user về false
        await supabase
            .from('vehicles')
            .update({ is_default: false })
            .eq('user_id', user.id)

        // 2. Set xe được chọn thành true
        const { error } = await supabase
            .from('vehicles')
            .update({ is_default: true })
            .eq('id', id)

        if (error) throw error
    } else {
        // Nếu bỏ mặc định, chỉ cần set xe đó về false
        const { error } = await supabase
            .from('vehicles')
            .update({ is_default: false })
            .eq('id', id)

        if (error) throw error
    }
}

// ============================================
// TRIPS CRUD
// ============================================

export async function fetchTrips(vehicleId?: string): Promise<TripRecord[]> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    let query = supabase
        .from('vehicle_trips')
        .select('*')
        .eq('user_id', user.id)

    query = applyArchiveFilter(query, 'trip_date')

    if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId)
    }

    const { data, error } = await query.order('trip_date', { ascending: false })

    if (error) throw error
    return data || []
}

export async function createTrip(trip: Omit<TripRecord, 'id' | 'user_id' | 'distance_km' | 'created_at' | 'updated_at'>): Promise<TripRecord> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('vehicle_trips')
        .insert({ ...trip, user_id: user.id })
        .select()
        .single()

    if (error) throw error

    // Update vehicle odometer
    if (data) {
        await updateVehicle(trip.vehicle_id, { current_odometer: trip.end_km })
    }

    return data
}

export async function updateTrip(id: string, updates: Partial<TripRecord>): Promise<TripRecord> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('vehicle_trips')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteTrip(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from('vehicle_trips')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================
// FUEL LOGS CRUD
// ============================================

export async function fetchFuelLogs(vehicleId?: string): Promise<FuelLogRecord[]> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    let query = supabase
        .from('vehicle_fuel_logs')
        .select('*')
        .eq('user_id', user.id)

    query = applyArchiveFilter(query, 'refuel_date')

    if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId)
    }

    const { data, error } = await query.order('refuel_date', { ascending: false })

    if (error) throw error
    return data || []
}

export async function createFuelLog(fuelLog: Omit<FuelLogRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FuelLogRecord> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('vehicle_fuel_logs')
        .insert({ ...fuelLog, user_id: user.id })
        .select()
        .single()

    if (error) throw error

    // Update vehicle odometer
    if (data) {
        await updateVehicle(fuelLog.vehicle_id, { current_odometer: fuelLog.odometer_at_refuel })
    }

    return data
}

export async function updateFuelLog(id: string, updates: Partial<FuelLogRecord>): Promise<FuelLogRecord> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('vehicle_fuel_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteFuelLog(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from('vehicle_fuel_logs')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================
// MAINTENANCE CRUD
// ============================================

export async function fetchMaintenance(vehicleId?: string): Promise<MaintenanceRecord[]> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    let query = supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('user_id', user.id)

    query = applyArchiveFilter(query, 'maintenance_date')

    if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId)
    }

    const { data, error } = await query.order('maintenance_date', { ascending: false })

    if (error) throw error
    return data || []
}

export async function createMaintenance(maintenance: Omit<MaintenanceRecord, 'id' | 'user_id' | 'total_cost' | 'created_at' | 'updated_at'>): Promise<MaintenanceRecord> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('vehicle_maintenance')
        .insert({ ...maintenance, user_id: user.id })
        .select()
        .single()

    if (error) throw error

    // Update vehicle with next maintenance reminders
    if (data && (maintenance.next_reminder_km || maintenance.next_reminder_date)) {
        await updateVehicle(maintenance.vehicle_id, {
            next_maintenance_km: maintenance.next_reminder_km,
            next_maintenance_date: maintenance.next_reminder_date,
            current_odometer: maintenance.odometer,
        })
    }

    return data
}

export async function updateMaintenance(id: string, updates: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('vehicle_maintenance')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteMaintenance(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from('vehicle_maintenance')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================
// EXPENSES CRUD
// ============================================

export async function fetchExpenses(vehicleId?: string): Promise<ExpenseRecord[]> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    let query = supabase
        .from('vehicle_expenses')
        .select('*')
        .eq('user_id', user.id)

    query = applyArchiveFilter(query, 'expense_date')

    if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId)
    }

    const { data, error } = await query.order('expense_date', { ascending: false })

    if (error) throw error
    return data || []
}

export async function createExpense(expense: Omit<ExpenseRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ExpenseRecord> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('vehicle_expenses')
        .insert({ ...expense, user_id: user.id })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function updateExpense(id: string, updates: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('vehicle_expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteExpense(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from('vehicle_expenses')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================
// ANALYTICS & REPORTS
// ============================================

export interface VehicleStats {
    totalTrips: number
    totalDistance: number
    totalFuelCost: number
    totalMaintenanceCost: number
    totalOtherExpenses: number
    averageFuelConsumption: number // L/100km or kWh/100km
    costPerKm: number
}

export async function getVehicleStats(vehicleId: string, startDate?: string, endDate?: string): Promise<VehicleStats> {
    const trips = await fetchTrips(vehicleId)
    const fuelLogs = await fetchFuelLogs(vehicleId)
    const maintenance = await fetchMaintenance(vehicleId)
    const expenses = await fetchExpenses(vehicleId)

    // Filter by date if provided
    const filterByDate = (items: any[], dateField: string) => {
        if (!startDate && !endDate) return items
        return items.filter(item => {
            const itemDate = item[dateField]
            if (startDate && itemDate < startDate) return false
            if (endDate && itemDate > endDate) return false
            return true
        })
    }

    const filteredTrips = filterByDate(trips, 'trip_date')
    const filteredFuel = filterByDate(fuelLogs, 'refuel_date')
    const filteredMaintenance = filterByDate(maintenance, 'maintenance_date')
    const filteredExpenses = filterByDate(expenses, 'expense_date')

    const totalDistance = filteredTrips.reduce((sum, trip) => sum + (trip.distance_km || 0), 0)
    const totalFuelCost = filteredFuel.reduce((sum, log) => sum + parseFloat(log.total_amount.toString()), 0)
    const totalMaintenanceCost = filteredMaintenance.reduce((sum, m) => sum + parseFloat((m.total_cost || 0).toString()), 0)
    const totalOtherExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)

    // Calculate average fuel consumption
    const totalLiters = filteredFuel.reduce((sum, log) => sum + (log.liters || 0), 0)
    const totalKwh = filteredFuel.reduce((sum, log) => sum + (log.kwh || 0), 0)
    const averageFuelConsumption = totalDistance > 0
        ? (totalLiters > 0 ? (totalLiters / totalDistance) * 100 : (totalKwh / totalDistance) * 100)
        : 0

    const totalCost = totalFuelCost + totalMaintenanceCost + totalOtherExpenses
    const costPerKm = totalDistance > 0 ? totalCost / totalDistance : 0

    return {
        totalTrips: filteredTrips.length,
        totalDistance,
        totalFuelCost,
        totalMaintenanceCost,
        totalOtherExpenses,
        averageFuelConsumption,
        costPerKm,
    }
}

// Check for upcoming alerts
export interface VehicleAlert {
    type: 'inspection' | 'insurance' | 'maintenance_km' | 'maintenance_date'
    message: string
    daysUntilDue?: number
    kmUntilDue?: number
    isOverdue: boolean
}

export async function getVehicleAlerts(vehicleId: string): Promise<VehicleAlert[]> {
    const vehicle = await getVehicleById(vehicleId)
    const alerts: VehicleAlert[] = []
    const today = new Date()
    const DAYS_THRESHOLD = 30 // Alert 30 days before

    // Check inspection
    if (vehicle.inspection_expiry_date) {
        const expiryDate = new Date(vehicle.inspection_expiry_date)
        const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil < 0) {
            alerts.push({
                type: 'inspection',
                message: `Xe đã quá hạn đăng kiểm ${Math.abs(daysUntil)} ngày`,
                daysUntilDue: daysUntil,
                isOverdue: true,
            })
        } else if (daysUntil <= DAYS_THRESHOLD) {
            alerts.push({
                type: 'inspection',
                message: `Sắp đến hạn đăng kiểm (còn ${daysUntil} ngày)`,
                daysUntilDue: daysUntil,
                isOverdue: false,
            })
        }
    }

    // Check insurance
    if (vehicle.insurance_expiry_date) {
        const expiryDate = new Date(vehicle.insurance_expiry_date)
        const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil < 0) {
            alerts.push({
                type: 'insurance',
                message: `Xe đã hết hạn bảo hiểm ${Math.abs(daysUntil)} ngày`,
                daysUntilDue: daysUntil,
                isOverdue: true,
            })
        } else if (daysUntil <= DAYS_THRESHOLD) {
            alerts.push({
                type: 'insurance',
                message: `Sắp hết hạn bảo hiểm (còn ${daysUntil} ngày)`,
                daysUntilDue: daysUntil,
                isOverdue: false,
            })
        }
    }

    // Check maintenance by KM
    if (vehicle.next_maintenance_km) {
        const kmUntil = vehicle.next_maintenance_km - vehicle.current_odometer

        if (kmUntil < 0) {
            alerts.push({
                type: 'maintenance_km',
                message: `Xe đã quá hạn bảo dưỡng ${Math.abs(kmUntil)} km`,
                kmUntilDue: kmUntil,
                isOverdue: true,
            })
        } else if (kmUntil <= 500) {
            alerts.push({
                type: 'maintenance_km',
                message: `Sắp đến kỳ bảo dưỡng (còn ${kmUntil} km)`,
                kmUntilDue: kmUntil,
                isOverdue: false,
            })
        }
    }

    // Check maintenance by date
    if (vehicle.next_maintenance_date) {
        const maintenanceDate = new Date(vehicle.next_maintenance_date)
        const daysUntil = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil < 0) {
            alerts.push({
                type: 'maintenance_date',
                message: `Xe đã quá hạn bảo dưỡng ${Math.abs(daysUntil)} ngày`,
                daysUntilDue: daysUntil,
                isOverdue: true,
            })
        } else if (daysUntil <= DAYS_THRESHOLD) {
            alerts.push({
                type: 'maintenance_date',
                message: `Sắp đến kỳ bảo dưỡng (còn ${daysUntil} ngày)`,
                daysUntilDue: daysUntil,
                isOverdue: false,
            })
        }
    }

    return alerts
}

// ============================================
// MONTHLY STATS FOR CHARTS
// ============================================

export interface MonthlyStatPoint {
    month: string       // "Th1", "Th2", ...
    yearMonth: string   // "2025-01" for sorting
    fuel: number
    maintenance: number
    expenses: number
    total: number
    distance: number
    trips: number
}

export async function getMonthlyStats(vehicleId: string, months = 6): Promise<MonthlyStatPoint[]> {
    const [trips, fuelLogs, maintenance, expenses] = await Promise.all([
        fetchTrips(vehicleId),
        fetchFuelLogs(vehicleId),
        fetchMaintenance(vehicleId),
        fetchExpenses(vehicleId),
    ])

    const points: MonthlyStatPoint[] = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = d.getFullYear()
        const month = d.getMonth() // 0-indexed
        const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`

        const inMonth = (dateStr: string) => {
            const dd = new Date(dateStr)
            return dd.getFullYear() === year && dd.getMonth() === month
        }

        const fuel = fuelLogs.filter(l => inMonth(l.refuel_date)).reduce((s, l) => s + (l.total_amount || 0), 0)
        const maint = maintenance.filter(m => inMonth(m.maintenance_date)).reduce((s, m) => s + (m.total_cost || 0), 0)
        const exp = expenses.filter(e => inMonth(e.expense_date)).reduce((s, e) => s + e.amount, 0)
        const dist = trips.filter(t => inMonth(t.trip_date)).reduce((s, t) => s + (t.distance_km || 0), 0)
        const tripsCount = trips.filter(t => inMonth(t.trip_date)).length

        points.push({
            month: `Th${month + 1}`,
            yearMonth,
            fuel,
            maintenance: maint,
            expenses: exp,
            total: fuel + maint + exp,
            distance: dist,
            trips: tripsCount,
        })
    }

    return points
}

