import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getVehicleById, type VehicleRecord } from '../../lib/ev/vehicleService'
import AddEV from './AddEV'
import { useNotification } from '../../contexts/notificationContext.helpers'

export default function EditEV() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { error: showError } = useNotification()
    const [vehicle, setVehicle] = useState<VehicleRecord | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadVehicle = async () => {
            if (!id) {
                navigate('/ev')
                return
            }

            try {
                const data = await getVehicleById(id)
                setVehicle(data)
            } catch (error) {
                console.error('Error loading vehicle:', error)
                showError('Không thể tải thông tin xe')
                navigate('/ev')
            } finally {
                setLoading(false)
            }
        }

        loadVehicle()
    }, [id, navigate, showError])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        )
    }

    if (!vehicle) return null

    return <AddEV vehicle={vehicle} onSuccess={() => navigate('/ev')} />
}

