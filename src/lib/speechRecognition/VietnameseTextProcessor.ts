/**
 * Vietnamese Text Processor
 * Xử lý và cải thiện văn bản tiếng Việt từ speech recognition
 * - Sửa lỗi chính tả phổ biến
 * - Thêm dấu câu tự động
 * - Chuẩn hóa số và đơn vị
 * - Viết hoa đúng vị trí
 */

// Từ điển sửa lỗi chính tả phổ biến từ speech recognition
const SPELLING_CORRECTIONS: Record<string, string> = {
  // Lỗi dấu thanh
  'duoc': 'được',
  'khong': 'không',
  'cung': 'cũng',
  'nhung': 'nhưng',
  'nguoi': 'người',
  'the': 'thế',
  'nhu': 'như',
  'tu': 'từ',
  'da': 'đã',
  'dang': 'đang',
  'den': 'đến',
  'di': 'đi',
  'doi': 'đổi',
  'dong': 'đồng',
  'dau': 'đầu',
  'duong': 'đường',

  // Lỗi từ phổ biến
  'đc': 'được',
  'dc': 'được',
  'ko': 'không',
  'k': 'không',
  'vs': 'với',
  'j': 'gì',
  'z': 'vậy',
  'r': 'rồi',
  'ntn': 'như thế nào',
  'bt': 'biết',
  'ns': 'nói',
  'ck': 'chồng',
  'vk': 'vợ',

  // Lỗi số tiền
  'nghin': 'nghìn',
  'ngan': 'ngàn',
  'trieu': 'triệu',
  'ty': 'tỷ',

  // Từ hay bị nhận sai
  'tien': 'tiền',
  'chi': 'chi',
  'thu': 'thu',
  'mua': 'mua',
  'ban': 'bán',
  'an': 'ăn',
  'uong': 'uống',
  'di chuyen': 'di chuyển',
  'xang': 'xăng',
  'dau_xang': 'dầu xăng',
  'dien': 'điện',
  'nuoc': 'nước',
  'nha': 'nhà',
  'thue': 'thuê',
  'luong': 'lương',
  'thuong': 'thưởng',

  // Ngày tháng
  'thu hai': 'thứ hai',
  'thu ba': 'thứ ba',
  'thu tu': 'thứ tư',
  'thu nam': 'thứ năm',
  'thu sau': 'thứ sáu',
  'thu bay': 'thứ bảy',
  'chu nhat': 'chủ nhật',
  'hom nay': 'hôm nay',
  'hom qua': 'hôm qua',
  'ngay mai': 'ngày mai',

  // Danh mục chi tiêu phổ biến
  'an uong': 'ăn uống',
  'mua sam': 'mua sắm',
  'giai tri': 'giải trí',
  'suc khoe': 'sức khỏe',
  'giao duc': 'giáo dục',
  'di lai': 'đi lại',
  'cong viec': 'công việc',
  'gia dinh': 'gia đình',
  'ban be': 'bạn bè',

  // Các từ thường dùng trong tài chính
  'so du': 'số dư',
  'tai khoan': 'tài khoản',
  'chuyen khoan': 'chuyển khoản',
  'rut tien': 'rút tiền',
  'nap tien': 'nạp tiền',
  'thanh toan': 'thanh toán',
  'hoa don': 'hoá đơn',
  'ngan hang': 'ngân hàng',
  'the tin dung': 'thẻ tín dụng',
  'vi dien tu': 'ví điện tử',
}

// Từ điển chuyển số thành chữ số
const NUMBER_WORDS: Record<string, string> = {
  'không': '0',
  'một': '1',
  'hai': '2',
  'ba': '3',
  'bốn': '4',
  'năm': '5',
  'sáu': '6',
  'bảy': '7',
  'tám': '8',
  'chín': '9',
  'mười': '10',
  'mươi': '0',
  'trăm': '00',
  'nghìn': '000',
  'ngàn': '000',
  'triệu': '000000',
  'tỷ': '000000000',
}

// Các từ khoá gợi ý loại câu
const QUESTION_KEYWORDS = ['bao nhiêu', 'mấy', 'gì', 'nào', 'sao', 'ai', 'đâu', 'khi nào', 'tại sao', 'như thế nào', 'có không', 'phải không', 'được không', 'chưa', 'rồi chưa']
const EXCLAMATION_KEYWORDS = ['quá', 'lắm', 'ghê', 'thật', 'tuyệt vời', 'tuyệt', 'hay quá', 'đẹp quá', 'giỏi quá', 'ôi', 'chà', 'ồ', 'a ha', 'hura', 'wow']

export interface ProcessingOptions {
  autoCapitalize?: boolean
  autoPunctuation?: boolean
  spellCheck?: boolean
  convertNumbers?: boolean
}

export class VietnameseTextProcessor {
  private options: ProcessingOptions

  constructor(options: ProcessingOptions = {}) {
    this.options = {
      autoCapitalize: true,
      autoPunctuation: true,
      spellCheck: true,
      convertNumbers: false, // Mặc định tắt vì có thể gây nhầm lẫn
      ...options,
    }
  }

