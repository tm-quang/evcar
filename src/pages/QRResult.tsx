import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaCopy, FaExternalLinkAlt, FaQrcode, FaCheck, FaTrash } from 'react-icons/fa'
import HeaderBar from '../components/layout/HeaderBar'
import { useNotification } from '../contexts/notificationContext.helpers'
import { isAndroidApp, startNativeScan, setupNativeScanCallback, cleanupNativeScanCallback } from '../utils/androidBridge'
import { startWebQRScan, stopWebQRScan } from '../utils/webQRScanner'

interface QRScanItem {
    id: string
    result: string
    timestamp: Date
}

const QRResultPage = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { success, error: showError } = useNotification()
    const [scanResults, setScanResults] = useState<QRScanItem[]>(() => {
        // Load from localStorage if available
        try {
            const saved = localStorage.getItem('qr-scan-history')
            if (saved) {
                const parsed = JSON.parse(saved)
                return parsed.map((item: { id: string; result: string; timestamp: string }) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }))
            }
        } catch (e) {
            console.error('Error loading QR history:', e)
        }
        return []
    })
    const [selectedResult, setSelectedResult] = useState<string>(() => {
        const stateResult = location.state?.scanResult
        const queryResult = new URLSearchParams(location.search).get('result')
        return stateResult || (queryResult ? decodeURIComponent(queryResult) : '')
    })
    const [isCopied, setIsCopied] = useState(false)
    const [isContinuousScanning, setIsContinuousScanning] = useState(false)
    const continuousScanTimeoutRef = useRef<number | null>(null)
    const lastScannedResultRef = useRef<string>('')

    // Update selectedResult when location state changes
    useEffect(() => {
        const stateResult = location.state?.scanResult
        const queryResult = new URLSearchParams(location.search).get('result')
        const newResult = stateResult || (queryResult ? decodeURIComponent(queryResult) : '')
        if (newResult && newResult !== selectedResult) {
            setSelectedResult(newResult)
            addScanResult(newResult)
        }
    }, [location.state, location.search, selectedResult])

    // Save to localStorage whenever scanResults changes
    useEffect(() => {
        try {
            localStorage.setItem('qr-scan-history', JSON.stringify(scanResults))
        } catch (e) {
            console.error('Error saving QR history:', e)
        }
    }, [scanResults])

    // Add scan result to list
    const addScanResult = useCallback((result: string) => {
        if (!result || result.trim() === '') return
        
        // Check if this result was just scanned (avoid duplicates from same scan)
        if (result === lastScannedResultRef.current) return
        
        lastScannedResultRef.current = result
        
        const newItem: QRScanItem = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            result: result.trim(),
            timestamp: new Date()
        }
        
        setScanResults(prev => {
            // Check if result already exists (avoid exact duplicates)
            const exists = prev.some(item => item.result === newItem.result)
            if (exists) return prev
            
            // Add to beginning of list
            return [newItem, ...prev].slice(0, 50) // Keep last 50 items
        })
        
        setSelectedResult(result)
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (continuousScanTimeoutRef.current) {
                clearTimeout(continuousScanTimeoutRef.current)
            }
            cleanupNativeScanCallback()
            stopWebQRScan()
        }
    }, [])

    const isValidUrl = (string: string) => {
        try {
            new URL(string)
            return true
        } catch {
            return false
        }
    }

    const handleCopy = async (text?: string) => {
        const textToCopy = text || currentResult
        if (!textToCopy) return
        try {
            await navigator.clipboard.writeText(textToCopy)
            setIsCopied(true)
            success('Đã sao chép vào clipboard')
            setTimeout(() => setIsCopied(false), 2000)
        } catch (_err) {
            console.error('Failed to copy:', _err)
            showError('Không thể sao chép')
        }
    }

    const handleOpenLink = (url?: string) => {
        const urlToOpen = url || currentResult
        if (urlToOpen && isValidUrl(urlToOpen)) {
            window.open(urlToOpen, '_blank', 'noopener,noreferrer')
        }
    }

    const handleScanQR = useCallback((continuous = false) => {
        const performNextScan = () => {
            if (continuousScanTimeoutRef.current) {
                clearTimeout(continuousScanTimeoutRef.current)
            }
            continuousScanTimeoutRef.current = window.setTimeout(() => {
                // Check if still in continuous mode
                setIsContinuousScanning(current => {
                    if (current) {
                        // Reset last scanned to allow same result to be scanned again after delay
                        lastScannedResultRef.current = ''
                        // Trigger next scan
                        if (isAndroidApp()) {
                            cleanupNativeScanCallback()
                            setupNativeScanCallback((result: string) => {
                                success('Đã quét mã thành công!')
                                addScanResult(result)
                                performNextScan()
                            })
                            startNativeScan()
                        } else {
                            startWebQRScan({
                                onSuccess: (result: string) => {
                                    success('Đã quét mã thành công!')
                                    addScanResult(result)
                                    performNextScan()
                                },
                                onError: (error: string) => {
                                    showError(error)
                                    setIsContinuousScanning(false)
                                }
                            })
                        }
                    }
                    return current
                })
            }, 1000)
        }

        if (isAndroidApp()) {
            cleanupNativeScanCallback()
            setupNativeScanCallback((result: string) => {
                success('Đã quét mã thành công!')
                addScanResult(result)
                
                if (continuous) {
                    performNextScan()
                } else {
                    cleanupNativeScanCallback()
                }
            })
            startNativeScan()
        } else {
            startWebQRScan({
                onSuccess: (result: string) => {
                    success('Đã quét mã thành công!')
                    addScanResult(result)
                    
                    if (continuous) {
                        performNextScan()
                    }
                },
                onError: (error: string) => {
                    showError(error)
                    setIsContinuousScanning(false)
                }
            })
        }
    }, [addScanResult, success, showError])

    const handleDeleteResult = (id: string) => {
        setScanResults(prev => prev.filter(item => item.id !== id))
        if (selectedResult && scanResults.find(item => item.id === id)?.result === selectedResult) {
            setSelectedResult('')
        }
    }

    const handleSelectResult = (result: string) => {
        setSelectedResult(result)
    }

    const currentResult = selectedResult || (scanResults.length > 0 ? scanResults[0].result : '')

    return (
        <div className="flex h-full flex-col bg-[#F7F9FC]">
            <HeaderBar
                variant="page"
                title="Kết quả quét QR"
                onBack={() => navigate('/settings')}
            />

            <main className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto max-w-md space-y-6">

                    {/* Scan Controls */}
                    <button
                        onClick={() => handleScanQR(false)}
                        disabled={isContinuousScanning}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-purple-600 p-4 font-bold text-white shadow-lg shadow-purple-200 transition-all hover:bg-purple-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaQrcode />
                        Quét tiếp QR
                    </button>

                    {/* Selected Result Card */}
                    {currentResult && (
                        <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-lg border border-slate-100">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-green-100 to-teal-50 opacity-50 blur-2xl" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-slate-800">Kết quả đang chọn</h2>
                                </div>
                                <div className="w-full rounded-2xl bg-slate-50 p-4 border border-slate-200 mb-4">
                                    <p className="break-all font-mono text-slate-600 text-sm">
                                        {currentResult}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {isValidUrl(currentResult) && (
                                        <button
                                            onClick={() => handleOpenLink()}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-95"
                                        >
                                            <FaExternalLinkAlt className="h-4 w-4" />
                                            Mở liên kết
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleCopy()}
                                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 border ${
                                            isCopied
                                                ? 'bg-green-50 text-green-600 border-green-200'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {isCopied ? <FaCheck className="h-4 w-4" /> : <FaCopy className="h-4 w-4" />}
                                        {isCopied ? 'Đã sao chép' : 'Sao chép'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scan Results List */}
                    {scanResults.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-slate-800 px-1">
                                Lịch sử quét ({scanResults.length})
                            </h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {scanResults.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`relative rounded-2xl bg-white p-4 shadow-md border transition-all ${
                                            currentResult === item.result
                                                ? 'border-purple-500 ring-2 ring-purple-200'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="break-all font-mono text-slate-700 text-sm mb-2">
                                                    {item.result}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {item.timestamp.toLocaleString('vi-VN', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => handleSelectResult(item.result)}
                                                    className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                                                    title="Chọn"
                                                >
                                                    <FaQrcode className="h-4 w-4" />
                                                </button>
                                                {isValidUrl(item.result) && (
                                                    <button
                                                        onClick={() => handleOpenLink(item.result)}
                                                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                        title="Mở liên kết"
                                                    >
                                                        <FaExternalLinkAlt className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleCopy(item.result)}
                                                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                                    title="Sao chép"
                                                >
                                                    <FaCopy className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteResult(item.id)}
                                                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                                    title="Xóa"
                                                >
                                                    <FaTrash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {scanResults.length === 0 && !currentResult && (
                        <div className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-lg border border-slate-100 text-center">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-purple-100 to-indigo-50 opacity-50 blur-2xl" />
                            <div className="relative z-10 flex flex-col items-center gap-4">
                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 text-purple-600 shadow-sm ring-4 ring-purple-50">
                                    <FaQrcode className="h-10 w-10" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">Chưa có kết quả quét</h2>
                                <p className="text-sm text-slate-500">Bấm nút bên trên để bắt đầu quét mã QR</p>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    )
}

export default QRResultPage

