/**
 * Voice Recognition Utility
 * Wrapper cho Speech Recognition Manager để tương thích với code cũ
 * 
 * @deprecated Sử dụng speechRecognitionManager từ src/lib/speechRecognition/SpeechRecognitionManager.ts
 * File này giữ lại để backward compatibility
 */

import { speechRecognitionManager } from '../lib/speechRecognition/SpeechRecognitionManager'

export interface VoiceRecognitionOptions {
  onResult: (transcript: string) => void
  onError?: (error: Error) => void
  onStart?: () => void
  onEnd?: () => void
  language?: string
  continuous?: boolean
}

export class VoiceRecognitionService {
  /**
   * Kiểm tra xem browser có hỗ trợ voice recognition không
   */
  isBrowserSupported(): boolean {
    return speechRecognitionManager.isSupported()
  }

  /**
   * Bắt đầu nhận diện giọng nói
   */
  start(options: VoiceRecognitionOptions): void {
    speechRecognitionManager.start({
      language: options.language || 'vi-VN',
      continuous: options.continuous || false,
      interimResults: false,
      onResult: (transcript: string, isFinal: boolean) => {
        if (isFinal) {
          options.onResult(transcript)
        }
      },
      onError: options.onError,
      onStart: options.onStart,
      onEnd: options.onEnd,
    }).catch((error) => {
      options.onError?.(error instanceof Error ? error : new Error('Lỗi khởi động nhận diện giọng nói'))
    })
  }

  /**
   * Dừng nhận diện giọng nói
   */
  stop(): void {
    speechRecognitionManager.stop()
  }

  /**
   * Kiểm tra trạng thái đang lắng nghe
   */
  getIsListening(): boolean {
    return speechRecognitionManager.isListening()
  }
}

/**
 * Chuyển số bằng chữ tiếng Việt thành số
 */
function wordToNumber(word: string): string | null {
  const numberMap: Record<string, string> = {
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
    'mười một': '11',
    'mười hai': '12',
    'mười ba': '13',
    'mười bốn': '14',
    'mười lăm': '15',
    'mười sáu': '16',
    'mười bảy': '17',
    'mười tám': '18',
    'mười chín': '19',
    'hai mươi': '20',
  }
  
  return numberMap[word.toLowerCase()] || null
}

/**
 * Parse text từ giọng nói thành danh sách items với số lượng
 * Hỗ trợ cả số và số bằng chữ tiếng Việt
 */
export function parseVoiceInputToItems(text: string): Array<{ name: string; quantity: string }> {
  const items: Array<{ name: string; quantity: string }> = []
  
  // Loại bỏ dấu câu và chuẩn hóa
  const normalizedText = text
    .toLowerCase()
    .replace(/[,，、]/g, ',')
    .replace(/[\.。]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Tách theo dấu phẩy hoặc từ khóa
  let parts: string[] = []
  
  if (normalizedText.includes(',')) {
    parts = normalizedText.split(',').map(p => p.trim()).filter(p => p)
  } else {
    parts = normalizedText.split(/(?=\s*\d+\s+|\s+(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s+)/).map(p => p.trim()).filter(p => p)
    if (parts.length === 1) {
      parts = [normalizedText]
    }
  }

  for (const part of parts) {
    let cleanPart = part.replace(/^(mua|thêm|cho|và|với|cần)\s+/i, '').trim()

    let quantity = '1'
    let itemName = cleanPart

    // Tìm số bằng chữ tiếng Việt trước
    const wordNumberMatch = cleanPart.match(/^(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mười một|mười hai|mười ba|mười bốn|mười lăm|mười sáu|mười bảy|mười tám|mười chín|hai mươi)\s+/i)
    if (wordNumberMatch) {
      const wordNumber = wordToNumber(wordNumberMatch[1])
      if (wordNumber) {
        quantity = wordNumber
        cleanPart = cleanPart.replace(wordNumberMatch[0], '').trim()
      }
    }

    // Tìm số (số arabic)
    const numberMatch = cleanPart.match(/^(\d+)\s+/)
    if (numberMatch) {
      quantity = numberMatch[1]
      cleanPart = cleanPart.replace(numberMatch[0], '').trim()
    }

    // Loại bỏ các từ chỉ đơn vị số lượng
    const unitPattern = /^(cái|chiếc|chai|gói|hộp|kg|kí|kilo|quả|trái|con|bịch|túi|lon|chén|bát|đĩa|bộ|ly|tách|bình|thùng)\s+/i
    itemName = cleanPart.replace(unitPattern, '').trim()

    // Loại bỏ các từ không cần thiết
    itemName = itemName.replace(/\s+(và|với|cho|nữa)$/i, '').trim()
    itemName = itemName.replace(/^(và|với|cho|mua|thêm|tôi|cần)\s+/i, '').trim()

    if (itemName && itemName.length > 0) {
      const capitalizedName = itemName.charAt(0).toUpperCase() + itemName.slice(1)
      
      items.push({
        name: capitalizedName,
        quantity: quantity
      })
    }
  }

  // Nếu không tách được, thử tách đơn giản
  if (items.length === 0 && normalizedText) {
    const withoutKeyword = normalizedText.replace(/^(mua|thêm|tôi cần|tôi muốn)\s+/i, '').trim()
    
    if (withoutKeyword && withoutKeyword.length > 2) {
      items.push({
        name: withoutKeyword.charAt(0).toUpperCase() + withoutKeyword.slice(1),
        quantity: '1'
      })
    }
  }

  return items
}

// Export singleton instance
export const voiceRecognitionService = new VoiceRecognitionService()

