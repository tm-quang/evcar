/**
 * Charge Receipt Analyzer — Tesseract.js OCR (free, no API key)
 * ─────────────────────────────────────────────────────────────
 * Runs 100% in the browser using Tesseract.js OCR.
 * - No API key, no registration, no cost
 * - Vietnamese model (~4MB, cached in IndexedDB after first use)
 * - Parses VinFast / general EV charging receipts with optimized canvas resizing
 */

export interface ChargeReceiptData {
    /** YYYY-MM-DD */
    date?: string
    /** HH:MM (24h) */
    time?: string
    /** HH:MM (24h) */
    endTime?: string
    /** kWh consumed */
    kwh?: number
    /** VND per kWh (back-calculated) */
    unitPrice?: number
    /** Total payment AFTER discounts (VND) */
    totalPayment?: number
    /** Gross charge cost BEFORE discounts (VND) */
    chargeAmount?: number
    /** Charging station / address */
    stationName?: string
    /** Short Vietnamese summary of extracted data */
    summary?: string
}

// ─────────────────────────────────────────────────────────────
// PRE-PROCESSING HELPER
// ─────────────────────────────────────────────────────────────
function optimizeImageForOCR(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)
        
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            // Resize to max 1200px to speed up Tesseract drastically
            const MAX_DIM = 1200
            let { width, height } = img

            if (width > height) {
                if (width > MAX_DIM) {
                    height = Math.round(height * (MAX_DIM / width))
                    width = MAX_DIM
                }
            } else {
                if (height > MAX_DIM) {
                    width = Math.round(width * (MAX_DIM / height))
                    height = MAX_DIM
                }
            }

            canvas.width = width
            canvas.height = height

            if (ctx) {
                // Fill white background just in case of transparency
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, width, height)
                ctx.drawImage(img, 0, 0, width, height)
                
                // Return as base64 jpeg
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
                URL.revokeObjectURL(objectUrl)
                resolve(dataUrl)
            } else {
                resolve(objectUrl) // Fallback if no canvas context
            }
        }
        img.onerror = () => {
             URL.revokeObjectURL(objectUrl)
             reject(new Error('Lỗi định dạng ảnh (không thể đọc làm Canvas)'))
        }
        img.src = objectUrl
    })
}

// ─────────────────────────────────────────────────────────────
// PARSER — Vietnamese EV/VinFast receipt format
// ─────────────────────────────────────────────────────────────

/**
 * Parse raw OCR text from a Vietnamese EV charging receipt.
 * Handles formats produced by the VinFast app:
 */
