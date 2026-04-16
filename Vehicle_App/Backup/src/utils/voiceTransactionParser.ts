/**
 * Voice Transaction Parser
 * Parse giọng nói thành thông tin giao dịch
 */

// Voice recognition service for transactions with real-time transcript support

// Extend VoiceRecognitionOptions to support real-time transcript
export interface VoiceRecognitionOptions {
  onResult: (interimTranscript: string, finalTranscript?: string) => void
  onError?: (error: Error) => void
  onStart?: () => void
  onEnd?: () => void
  language?: string
  continuous?: boolean
}

export class VoiceRecognitionService {
  private recognition: any = null
  private isSupported: boolean = false
  private isListening: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      this.isSupported = !!SpeechRecognition

      if (this.isSupported) {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.lang = 'vi-VN'
      }
    }
  }

  isBrowserSupported(): boolean {
    return this.isSupported
  }

  start(options: VoiceRecognitionOptions): void {
    if (!this.isSupported) {
      options.onError?.(new Error('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói'))
      return
    }

    if (this.isListening) {
      this.stop()
    }

    this.recognition.lang = options.language || 'vi-VN'
    this.recognition.continuous = options.continuous !== false

    this.recognition.onstart = () => {
      this.isListening = true
      options.onStart?.()
    }

    this.recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      // Call callback with both interim and final transcripts
      if (interimTranscript || finalTranscript) {
        options.onResult(interimTranscript, finalTranscript.trim() || undefined)
      }
    }

    this.recognition.onerror = (event: any) => {
      this.isListening = false
      let errorMessage = 'Lỗi nhận diện giọng nói'
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Không phát hiện giọng nói'
          break
        case 'audio-capture':
          errorMessage = 'Không thể truy cập microphone'
          break
        case 'not-allowed':
          errorMessage = 'Quyền truy cập microphone bị từ chối'
          break
        case 'network':
          errorMessage = 'Lỗi kết nối mạng'
          break
        default:
          errorMessage = `Lỗi: ${event.error}`
      }

      options.onError?.(new Error(errorMessage))
    }

    this.recognition.onend = () => {
      this.isListening = false
      options.onEnd?.()
    }

    try {
      this.recognition.start()
    } catch (error) {
      options.onError?.(new Error('Không thể bắt đầu nhận diện giọng nói'))
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
      } catch (error) {
        // Ignore errors when stopping
      }
      this.isListening = false
    }
  }

  getIsListening(): boolean {
    return this.isListening
  }
}

// Singleton instance
export const voiceRecognitionService = new VoiceRecognitionService()

/**
 * Chuyển số bằng chữ tiếng Việt thành số
 */
function wordToNumber(word: string): number | null {
  const numberMap: Record<string, number> = {
    'không': 0,
    'một': 1,
    'hai': 2,
    'ba': 3,
    'bốn': 4,
    'năm': 5,
    'sáu': 6,
    'bảy': 7,
    'tám': 8,
    'chín': 9,
    'mười': 10,
    'hai mươi': 20,
    'ba mươi': 30,
    'bốn mươi': 40,
    'năm mươi': 50,
    'sáu mươi': 60,
    'bảy mươi': 70,
    'tám mươi': 80,
    'chín mươi': 90,
  }

  // Hỗ trợ số lớn
  const bigNumbers: Record<string, number> = {
    'mười': 10,
    'hai mươi': 20,
    'ba mươi': 30,
    'bốn mươi': 40,
    'năm mươi': 50,
    'sáu mươi': 60,
    'bảy mươi': 70,
    'tám mươi': 80,
    'chín mươi': 90,
    'một trăm': 100,
    'hai trăm': 200,
    'ba trăm': 300,
    'bốn trăm': 400,
    'năm trăm': 500,
    'sáu trăm': 600,
    'bảy trăm': 700,
    'tám trăm': 800,
    'chín trăm': 900,
    'một nghìn': 1000,
    'một ngàn': 1000,
    'hai nghìn': 2000,
    'hai ngàn': 2000,
    'ba nghìn': 3000,
    'ba ngàn': 3000,
    'năm nghìn': 5000,
    'năm ngàn': 5000,
    'mười nghìn': 10000,
    'mười ngàn': 10000,
    'hai mươi nghìn': 20000,
    'hai mươi ngàn': 20000,
    'năm mươi nghìn': 50000,
    'năm mươi ngàn': 50000,
    'một trăm nghìn': 100000,
    'một trăm ngàn': 100000,
    'hai trăm nghìn': 200000,
    'hai trăm ngàn': 200000,
    'năm trăm nghìn': 500000,
    'năm trăm ngàn': 500000,
    'một triệu': 1000000,
    'hai triệu': 2000000,
    'năm triệu': 5000000,
  }

  const lowerWord = word.toLowerCase().trim()
  
  // Check big numbers first
  if (bigNumbers[lowerWord]) {
    return bigNumbers[lowerWord]
  }

  // Check single numbers
  if (numberMap[lowerWord]) {
    return numberMap[lowerWord]
  }

  // Try to parse compound numbers like "mười một", "hai mươi lăm"
  const parts = lowerWord.split(/\s+/)
  if (parts.length === 2) {
    const first = numberMap[parts[0]]
    const second = numberMap[parts[1]]
    if (first && second) {
      return first + second
    }
  }

  return null
}

