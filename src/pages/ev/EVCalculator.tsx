import { useState, useEffect } from 'react'
import HeaderBar from '../../components/layout/HeaderBar'
import {
    Calculator,
    Battery,
    Zap,
    Car,
    Settings,
    ArrowRight,
    Activity,
    Info,
    TrendingDown,
    Coins,
    RefreshCw
} from 'lucide-react'
import { useVehicleStore } from '../../store/useVehicleStore'
import { useVehicle, useVehicleCharging } from '../../lib/ev/useVehicleQueries'
import { useAppearance } from '../../contexts/AppearanceContext'

export default function EVCalculator() {
    const { isDarkMode } = useAppearance()
    // 1. Cài đặt thông số xe (Global)
    const [battery, setBattery] = useState<number>(37.23) // Mặc định VF5
    const [price, setPrice] = useState<number>(3858) // Mặc định giá VN

    // 2. Kịch bản 1: Tính hiệu suất vận hành (Trip Efficiency)
    const [odoKm, setOdoKm] = useState<number | ''>('')
    const [totalKwh, setTotalKwh] = useState<number | ''>('')

    // 3. Kịch bản 2: Tính hiệu suất sạc (Charging Efficiency)
    const [startSoc, setStartSoc] = useState<number | ''>('')
    const [endSoc, setEndSoc] = useState<number | ''>('')
    const [actualKwh, setActualKwh] = useState<number | ''>('')

    // --- AUTO FETCH LẤY TỪ HỆ THỐNG ---
    const { selectedVehicleId } = useVehicleStore()
    const { data: vehicle } = useVehicle(selectedVehicleId || undefined)
    const { data: fuelLogs } = useVehicleCharging(selectedVehicleId || undefined)

    const syncAutoData = () => {
        if (vehicle) {
            setOdoKm(vehicle.current_odometer || 0)
        }
        if (fuelLogs) {
            const electricLogs = fuelLogs.filter(log => log.fuel_type === 'electric' || log.fuel_category === 'electric')
            let sumKwh: number | '' = electricLogs.length > 0 ? electricLogs.reduce((sum, l) => sum + (l.kwh || 0), 0) : ''
            if (typeof sumKwh === 'number') {
                sumKwh = Number(sumKwh.toFixed(1))
            }
            setTotalKwh(sumKwh)
        }
    }

    // Auto sync on mount / data load if empty
    useEffect(() => {
        if (odoKm === '' && totalKwh === '') {
            syncAutoData()
        }
    }, [vehicle, fuelLogs])


    // --- LOGIC TÍNH TOÁN ---
    const bat = Number(battery) || 0
    const prc = Number(price) || 0

    // Kết quả 1: Hiệu suất đi lại
    const tripOdo = Number(odoKm) || 0
    const tripKwh = Number(totalKwh) || 0

    const kmPerKwh = (tripOdo > 0 && tripKwh > 0) ? (tripOdo / tripKwh) : 0
    const kwhPer100km = kmPerKwh > 0 ? (100 / kmPerKwh) : 0
    const fullRange = kmPerKwh * bat
    const costPerKm = (tripOdo > 0 && tripKwh > 0) ? (tripKwh * prc / tripOdo) : 0

    // Kết quả 2: Hiệu suất sạc
    const sSoc = Number(startSoc) || 0
    const eSoc = Number(endSoc) || 0
    const aKwh = Number(actualKwh) || 0

    const deltaSoc = Math.max(0, eSoc - sSoc)
    const kwhTheoretical = (bat * deltaSoc) / 100
    const chargingEfficiency = (aKwh > 0 && kwhTheoretical > 0) ? (kwhTheoretical / aKwh) * 100 : 0
    const kwhPerPercentActual = deltaSoc > 0 ? (aKwh / deltaSoc) : 0

    // Quy đổi cố định
    const kwhPerPercent = bat / 100
    const percentPerKwh = bat > 0 ? (1 / bat) * 100 : 0
    const kmPerPercent = kmPerKwh > 0 ? (kmPerKwh * kwhPerPercent) : 0

    const formatNum = (num: number, frac = 2) =>
        num.toLocaleString('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: frac
        })

    const resetTrip = () => { syncAutoData(); }
    const resetCharge = () => { setStartSoc(''); setEndSoc(''); setActualKwh(''); }

    const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900'
    const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500'

    return (
        <div className={`flex h-screen flex-col font-sans selection:bg-blue-100 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }}>
            <HeaderBar variant="page" title="Công cụ tính toán" />

            <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto px-4 py-4 space-y-4 pb-32">

                {/* 🏷️ SECTION: CORE SETTINGS (Pinned-style) */}
                <section className="animate-in fade-in slide-in-from-top duration-700">
                    <div className={`rounded-[24px] p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border relative overflow-hidden transition-all ${isDarkMode ? 'bg-[#1E293B] border-slate-700 shadow-black/20' : 'bg-white border-slate-200/50'}`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50/50'}`} />
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl shadow-lg transition-all ${isDarkMode ? 'bg-blue-600 shadow-black/20' : 'bg-gradient-to-br from-slate-800 to-slate-900 shadow-slate-200'}`}>
                                    <Settings className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className={`font-black text-lg leading-none ${textPrimary}`}>Cấu hình xe</h2>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${textSecondary}`}>Thông số pin & giá điện</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="group space-y-2">
                                <label className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-1 transition-colors group-focus-within:text-blue-500 ${textSecondary}`}>
                                    Pin (kWh)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={battery}
                                        onChange={e => setBattery(parseFloat(e.target.value) || 0)}
                                        className={`w-full border-2 border-transparent rounded-[20px] px-4 py-3.5 font-black focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-lg shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 text-slate-800 focus:bg-white'}`}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                        <Battery className={`h-5 w-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-900'}`} />
                                    </div>
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-1 transition-colors group-focus-within:text-green-500 ${textSecondary}`}>
                                    Giá điện (đ)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                                        className={`w-full border-2 border-transparent rounded-[20px] px-4 py-3.5 font-black focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all text-lg shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 text-slate-800 focus:bg-white'}`}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                        <Coins className={`h-5 w-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-900'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ⚡ SECTION: TRIP EFFICIENCY */}
                <section className="animate-in fade-in slide-in-from-bottom duration-700 delay-100">
                    <div className={`rounded-[28px] overflow-hidden shadow-[0_15px_50px_-12px_rgba(0,0,0,0.1)] border ring-1 transition-all ${isDarkMode ? 'bg-[#1E293B] border-slate-700 ring-slate-800 shadow-black/30' : 'bg-white border-slate-200/60 ring-slate-50'}`}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3.5 rounded-[22px] shadow-lg ring-4 transition-all ${isDarkMode ? 'bg-blue-600 shadow-black/20 ring-blue-500/10' : 'bg-blue-500 shadow-blue-200 ring-blue-50'}`}>
                                        <Activity className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className={`font-black text-lg leading-none ${textPrimary}`}>Vận hành</h2>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${textSecondary}`}>Tính chi phí & quãng đường</p>
                                    </div>
                                </div>
                                <button onClick={resetTrip} className={`p-2.5 transition-all active:scale-90 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500 hover:text-blue-400' : 'bg-slate-50/80 border-slate-100 text-slate-300 hover:text-blue-500'}`}>
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>

                             <div className="grid grid-cols-2 gap-5 mb-8">
                                <div className="space-y-2.5">
                                    <label className={`text-[10px] font-black uppercase tracking-widest px-2 ${textSecondary}`}>Quãng đường</label>
                                    <div className={`relative border-b-2 transition-colors pb-1 ${isDarkMode ? 'border-slate-700 focus-within:border-blue-500' : 'border-slate-100 focus-within:border-blue-500'}`}>
                                        <input
                                            type="number"
                                            value={odoKm}
                                            onChange={e => setOdoKm(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder="Nhập số km"
                                            className={`w-full bg-transparent px-2 py-2 text-2xl font-black focus:outline-none ${isDarkMode ? 'text-slate-100 placeholder:text-slate-700' : 'text-slate-800 placeholder:text-slate-200'}`}
                                        />
                                        <span className={`absolute right-2 bottom-3 text-[10px] font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>KM</span>
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <label className={`text-[10px] font-black uppercase tracking-widest px-2 ${textSecondary}`}>Điện tiêu thụ</label>
                                    <div className={`relative border-b-2 transition-colors pb-1 ${isDarkMode ? 'border-slate-700 focus-within:border-blue-600' : 'border-slate-100 focus-within:border-blue-600'}`}>
                                        <input
                                            type="number"
                                            value={totalKwh}
                                            onChange={e => setTotalKwh(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder="Nhập số KWH"
                                            className={`w-full bg-transparent px-2 py-2 text-2xl font-black focus:outline-none ${isDarkMode ? 'text-slate-100 placeholder:text-slate-700' : 'text-slate-800 placeholder:text-slate-200'}`}
                                        />
                                        <span className={`absolute right-2 bottom-3 text-[10px] font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>KWH</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {kmPerKwh > 0 ? (
                            <div className={`rounded-[28px] p-7 m-1 text-white shadow-2xl transition-all overflow-hidden relative ${isDarkMode ? 'bg-[#0F172A] shadow-black/50 border border-slate-800' : 'bg-slate-900 shadow-slate-900/30'}`}>
                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                    <Zap className="h-32 w-32" />
                                </div>

                                <div className="grid grid-cols-1 gap-8 relative z-10">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-6">
                                        <div>
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Hiệu suất vận hành</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black tracking-tighter">{formatNum(kmPerKwh)}</span>
                                                <span className="text-sm font-bold text-white/50">km/kWh</span>
                                            </div>
                                        </div>
                                        <div className="bg-blue-500/20 p-4 rounded-3xl backdrop-blur-md border border-white/10">
                                            <TrendingDown className="h-7 w-7 text-blue-400" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-blue-300/60 uppercase">Chi phí</p>
                                                <p className="text-xl font-black">{formatNum(costPerKm, 0)}<span className="text-[10px] ml-1 opacity-50">đ/km</span></p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-orange-300/60 uppercase">Tiêu hao</p>
                                                <p className="text-xl font-black">{formatNum(kwhPer100km)}<span className="text-[10px] ml-1 opacity-50">kWh/100</span></p>
                                            </div>
                                        </div>
                                        <div className={`rounded-[28px] p-5 flex flex-col justify-center border transition-all ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white/5 border-white/5'}`}>
                                            <p className={`text-[9px] font-black text-center uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Tầm vận hành Max</p>
                                            <p className="text-3xl font-black text-center text-green-400">{formatNum(fullRange, 0)}</p>
                                            <p className="text-[10px] font-bold text-center text-green-400/50 uppercase mt-1">Km dự kiến</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`m-4 border-2 border-dashed rounded-[32px] py-12 px-6 text-center animate-pulse transition-all ${isDarkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                <div className={`p-4 rounded-full w-fit mx-auto shadow-sm mb-4 transition-all ${isDarkMode ? 'bg-slate-800 text-slate-600 shadow-black/20' : 'bg-white text-slate-300'}`}>
                                    <Info className="h-6 w-6" />
                                </div>
                                <p className={`text-sm font-black font-mono tracking-tight uppercase ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>Đang chờ nhập liệu...</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 🔌 SECTION: CHARGING EFFICIENCY */}
                <section className="animate-in fade-in slide-in-from-bottom duration-700 delay-200">
                    <div className={`rounded-[28px] p-6 shadow-[0_15px_50px_-12px_rgba(0,0,0,0.1)] border ring-1 transition-all ${isDarkMode ? 'bg-[#1E293B] border-slate-700 ring-slate-800 shadow-black/30' : 'bg-white border-slate-200/60 ring-slate-50'}`}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`p-3.5 rounded-[22px] shadow-lg ring-4 transition-all ${isDarkMode ? 'bg-emerald-600 shadow-black/20 ring-emerald-500/10' : 'bg-emerald-500 shadow-emerald-200 ring-emerald-50'}`}>
                                    <Zap className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className={`font-black text-lg leading-none ${textPrimary}`}>Trạm Sạc</h2>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${textSecondary}`}>Tính hao hụt & thực tế</p>
                                </div>
                            </div>
                            <button onClick={resetCharge} className={`p-2.5 transition-all active:scale-90 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500 hover:text-emerald-400' : 'bg-slate-50/80 border-slate-100 text-slate-300 hover:text-emerald-500'}`}>
                                <RefreshCw className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest px-2 ${textSecondary}`}>Pin Đầu (%)</label>
                                    <input
                                        type="number"
                                        value={startSoc}
                                        onChange={e => setStartSoc(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className={`w-full border-2 border-transparent rounded-2xl px-4 py-3 font-black text-center focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-xl ${isDarkMode ? 'bg-slate-800 text-slate-100 focus:border-emerald-500' : 'bg-slate-50 text-slate-700 focus:border-emerald-500 focus:bg-white'}`}
                                    />
                                </div>
                                <div className="pt-6 flex-shrink-0">
                                    <ArrowRight className="h-6 w-6 text-slate-200" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest px-2 ${textSecondary}`}>Pin Cuối (%)</label>
                                    <input
                                        type="number"
                                        value={endSoc}
                                        onChange={e => setEndSoc(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className={`w-full border-2 border-transparent rounded-2xl px-4 py-3 font-black text-center focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-xl ${isDarkMode ? 'bg-slate-800 text-slate-100 focus:border-emerald-500' : 'bg-slate-50 text-slate-700 focus:border-emerald-500 focus:bg-white'}`}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest px-2 ${textSecondary}`}>Lượng điện vào thực tế (kWh)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={actualKwh}
                                        onChange={e => setActualKwh(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder="VD: 12.5"
                                        className={`w-full border-2 border-transparent rounded-[24px] px-6 py-4 font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-2xl shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100 placeholder:text-slate-700 focus:border-emerald-500' : 'bg-slate-50 text-slate-800 focus:border-emerald-500 focus:bg-white'}`}
                                    />
                                    <div className={`absolute right-6 top-1/2 -translate-y-1/2 font-black ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>KWH</div>
                                </div>
                            </div>
                        </div>

                        {deltaSoc > 0 && aKwh > 0 && (
                            <div className={`rounded-[32px] p-6 border relative overflow-hidden group transition-all ${isDarkMode ? 'bg-[#0F172A] border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                <div className={`absolute top-0 right-0 p-6 opacity-[0.03] transition-transform group-hover:scale-110 duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <Activity className="h-24 w-24" />
                                </div>

                                <div className="flex items-center justify-between mb-6">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Hiệu suất Sạc</p>
                                        <p className={`text-4xl font-black leading-none ${textPrimary}`}>{formatNum(chargingEfficiency)}<span className="text-lg opacity-40 ml-1">%</span></p>
                                    </div>
                                    <div className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase transition-all ${chargingEfficiency > 90 
                                        ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600') 
                                        : chargingEfficiency > 80 
                                            ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') 
                                            : (isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600')}`}>
                                        {chargingEfficiency > 90 ? 'Tối ưu' : chargingEfficiency > 80 ? 'Khá tốt' : 'Hao hụt cao'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`backdrop-blur-sm p-4 rounded-2xl border shadow-sm space-y-1 transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-white'}`}>
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Hao hụt</p>
                                        <p className="text-lg font-black text-red-500">-{formatNum(100 - chargingEfficiency)}%</p>
                                    </div>
                                    <div className={`backdrop-blur-sm p-4 rounded-2xl border shadow-sm space-y-1 transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-white'}`}>
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Điện nạp/1%</p>
                                        <p className={`text-lg font-black ${textPrimary}`}>{formatNum(kwhPerPercentActual, 3)}</p>
                                    </div>
                                </div>

                                <div className={`mt-5 flex items-center justify-between px-2 pt-4 border-t transition-all ${isDarkMode ? 'border-slate-800' : 'border-slate-200/50'}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        <span className={`text-[10px] font-bold ${textSecondary}`}>Lý thuyết: {formatNum(kwhTheoretical)} kWh</span>
                                    </div>
                                    <span className={`text-[11px] font-black ${textPrimary}`}>{formatNum(aKwh * prc, 0)} <span className="text-[9px] font-bold opacity-50">VNĐ</span></span>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* 🔢 SECTION: QUICK CALCULATIONS */}
                <section className="animate-in fade-in slide-in-from-bottom duration-700 delay-300">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-2xl shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 shadow-black/20' : 'bg-white'}`}>
                                    <Calculator className="h-5 w-5 text-indigo-500" />
                                </div>
                                <h3 className={`font-black text-lg ${textPrimary}`}>Quy đổi nhanh</h3>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>Tự động</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { icon: Battery, label: '1% Pin =', val: formatNum(kwhPerPercent, 4), unit: 'kWh', color: 'text-indigo-500' },
                                { icon: Zap, label: '1 kWh =', val: formatNum(percentPerKwh, 2), unit: '% pin', color: 'text-amber-500' },
                                { icon: Car, label: '1% đi được', val: kmPerKwh > 0 ? formatNum(kmPerPercent, 2) : '--', unit: 'km', color: 'text-blue-500' },
                                { icon: Coins, label: 'Chi phí/km', val: kmPerKwh > 0 ? formatNum(prc / kmPerKwh, 0) : '--', unit: 'đ', color: 'text-emerald-500' }
                            ].map((item, idx) => (
                                <div key={idx} className={`rounded-[24px] p-5 shadow-[0_8px_25px_-5px_rgba(0,0,0,0.06)] border group hover:scale-[1.03] transition-all cursor-pointer ${isDarkMode ? 'bg-[#1E293B] border-slate-700 shadow-black/20' : 'bg-white border-slate-100'}`}>
                                    <div className={`p-2 w-fit rounded-lg mb-3 ${isDarkMode ? (item.color.replace('text', 'bg').replace('500', '500/20')) : (item.color.replace('text', 'bg').replace('500', '50'))}`}>
                                        <item.icon className={`h-4 w-4 ${item.color}`} />
                                    </div>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${textSecondary}`}>{item.label}</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`text-xl font-black ${textPrimary}`}>{item.val}</span>
                                        <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>{item.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 📋 SECTION: LOOKUP TABLES */}
                <section className="animate-in fade-in slide-in-from-bottom duration-700 delay-400">
                    <div className={`rounded-[28px] p-1 shadow-[0_15px_50px_-12px_rgba(0,0,0,0.1)] border ring-1 transition-all ${isDarkMode ? 'bg-[#1E293B] border-slate-700 ring-slate-800 shadow-black/30' : 'bg-white border-slate-200/60 ring-slate-50'}`}>
                        <div className="p-6">
                            <h3 className={`font-black text-lg mb-6 px-1 flex items-center gap-3 ${textPrimary}`}>
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                Theo dõi mức Pin
                            </h3>

                            <div className="space-y-1.5">
                                <div className={`grid grid-cols-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest mb-2 transition-all ${isDarkMode ? 'bg-slate-800/50 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                                    <div className="text-left">Mức Pin</div>
                                    <div className="text-center">Dung lượng</div>
                                    <div className="text-right">Ước tính</div>
                                </div>
                                {[1, 10, 20, 50, 80, 100].map(pct => (
                                    <div key={pct} className={`grid grid-cols-3 px-6 py-4 rounded-[20px] border border-transparent transition-all group ${isDarkMode ? 'bg-slate-800/30 hover:bg-slate-800 hover:border-slate-700' : 'bg-white hover:bg-slate-50 hover:border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-6 w-1 rounded-full ${pct <= 20 ? 'bg-red-400' : pct <= 50 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                            <span className={`font-black ${textPrimary}`}>{pct}%</span>
                                        </div>
                                        <div className="text-center">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatNum(kwhPerPercent * pct)}</span>
                                            <span className={`text-[9px] font-bold ml-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>KWH</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{kmPerKwh > 0 ? formatNum(kmPerPercent * pct, 0) : '--'}</span>
                                            <span className={`text-[9px] font-black uppercase ml-1 ${isDarkMode ? 'text-blue-900' : 'text-blue-200'}`}>KM</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    )
}