function parseEVReceipt(rawText: string): ChargeReceiptData {
    const result: ChargeReceiptData = {}
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
    const full = rawText.replace(/\s+/g, ' ') // Flatten for better multi-line regex

    // ── DATE ────────────────────────────────────────────────
    const datePatterns: { re: RegExp; fn: (m: RegExpMatchArray) => string }[] = [
        // "3 Th5, 2026" or "24 Th12, 2026"
        {
            re: /(\d{1,2})\s+Th(?:áng)?\s*(\d{1,2})[,.]?\s*(\d{4})/i,
            fn: m => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
        },
        // "24/02/2026"
        {
            re: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            fn: m => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
        },
    ]
    for (const { re, fn } of datePatterns) {
        const m = full.match(re)
        if (m) { result.date = fn(m); break }
    }

    // ── TIME (start & end of charging) ─────────────────────────────
    // Pattern 1: "Cắm sạc từ: 15:29 - 15:57"
    const durationRe = /(?:cắm sạc từ|thời gian sạc|từ)[^\d]*(\d{1,2}[:h]\d{2})(?:\s*-\s*(\d{1,2}[:h]\d{2}))?/i
    const durationMatch = full.match(durationRe)
    
    if (durationMatch) {
        result.time = durationMatch[1].replace('h', ':')
        if (durationMatch[2]) result.endTime = durationMatch[2].replace('h', ':')
    } else {
        // Pattern 2: Start time often near the date "3 Th5, 2026 - 15:29"
        const startTimeNearDate = full.match(/\d{4}\s*-\s*(\d{1,2}:\d{2})/i)
        if (startTimeNearDate) {
            result.time = startTimeNearDate[1]
        }
    }

    // ── KWH ─────────────────────────────────────────────────
    // "19,16 kWh" or "19.16 kWh" or "Số điện đã sạc: 19,16"
    const kwhMatch = full.match(/(\d+[.,]\d+)\s*kWh/i) || 
                     full.match(/số điện đã sạc[^\d]*(\d+[.,]\d+)/i) ||
                     full.match(/(\d+[.,]\d+)\s*kw/i)
    if (kwhMatch) result.kwh = parseFloat(kwhMatch[1].replace(',', '.'))

    // ── MONEY helper ─────────────────────────────────────────
    const parseMoney = (s: string): number | undefined => {
        // Remove times (HH:MM) and common noise words to isolate money numbers
        const sClean = s.replace(/\b\d{1,2}[:h]\d{2}\b/g, '')
                        .replace(/[đdđ]$/i, '')
                        .replace(/[:\-]/g, ' ')
        
        const matches = [...sClean.matchAll(/\d[0-9.,]*/g)]
        if (!matches.length) return undefined
        
        // Take the most significant number (usually the longest one containing dots/commas)
        // In receipts, the money value is often the last number in the label line
        const lastMatch = matches[matches.length - 1][0]
        const clean = lastMatch.replace(/\./g, '').replace(',', '.')
        const n = parseFloat(clean)
        return isNaN(n) ? undefined : Math.round(n)
    }

    // ── CHARGE AMOUNT (Gross fee before discount) ────────────
    for (const line of lines) {
        if (/phí sạc thực tế|phí sạc|tổng[:\s]*$/i.test(line) || (/^tổng\b/i.test(line) && !/thanh toán/i.test(line))) {
            const v = parseMoney(line)
            if (v !== undefined && v > 500) { 
                result.chargeAmount = v
                break
            }
        }
    }

    // ── TOTAL PAYMENT (Net fee after discount) ───────────────
    for (const line of lines) {
        if (/tổng thanh toán/i.test(line)) {
            const v = parseMoney(line)
            if (v !== undefined) { result.totalPayment = v; break }
        }
    }

    // ── STATION NAME / ADDRESS ───────────────────────────────
    for (let i = 0; i < lines.length; i++) {
        if (/địa chỉ[:\s]/i.test(lines[i])) {
            let addr = lines[i].replace(/địa chỉ[:\s]*/i, '').trim()
            // Check if address continues on the next line (often the case for long addresses)
            if (i + 1 < lines.length && !/[:\-]/.test(lines[i+1]) && lines[i+1].length > 5) {
                addr += ' ' + lines[i+1]
            }
            result.stationName = addr
            break
        }
    }

    // ── UNIT PRICE (back-calculated) ─────────────────────────
    const cost = result.chargeAmount ?? result.totalPayment
    if (cost !== undefined && cost > 0 && result.kwh && result.kwh > 0) {
        result.unitPrice = Math.round(cost / result.kwh)
        if (Math.abs(result.unitPrice - 3858) < 10) result.unitPrice = 3858
        else if (Math.abs(result.unitPrice - 3355) < 10) result.unitPrice = 3355
    }

    // ── SUMMARY ─────────────────────────────────────────────
    const parts: string[] = []
    if (result.date) parts.push(`Ngày ${result.date.split('-').reverse().join('/')}`)
    if (result.kwh) parts.push(`${result.kwh} kWh`)
    if (result.chargeAmount !== undefined) parts.push(`${result.chargeAmount.toLocaleString('vi-VN')}đ`)
    if (result.endTime && result.time) parts.push(`${result.time}-${result.endTime}`)
    
    result.summary = parts.length
        ? `Đã đọc: ${parts.join(' · ')}`
        : 'Không tìm thấy dữ liệu sạc rõ ràng'

    return result
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Analyze a charging receipt image using Tesseract.js OCR.
 *
 * - No API key required
 * - Implements canvas downscaling to make processing 3x+ faster
 * - Uses 4.0.0_fast model for better performance vs accuracy tradeoff
 *
 * @param imageFile  The receipt image selected by the user
 */
export async function analyzeChargeReceipt(imageFile: File): Promise<ChargeReceiptData> {
    if (!imageFile.type.startsWith('image/')) {
        throw new Error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP...)')
    }
    
    // Dynamic import to only load when needed
    const { createWorker } = await import('tesseract.js')

    // Prepare image specifically for Tesseract to skip its heavy pre-processing
    const processedImageDataUrl = await optimizeImageForOCR(imageFile)

    const worker = await createWorker('vie', 1, {
        workerPath: 'https://unpkg.com/tesseract.js@6/dist/worker.min.js',
        corePath: 'https://unpkg.com/tesseract.js-core@6/tesseract-core-simd-lstm.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
        cacheMethod: 'indexeddb', // persist language model across sessions
        logger: (m) => {
            // Logging progress for debugging if needed (could be bound to UI later)
            if (m.status === 'recognizing text') {
                 // console.log(`[Scan] ${Math.round(m.progress * 100)}%`)
            }
        },
    })

    try {
        const { data: { text } } = await worker.recognize(processedImageDataUrl)
        await worker.terminate()
        return parseEVReceipt(text)
    } catch (err) {
        await worker.terminate()
        throw new Error('Lỗi trong quá trình nhận diện chữ: ' + (err instanceof Error ? err.message : String(err)))
    }
}