/**
 * Parse số tiền từ text
 * Hỗ trợ: "một trăm nghìn", "100000", "100.000", "100,000", "một trăm ngàn đồng"
 */
function parseAmount(text: string): number | null {
  const normalizedText = text.toLowerCase().trim()
  
  // Loại bỏ "đồng", "vnđ", "vnd"
  const cleanText = normalizedText
    .replace(/\s*(đồng|vnđ|vnd)\s*/gi, '')
    .replace(/[.,]/g, '') // Loại bỏ dấu phân cách
  
  // Tìm số arabic trước
  const numberMatch = cleanText.match(/(\d+)/)
  if (numberMatch) {
    const amount = parseInt(numberMatch[1], 10)
    if (!isNaN(amount) && amount > 0) {
      return amount
    }
  }

  // Tìm số bằng chữ
  const amountPatterns = [
    /(một trăm nghìn|một trăm ngàn|100 nghìn|100 ngàn)/i,
    /(hai trăm nghìn|hai trăm ngàn|200 nghìn|200 ngàn)/i,
    /(năm trăm nghìn|năm trăm ngàn|500 nghìn|500 ngàn)/i,
    /(một triệu|1 triệu)/i,
    /(hai triệu|2 triệu)/i,
    /(năm triệu|5 triệu)/i,
    /(\d+)\s*(nghìn|ngàn|k)/i,
    /(\d+)\s*(triệu|m)/i,
  ]

  for (const pattern of amountPatterns) {
    const match = cleanText.match(pattern)
    if (match) {
      const matchText = match[0].toLowerCase()
      
      // Handle "một trăm nghìn"
      if (matchText.includes('một trăm nghìn') || matchText.includes('một trăm ngàn')) {
        return 100000
      }
      if (matchText.includes('hai trăm nghìn') || matchText.includes('hai trăm ngàn')) {
        return 200000
      }
      if (matchText.includes('năm trăm nghìn') || matchText.includes('năm trăm ngàn')) {
        return 500000
      }
      if (matchText.includes('một triệu')) {
        return 1000000
      }
      if (matchText.includes('hai triệu')) {
        return 2000000
      }
      if (matchText.includes('năm triệu')) {
        return 5000000
      }

      // Handle "100 nghìn", "50 nghìn"
      const numMatch = matchText.match(/(\d+)/)
      if (numMatch) {
        const num = parseInt(numMatch[1], 10)
        if (matchText.includes('triệu') || matchText.includes('m')) {
          return num * 1000000
        }
        if (matchText.includes('nghìn') || matchText.includes('ngàn') || matchText.includes('k')) {
          return num * 1000
        }
      }
    }
  }

  // Try word-to-number conversion
  const words = cleanText.split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    
    if (word === 'nghìn' || word === 'ngàn') {
      const prevWord = words[i - 1]
      if (prevWord) {
        const num = wordToNumber(prevWord) || parseInt(prevWord, 10)
        if (!isNaN(num)) {
          return num * 1000
        }
      }
    }
    
    if (word === 'triệu') {
      const prevWord = words[i - 1]
      if (prevWord) {
        const num = wordToNumber(prevWord) || parseInt(prevWord, 10)
        if (!isNaN(num)) {
          return num * 1000000
        }
      }
    }
  }

  return null
}

/**
 * Parse loại giao dịch (Thu/Chi)
 */
function parseTransactionType(text: string): 'Thu' | 'Chi' {
  const normalizedText = text.toLowerCase()
  
  // Keywords cho khoản thu
  const incomeKeywords = ['thu', 'nhận', 'nhận được', 'lương', 'tiền lương', 'tiền thưởng']
  
  // Keywords cho khoản chi
  const expenseKeywords = ['chi', 'hết', 'mua', 'trả', 'thanh toán', 'đi', 'ăn']
  
  // Mặc định là Chi
  for (const keyword of incomeKeywords) {
    if (normalizedText.includes(keyword)) {
      return 'Thu'
    }
  }
  
  for (const keyword of expenseKeywords) {
    if (normalizedText.includes(keyword)) {
      return 'Chi'
    }
  }
  
  // Mặc định là Chi
  return 'Chi'
}

/**
 * Parse tên ví từ text
 */
