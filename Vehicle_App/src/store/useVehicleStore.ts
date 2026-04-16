import { create } from 'zustand'

interface VehicleState {
    selectedVehicleId: string | null
    setSelectedVehicleId: (id: string | null) => void
}

export const useVehicleStore = create<VehicleState>((set) => ({
    selectedVehicleId: null,
    setSelectedVehicleId: (id) => set({ selectedVehicleId: id }),
}))

