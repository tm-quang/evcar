import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchVehicles,
    getVehicleStats,
    getVehicleAlerts,
    setVehicleAsDefault,
    fetchTrips,
    fetchFuelLogs,
    fetchMaintenance,
    fetchExpenses,
    getVehicleById
} from './vehicleService'


// Keys for caching
export const vehicleKeys = {
    all: ['vehicles'] as const,
    detail: (id: string) => [...vehicleKeys.all, id] as const,
    stats: (id: string) => [...vehicleKeys.all, id, 'stats'] as const,
    alerts: (id: string) => [...vehicleKeys.all, id, 'alerts'] as const,
    trips: (id: string) => [...vehicleKeys.all, id, 'trips'] as const,
    fuel: (id: string) => [...vehicleKeys.all, id, 'fuel'] as const,
    maintenance: (id: string) => [...vehicleKeys.all, id, 'maintenance'] as const,
    expenses: (id: string) => [...vehicleKeys.all, id, 'expenses'] as const,
}

// 1. Hook for fetching all vehicles
export function useVehicles() {
    return useQuery({
        queryKey: vehicleKeys.all,
        queryFn: () => fetchVehicles(true),
        staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
    })
}

// 2. Hook for fetching specific vehicle
export function useVehicle(id: string | undefined) {
    return useQuery({
        queryKey: vehicleKeys.detail(id || ''),
        queryFn: () => getVehicleById(id!),
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
    })
}

// 3. Hook for vehicle stats
export function useVehicleStats(vehicleId: string | undefined) {
    return useQuery({
        queryKey: vehicleKeys.stats(vehicleId || ''),
        queryFn: () => getVehicleStats(vehicleId!),
        enabled: !!vehicleId,
        staleTime: 1000 * 60, // 1 minute
    })
}

// 4. Hook for vehicle alerts
export function useVehicleAlerts(vehicleId: string | undefined) {
    return useQuery({
        queryKey: vehicleKeys.alerts(vehicleId || ''),
        queryFn: () => getVehicleAlerts(vehicleId!),
        enabled: !!vehicleId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    })
}

// 5. Hooks for sub-features
export function useVehicleTrips(vehicleId: string | undefined) {
    return useQuery({
        queryKey: vehicleKeys.trips(vehicleId || ''),
        queryFn: () => fetchTrips(vehicleId),
        enabled: !!vehicleId,
    })
}

export function useVehicleFuel(vehicleId: string | undefined) {
    return useQuery({
        queryKey: vehicleKeys.fuel(vehicleId || ''),
        queryFn: () => fetchFuelLogs(vehicleId),
        enabled: !!vehicleId,
    })
}

export function useVehicleMaintenance(vehicleId: string | undefined) {
    return useQuery({
        queryKey: vehicleKeys.maintenance(vehicleId || ''),
        queryFn: () => fetchMaintenance(vehicleId),
        enabled: !!vehicleId,
    })
}

export function useVehicleExpenses(vehicleId: string | undefined) {
    return useQuery({
        queryKey: vehicleKeys.expenses(vehicleId || ''),
        queryFn: () => fetchExpenses(vehicleId),
        enabled: !!vehicleId,
    })
}

// 6. Mutation for setting default vehicle
export function useSetDefaultVehicle() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, isDefault }: { id: string; isDefault: boolean }) =>
            setVehicleAsDefault(id, isDefault),
        onSuccess: () => {
            // Invalidate vehicles query to refetch the list
            queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
        },
    })
}

