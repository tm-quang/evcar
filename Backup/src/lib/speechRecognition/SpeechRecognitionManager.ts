/**
 * Speech Recognition Manager - Enhanced Version
 * Quản lý và chọn provider tốt nhất, với fallback và post-processing
 * - Tích hợp VietnameseTextProcessor cho xử lý tiếng Việt
 * - Hỗ trợ real-time interim results
 */

import type { ISpeechProvider, SpeechRecognitionOptions } from './ISpeechProvider'
import { WebSpeechProvider, type EnhancedSpeechOptions } from './WebSpeechProvider'
import { OpenAIWhisperProvider } from './OpenAIWhisperProvider'
import { vietnameseTextProcessor } from './VietnameseTextProcessor'

export type ProviderType = 'auto' | 'web-speech' | 'openai-whisper'

export interface EnhancedManagerOptions extends SpeechRecognitionOptions {
  onInterimResult?: (transcript: string) => void
  enableVietnameseProcessing?: boolean
  autoRestart?: boolean
}

export class SpeechRecognitionManager {
  private providers: Map<string, ISpeechProvider> = new Map()
  private currentProvider: ISpeechProvider | null = null
  private preferredProvider: ProviderType = 'auto'
  private enableVietnameseProcessing: boolean = true

  constructor() {
    // Đăng ký các providers
    const webSpeech = new WebSpeechProvider()
    const openAIWhisper = new OpenAIWhisperProvider()

    this.providers.set('web-speech', webSpeech)
    this.providers.set('openai-whisper', openAIWhisper)

    // Chọn provider mặc định
    this.selectProvider()
  }

  /**
   * Chọn provider tốt nhất dựa trên cấu hình
   */
  private selectProvider(): void {
    const preferred = import.meta.env.VITE_SPEECH_PROVIDER as ProviderType || 'auto'

    if (preferred === 'auto') {
      // Tạm thời chỉ dùng Web Speech API (miễn phí)
      // AI providers đã bị ẩn, có thể bật lại sau bằng cách set VITE_SPEECH_PROVIDER=openai-whisper
      const webSpeech = this.providers.get('web-speech')
      if (webSpeech?.isSupported()) {
        this.currentProvider = webSpeech
      }
    } else if (preferred === 'web-speech') {
      // Chỉ dùng Web Speech
      const provider = this.providers.get('web-speech')
      if (provider && provider.isSupported()) {
        this.currentProvider = provider
      }
    } else if (preferred === 'openai-whisper') {
      // Chỉ dùng OpenAI Whisper (nếu user explicitly chọn)
      const provider = this.providers.get('openai-whisper')
      if (provider && provider.isSupported()) {
        this.currentProvider = provider
      } else {
        // Fallback về Web Speech nếu OpenAI không khả dụng
        const fallback = this.providers.get('web-speech')
        if (fallback?.isSupported()) {
          this.currentProvider = fallback
        }
      }
    } else {
      // Fallback về Web Speech
      const fallback = this.providers.get('web-speech')
      if (fallback?.isSupported()) {
        this.currentProvider = fallback
      }
    }

    this.preferredProvider = preferred
  }

  /**
   * Set provider ưa thích
   */
  setProvider(providerType: ProviderType): void {
    this.preferredProvider = providerType
    this.selectProvider()
  }

  /**
   * Bật/tắt xử lý tiếng Việt
   */
  setVietnameseProcessing(enabled: boolean): void {
    this.enableVietnameseProcessing = enabled
  }

  /**
   * Lấy provider hiện tại
   */
  getCurrentProvider(): ISpeechProvider | null {
    return this.currentProvider
  }

  /**
   * Lấy tên provider hiện tại
   */
  getProviderName(): string {
    return this.currentProvider?.getName() || 'Không có'
  }

  /**
   * Lấy loại provider ưa thích
   */
  getPreferredProvider(): ProviderType {
    return this.preferredProvider
  }

  /**
   * Kiểm tra xem có provider nào được hỗ trợ không
   */
  isSupported(): boolean {
    return this.currentProvider !== null
  }

  /**
   * Bắt đầu nhận diện giọng nói với provider hiện tại
   */
  async start(options: EnhancedManagerOptions): Promise<void> {
    if (!this.currentProvider) {
      throw new Error('Không có speech recognition provider nào khả dụng')
    }

    const useVietnamese = options.enableVietnameseProcessing !== false && this.enableVietnameseProcessing

    // Enhanced options với post-processing
    const enhancedOptions: EnhancedSpeechOptions = {
      ...options,
      continuous: options.continuous !== false, // Mặc định true
      interimResults: options.interimResults !== false, // Mặc định true
      autoRestart: options.autoRestart !== false, // Mặc định true

      // Xử lý interim results
      onInterimResult: (transcript: string) => {
        if (useVietnamese) {
          const processed = vietnameseTextProcessor.processInterim(transcript)
          options.onInterimResult?.(processed)
        } else {
          options.onInterimResult?.(transcript)
        }
      },

      // Xử lý final results
      onResult: (transcript: string, isFinal: boolean) => {
        if (isFinal) {
          // Post-process transcript hoàn chỉnh
          const processed = useVietnamese
            ? vietnameseTextProcessor.process(transcript)
            : this.basicPostProcess(transcript)

          if (processed) {
            options.onResult?.(processed, true)
          }
        } else {
          // Interim result - xử lý nhẹ
          const processed = useVietnamese
            ? vietnameseTextProcessor.processInterim(transcript)
            : transcript
          options.onResult?.(processed, false)
        }
      },
    }

    await this.currentProvider.start(enhancedOptions)
  }

  /**
   * Dừng nhận diện
   */
  stop(): void {
    this.currentProvider?.stop()
  }

  /**
   * Kiểm tra trạng thái
   */
  isListening(): boolean {
    return this.currentProvider?.isListening() || false
  }

  /**
   * Post-processing cơ bản (không dùng Vietnamese processor)
   */
  private basicPostProcess(text: string): string {
    let processed = text.trim()

    // 1. Chuẩn hóa khoảng trắng
    processed = processed.replace(/\s+/g, ' ').trim()

    // 2. Sửa lỗi dấu câu cơ bản
    const punctuationFixes: Record<string, string> = {
      ' ,': ',',
      ' .': '.',
      ' :': ':',
      ' ;': ';',
      ' !': '!',
      ' ?': '?',
    }

    Object.entries(punctuationFixes).forEach(([wrong, correct]) => {
      processed = processed.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct)
    })

    // 3. Capitalize đầu câu
    if (processed.length > 0) {
      processed = processed.charAt(0).toUpperCase() + processed.slice(1)
    }

    return processed
  }

  /**
   * Lấy danh sách providers có sẵn
   */
  getAvailableProviders(): Array<{ type: string; name: string; accuracy: number; speed: number; supported: boolean }> {
    const result: Array<{ type: string; name: string; accuracy: number; speed: number; supported: boolean }> = []

    this.providers.forEach((provider, type) => {
      result.push({
        type,
        name: provider.getName(),
        accuracy: provider.getAccuracy(),
        speed: provider.getSpeed(),
        supported: provider.isSupported(),
      })
    })

    return result
  }

  /**
   * Lấy Vietnamese Text Processor để truy cập trực tiếp nếu cần
   */
  getTextProcessor() {
    return vietnameseTextProcessor
  }
}

// Export singleton instance
export const speechRecognitionManager = new SpeechRecognitionManager()