function parseWallet(text: string): string | null {
  const normalizedText = text.toLowerCase()
  
  const walletKeywords: Record<string, string> = {
    'ngân hàng': 'ngân hàng',
    'tài khoản ngân hàng': 'ngân hàng',
    'tài khoản': 'ngân hàng',
    'tiền mặt': 'tiền mặt',
    'ví tiền mặt': 'tiền mặt',
    'cash': 'tiền mặt',
    'ví điện tử': 'ví điện tử',
    'momo': 'momo',
    'zalo pay': 'zalo pay',
    'zalopay': 'zalo pay',
  }
  
  for (const [keyword, walletName] of Object.entries(walletKeywords)) {
    if (normalizedText.includes(keyword)) {
      return walletName
    }
  }
  
  return null
}

/**
 * Parse hạng mục từ text
 */
function parseCategory(text: string): string | null {
  const normalizedText = text.toLowerCase()
  
  const categoryKeywords: Record<string, string> = {
    'siêu thị': 'Đi chợ, siêu thị',
    'chợ': 'Đi chợ, siêu thị',
    'đi chợ': 'Đi chợ, siêu thị',
    'ăn': 'Ăn uống',
    'ăn tiệm': 'Ăn tiệm, nhà hàng',
    'nhà hàng': 'Ăn tiệm, nhà hàng',
    'cafe': 'Đồ uống',
    'cà phê': 'Đồ uống',
    'xăng': 'Xăng, dầu',
    'dầu': 'Xăng, dầu',
    'nhiên liệu': 'Xăng, dầu',
  }
  
  for (const [keyword, categoryName] of Object.entries(categoryKeywords)) {
    if (normalizedText.includes(keyword)) {
      return categoryName
    }
  }
  
  return null
}

/**
 * Parse ngày giờ từ text
 */
function parseDateTime(text: string): string | null {
  const normalizedText = text.toLowerCase()
  
  // Check for "hôm nay", "hôm qua", "ngày mai"
  const today = new Date()
  
  if (normalizedText.includes('hôm nay') || normalizedText.includes('hôm nay')) {
    return today.toISOString().split('T')[0]
  }
  
  if (normalizedText.includes('hôm qua')) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }
  
  // Try to find date patterns: "30/11/2025", "30-11-2025"
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/
  const dateMatch = normalizedText.match(datePattern)
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10)
    const month = parseInt(dateMatch[2], 10)
    const year = parseInt(dateMatch[3], 10)
    const date = new Date(year, month - 1, day)
    return date.toISOString().split('T')[0]
  }
  
  // Default to today
  return today.toISOString().split('T')[0]
}

/**
 * Parse toàn bộ transaction từ giọng nói
 * Ví dụ: "Hôm nay tôi đi siêu thị hết một trăm nghìn đồng từ tài khoản ngân hàng"
 * 
 * @param text - Text từ giọng nói
 * @param categories - Danh sách categories để map từ tên sang ID
 * @param wallets - Danh sách wallets để map từ tên sang ID
 */
export function parseVoiceTransaction(
  text: string,
  categories?: Array<{ id: string; name: string }>,
  wallets?: Array<{ id: string; name: string }>
): {
  type: 'Thu' | 'Chi'
  amount: number
  category_id?: string
  wallet_id?: string
  transaction_date?: string
  description?: string
} | null {
  if (!text || text.trim().length === 0) {
    return null
  }

  const normalizedText = text.toLowerCase().trim()

  // Parse các thành phần
  const type = parseTransactionType(normalizedText)
  const amount = parseAmount(normalizedText)
  const walletName = parseWallet(normalizedText)
  const categoryName = parseCategory(normalizedText)
  const transactionDate = parseDateTime(normalizedText)

  // Amount là bắt buộc
  if (!amount || amount <= 0) {
    return null
  }

  // Map category name to ID
  let categoryId: string | undefined
  if (categoryName && categories) {
    const matchedCategory = categories.find(cat => {
      const catNameLower = cat.name.toLowerCase()
      return catNameLower === categoryName.toLowerCase() || 
             catNameLower.includes(categoryName.toLowerCase()) ||
             categoryName.toLowerCase().includes(catNameLower)
    })
    if (matchedCategory) {
      categoryId = matchedCategory.id
    }
  }

  // Map wallet name to ID
  let walletId: string | undefined
  if (walletName && wallets) {
    const matchedWallet = wallets.find(wallet => {
      const walletNameLower = wallet.name.toLowerCase()
      const parsedWalletNameLower = walletName.toLowerCase()
      return walletNameLower.includes(parsedWalletNameLower) ||
             parsedWalletNameLower.includes(walletNameLower)
    })
    if (matchedWallet) {
      walletId = matchedWallet.id
    }
  }

  // Extract description (toàn bộ text làm mô tả)
  const description = text.trim()

  return {
    type,
    amount,
    category_id: categoryId,
    wallet_id: walletId,
    transaction_date: transactionDate || undefined,
    description,
  }
}


