/**
 * Charge Receipt Analyzer — Tesseract.js OCR (free, no API key)
 * ─────────────────────────────────────────────────────────────
 * Runs 100% in the browser using Tesseract.js OCR.
 * - No API key, no registration, no cost
 * - Vietnamese + English language models (~4MB, cached in IndexedDB after first use)
 * - Parses VinFast / general EV charging receipts
 */

export interface ChargeReceiptData {
    /** YYYY-MM-DD */
    date?: string
    /** HH:MM (24h) */
    time?: string
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
// PARSER — Vietnamese EV/VinFast receipt format
// ─────────────────────────────────────────────────────────────

/**
 * Parse raw OCR text from a Vietnamese EV charging receipt.
 * Handles formats produced by the VinFast app:
 *   "24 Th2, 2026 - 21:21"
 *   "Cắm sạc từ: 21:21 - 21:56"
 *   "Số điện đã sạc: 27,1 kWh"
 *   "Phí sạc thực tế ... 104.552 đ"
 *   "Tổng thanh toán ... 0 đ"
 *   "Địa chỉ: HKD Tài Phúc, QL80..."
 */
function parseEVReceipt(rawText: string): ChargeReceiptData {
    const result: ChargeReceiptData = {}
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
    const full = rawText

    // ── DATE ────────────────────────────────────────────────
    const datePatterns: { re: RegExp; fn: (m: RegExpMatchArray) => string }[] = [
        // "24 Th2, 2026" (VinFast app format)
        {
            re: /(\d{1,2})\s+Th(\d{1,2})[,.]?\s*(\d{4})/i,
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

    // ── TIME (start of charging) ─────────────────────────────
    // Prefer explicit "Cắm sạc từ" line, else first HH:MM in text
    const timeMatch =
        full.match(/(?:Cắm sạc từ|bắt đầu|start)[^\d]*(\d{1,2}:\d{2})/i) ??
        full.match(/\b(\d{1,2}:\d{2})\b/)
    if (timeMatch) result.time = timeMatch[1]

    // ── KWH ─────────────────────────────────────────────────
    // "27,1 kWh" or "27.1 kWh"
    const kwhMatch = full.match(/(\d+[,.]?\d*)\s*kWh/i)
    if (kwhMatch) result.kwh = parseFloat(kwhMatch[1].replace(',', '.'))

    // ── MONEY helper ─────────────────────────────────────────
    // "104.552 đ"  →  104552   |   "0 đ"  →  0
    const parseMoney = (s: string): number | undefined => {
        const m = s.match(/[\d.,]+/)
        if (!m) return undefined
        // Remove thousand separators (dots), convert comma decimal to dot
        const clean = m[0].replace(/\./g, '').replace(',', '.')
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
        if (/phí sạc thực tế|charge.*fee|phí điện/i.test(line)) {
            const v = parseMoney(line)
            if (v !== undefined && v > 0) { result.chargeAmount = v; break }
        }
        // Fallback "Tổng ... 104.552" (but not "Tổng thanh toán")
        if (!result.chargeAmount && /^tổng\s/i.test(line) && !/thanh toán/i.test(line)) {
            const v = parseMoney(line)
            if (v !== undefined && v > 0) result.chargeAmount = v
        }
    }

    // ── STATION NAME / ADDRESS ───────────────────────────────
    for (const line of lines) {
        if (/địa chỉ[:\s]/i.test(line)) {
            result.stationName = line.replace(/địa chỉ[:\s]*/i, '').trim()
            break
        }
    }
    if (!result.stationName && /vinfast/i.test(full)) {
        result.stationName = 'Trạm sạc VinFast'
    }

    // ── UNIT PRICE (back-calculated) ─────────────────────────
    const cost = result.totalPayment ?? result.chargeAmount
    if (cost !== undefined && cost > 0 && result.kwh && result.kwh > 0) {
        result.unitPrice = Math.round(cost / result.kwh)
    }

    // ── SUMMARY ─────────────────────────────────────────────
    const parts: string[] = []
    if (result.date)
        parts.push(`Ngày ${new Date(result.date).toLocaleDateString('vi-VN')}`)
    if (result.kwh) parts.push(`${result.kwh} kWh`)
    const displayCost = result.totalPayment ?? result.chargeAmount
    if (displayCost !== undefined)
        parts.push(`${displayCost.toLocaleString('vi-VN')} đ`)
    if (result.stationName) parts.push(result.stationName)

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
 * - Runs entirely in the browser
 * - First run downloads Vietnamese + English language models (~4MB)
 *   and caches them in IndexedDB for subsequent calls
 *
 * @param imageFile  The receipt image selected by the user
 */
export async function analyzeChargeReceipt(imageFile: File): Promise<ChargeReceiptData> {
    if (!imageFile.type.startsWith('image/')) {
        throw new Error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP...)')
    }
    if (imageFile.size > 15 * 1024 * 1024) {
        throw new Error('Ảnh quá lớn, vui lòng chọn ảnh dưới 15MB')
    }

    // Dynamic import — Tesseract bundle only loaded when actually needed
    const { createWorker } = await import('tesseract.js')

    const worker = await createWorker(['vie', 'eng'], 1, {
        workerPath: 'https://unpkg.com/tesseract.js@6/dist/worker.min.js',
        corePath: 'https://unpkg.com/tesseract.js-core@6/tesseract-core-simd-lstm.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0_best',
        cacheMethod: 'indexeddb', // persist language model across sessions
        logger: () => { /* silent */ },
    })

    try {
        const { data: { text } } = await worker.recognize(imageFile)
        await worker.terminate()
        return parseEVReceipt(text)
    } catch (err) {
        await worker.terminate()
        throw err
    }
}

