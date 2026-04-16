import { useState, useEffect, useMemo } from 'react'
import {
    Route, MapPin, Calendar, Trash2, Edit, Car, Bike,
    ChevronDown, Clock, Navigation, TrendingUp, BarChart3,
    X, ArrowRight, Filter, Map,
    ChevronLeft, ChevronRight, Gauge, FileText, Tag, Save,
    Timer, Flag, CheckCircle2, Star
} from 'lucide-react'
import { createTrip, updateTrip, deleteTrip, type VehicleRecord, type TripRecord } from '../../lib/vehicles/vehicleService'
import { useVehicles, useVehicleTrips, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useVehicleStore } from '../../store/useVehicleStore'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { DateTimePickerModal } from '../../components/ui/DateTimePickerModal'
import { DateRangePickerModal } from '../../components/ui/DateRangePickerModal'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { getTripPricePerKm } from '../../lib/vehicles/tripPriceService'
import { TripPriceModal } from '../../components/vehicles/TripPriceModal'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SimpleLocationInput, type SimpleLocationData } from '../../components/vehicles/SimpleLocationInput'
import { TripGPSDisplay, getTripCleanNotes } from '../../components/vehicles/TripGPSDisplay'
import { VehicleFooterNav } from '../../components/vehicles/VehicleFooterNav'
import { forwardGeocode, reverseGeocode, parseCoordinates } from '../../utils/geocoding'

