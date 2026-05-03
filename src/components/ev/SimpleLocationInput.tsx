import { useState, useEffect } from 'react'
import { MapPin, Navigation, Loader2, ExternalLink, X, ChevronRight, Plus, Trash2, Map } from 'lucide-react'
import { reverseGeocode } from '../../utils/geocoding'
import { fetchSavedStations, createSavedStation, deleteSavedStation, type SavedStation } from '../../lib/ev/savedStationService'

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
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoadingLocation, setIsLoadingLocation] = useState(false)
    const [manualInput, setManualInput] = useState('')
    const [savedStations, setSavedStations] = useState<SavedStation[]>([])
    const [loadingSaved, setLoadingSaved] = useState(false)

    // State for creating new saved station
    const [isAddingSaved, setIsAddingSaved] = useState(false)
    const [newSavedName, setNewSavedName] = useState('')
    const [newSavedAddress, setNewSavedAddress] = useState('')

    // Load saved stations from Supabase
    useEffect(() => {
        if (isModalOpen) {
            loadSavedStations()
        }
    }, [isModalOpen])

    useEffect(() => {
        if (isModalOpen) {
            setManualInput(value || '')
            setIsAddingSaved(false)
            setNewSavedName('')
            setNewSavedAddress('')
        }
    }, [isModalOpen, value])

    const loadSavedStations = async () => {
        setLoadingSaved(true)
        try {
            const stations = await fetchSavedStations()
            setSavedStations(stations)
        } catch (e) {
            console.error('Error loading saved stations', e)
        } finally {
            setLoadingSaved(false)
        }
    }

    const handleGetCurrentLocation = async (isForSave: boolean = false) => {
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

                    if (isForSave) {
                        setNewSavedAddress(address)
                    } else {
                        // TỰ ĐỘNG LƯU VÀO CSDL NẾU CHƯA CÓ
                        const isDuplicate = savedStations.some(s => 
                            s.address.toLowerCase().replace(/\s+/g, '') === address.toLowerCase().replace(/\s+/g, '')
                        )

                        if (!isDuplicate) {
                            try {
                                const newStation = await createSavedStation({
                                    name: address, // Tên mặc định là địa chỉ
                                    address: address,
                                    lat: lat,
                                    lng: lng
                                })
                                if (newStation) {
                                    setSavedStations(prev => [newStation, ...prev])
                                    console.log('Auto-saved new station:', address)
                                }
                            } catch (e) {
                                console.error('Error auto-saving station:', e)
                            }
                        }

                        onChange(address, { address, lat, lng })
                        setIsModalOpen(false)
                    }
                } catch (error) {
                    console.error('Error reverse geocoding:', error)
                    const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                    if (isForSave) {
                        setNewSavedAddress(address)
                    } else {
                        onChange(address, { address, lat, lng })
                        setIsModalOpen(false)
                    }
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

    const handleManualSubmit = () => {
        if (!manualInput.trim()) return
        onChange(manualInput.trim(), undefined) // No coordinates for manual text address
        setIsModalOpen(false)
    }

    const handleSelectSaved = (station: SavedStation) => {
        const locData = station.lat && station.lng ? { address: station.address, lat: station.lat, lng: station.lng } : undefined
        const displayValue = station.name !== station.address ? `${station.name} - ${station.address}` : station.address
        onChange(displayValue, locData)
        setIsModalOpen(false)
    }

    const handleAddNewSaved = async () => {
        const name = newSavedName.trim()
        const address = newSavedAddress.trim()

        if (!name || !address) return
        
        // 1. Kiểm tra trùng lặp thông minh
        const isDuplicateName = savedStations.some(s => 
            s.name.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, '')
        )
        const isDuplicateAddress = savedStations.some(s => 
            s.address.toLowerCase().replace(/\s+/g, '') === address.toLowerCase().replace(/\s+/g, '')
        )

        if (isDuplicateName) {
            alert(`Tên trạm "${name}" đã tồn tại trong danh sách của bạn.`)
            return
        }

        if (isDuplicateAddress) {
            const existing = savedStations.find(s => s.address.toLowerCase().replace(/\s+/g, '') === address.toLowerCase().replace(/\s+/g, ''))
            if (!confirm(`Địa chỉ này đã được lưu với tên "${existing?.name}". Bạn vẫn muốn lưu thêm trạm mới này chứ?`)) {
                return
            }
        }
        
        try {
            const newStation = await createSavedStation({
                name,
                address
            })
            
            if (newStation) {
                setSavedStations(prev => [newStation, ...prev])
                setIsAddingSaved(false)
                setNewSavedName('')
                setNewSavedAddress('')
            }
        } catch (e) {
            console.error('Error adding saved station', e)
            alert('Không thể lưu trạm sạc. Vui lòng thử lại.')
        }
    }

    const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Bạn có chắc chắn muốn xóa trạm sạc này?')) return

        try {
            await deleteSavedStation(id)
            setSavedStations(prev => prev.filter(s => s.id !== id))
        } catch (e) {
            console.error('Error deleting saved station', e)
        }
    }

    const handleOpenInMaps = () => {
        if (locationData) {
            const url = `https://www.google.com/maps?q=${locationData.lat},${locationData.lng}`
            window.open(url, '_blank')
        }
    }

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium text-slate-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {/* Clickable fake input trigger - replaced Navigation icon with MapPin as requested */}
            <div
                className="relative cursor-pointer group"
                onClick={() => setIsModalOpen(true)}
            >
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" />

                <div className={`w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm ${value ? 'text-slate-900' : 'text-slate-400'} min-h-[44px] flex items-center shadow-sm hover:border-blue-400 transition-colors`}>
                    <span className="truncate">{value || placeholder}</span>
                </div>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500">
                    <MapPin className="h-4 w-4" />
                </div>
            </div>

            {/* Location info card */}
            {locationData && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-green-800">Tọa độ GPS:</p>
                            <p className="text-xs text-green-700 font-mono">
                                {locationData.lat.toFixed(6)}, {locationData.lng.toFixed(6)}
                            </p>
                        </div>
                        
                        {/* Smart Save Button */}
                        {!savedStations.some(s => s.address === locationData.address) && (
                            <button
                                type="button"
                                onClick={async () => {
                                    const name = prompt('Đặt tên cho trạm sạc này:', locationData.address)
                                    if (name) {
                                        try {
                                            const newStation = await createSavedStation({
                                                name: name.trim(),
                                                address: locationData.address
                                            })
                                            if (newStation) {
                                                setSavedStations(prev => [newStation, ...prev])
                                                alert('Đã lưu vào danh sách trạm thường dùng!')
                                            }
                                        } catch (e) { console.error(e) }
                                    }
                                }}
                                className="flex items-center gap-1 text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded-lg shadow-sm active:scale-95 transition-all"
                            >
                                <Plus className="h-3 w-3" /> LƯU TRẠM
                            </button>
                        )}
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

            {/* Location Pickup Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-slate-50 shadow-2xl mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
                        {/* Header with Handle */}
                        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 flex-shrink-0">
                            {/* Mobile Handle */}
                            <div className="flex w-full justify-center pt-3 pb-2 sm:hidden scroll-none pointer-events-none">
                                <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                            </div>

                            {/* Header Content */}
                            <div className="px-5 pb-3 flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-800">Chọn địa điểm</h3>
                                <button onClick={() => setIsModalOpen(false)} className="rounded-full bg-slate-100 p-1.5 hover:bg-slate-200 transition-colors active:scale-95">
                                    <X className="h-4 w-4 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">

                            {/* Option 1: GPS Fetch */}
                            <div>
                                <button
                                    onClick={() => handleGetCurrentLocation(false)}
                                    disabled={isLoadingLocation}
                                    className="w-full flex items-center gap-3 bg-blue-50 text-blue-700 p-3.5 rounded-2xl hover:bg-blue-100 transition shadow-sm border border-blue-100 active:scale-[0.98]"
                                >
                                    <div className="bg-blue-200 p-2.5 rounded-xl">
                                        {isLoadingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
                                    </div>
                                    <div className="text-left flex-1">
                                        <span className="font-bold block text-sm">Lấy vị trí GPS hiện tại</span>
                                        <span className="text-xs text-blue-500 font-medium">Tự động lấy tọa độ & địa chỉ</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 opacity-50" />
                                </button>
                            </div>

                            {/* Option 2: Manual Input */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Nhập thủ công</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={manualInput}
                                        onChange={e => setManualInput(e.target.value)}
                                        placeholder="Nhập địa chỉ bất kỳ..."
                                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm transition"
                                    />
                                    <button
                                        onClick={handleManualSubmit}
                                        disabled={!manualInput.trim()}
                                        className="bg-slate-800 text-white px-5 rounded-2xl font-bold text-sm shadow-md disabled:opacity-50 hover:bg-slate-700 active:scale-95 transition"
                                    >
                                        Chọn
                                    </button>
                                </div>
                            </div>

                            {/* Option 3: Saved Stations */}
                            <div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Trạm sạc thường dùng</p>
                                    <button onClick={() => setIsAddingSaved(true)} className="text-xs font-bold text-white bg-blue-600 px-2.5 py-1.5 rounded-3xl flex items-center gap-1 hover:bg-blue-100 transition">
                                        <Plus className="h-3 w-3" /> Thêm mới
                                    </button>
                                </div>

                                {/* Add New Saved Station Form */}
                                {isAddingSaved && (
                                    <div className="bg-white border border-blue-100 shadow-sm p-4 rounded-3xl mb-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-sm font-bold text-blue-800 mb-1">Thêm trạm sạc mới</p>
                                        <input
                                            placeholder="Tên trạm (VD: Trạm sạc Vincom)"
                                            value={newSavedName} onChange={e => setNewSavedName(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-3 py-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                placeholder="Nhập địa chỉ..."
                                                value={newSavedAddress} onChange={e => setNewSavedAddress(e.target.value)}
                                                className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-3 py-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                                            />
                                            <button
                                                onClick={() => handleGetCurrentLocation(true)}
                                                className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl text-blue-600 hover:bg-blue-100 transition"
                                                title="Lấy GPS cho địa chỉ này"
                                            >
                                                {isLoadingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                                            </button>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={() => setIsAddingSaved(false)} className="px-4 py-2 text-sm text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">Hủy</button>
                                            <button
                                                onClick={handleAddNewSaved}
                                                disabled={!newSavedName.trim() || !newSavedAddress.trim()}
                                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 transition"
                                            >
                                                Lưu lại
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Saved List */}
                                {loadingSaved ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                                        <p className="text-xs text-slate-500 font-medium">Đang tải danh sách...</p>
                                    </div>
                                ) : savedStations.length === 0 ? (
                                    <div className="bg-white border-2 border-slate-300 border-dashed rounded-3xl p-6 text-center">
                                        <Map className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-500">Chưa có trạm sạc nào được lưu</p>
                                        <p className="text-xs text-slate-400 mt-1">Lưu các trạm thường dùng để chọn nhanh hơn</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {savedStations.map(station => (
                                            <div key={station.id} onClick={() => handleSelectSaved(station)} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-blue-400 transition cursor-pointer shadow-sm group active:scale-[0.99]">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className="bg-green-50 text-green-600 border border-green-100 p-2 rounded-xl shrink-0">
                                                        <MapPin className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-sm text-slate-800 truncate">{station.name}</p>
                                                        <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{station.address}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeleteSaved(station.id, e)}
                                                    className="p-2 ml-2 text-slate-300 bg-slate-50 rounded-lg hover:text-red-500 hover:bg-red-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

