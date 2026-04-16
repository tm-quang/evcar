/**
 * Web Speech API Provider - Enhanced Version
 * Sử dụng browser native Web Speech API với các cải tiến:
 * - Real-time interim results
 * - Continuous listening mode
 * - Auto-restart on unexpected stop
 * - Multiple alternatives support
 */

import type { ISpeechProvider, SpeechRecognitionOptions } from './ISpeechProvider'

// Extended options for enhanced features
export interface EnhancedSpeechOptions extends SpeechRecognitionOptions {
  onInterimResult?: (transcript: string) => void
  maxAlternatives?: number
  autoRestart?: boolean
}

export class WebSpeechProvider implements ISpeechProvider {
  private recognition: any = null
  private isListeningState: boolean = false
  private isSupportedState: boolean = false
  private currentOptions: EnhancedSpeechOptions | null = null
  private restartTimeout: ReturnType<typeof setTimeout> | null = null
  private manualStop: boolean = false
  private accumulatedTranscript: string = ''

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      this.isSupportedState = !!SpeechRecognition

      if (this.isSupportedState) {
        this.recognition = new SpeechRecognition()
        this.setupRecognition()
      }
    }
  }

  /**
   * Setup recognition với các cài đặt mặc định tối ưu
   */
  private setupRecognition(): void {
    if (!this.recognition) return

    // Cấu hình mặc định cho trải nghiệm tốt nhất
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'vi-VN'
    this.recognition.maxAlternatives = 3
  }

  isSupported(): boolean {
    return this.isSupportedState
  }

  async start(options: EnhancedSpeechOptions): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Speech API không được hỗ trợ trong trình duyệt này')
    }

    if (this.isListeningState) {
      this.stop()
      // Đợi một chút để recognition dừng hoàn toàn
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.currentOptions = options
    this.manualStop = false
    this.accumulatedTranscript = ''

    // Cấu hình recognition
    this.recognition.lang = options.language || 'vi-VN'
    this.recognition.continuous = options.continuous !== false // Mặc định true
    this.recognition.interimResults = options.interimResults !== false // Mặc định true
    this.recognition.maxAlternatives = options.maxAlternatives || 3

    // Event handlers
    this.recognition.onstart = () => {
      this.isListeningState = true
      options.onStart?.()
    }

    this.recognition.onresult = (event: any) => {
      this.handleResult(event)
    }

    this.recognition.onerror = (event: any) => {
      this.handleError(event)
    }

    this.recognition.onend = () => {
      this.handleEnd()
    }

    this.recognition.onspeechstart = () => {
      // Người dùng bắt đầu nói
    }

    this.recognition.onspeechend = () => {
      // Người dùng ngừng nói
    }

    this.recognition.onnomatch = () => {
      // Không nhận diện được
    }

    try {
      this.recognition.start()
    } catch (error) {
      this.isListeningState = false
      throw new Error('Không thể bắt đầu nhận diện giọng nói. Vui lòng thử lại.')
    }
  }

  /**
   * Xử lý kết quả nhận diện
   */
  private handleResult(event: any): void {
    if (!this.currentOptions) return

    let finalTranscript = ''
    let interimTranscript = ''
    let bestAlternative = ''
    let bestConfidence = 0

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]

      // Lấy alternative có confidence cao nhất
      for (let j = 0; j < result.length; j++) {
        const alternative = result[j]
        if (alternative.confidence > bestConfidence || j === 0) {
          bestConfidence = alternative.confidence
          bestAlternative = alternative.transcript
        }
      }

      if (result.isFinal) {
        finalTranscript += bestAlternative
      } else {
        interimTranscript += bestAlternative
      }
    }

    // Gửi interim results (real-time feedback)
    if (interimTranscript && this.currentOptions.onInterimResult) {
      const fullInterim = this.accumulatedTranscript
        ? `${this.accumulatedTranscript} ${interimTranscript}`
        : interimTranscript
      this.currentOptions.onInterimResult(fullInterim.trim())
    }

    // Cũng gửi qua onResult với isFinal = false để backward compatible
    if (interimTranscript && this.currentOptions.onResult) {
      this.currentOptions.onResult(interimTranscript.trim(), false)
    }

    // Gửi final results
    if (finalTranscript) {
      // Tích lũy transcript
      this.accumulatedTranscript = this.accumulatedTranscript
        ? `${this.accumulatedTranscript} ${finalTranscript}`
        : finalTranscript

      if (this.currentOptions.onResult) {
        this.currentOptions.onResult(finalTranscript.trim(), true)
      }
    }
  }

  /**
   * Xử lý lỗi
   */
  private handleError(event: any): void {
    let errorMessage = 'Lỗi nhận diện giọng nói'
    let shouldRestart = false

    switch (event.error) {
      case 'no-speech':
        errorMessage = 'Không phát hiện giọng nói. Vui lòng nói rõ hơn.'
        shouldRestart = true // Tự động restart nếu không phát hiện giọng nói
        break
      case 'audio-capture':
        errorMessage = 'Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.'
        break
      case 'not-allowed':
        errorMessage = 'Quyền truy cập microphone bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.'
        break
      case 'network':
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối.'
        shouldRestart = true
        break
      case 'aborted':
        // User hoặc hệ thống dừng - không cần thông báo
        return
      case 'service-not-allowed':
        errorMessage = 'Dịch vụ nhận diện giọng nói không khả dụng.'
        break
      default:
        errorMessage = `Lỗi: ${event.error}`
        shouldRestart = true
    }

    // Chỉ restart nếu không phải manual stop và option cho phép
    if (shouldRestart && !this.manualStop && this.currentOptions?.autoRestart !== false) {
      this.scheduleRestart()
    } else {
      this.isListeningState = false
      this.currentOptions?.onError?.(new Error(errorMessage))
    }
  }

  /**
   * Xử lý khi recognition kết thúc
   */
  private handleEnd(): void {
    // Nếu không phải manual stop và đang ở continuous mode, tự động restart
    if (!this.manualStop && this.currentOptions?.continuous !== false && this.currentOptions?.autoRestart !== false) {
      this.scheduleRestart()
    } else {
      this.isListeningState = false
      this.currentOptions?.onEnd?.()
    }
  }

  /**
   * Lên lịch restart recognition
   */
  private scheduleRestart(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
    }

    this.restartTimeout = setTimeout(() => {
      if (!this.manualStop && this.currentOptions) {
        try {
          this.recognition.start()
        } catch (error) {
          // Có thể đã có recognition đang chạy, bỏ qua
          console.warn('Could not restart recognition:', error)
        }
      }
    }, 100) // Đợi 100ms trước khi restart
  }

  stop(): void {
    this.manualStop = true

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
    }

    if (this.recognition && this.isListeningState) {
      try {
        this.recognition.stop()
      } catch (error) {
        // Ignore errors when stopping
      }
    }

    this.isListeningState = false

    // Trả về accumulated transcript nếu có
    if (this.accumulatedTranscript && this.currentOptions?.onResult) {
      // Đã gửi qua handleResult rồi, không cần gửi lại
    }

    this.currentOptions?.onEnd?.()
    this.accumulatedTranscript = ''
  }

  /**
   * Lấy transcript đã tích lũy
   */
  getAccumulatedTranscript(): string {
    return this.accumulatedTranscript
  }

  /**
   * Xóa transcript đã tích lũy
   */
  clearAccumulatedTranscript(): void {
    this.accumulatedTranscript = ''
  }

  isListening(): boolean {
    return this.isListeningState
  }

  getName(): string {
    return 'Web Speech API (Enhanced)'
  }

  getAccuracy(): number {
    return 0.75 // Độ chính xác cải thiện với multiple alternatives
  }

  getSpeed(): number {
    return 200 // ~200ms latency với interim results
  }
}

