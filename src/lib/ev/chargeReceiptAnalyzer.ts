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
    const full = rawText

    // ── DATE ────────────────────────────────────────────────
    const datePatterns: { re: RegExp; fn: (m: RegExpMatchArray) => string }[] = [
        // "24 Th2, 2026" or "18 Th4, 2026"
        {
            re: /(\d{1,2})\s+Th(?:áng)?\s*(\d{1,2})[,.]?\s*(\d{4})/i,
            fn: m => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
        },
        // "24/02/2026"
        {
            re: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            fn: m => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
        },
        // ISO "2026-02-24"
        {
            re: /(\d{4}-\d{2}-\d{2})/,
            fn: m => m[1],
        },
    ]
    for (const { re, fn } of datePatterns) {
        const m = full.match(re)
        if (m) { result.date = fn(m); break }
    }

    // ── TIME (start & end of charging) ─────────────────────────────
    // Prefer explicit "Cắm sạc từ: 20:02 - 20:34"
    const timeRe = /(?:cắm sạc từ|bắt đầu|thời gian)[^\d]*(\d{1,2}:\d{2})(?:[^\d]+(\d{1,2}:\d{2}))?/i
    const timeMatch = full.match(timeRe)
    if (timeMatch) {
        result.time = timeMatch[1]
        if (timeMatch[2]) result.endTime = timeMatch[2]
    } else {
        // Fallback: search for stand alone time format like 21:21
        const fallback = full.match(/\b(\d{1,2}:\d{2})\b/)
        if (fallback) result.time = fallback[1]
    }

    // ── KWH ─────────────────────────────────────────────────
    // "27,1 kWh" or "27.1 kWh"
    const kwhMatch = full.match(/(\d+[,.]?\d*)\s*kWh/i)
    if (kwhMatch) result.kwh = parseFloat(kwhMatch[1].replace(',', '.'))

    // ── MONEY helper ─────────────────────────────────────────
    // Correctly parses line like "Phí sạc thực tế 20:02 - 20:34 92.978 đ" without picking up 20:02
    const parseMoney = (s: string): number | undefined => {
        // Erase any time-like pattern HH:MM to avoid matching it as a number
        const sNoTime = s.replace(/\b\d{1,2}:\d{2}\b/g, '')
        // Extract all numeric substrings
        const matches = [...sNoTime.matchAll(/\d[0-9.,]*/g)]
        if (!matches.length) return undefined
        
        // Take the last extracted number
        const lastMatch = matches[matches.length - 1][0]
        const clean = lastMatch.replace(/\./g, '').replace(',', '.')
        const n = parseFloat(clean)
        return isNaN(n) ? undefined : Math.round(n)
    }

    // ── TOTAL PAYMENT (after discounts) ─────────────────────
    for (const line of lines) {
        if (/tổng thanh toán/i.test(line)) {
            const v = parseMoney(line.replace(/tổng thanh toán/i, ''))
            if (v !== undefined) { result.totalPayment = v; break }
        }
    }

    // ── CHARGE AMOUNT (before discounts / gross fee) ─────────
    for (const line of lines) {
        if (/phí sạc thực tế|charge.*fee|phí điện|tạm tính/i.test(line)) {
            const v = parseMoney(line)
            if (v !== undefined && v > 0) { result.chargeAmount = v; break }
        }
    }
    // Fallback if not found: "Tổng ... 104.552" (excluding "Tổng thanh toán")
    if (result.chargeAmount === undefined) {
        for (const line of lines) {
            if (/^tổng\s/i.test(line) && !/thanh toán/i.test(line)) {
                const v = parseMoney(line)
                if (v !== undefined && v > 0) { result.chargeAmount = v; break }
            }
        }
    }

    // ── STATION NAME / ADDRESS ───────────────────────────────
    for (const line of lines) {
        if (/địa chỉ[:\s]/i.test(line)) {
            // Take multiple lines if it wrapped but let's just grab the whole line text cleanly
            result.stationName = line.replace(/địa chỉ[:\s]*/i, '').trim()
            break
        }
    }
    if (!result.stationName && /vinfast/i.test(full)) {
        result.stationName = 'Trạm sạc VinFast'
    }

    // ── UNIT PRICE (back-calculated) ─────────────────────────
    const cost = result.chargeAmount ?? result.totalPayment
    if (cost !== undefined && cost > 0 && result.kwh && result.kwh > 0) {
        result.unitPrice = Math.round(cost / result.kwh)
        // Adjust for common price points slightly off due to float rounding
        if (Math.abs(result.unitPrice - 3858) < 5) result.unitPrice = 3858
        else if (Math.abs(result.unitPrice - 3355) < 5) result.unitPrice = 3355
    }

    // ── SUMMARY ─────────────────────────────────────────────
    const parts: string[] = []
    if (result.date)
        parts.push(`Ngày ${new Date(result.date).toLocaleDateString('vi-VN')}`)
    if (result.kwh) parts.push(`${result.kwh} kWh`)
    if (result.totalPayment !== undefined)
        parts.push(`${result.totalPayment.toLocaleString('vi-VN')} đ`)
    else if (result.chargeAmount !== undefined)
        parts.push(`${result.chargeAmount.toLocaleString('vi-VN')} đ`)
        
    if (result.stationName) {
        // truncate station name in summary
        let name = result.stationName
        if (name.length > 25) name = name.substring(0, 25) + '...'
        parts.push(name)
    }

    result.summary = parts.length
        ? `Đọc được: ${parts.join(' · ')}`
        : 'OCR hoàn tất — kiểm tra lại dữ liệu nhé'

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