  /**
   * Xử lý văn bản hoàn chỉnh
   */
  process(text: string): string {
    if (!text || typeof text !== 'string') return ''

    let processed = text.trim()

    // 1. Chuẩn hoá khoảng trắng
    processed = this.normalizeWhitespace(processed)

    // 2. Sửa lỗi chính tả
    if (this.options.spellCheck) {
      processed = this.correctSpelling(processed)
    }

    // 3. Chuyển số (nếu bật)
    if (this.options.convertNumbers) {
      processed = this.convertNumberWords(processed)
    }

    // 4. Thêm dấu câu
    if (this.options.autoPunctuation) {
      processed = this.addPunctuation(processed)
    }

    // 5. Viết hoa
    if (this.options.autoCapitalize) {
      processed = this.capitalize(processed)
    }

    return processed
  }

  /**
   * Xử lý văn bản tạm thời (interim) - nhẹ hơn
   */
  processInterim(text: string): string {
    if (!text || typeof text !== 'string') return ''

    let processed = text.trim()

    // Chỉ chuẩn hoá khoảng trắng và sửa lỗi cơ bản
    processed = this.normalizeWhitespace(processed)

    // Sửa lỗi chính tả cơ bản cho interim
    if (this.options.spellCheck) {
      processed = this.correctSpelling(processed)
    }

    return processed
  }

  /**
   * Chuẩn hoá khoảng trắng
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,!?:;])/g, '$1')
      .replace(/([.,!?:;])(?=[^\s])/g, '$1 ')
      .trim()
  }

  /**
   * Sửa lỗi chính tả
   */
  private correctSpelling(text: string): string {
    let corrected = text.toLowerCase()

    // Áp dụng từ điển sửa lỗi
    Object.entries(SPELLING_CORRECTIONS).forEach(([wrong, correct]) => {
      // Sử dụng word boundary để tránh sửa nhầm
      const regex = new RegExp(`\\b${this.escapeRegex(wrong)}\\b`, 'gi')
      corrected = corrected.replace(regex, correct)
    })

    return corrected
  }

  /**
   * Chuyển số từ chữ sang số
   */
  private convertNumberWords(text: string): string {
    let converted = text

    // Pattern để nhận diện chuỗi số
    // Ví dụ: "hai trăm nghìn" -> "200000"
    const numberPattern = /\b(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mươi|trăm|nghìn|ngàn|triệu|tỷ)(\s+(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mươi|trăm|nghìn|ngàn|triệu|tỷ))*\b/gi

    converted = converted.replace(numberPattern, (match) => {
      return this.parseVietnameseNumber(match)
    })

    return converted
  }

  /**
   * Parse chuỗi số tiếng Việt thành số
   */
  private parseVietnameseNumber(numStr: string): string {
    const words = numStr.toLowerCase().split(/\s+/)
    let result = 0
    let current = 0

    for (const word of words) {
      if (NUMBER_WORDS[word]) {
        const value = parseInt(NUMBER_WORDS[word], 10)

        if (word === 'nghìn' || word === 'ngàn') {
          current = current === 0 ? 1000 : current * 1000
          result += current
          current = 0
        } else if (word === 'triệu') {
          current = current === 0 ? 1000000 : current * 1000000
          result += current
          current = 0
        } else if (word === 'tỷ') {
          current = current === 0 ? 1000000000 : current * 1000000000
          result += current
          current = 0
        } else if (word === 'trăm') {
          current = current === 0 ? 100 : current * 100
        } else if (word === 'mười') {
          current = current === 0 ? 10 : current + 10
        } else if (word === 'mươi') {
          current = current * 10
        } else {
          current += value
        }
      }
    }

    result += current

    // Nếu không parse được, trả về chuỗi gốc
    return result > 0 ? result.toLocaleString('vi-VN') : numStr
  }

  /**
   * Thêm dấu câu tự động
   */
  private addPunctuation(text: string): string {
    const punctuated = text.trim()

    // Không thêm nếu đã có dấu câu ở cuối
    if (/[.!?,:;]$/.test(punctuated)) {
      return punctuated
    }

    // Kiểm tra câu hỏi
    const lowerText = punctuated.toLowerCase()
    for (const keyword of QUESTION_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return punctuated + '?'
      }
    }

    // Kiểm tra câu cảm thán
    for (const keyword of EXCLAMATION_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return punctuated + '!'
      }
    }

    // Mặc định thêm dấu chấm
    return punctuated + '.'
  }

  /**
   * Viết hoa đầu câu
   */
  private capitalize(text: string): string {
    if (!text) return ''

    // Viết hoa đầu chuỗi
    let capitalized = text.charAt(0).toUpperCase() + text.slice(1)

    // Viết hoa sau dấu câu
    capitalized = capitalized.replace(/([.!?]\s+)([a-záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ])/gi, (_match, punct, char) => {
      return punct + char.toUpperCase()
    })

    return capitalized
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Cập nhật options
   */
  setOptions(options: Partial<ProcessingOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Lấy options hiện tại
   */
  getOptions(): ProcessingOptions {
    return { ...this.options }
  }
}

// Export singleton instance
export const vietnameseTextProcessor = new VietnameseTextProcessor()

