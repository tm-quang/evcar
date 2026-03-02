import { useState } from 'react'
import { MapPin, Navigation, Loader2, ExternalLink } from 'lucide-react'
import { reverseGeocode } from '../../utils/geocoding'

export type SimpleLocationData = {
    address: string
    lat: number
    lng: number
}

type SimpleLocationInputProps = {
    label: string
    value: string
    locationData?: SimpleLocationData | null
    onChange: (address: string, locationData?: SimpleLocationData) => void
    placeholder?: string
    required?: boolean
}

export function SimpleLocationInput({
    label,
    value,
    locationData,
    onChange,
    placeholder = 'Nhập địa điểm hoặc lấy vị trí hiện tại',
    required = false,
}: SimpleLocationInputProps) {
    const [isLoadingLocation, setIsLoadingLocation] = useState(false)

    // Get current location using GPS and reverse geocode
    const handleGetCurrentLocation = async () => {
        if (!navigator.geolocation) {
            alert('Trình duyệt không hỗ trợ định vị GPS')
            return
        }

        setIsLoadingLocation(true)

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude
                const lng = position.coords.longitude

                try {
                    const addressStr = await reverseGeocode(lat, lng)
                    const address = addressStr && addressStr !== `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                        ? addressStr
                        : `${lat.toFixed(6)}, ${lng.toFixed(6)}`

                    onChange(address, { address, lat, lng })
                } catch (error) {
                    console.error('Error reverse geocoding:', error)
                    const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                    onChange(address, { address, lat, lng })
                } finally {
                    setIsLoadingLocation(false)
                }
            },
            (error) => {
                setIsLoadingLocation(false)
                console.error('Error getting location:', error)

                let errorMessage = 'Không thể lấy vị trí hiện tại.'
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật GPS trong cài đặt trình duyệt.'
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage = 'Không thể xác định vị trí. Vui lòng kiểm tra GPS của thiết bị.'
                } else if (error.code === error.TIMEOUT) {
                    errorMessage = 'Hết thời gian chờ. Vui lòng thử lại.'
                }

                alert(errorMessage)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        )
    }

    // Open location in Google Maps
    const handleOpenInMaps = () => {
        if (locationData) {
            const url = `https://www.google.com/maps?q=${locationData.lat},${locationData.lng}`
            window.open(url, '_blank')
        }
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>

            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />

                <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLoadingLocation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                    title="Lấy vị trí hiện tại"
                >
                    {isLoadingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Navigation className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Location info card */}
            {locationData && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-green-800">Tọa độ GPS:</p>
                            <p className="text-xs text-green-700 font-mono">
                                {locationData.lat.toFixed(6)}, {locationData.lng.toFixed(6)}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenInMaps}
                        className="flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        <ExternalLink className="h-3 w-3" />
                        Mở trong Google Maps
                    </button>
                </div>
            )}
        </div>
    )
}
