/**
 * Speech Recognition Provider Interface
 * Abstract interface cho các speech recognition providers
 */

export interface SpeechRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: Error) => void
  onStart?: () => void
  onEnd?: () => void
}

export interface ISpeechProvider {
  /**
   * Kiểm tra xem provider có được hỗ trợ không
   */
  isSupported(): boolean

  /**
   * Bắt đầu nhận diện giọng nói
   */
  start(options: SpeechRecognitionOptions): Promise<void>

  /**
   * Dừng nhận diện giọng nói
   */
  stop(): void

  /**
   * Kiểm tra trạng thái đang lắng nghe
   */
  isListening(): boolean

  /**
   * Tên provider
   */
  getName(): string

  /**
   * Độ chính xác (0-1)
   */
  getAccuracy(): number

  /**
   * Tốc độ xử lý (ms)
   */
  getSpeed(): number
}