// ─── Trip Type Config ─────────────────────────────────────────────────────────
const TRIP_TYPES = {
    work: { label: 'Đi làm', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    business: { label: 'Công tác', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    service: { label: 'Dịch vụ', color: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
    leisure: { label: 'Đi chơi', color: 'green', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    hometown: { label: 'Về quê', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    family: { label: 'Gia đình', color: 'red', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    shopping: { label: 'Mua sắm', color: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
    roadtrip: { label: 'Phượt', color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    repair: { label: 'Sửa xe', color: 'sky', bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
    other: { label: 'Khác', color: 'slate', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
} as const

type TripTypeKey = keyof typeof TRIP_TYPES

export function getTripTags(trip: TripRecord): string[] {
    const meta = parseMeta(trip.notes)
    if (meta.tags) {
        return meta.tags.split('|').filter(Boolean)
    }
    const preset = TRIP_TYPES[trip.trip_type as TripTypeKey]
    return [preset ? preset.label : TRIP_TYPES.other.label]
}

export function getTripTagConfig(tagLabel: string) {
    const preset = Object.values(TRIP_TYPES).find(cfg => cfg.label === tagLabel)
    if (preset) return preset
    return { label: tagLabel, color: 'slate', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' }
}

function TripTypeSelector({ selectedTags, onChange }: { selectedTags: string[], onChange: (tags: string[]) => void }) {
    const [customTags, setCustomTags] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('bofin_custom_tags') || '[]') } catch { return [] }
    })
    const [input, setInput] = useState('')
    const addCustomTag = () => {
        const val = input.trim()
        if (!val || customTags.includes(val) || Object.values(TRIP_TYPES).some(c => c.label === val)) return
        const newTags = [...customTags, val]
        setCustomTags(newTags)
        localStorage.setItem('bofin_custom_tags', JSON.stringify(newTags))
        onChange([...selectedTags, val])
        setInput('')
    }
    const removeCustomTag = (tag: string) => {
        const newTags = customTags.filter(t => t !== tag)
        setCustomTags(newTags)
        localStorage.setItem('bofin_custom_tags', JSON.stringify(newTags))
        onChange(selectedTags.filter(t => t !== tag))
    }
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) onChange(selectedTags.filter(t => t !== tag))
        else onChange([...selectedTags, tag])
    }
    return (
        <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
                {(Object.values(TRIP_TYPES)).map((cfg) => (
                    <button key={cfg.label} type="button" onClick={() => toggleTag(cfg.label)} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${selectedTags.includes(cfg.label) ? `${cfg.dot} text-white shadow-md scale-105` : `${cfg.bg} ${cfg.text} opacity-80 hover:opacity-100`}`}>
                        {cfg.label} {selectedTags.includes(cfg.label) && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
                    </button>
                ))}
                {customTags.map(tag => (
                    <div key={tag} className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${selectedTags.includes(tag) ? `bg-slate-700 text-white shadow-md scale-105` : `bg-slate-100 text-slate-700 opacity-80 hover:opacity-100`}`}>
                        <button type="button" onClick={() => toggleTag(tag)} className="flex items-center gap-1">
                            {tag} {selectedTags.includes(tag) && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
                        </button>
                        <button type="button" onClick={() => removeCustomTag(tag)} className={`ml-1 hover:text-red-400 ${selectedTags.includes(tag) ? 'text-slate-300' : 'text-slate-400'}`}>
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Nhập loại lộ trình mới..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <button type="button" onClick={addCustomTag} disabled={!input.trim()} className="rounded-xl bg-blue-100 px-4 py-2 text-xs font-bold text-blue-600 disabled:opacity-50 hover:bg-blue-200 transition-colors">
                    Thêm & Chọn
                </button>
            </div>
        </div>
    )
}

// ─── Trip Status Metadata (stored in notes field) ────────────────────────────
// Format: [TRIPMETA:key=value,key2=value2]
const META_RE = /^\[TRIPMETA:([^\]]+)\]\n?/

function parseMeta(notes?: string): Record<string, string> {
    if (!notes) return {}
    const m = notes.match(META_RE)
    if (!m) return {}
    return Object.fromEntries(m[1].split(',').map(e => {
        const i = e.indexOf('=')
        return [e.slice(0, i), e.slice(i + 1)]
    }))
}

function buildMeta(meta: Record<string, string>): string {
    return `[TRIPMETA:${Object.entries(meta).map(([k, v]) => `${k}=${v}`).join(',')}]`
}

function stripMeta(notes?: string): string {
    return (notes ?? '').replace(META_RE, '').trim()
}

function isInProgress(trip: TripRecord): boolean {
    return parseMeta(trip.notes).status === 'in_progress'
}

function isTour(trip: TripRecord): boolean {
    return parseMeta(trip.notes).tour === 'true'
}

function parseManualCoords(str: string): { lat: number, lng: number } | null {
    const m = str.match(/([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)/)
    if (m) {
        const lat = parseFloat(m[1])
        const lng = parseFloat(m[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng }
        }
    }
    return null
}

function getTripDuration(trip: TripRecord): { startedAt: Date | null; completedAt: Date | null; mins: number | null } {
    const m = parseMeta(trip.notes)
    const startedAt = m.started_at ? new Date(m.started_at) : null
    const completedAt = m.completed_at ? new Date(m.completed_at) : null
    const mins = startedAt && completedAt
        ? Math.round((completedAt.getTime() - startedAt.getTime()) / 60000)
        : null
    return { startedAt, completedAt, mins }
}

function fmtDur(mins: number): string {
    if (mins < 60) return `${mins} phút`
    const h = Math.floor(mins / 60), m = mins % 60
    return m > 0 ? `${h}g ${m}ph` : `${h} giờ`
}

function fmtTime(d: Date): string {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// ─── OSRM Helper ──────────────────────────────────────────────────────────────
async function calculateDistanceOSRM(lat1: number, lng1: number, lat2: number, lng2: number): Promise<number> {
    try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`)
        const data = await res.json()
        if (data.code === 'Ok' && data.routes.length > 0) {
            return data.routes[0].distance / 1000
        }
    } catch (err) {
        console.error('OSRM API Error:', err)
    }
    return 0
}

// ─── Vehicle Type Icon ────────────────────────────────────────────────────────
function VehicleBodyIcon({ vehicleType, className }: { vehicleType?: string; className?: string }) {
    if (vehicleType === 'motorcycle') return <Bike className={className} />
    return <Car className={className} />
}

// Vehicle Selector removed per request to follow global store selection

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatsCard({ vehicle, trips }: { vehicle: VehicleRecord; trips: TripRecord[] }) {
    const totalDistance = trips.reduce((s, t) => s + (t.distance_km || 0), 0)
    const thisMonth = new Date()
    const monthTrips = trips.filter(t => {
        const d = new Date(t.trip_date)
        return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
    })
    const monthDist = monthTrips.reduce((s, t) => s + (t.distance_km || 0), 0)
    const accent = 'bg-blue-600 shadow-blue-200'

    return (
        <div className={`mb-4 rounded-2xl ${accent} p-4 text-white shadow-lg`}>
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-white/20 p-1.5">
                        <Route className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold opacity-90">Lộ trình di chuyển</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <VehicleBodyIcon vehicleType={vehicle.vehicle_type} className="h-4 w-4 opacity-80" />
                    <span className="text-xs opacity-75">{vehicle.license_plate}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/15 p-2.5 text-center">
                    <p className="text-xl font-black">{trips.length}</p>
                    <p className="text-[10px] opacity-75 leading-tight">Tổng<br />chuyến</p>
                </div>
                <div className="rounded-xl bg-white/15 p-2.5 text-center">
                    <p className="text-xl font-black">{totalDistance.toLocaleString()}</p>
                    <p className="text-[10px] opacity-75 leading-tight">Tổng km<br />đã đi</p>
                </div>
                <div className="rounded-xl bg-white/15 p-2.5 text-center">
                    <p className="text-xl font-black">{monthDist.toLocaleString()}</p>
                    <p className="text-[10px] opacity-75 leading-tight">Km<br />tháng này</p>
                </div>
            </div>

            {/* Odometer row */}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 opacity-75" />
                    <span className="text-xs opacity-75">Odometer hiện tại</span>
                </div>
                <span className="text-sm font-bold">{vehicle.current_odometer.toLocaleString()} km</span>
            </div>
        </div>
    )
}

// ─── Trip Status UX helper ──────────────────────────────────────────────────
function getTripUXStatus(trip: TripRecord) {
    const meta = parseMeta(trip.notes)

    if (meta.status === 'in_progress') {
        return {
            key: 'in_progress', label: 'Đang di chuyển',
            badgeCls: 'bg-blue-100 text-blue-700 border-blue-200',
            dot: 'bg-blue-500 animate-pulse', border: 'border-l-blue-400'
        }
    }
    if (meta.status === 'completed') {
        return {
            key: 'completed', label: 'Hoàn tất',
            badgeCls: 'bg-green-100 text-green-700 border-green-200',
            dot: 'bg-green-500', border: 'border-l-green-400'
        }
    }

    const now = new Date()
    const tripDate = new Date(`${trip.trip_date}T${trip.trip_time || '00:00'}`)
    if (tripDate > now) {
        return {
            key: 'upcoming', label: 'Sắp tới',
            badgeCls: 'bg-amber-100 text-amber-700 border-amber-200',
            dot: 'bg-amber-500', border: 'border-l-amber-200'
        }
    }
    return {
        key: 'manual', label: 'Đã lưu',
        badgeCls: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-500', border: 'border-l-transparent'
    }
}

function LocationDisplay({ locationStr, fallback }: { locationStr: string | undefined, fallback: string }) {
    const [display, setDisplay] = useState(locationStr || fallback)

    useEffect(() => {
        if (!locationStr) {
            setDisplay(fallback)
            return
        }
        const coords = parseCoordinates(locationStr)
        if (coords) {
            reverseGeocode(coords.lat, coords.lng).then(addr => {
                if (addr && !/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(addr)) {
                    setDisplay(addr)
                }
            }).catch(console.error)
        } else {
            setDisplay(locationStr)
        }
    }, [locationStr, fallback])

    return <span className="truncate max-w-[110px]" title={display}>{display}</span>
}

// ─── Trip Card ────────────────────────────────────────────────────────────────────
function TripCard({
    trip, pricePerKm, onEdit, onDelete, onComplete, onCheckpoint, onTogglePin
}: {
    trip: TripRecord; pricePerKm: number; onEdit: (trip: TripRecord) => void; onDelete: (id: string) => void; onComplete: (trip: TripRecord) => void; onCheckpoint: (trip: TripRecord) => void; onTogglePin: (trip: TripRecord) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const inProgress = isInProgress(trip)
    const { startedAt, completedAt, mins } = getTripDuration(trip)
    const userNotes = getTripCleanNotes(stripMeta(trip.notes))
    const uxStatus = getTripUXStatus(trip)
    const tags = getTripTags(trip)
    const meta = parseMeta(trip.notes)
    const isPinned = meta.pinned === 'true'

    return (
        <div className={`overflow-hidden rounded-2xl bg-white shadow-sm border-l-4 ${isPinned ? 'border-l-yellow-400 border-t border-t-yellow-100' : uxStatus.border} transition-all hover:shadow-md`}>
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {isPinned && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mt-0.5" />}
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${uxStatus.badgeCls}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${uxStatus.dot}`} />
                                {uxStatus.label}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {tags.map(tag => {
                                    const cfg = getTripTagConfig(tag)
                                    return (
                                        <span key={tag} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                            {tag}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>

                        {(trip.start_location || trip.end_location) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium my-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <Navigation className="h-3 w-3 text-blue-500 shrink-0" />
                                    <LocationDisplay locationStr={trip.start_location} fallback="?" />
                                    <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />
                                    <Flag className="h-3 w-3 text-green-500 shrink-0" />
                                    <LocationDisplay locationStr={trip.end_location} fallback={inProgress ? '...' : '?'} />
                                </div>
                                {!inProgress && (
                                    <span className="ml-1 font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                                        {(trip.distance_km || (trip.end_km - trip.start_km)).toLocaleString()} km
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Calendar className="h-3 w-3 ml-0.5" />
                            {new Date(trip.trip_date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            {trip.trip_time && (
                                <span className="flex items-center gap-0.5 ml-1.5">
                                    <Clock className="h-3 w-3" />
                                    {trip.trip_time.slice(0, 5)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0 items-end">
                        <div className="flex gap-1">
                            <button onClick={() => onTogglePin(trip)} className={`rounded-xl p-1.5 transition-colors ${isPinned ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' : 'text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-yellow-500'}`}>
                                <Star className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
                            </button>
                            <button onClick={() => onEdit(trip)} className="rounded-xl p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors">
                                <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => onDelete(trip.id)} className="rounded-xl p-1.5 text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        {inProgress && (
                            <div className="flex gap-1.5 mt-1">
                                {isTour(trip) && (
                                    <button onClick={() => onCheckpoint(trip)} className="flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-1.5 text-[10px] font-bold text-cyan-700 border border-cyan-100 hover:bg-cyan-100 transition-colors shadow-sm">
                                        <MapPin className="h-3 w-3" /> Thêm điểm dừng
                                    </button>
                                )}
                                <button onClick={() => onComplete(trip)} className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors shadow-sm">
                                    <Flag className="h-3 w-3" /> Hoàn tất
                                </button>
                            </div>
                        )}
                    </div>
                </div>



                {/* Duration row (if completed) */}
                {!inProgress && mins !== null && (
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-green-50/50 px-3 py-1.5 border border-green-100/50">
                        <div className="flex flex-1 items-center gap-2 text-[11px] text-green-700 font-medium">
                            {startedAt && <span>{fmtTime(startedAt)}</span>}
                            {completedAt && <><ArrowRight className="h-3 w-3 text-green-300" /><span>{fmtTime(completedAt)}</span></>}
                        </div>
                        <span className="text-[11px] font-bold text-green-700 bg-green-100/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {fmtDur(mins)}
                        </span>
                    </div>
                )}

                {/* Expand toggle */}
                <button onClick={() => setExpanded(!expanded)} className="mt-3 py-1 w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                    {expanded ? 'Ẩn Lộ trình' : 'Xem Lộ trình & Ghi chú'}
                </button>

                {expanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100/80 animate-in slide-in-from-top-2 fade-in duration-300">
                        <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <Gauge className="h-3.5 w-3.5 text-slate-400" />
                                <span>Odo:</span>
                                <span className="font-semibold text-slate-700">{trip.start_km.toLocaleString()}</span>
                                <span className="text-slate-300">→</span>
                                <span className="font-semibold text-slate-700">{trip.end_km.toLocaleString()}</span>
                            </div>
                            {inProgress ? (
                                <span className="text-[11px] font-medium text-blue-500 italic">Đang ghi nhận...</span>
                            ) : null}
                        </div>
                        {!inProgress && pricePerKm > 0 && (trip.distance_km || (trip.end_km - trip.start_km)) > 0 && (
                            <div className="mb-4 flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-3 py-2">
                                <span className="text-[11px] text-green-700 font-medium">Thành tiền ({pricePerKm.toLocaleString()} đ/km)</span>
                                <span className="text-[13px] font-black text-green-600">{((trip.distance_km || (trip.end_km - trip.start_km)) * pricePerKm).toLocaleString()} đ</span>
                            </div>
                        )}
                        {userNotes && (
                            <div className="mb-4 rounded-xl bg-orange-50/70 border border-orange-100 px-3 py-2.5 text-[11px] text-slate-700 shadow-sm">
                                <div className="flex items-center gap-1.5 mb-1.5 text-orange-800 font-bold uppercase tracking-wide text-[10px]">
                                    <FileText className="h-3 w-3" /> Ghi chú
                                </div>
                                <div className="leading-relaxed whitespace-pre-wrap">{userNotes}</div>
                            </div>
                        )}
                        <TripGPSDisplay trip={trip} />
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VehicleTrips() {
    const { success, error: showError } = useNotification()
    const queryClient = useQueryClient()

    const { data: vehicles = [] } = useVehicles()
    const { selectedVehicleId, setSelectedVehicleId } = useVehicleStore()
    const [pricePerKm, setPricePerKm] = useState<number>(0)
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)

    useEffect(() => {
        if (selectedVehicleId) {
            getTripPricePerKm(selectedVehicleId).then(price => {
                setPricePerKm(price)
            }).catch(console.error)
        }
    }, [selectedVehicleId])

    const [showAddModal, setShowAddModal] = useState(false)
    const [editingTrip, setEditingTrip] = useState<TripRecord | null>(null)
    const [completingTrip, setCompletingTrip] = useState<TripRecord | null>(null)
    const [checkpointTrip, setCheckpointTrip] = useState<TripRecord | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    type FilterPeriod = 'day' | 'week' | 'month' | 'quarter' | 'all' | 'custom'
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month')
    const [periodOffset, setPeriodOffset] = useState(0) // 0 = current, -1 = prev, ...
    const [isRangePickerOpen, setIsRangePickerOpen] = useState(false)
    const [customRange, setCustomRange] = useState({ start: '', end: '' })
    const [filterType, setFilterType] = useState<TripTypeKey | 'all'>('all')
    const [showFilter, setShowFilter] = useState(false)

    const handleTogglePin = async (trip: TripRecord) => {
        try {
            const meta = parseMeta(trip.notes)
            const isPinned = meta.pinned === 'true'
            meta.pinned = isPinned ? 'false' : 'true'
            const strippedNotes = stripMeta(trip.notes)
            const newNotes = [buildMeta(meta), strippedNotes].filter(Boolean).join('\n')
            await updateTrip(trip.id, { notes: newNotes })
            queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId || '') })
        } catch (e: any) {
            showError(e.message || 'Không thể thay đổi trạng thái ghim')
        }
    }

    // ── Period Calculation ──────────────────────────────────────────────────
    const getPeriodRange = (period: FilterPeriod, offset: number) => {
        const now = new Date()
        if (period === 'day') {
            const s = new Date(now); s.setDate(now.getDate() + offset); s.setHours(0, 0, 0, 0)
            const e = new Date(s); e.setHours(23, 59, 59, 999)
            return {
                start: s, end: e,
                label: offset === 0 ? 'Hôm nay' : offset === -1 ? 'Hôm qua' : s.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
            }
        }
        if (period === 'week') {
            const d = new Date(now); d.setDate(now.getDate() + offset * 7)
            const day = d.getDay() === 0 ? 6 : d.getDay() - 1
            const s = new Date(d); s.setDate(d.getDate() - day); s.setHours(0, 0, 0, 0)
            const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999)
            return {
                start: s, end: e,
                label: offset === 0 ? 'Tuần này' : `T${s.getDate()}/${s.getMonth() + 1} - ${e.getDate()}/${e.getMonth() + 1}`
            }
        }
        if (period === 'month') {
            const s = new Date(now.getFullYear(), now.getMonth() + offset, 1)
            const e = new Date(s.getFullYear(), s.getMonth() + 1, 0, 23, 59, 59, 999)
            return {
                start: s, end: e,
                label: offset === 0 ? 'Tháng này' : s.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
            }
        }
        if (period === 'quarter') {
            const q = Math.floor(now.getMonth() / 3) + offset
            const actualYear = now.getFullYear() + Math.floor(q / 4)
            const actualQ = ((q % 4) + 4) % 4
            const s = new Date(actualYear, actualQ * 3, 1)
            const e = new Date(actualYear, actualQ * 3 + 3, 0, 23, 59, 59, 999)
            const qLabel = `Q${actualQ + 1}/${actualYear}`
            return { start: s, end: e, label: offset === 0 ? `Quý này (${qLabel})` : qLabel }
        }
        if (period === 'custom' && customRange.start && customRange.end) {
            const s = new Date(customRange.start); s.setHours(0, 0, 0, 0)
            const e = new Date(customRange.end); e.setHours(23, 59, 59, 999)
            const label = s.getTime() === e.getTime() ? s.toLocaleDateString('vi-VN') : `${s.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} – ${e.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
            return { start: s, end: e, label }
        }
        if (period === 'custom') return { start: new Date(), end: new Date(), label: 'Chọn khoảng thời gian' }
        return { start: new Date(0), end: new Date(9999, 0), label: 'Tất cả' }
    }

    const periodRange = getPeriodRange(filterPeriod, periodOffset)

    const PERIOD_TABS: { id: FilterPeriod, label: string }[] = [
        { id: 'day', label: 'Ngày' },
        { id: 'week', label: 'Tuần' },
        { id: 'month', label: 'Tháng' },
        { id: 'quarter', label: 'Quý' },
        { id: 'all', label: 'Tất cả' },
    ]

    useEffect(() => {
        if (vehicles.length > 0 && !selectedVehicleId) {
            const def = vehicles.find(v => v.is_default) || vehicles[0]
            setSelectedVehicleId(def.id)
        }
    }, [vehicles, selectedVehicleId, setSelectedVehicleId])

    const { data: allTrips = [], isLoading: loading } = useVehicleTrips(selectedVehicleId || undefined)
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

    // ── Combined Filter ────────────────────────────────────────────────────
    const trips = useMemo(() => {
        return allTrips.filter(t => {
            const d = new Date(t.trip_date)
            const inPeriod = filterPeriod === 'all' || (d >= periodRange.start && d <= periodRange.end)
            const typeMatch = filterType === 'all' || t.trip_type === filterType
            return inPeriod && typeMatch
        })
    }, [allTrips, periodRange, filterType, filterPeriod])

    // ── Group by date ──────────────────────────────────────────────────────
    const pinnedTrips = useMemo(() => trips.filter(t => parseMeta(t.notes).pinned === 'true'), [trips])
    const unpinnedTrips = useMemo(() => trips.filter(t => parseMeta(t.notes).pinned !== 'true'), [trips])

    const groupedByDate = useMemo(() => {
        const groups: Record<string, typeof unpinnedTrips> = {}
        unpinnedTrips.forEach(t => {
            const date = new Date(t.trip_date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
            if (!groups[date]) groups[date] = []
            groups[date].push(t)
        })
        return Object.entries(groups).sort((a, b) => new Date(b[1][0].trip_date).getTime() - new Date(a[1][0].trip_date).getTime())
    }, [unpinnedTrips])

    const todayKey = new Date().toISOString().split('T')[0]
    const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    function dayLabel(key: string) {
        if (key === todayKey) return 'Hôm nay'
        if (key === yesterdayKey) return 'Hôm qua'
        return new Date(key).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
    }

    const handleDelete = async () => {
        if (!deleteConfirmId) return
        setDeleting(true)
        try {
            await deleteTrip(deleteConfirmId)
            queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId || '') })
            success('Đã xóa lộ trình thành công!')
            setDeleteConfirmId(null)
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể xóa')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar variant="page" title="Quản Lý Lộ Trình" />

            <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-md mx-auto px-4 pb-4 pt-4">

                {/* ── Stats Card ───────────────────────────────────────── */}
                {selectedVehicle && !loading && (
                    <StatsCard vehicle={selectedVehicle} trips={allTrips} />
                )}

                {/* ── Action Buttons ────────────────────────────────────────── */}
                <div className="mb-4 flex gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex-1 flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 py-3.5 text-white shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <Map className="h-5 w-5" />
                        <span className="text-sm font-bold">Tạo lộ trình di chuyển</span>
                    </button>
                    <button
                        onClick={() => setIsPriceModalOpen(true)}
                        className="w-[120px] rounded-2xl bg-white border border-slate-200 p-2 overflow-hidden shadow-sm flex flex-col items-center justify-center hover:border-blue-300 hover:bg-blue-50 transition-colors active:scale-95"
                    >
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Cài đặt cước</label>
                        <div className="flex items-center gap-1 mt-0.5 text-slate-700">
                            <span className="font-bold text-[13px]">{pricePerKm > 0 ? pricePerKm.toLocaleString() : 'Chưa cài'}</span>
                            {pricePerKm > 0 && <span className="text-[9px] text-slate-400">₫/km</span>}
                        </div>
                    </button>
                </div>

                {/* ── FILTER BAR ── */}
                <div className="mb-3 space-y-2">
                    {/* Period type tabs */}
                    <div className="flex rounded-xl bg-gray-200 p-1 gap-0.5 shadow-inner">
                        {PERIOD_TABS.map(tab => (
                            <button key={tab.id} type="button"
                                onClick={() => {
                                    setFilterPeriod(tab.id)
                                    setPeriodOffset(0)
                                }}
                                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${filterPeriod === tab.id
                                    ? 'bg-slate-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Period navigator */}
                    {filterPeriod !== 'all' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPeriodOffset(o => o - 1)}
                                className="rounded-xl border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div
                                onClick={() => setIsRangePickerOpen(true)}
                                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <p className="text-md font-bold text-slate-700">{periodRange.label}</p>
                            </div>
                            <button
                                onClick={() => setPeriodOffset(o => Math.min(0, o + 1))}
                                disabled={periodOffset >= 0 && filterPeriod !== 'custom'}
                                className="rounded-xl border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setShowFilter(!showFilter)}
                                className={`rounded-xl border p-1.5 transition-all ${showFilter ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-400'}`}
                            >
                                <Filter className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Trip type filter chips */}
                    {showFilter && (
                        <div className="flex gap-1.5 flex-wrap">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${filterType === 'all' ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                            >
                                Tất cả
                            </button>
                            {(Object.entries(TRIP_TYPES) as [TripTypeKey, typeof TRIP_TYPES[TripTypeKey]][]).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterType(key)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${filterType === key ? `${cfg.dot} text-white` : `${cfg.bg} ${cfg.text}`}`}
                                >
                                    {cfg.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Period summary row */}
                    {trips.length > 0 && (
                        <div className="flex items-center justify-between rounded-xl bg-white border border-slate-100 px-3 py-2 shadow-md">
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span><span className="font-bold text-slate-700">{trips.length}</span> chuyến</span>
                                <span>·</span>
                                <span><span className="font-bold text-slate-700">{trips.reduce((s, t) => s + (t.distance_km || 0), 0).toLocaleString()}</span> km</span>
                            </div>
                            <BarChart3 className="h-4 w-4 text-slate-300" />
                        </div>
                    )}
                </div>

                {/* ── Trip List ────────────────────────────────────────── */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-md border border-slate-100">
                                <div className="mb-3 flex gap-2">
                                    <div className="h-5 w-16 rounded-full bg-slate-200" />
                                    <div className="h-5 w-24 rounded-full bg-slate-100" />
                                </div>
                                <div className="h-10 w-full rounded-xl bg-slate-50" />
                            </div>
                        ))}
                    </div>
                ) : trips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl bg-white border border-slate-100 py-14 shadow-sm">
                        <div className={`mb-4 rounded-3xl p-6 bg-blue-100 shadow-md`}>
                            <Route className={`h-14 w-14 text-blue-600`} />
                        </div>
                        <p className="font-semibold text-slate-600">Chưa có lộ trình nào</p>
                        <p className="mt-1 text-sm text-slate-400">
                            {filterType !== 'all'
                                ? `Không có lộ trình "${TRIP_TYPES[filterType].label}" trong ${periodRange.label.toLowerCase()}`
                                : 'Bắt đầu ghi lại lộ trình của bạn'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {pinnedTrips.length > 0 && (
                            <div>
                                <div className="mb-2 flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-yellow-400" />
                                        <span className="text-xs font-bold text-yellow-600 uppercase tracking-wide">
                                            Lộ trình đã ghim
                                        </span>
                                    </div>
                                    <span className="text-xs font-semibold text-yellow-500/70">
                                        {pinnedTrips.length} chuyến
                                    </span>
                                </div>
                                <div className="space-y-2 pl-4 border-l-2 border-yellow-100">
                                    {pinnedTrips.map(trip => (
                                        <TripCard
                                            key={trip.id}
                                            trip={trip}
                                            pricePerKm={pricePerKm}
                                            onEdit={setEditingTrip}
                                            onDelete={setDeleteConfirmId}
                                            onComplete={setCompletingTrip}
                                            onCheckpoint={setCheckpointTrip}
                                            onTogglePin={handleTogglePin}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {groupedByDate.map(([dateKey, dayTrips]) => {
                            const dayDistance = dayTrips.reduce((s, t) => s + (t.distance_km || 0), 0)
                            return (
                                <div key={dateKey}>
                                    {/* Date separator */}
                                    <div className="mb-2 flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full bg-blue-400`} />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                {dayLabel(dateKey)}
                                            </span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-400">
                                            {dayDistance.toLocaleString()} km · {dayTrips.length} chuyến
                                        </span>
                                    </div>
                                    <div className={`space-y-2 pl-4 border-l-2 border-blue-100`}>
                                        {dayTrips.map(trip => (
                                            <TripCard
                                                key={trip.id}
                                                trip={trip}
                                                pricePerKm={pricePerKm}
                                                onEdit={setEditingTrip}
                                                onDelete={setDeleteConfirmId}
                                                onComplete={setCompletingTrip}
                                                onCheckpoint={setCheckpointTrip}
                                                onTogglePin={handleTogglePin}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                <div className="h-[150px] w-full flex-shrink-0"></div>
            </main>

            {/* Footer Nav */}
            <VehicleFooterNav
                onAddClick={() => { setShowAddModal(true) }}
                addLabel="Tạo lộ trình"
                isElectricVehicle={selectedVehicle?.fuel_type === 'electric'}
            />

            {/* Add / Edit Modal */}
            {(showAddModal || editingTrip) && selectedVehicle && (
                <TripModal
                    vehicle={selectedVehicle}
                    editingTrip={editingTrip}
                    pricePerKm={pricePerKm}
                    onClose={() => { setShowAddModal(false); setEditingTrip(null) }}
                    onSuccess={() => {
                        setShowAddModal(false)
                        setEditingTrip(null)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId || '') })
                    }}
                />
            )}

            {/* Complete Trip Modal */}
            {completingTrip && selectedVehicle && (
                <CompleteTripModal
                    vehicle={selectedVehicle}
                    trip={completingTrip}
                    onClose={() => setCompletingTrip(null)}
                    onSuccess={() => {
                        setCompletingTrip(null)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId || '') })
                    }}
                />
            )}

            {/* Checkpoint Trip Modal */}
            {checkpointTrip && selectedVehicle && (
                <CheckpointTripModal
                    vehicle={selectedVehicle}
                    trip={checkpointTrip}
                    onClose={() => setCheckpointTrip(null)}
                    onSuccess={() => {
                        setCheckpointTrip(null)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.trips(selectedVehicleId || '') })
                    }}
                />
            )}

            {/* Range Picker Modal */}
            <DateRangePickerModal
                isOpen={isRangePickerOpen}
                onClose={() => setIsRangePickerOpen(false)}
                onConfirm={(s, e) => {
                    setCustomRange({ start: s, end: e })
                    setFilterPeriod('custom')
                }}
            />

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDelete}
                title="Xác nhận xóa lộ trình"
                message="Bạn có chắc muốn xóa lộ trình này? Hành động này không thể hoàn tác."
                confirmText="Xóa"
                cancelText="Hủy"
                isLoading={deleting}
            />

            {/* Price Modal */}
            {isPriceModalOpen && selectedVehicleId && (
                <TripPriceModal
                    isOpen={isPriceModalOpen}
                    vehicleId={selectedVehicleId}
                    onClose={() => setIsPriceModalOpen(false)}
                    onSuccess={(newPrice) => setPricePerKm(newPrice)}
                />
            )}
        </div>
    )
}

// ─── Add / Edit Trip Modal ────────────────────────────────────────────────────
function TripModal({
    vehicle,
    editingTrip,
    pricePerKm,
    onClose,
    onSuccess,
}: {
    vehicle: VehicleRecord
    editingTrip?: TripRecord | null
    pricePerKm: number
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const isEdit = !!editingTrip

    const [formData, setFormData] = useState({
        vehicle_id: vehicle.id,
        trip_date: editingTrip?.trip_date ?? new Date().toISOString().split('T')[0],
        trip_time: editingTrip?.trip_time ?? new Date().toTimeString().slice(0, 5),
        trip_type: (editingTrip?.trip_type ?? 'work') as TripTypeKey,
        start_km: editingTrip?.start_km?.toString() ?? vehicle.current_odometer.toString(),
        end_km: editingTrip?.end_km?.toString() ?? '',
        start_location: editingTrip?.start_location ?? '',
        end_location: editingTrip?.end_location ?? '',
        notes: editingTrip ? getTripCleanNotes(editingTrip.notes ?? '') : '',
    })

    const [selectedTags, setSelectedTags] = useState<string[]>(() => {
        if (editingTrip) return getTripTags(editingTrip)
        return [TRIP_TYPES.work.label]
    })
    const [isImportant, setIsImportant] = useState(() => {
        return editingTrip ? parseMeta(editingTrip.notes).pinned === 'true' : false
    })

    const [startLocationData, setStartLocationData] = useState<SimpleLocationData | null>(null)
    const [endLocationData, setEndLocationData] = useState<SimpleLocationData | null>(null)
    const [showOdo, setShowOdo] = useState(false)
    const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false)

    useEffect(() => {
        const startLoc = startLocationData || (formData.start_location ? parseManualCoords(formData.start_location) : null)
        const endLoc = endLocationData || (formData.end_location ? parseManualCoords(formData.end_location) : null)
        if (startLoc && endLoc && formData.start_km) {
            calculateDistanceOSRM(startLoc.lat, startLoc.lng, endLoc.lat, endLoc.lng)
                .then(distanceKm => {
                    if (distanceKm >= 0) {
                        const expectedEndKm = Math.round(Number(formData.start_km) + distanceKm)
                        setFormData(prev => ({ ...prev, end_km: expectedEndKm.toString() }))
                        success(`Đã tự động tính quãng đường: ${distanceKm.toFixed(1)} km`)
                    }
                })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startLocationData, endLocationData, formData.start_location, formData.end_location])

    const parsedEndKm = formData.end_km === '' ? Number(formData.start_km) : Number(formData.end_km)
    const calcDist = parsedEndKm - Number(formData.start_km)
    const validDist = Number(formData.start_km) > 0 && parsedEndKm >= Number(formData.start_km)

    const accentBg = 'bg-blue-600'

    const [submitAction, setSubmitAction] = useState<'complete' | 'in_progress' | 'update'>('update')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.start_location.trim()) {
            showError('Vui lòng nhập "Điểm xuất phát" trước khi lưu.')
            return
        }

        if (submitAction === 'complete' && !formData.end_location.trim()) {
            showError('Bạn cần nhập "Điểm đến" để hoàn tất lộ trình (ít nhất 2 điểm).')
            return
        }

        if (parsedEndKm < Number(formData.start_km)) {
            showError('Odo kết thúc phải lớn hơn hoặc bằng odo bắt đầu')
            return
        }
        setLoading(true)
        try {
            const tripData: any = { ...formData, start_km: Number(formData.start_km) || vehicle.current_odometer, end_km: parsedEndKm || vehicle.current_odometer }

            // Nếu lưu tạm (bắt đầu) nhưng chưa có end_location thì lấy điểm kết thúc bằng điểm bắt đầu (cho tính logic tour)
            if (submitAction === 'in_progress' && !tripData.end_location) {
                tripData.end_location = tripData.start_location;
                tripData.end_km = tripData.start_km;
            }

            // Append GPS coordinates to notes
            const finalStartLoc = startLocationData || parseManualCoords(formData.start_location)
            const finalEndLoc = endLocationData || parseManualCoords(formData.end_location) || finalStartLoc

            // Preserve meta if editing
            let originalMetaLine = ''
            if (isEdit && editingTrip?.notes) {
                const metaMatch = editingTrip.notes.match(/^\[TRIPMETA:([^\]]+)\]/)
                if (metaMatch) {
                    originalMetaLine = metaMatch[0]
                }
            }

            // Build new meta
            const newMeta: Record<string, string> = { ...parseMeta(originalMetaLine) }
            newMeta.tags = selectedTags.join('|')
            newMeta.pinned = isImportant ? 'true' : 'false'

            if (!isEdit) {
                newMeta.status = submitAction === 'in_progress' ? 'in_progress' : 'completed';
                newMeta.tour = 'true';
                newMeta.started_at = new Date().toISOString();
                if (submitAction === 'complete') {
                    newMeta.completed_at = new Date().toISOString();
                }
            }
            const newMetaLine = buildMeta(newMeta)

            if (finalStartLoc || finalEndLoc) {
                const gpsLines: string[] = []
                const nowIso = new Date().toISOString()
                if (finalStartLoc) {
                    gpsLines.push(`[Start] ${finalStartLoc.lat.toFixed(6)}, ${finalStartLoc.lng.toFixed(6)} | Odo: ${tripData.start_km} | Time: ${tripData.trip_date}T${tripData.trip_time}:00.000Z`)
                    gpsLines.push(`https://www.google.com/maps?q=${finalStartLoc.lat},${finalStartLoc.lng}`)
                }
                if (finalEndLoc) {
                    gpsLines.push(`[End] ${finalEndLoc.lat.toFixed(6)}, ${finalEndLoc.lng.toFixed(6)} | Odo: ${tripData.end_km} | Time: ${nowIso}`)
                    gpsLines.push(`https://www.google.com/maps?q=${finalEndLoc.lat},${finalEndLoc.lng}`)
                }
                tripData.notes = [newMetaLine, formData.notes, ...gpsLines].filter(Boolean).join('\n')
            } else {
                tripData.notes = [newMetaLine, formData.notes].filter(Boolean).join('\n')
            }

            if (isEdit && editingTrip) {
                await updateTrip(editingTrip.id, tripData)
                success('Đã cập nhật lộ trình!')
            } else {
                await createTrip(tripData)
                success('Đã thêm lộ trình mới!')
            }
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể lưu lộ trình')
        } finally {
            setLoading(false)
        }
    }

    const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all'
    const labelCls = 'mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide'

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
            <div className="w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[80vh] mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className={`${accentBg} rounded-t-3xl px-5 pt-3 pb-4 text-white`}>
                    {/* Mobile Handle */}
                    <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                        <div className="h-1.5 w-12 rounded-full bg-white/40" />
                    </div>
                    <div className="flex items-center justify-between mb-1 mt-1">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-white/20 p-1.5">
                                <Route className="h-4 w-4" />
                            </div>
                            <h3 className="text-base font-bold">
                                {isEdit ? 'Chỉnh sửa lộ trình' : 'Thêm lộ trình mới'}
                            </h3>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs opacity-75 ml-10">{vehicle.license_plate} · {vehicle.brand} {vehicle.model}</p>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <form id="trip-form" onSubmit={handleSubmit} className="space-y-4">

                        {/* Date + Time */}
                        <div>
                            <label className={labelCls}>
                                <Calendar className="h-3.5 w-3.5" /> Thời gian giao dịch
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsDateTimePickerOpen(true)}
                                className="relative flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-4 text-left transition-all hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                            >
                                <div className="flex-1 flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                                        {(() => {
                                            const [year, month, day] = formData.trip_date.split('-').map(Number)
                                            return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
                                        })()}
                                    </div>
                                    {formData.trip_time && (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span className="font-semibold">{formData.trip_time}</span>
                                        </div>
                                    )}
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                            </button>
                        </div>

                        {/* Trip Type */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    <Tag className="h-3.5 w-3.5" /> Thẻ lộ trình
                                </label>
                                <button type="button" onClick={() => setIsImportant(!isImportant)} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${isImportant ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    <Star className={`h-3 w-3 ${isImportant ? 'fill-current' : ''}`} /> Quan trọng
                                </button>
                            </div>
                            <TripTypeSelector selectedTags={selectedTags} onChange={setSelectedTags} />
                        </div>

                        {/* Locations */}
                        <div>
                            <label className={labelCls}>
                                <MapPin className="h-3.5 w-3.5" /> Địa điểm
                            </label>
                            <div className="space-y-2">
                                <SimpleLocationInput
                                    label="Điểm xuất phát *"
                                    value={formData.start_location}
                                    locationData={startLocationData}
                                    onChange={(address, locationData) => {
                                        setFormData({ ...formData, start_location: address })
                                        setStartLocationData(locationData || null)
                                    }}
                                    placeholder="Địa điểm bắt đầu..."
                                />
                                <SimpleLocationInput
                                    label="Điểm đến (Bắt buộc khi hoàn tất)"
                                    value={formData.end_location}
                                    locationData={endLocationData}
                                    onChange={(address, locationData) => {
                                        setFormData({ ...formData, end_location: address })
                                        setEndLocationData(locationData || null)
                                    }}
                                    placeholder="Địa điểm kết thúc..."
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className={labelCls}>
                                <FileText className="h-3.5 w-3.5" /> Ghi chú
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                placeholder="Ghi chú về chuyến đi, mục đích, chi phí khác..."
                                className={inputCls + ' resize-none'}
                            />
                        </div>

                        {/* Odometer (collapsible) */}
                        <div className="pt-1">
                            <button type="button" onClick={() => setShowOdo(!showOdo)} className="flex items-center justify-between w-full text-left gap-2 text-[11px] font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100/50 transition-colors px-3 py-2.5 rounded-xl border border-blue-100 uppercase tracking-wide">
                                <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4" /> {showOdo ? 'Ẩn thông tin Odometer' : 'Mở rộng: Cập nhật Odometer & Thành tiền'}</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${showOdo ? 'rotate-180' : ''}`} />
                            </button>
                            {showOdo && (
                                <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl animate-in fade-in slide-in-from-top-2 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1 font-semibold">Odo Bắt đầu <span className="font-normal italic">(km)</span></p>
                                            <input type="number" min={0} value={formData.start_km}
                                                onChange={e => setFormData({ ...formData, start_km: e.target.value })}
                                                placeholder={`VD: ${vehicle.current_odometer}`}
                                                className={inputCls} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1 font-semibold">Odo Kết thúc <span className="font-normal italic">(km)</span></p>
                                            <input type="number" min={formData.start_km} value={formData.end_km}
                                                onChange={e => setFormData({ ...formData, end_km: e.target.value })}
                                                placeholder={`VD: ${formData.start_km}`}
                                                className={inputCls} />
                                        </div>
                                    </div>

                                    {validDist && calcDist > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-blue-100/40 border border-blue-200/50 shadow-sm">
                                                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Quãng đường</span>
                                                <span className="text-[13px] font-black text-blue-600">{calcDist.toLocaleString()} km</span>
                                            </div>
                                            {pricePerKm > 0 && (
                                                <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-green-100/40 border border-green-200/50 shadow-sm">
                                                    <span className="text-[11px] font-semibold text-green-700 uppercase tracking-wide">Thành tiền ({pricePerKm.toLocaleString()} đ/km)</span>
                                                    <span className="text-[14px] font-black text-green-600">{(calcDist * pricePerKm).toLocaleString()} ₫</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100"
                    >
                        Hủy
                    </button>
                    {isEdit ? (
                        <button
                            type="submit"
                            form="trip-form"
                            onClick={() => setSubmitAction('update')}
                            disabled={loading}
                            className={`flex-[2] rounded-xl ${accentBg} py-3 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50 active:scale-95`}
                        >
                            <span className="flex items-center justify-center gap-1.5"><Save className="h-4 w-4" /> Cập nhật lộ trình</span>
                        </button>
                    ) : (
                        <>
                            <button
                                type="submit"
                                form="trip-form"
                                onClick={() => setSubmitAction('in_progress')}
                                disabled={loading}
                                className={`flex-[1.2] rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-orange-600 disabled:opacity-50 active:scale-95`}
                            >
                                Lưu tạm
                            </button>
                            <button
                                type="submit"
                                form="trip-form"
                                onClick={() => setSubmitAction('complete')}
                                disabled={loading}
                                className={`flex-[1.8] rounded-xl bg-green-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-green-700 disabled:opacity-50 active:scale-95`}
                            >
                                Hoàn tất
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* DateTime Picker Modal */}
            <DateTimePickerModal
                isOpen={isDateTimePickerOpen}
                onClose={() => setIsDateTimePickerOpen(false)}
                onConfirm={(date, time) => {
                    setFormData(prev => ({
                        ...prev,
                        trip_date: date,
                        trip_time: time || '',
                    }))
                    setIsDateTimePickerOpen(false)
                }}
                initialDate={formData.trip_date}
                initialTime={formData.trip_time}
                showTime={true}
            />

            <LoadingOverlay isOpen={loading} />
        </div>
    )
}



// ─── Checkpoint Tour Modal ────────────────────────────────────────────────────
function CheckpointTripModal({ vehicle: _vehicle, trip, onClose, onSuccess }: {
    vehicle: VehicleRecord
    trip: TripRecord
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [waypointLocData, setWaypointLocData] = useState<SimpleLocationData | null>(null)
    const [form, setForm] = useState({
        end_km: '',
        end_location: '',
        notes: '',
    })

    // Auto location fetch on open
    useEffect(() => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords
                setWaypointLocData({ lat: latitude, lng: longitude, address: '' })
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                    const data = await res.json()
                    if (data && data.display_name) {
                        setForm(prev => ({ ...prev, end_location: data.display_name }))
                    }
                } catch (e) {
                    // Ignore
                }
            },
            () => { /* ignore */ },
            { enableHighAccuracy: true }
        )
    }, [])

    // Auto-calculate distance for waypoint
    useEffect(() => {
        let isSubscribed = true;
        const autoCalculate = async () => {
            if (!waypointLocData) return;

            let lastLat = 0, lastLng = 0
            const matches = [...(trip.notes || '').matchAll(/\[(?:Start|Waypoint|End)\]\s*([\d.-]+),\s*([\d.-]+)/g)]
            if (matches.length > 0) {
                const last = matches[matches.length - 1]
                lastLat = parseFloat(last[1])
                lastLng = parseFloat(last[2])
            } else {
                // Determine fallback location string
                const fallbackAddress = trip.end_location || trip.start_location;
                if (!fallbackAddress) return;

                // Try simple coordinate parsing
                const fallbackCoords = parseManualCoords(fallbackAddress);
                if (fallbackCoords) {
                    lastLat = fallbackCoords.lat;
                    lastLng = fallbackCoords.lng;
                } else {
                    // Try forward geocoding using Nominatim
                    const geocoded = await forwardGeocode(fallbackAddress)
                    if (geocoded && isSubscribed) {
                        lastLat = geocoded.lat;
                        lastLng = geocoded.lng;
                    }
                }
            }

            if (lastLat && lastLng && isSubscribed) {
                const distanceKm = await calculateDistanceOSRM(lastLat, lastLng, waypointLocData.lat, waypointLocData.lng)
                if (distanceKm >= 0 && isSubscribed) {
                    const expectedEndKm = Math.round((trip.end_km || trip.start_km) + distanceKm)
                    setForm(prev => ({ ...prev, end_km: expectedEndKm.toString() }))
                    success(`Đã tự động tính quãng đường dừng: ${distanceKm.toFixed(1)} km`)
                }
            }
        }

        autoCalculate()
        return () => { isSubscribed = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waypointLocData])

    const parsedEndKm = form.end_km === '' ? (trip.end_km || trip.start_km) : Number(form.end_km)
    const calcDist = parsedEndKm - (trip.end_km || trip.start_km)
    const validDist = parsedEndKm >= (trip.end_km || trip.start_km)
    const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all'
    const labelCls = 'mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide'

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validDist) { showError('Odo phải lớn hơn hoặc bằng odo hiện tại'); return }
        setLoading(true)
        try {
            const nowIso = new Date().toISOString()
            const wpLoc = waypointLocData || parseManualCoords(form.end_location)
            const gpsNote = wpLoc
                ? `\n[Waypoint] ${wpLoc.lat.toFixed(6)}, ${wpLoc.lng.toFixed(6)} | Odo: ${parsedEndKm} | Time: ${nowIso}\nhttps://www.google.com/maps?q=${wpLoc.lat},${wpLoc.lng}\nĐịa điểm dừng: ${form.end_location}`
                : `\n[Waypoint] None | Odo: ${parsedEndKm} | Time: ${nowIso}\nĐịa điểm dừng: ${form.end_location}`

            let notes = trip.notes || ''
            if (form.notes) notes += `\n${form.notes}`
            notes += gpsNote

            await updateTrip(trip.id, {
                end_km: parsedEndKm,
                end_location: form.end_location,
                notes
            })
            success(`Đã lưu điểm dừng! Odo mới: ${parsedEndKm} km`)
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể cập nhật')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
            <div className="w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[80vh] mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
                <div className="bg-cyan-500 rounded-t-3xl px-5 pt-3 pb-4 text-white">
                    {/* Mobile Handle */}
                    <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                        <div className="h-1.5 w-12 rounded-full bg-white/40" />
                    </div>
                    <div className="flex items-center justify-between mb-2 mt-1">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-white/20 p-1.5"><MapPin className="h-4 w-4" /></div>
                            <h3 className="text-base font-bold">dừng điểm mới (Tour)</h3>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30"><X className="h-4 w-4" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
                        <div className="flex justify-between w-full">
                            <div>
                                <p className="text-xs text-slate-400">Odo hiện tại</p>
                                <p className="font-bold text-slate-700">{(trip.end_km || trip.start_km).toLocaleString()} km</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Vị trí hiện tại</p>
                                <p className="font-bold text-slate-700 truncate max-w-[150px]">{trip.end_location || trip.start_location}</p>
                            </div>
                        </div>
                    </div>
                    <form id="checkpoint-form" onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className={labelCls}><MapPin className="h-3.5 w-3.5" /> Điểm dừng tiếp theo</label>
                            <SimpleLocationInput label="" value={form.end_location} locationData={waypointLocData}
                                onChange={(addr, loc) => { setForm({ ...form, end_location: addr }); setWaypointLocData(loc || null) }}
                                placeholder="Nhập địa điểm dừng..." />
                        </div>
                        <div>
                            <label className={labelCls}><Gauge className="h-3.5 w-3.5" /> Odo khi tới điểm dừng (km)</label>
                            <input type="number" value={form.end_km}
                                onChange={e => setForm({ ...form, end_km: e.target.value })}
                                placeholder={`(Tùy chọn) Bỏ trống = ${(trip.end_km || trip.start_km).toLocaleString()} km`} className={inputCls} />
                            {validDist && calcDist > 0 && (
                                <div className="mt-2 text-xs font-semibold text-cyan-600 bg-cyan-50 p-2 rounded-xl text-center">
                                    Khoảng cách: +{calcDist.toLocaleString()} km
                                </div>
                            )}
                            {(waypointLocData || parseManualCoords(form.end_location)) && !(trip.notes || '').match(/\[(?:Start|Waypoint|End)\]/) && (
                                <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-xl text-center">
                                    Điểm đi không có tọa độ GPS, vui lòng nhập Odo thủ công.
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={labelCls}><FileText className="h-3.5 w-3.5" /> Ghi chú chặng</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                rows={2} placeholder="Chi phí, ghi chú điểm dừng..." className={inputCls + ' resize-none'} />
                        </div>
                    </form>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
                    <button type="submit" form="checkpoint-form" disabled={loading}
                        className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-cyan-600 disabled:opacity-50 active:scale-95 transition-all">
                        <MapPin className="h-4 w-4" />
                        Lưu điểm dừng
                    </button>
                </div>
            </div>
            <LoadingOverlay isOpen={loading} />
        </div>
    )
}

// ─── Complete Trip Modal ──────────────────────────────────────────────────────
function CompleteTripModal({ vehicle: _vehicle, trip, onClose, onSuccess }: {
    vehicle: VehicleRecord
    trip: TripRecord
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [endLocData, setEndLocData] = useState<SimpleLocationData | null>(null)
    const now = new Date()
    const { startedAt } = getTripDuration(trip)
    const elapsedMins = startedAt ? Math.round((now.getTime() - startedAt.getTime()) / 60000) : null
    const [form, setForm] = useState({
        end_km: '',
        end_location: '',
        notes: getTripCleanNotes(stripMeta(trip.notes)),
    })

    useEffect(() => {
        let isSubscribed = true;
        const autoCalculate = async () => {
            const endLoc = endLocData || parseManualCoords(form.end_location)
            if (!endLoc || trip.start_km === undefined) return;

            let lastLat = 0, lastLng = 0
            const matches = [...(trip.notes || '').matchAll(/\[(?:Start|Waypoint|End)\]\s*([\d.-]+),\s*([\d.-]+)/g)]
            if (matches.length > 0) {
                const last = matches[matches.length - 1]
                lastLat = parseFloat(last[1])
                lastLng = parseFloat(last[2])
            } else {
                // Determine fallback location string
                const fallbackAddress = trip.end_location || trip.start_location;
                if (!fallbackAddress) return;

                // Try simple coordinate parsing
                const fallbackCoords = parseManualCoords(fallbackAddress);
                if (fallbackCoords) {
                    lastLat = fallbackCoords.lat;
                    lastLng = fallbackCoords.lng;
                } else {
                    // Try forward geocoding using Nominatim
                    const geocoded = await forwardGeocode(fallbackAddress)
                    if (geocoded && isSubscribed) {
                        lastLat = geocoded.lat;
                        lastLng = geocoded.lng;
                    }
                }
            }

            if (lastLat && lastLng && isSubscribed) {
                const distanceKm = await calculateDistanceOSRM(lastLat, lastLng, endLoc.lat, endLoc.lng)
                if (distanceKm >= 0 && isSubscribed) {
                    const expectedEndKm = Math.round((trip.end_km || trip.start_km) + distanceKm)
                    setForm(prev => ({ ...prev, end_km: expectedEndKm.toString() }))
                    success(`Đã tự động tính quãng đường: ${distanceKm.toFixed(1)} km`)
                }
            }
        }

        autoCalculate()
        return () => { isSubscribed = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endLocData, form.end_location])

    const parsedEndKm = form.end_km === '' ? (trip.end_km || trip.start_km) : Number(form.end_km)
    const calcDist = parsedEndKm - trip.start_km
    const validDist = parsedEndKm >= (trip.end_km || trip.start_km)
    const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all'
    const labelCls = 'mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide'

    const handleComplete = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validDist) { showError('Odo kết thúc phải lớn hơn hoặc bằng odo hiện tại'); return }
        setLoading(true)
        try {
            const completedAt = new Date().toISOString()
            const oldMeta = parseMeta(trip.notes)
            const newMeta = buildMeta({ ...oldMeta, status: 'completed', completed_at: completedAt })

            const endLoc = endLocData || parseManualCoords(form.end_location)
            const gpsNote = endLoc
                ? `\n[End] ${endLoc.lat.toFixed(6)}, ${endLoc.lng.toFixed(6)} | Odo: ${parsedEndKm} | Time: ${completedAt}\nhttps://www.google.com/maps?q=${endLoc.lat},${endLoc.lng}`
                : `\n[End] None | Odo: ${parsedEndKm} | Time: ${completedAt}`
            const notes = `${newMeta}\n${form.notes}${gpsNote}`.trim()
            await updateTrip(trip.id, { end_km: parsedEndKm, end_location: form.end_location, notes })
            success(`Lộ trình hoàn tất! ${calcDist.toLocaleString()} km${elapsedMins ? ' · ' + fmtDur(elapsedMins) : ''}`)
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể cập nhật')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
            <div className="w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[80vh] mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
                <div className="bg-green-500 rounded-t-3xl px-5 pt-3 pb-4 text-white">
                    {/* Mobile Handle */}
                    <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                        <div className="h-1.5 w-12 rounded-full bg-white/40" />
                    </div>
                    <div className="flex items-center justify-between mb-2 mt-1">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-white/20 p-1.5"><Flag className="h-4 w-4" /></div>
                            <h3 className="text-base font-bold">Hoàn tất lộ trình</h3>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2 text-xs">
                        {startedAt && <span><Clock className="h-3 w-3 inline mr-0.5" />Xuất phát {fmtTime(startedAt)}</span>}
                        <ArrowRight className="h-3 w-3 opacity-60" />
                        <span><Flag className="h-3 w-3 inline mr-0.5" />Hiện tại {fmtTime(now)}</span>
                        {elapsedMins !== null && (
                            <span className="ml-auto font-bold"><Timer className="h-3 w-3 inline mr-0.5" />{fmtDur(elapsedMins)}</span>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">Điểm xuất phát (đã lưu)</p>
                        <div className="flex gap-6 text-sm">
                            <div>
                                <p className="text-xs text-slate-400">Odo bắt đầu</p>
                                <p className="font-bold text-slate-700">{trip.start_km.toLocaleString()} km</p>
                            </div>
                            {trip.start_location && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-400">Địa điểm</p>
                                    <p className="font-bold text-slate-700 truncate">{trip.start_location}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <form id="complete-trip-form" onSubmit={handleComplete} className="space-y-4">
                        <div>
                            <label className={labelCls}><Gauge className="h-3.5 w-3.5" /> Odo kết thúc (km)</label>
                            <input type="number" min={trip.end_km || trip.start_km} value={form.end_km}
                                onChange={e => setForm({ ...form, end_km: e.target.value })}
                                placeholder={`(Tùy chọn) Bỏ trống = ${(trip.end_km || trip.start_km).toLocaleString()}`} className={inputCls} />
                            {validDist && (
                                <div className="mt-2 flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2">
                                    <span className="text-xs font-medium text-green-700">Quãng đường di chuyển</span>
                                    <span className="text-base font-black text-green-600">{calcDist.toLocaleString()} km</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={labelCls}><MapPin className="h-3.5 w-3.5" /> Điểm đến</label>
                            <SimpleLocationInput label="" value={form.end_location} locationData={endLocData}
                                onChange={(addr, loc) => { setForm({ ...form, end_location: addr }); setEndLocData(loc || null) }}
                                placeholder="Địa điểm kết thúc..." />
                        </div>
                        <div>
                            <label className={labelCls}><FileText className="h-3.5 w-3.5" /> Ghi chú</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                rows={2} className={inputCls + ' resize-none'} />
                        </div>
                    </form>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
                    <button type="submit" form="complete-trip-form" disabled={loading}
                        className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-green-600 disabled:opacity-50 active:scale-95 transition-all">
                        <CheckCircle2 className="h-4 w-4" />
                        Hoàn tất lộ trình
                    </button>
                </div>
            </div>
            <LoadingOverlay isOpen={loading} />
        </div>
    )
}
