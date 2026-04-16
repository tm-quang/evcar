/**
 * OpenAI Whisper Provider
 * Sử dụng OpenAI Whisper API để nhận diện giọng nói với độ chính xác cao
 * 
 * Cần set VITE_OPENAI_API_KEY trong .env
 */

import type { ISpeechProvider, SpeechRecognitionOptions } from './ISpeechProvider'

interface AudioRecorder {
  start(): void
  stop(): Promise<Blob>
  isRecording(): boolean
}

class MediaRecorderWrapper implements AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })

      // Ưu tiên webm, fallback về các format khác
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ]

      let selectedMimeType = 'audio/webm'
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          break
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType,
      })

      this.audioChunks = []
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100) // Collect data every 100ms for better quality
    } catch (error) {
      throw new Error('Không thể truy cập microphone')
    }
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder chưa được khởi tạo'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm'
        const audioBlob = new Blob(this.audioChunks, { type: mimeType })
        // Stop all tracks
        this.stream?.getTracks().forEach(track => track.stop())
        this.stream = null
        this.audioChunks = []
        resolve(audioBlob)
      }

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop()
        }
      } catch (error) {
        // If already stopped, create blob from existing chunks
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm'
        const audioBlob = new Blob(this.audioChunks, { type: mimeType })
        this.stream?.getTracks().forEach(track => track.stop())
        this.stream = null
        resolve(audioBlob)
      }
    })
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }
}

export class OpenAIWhisperProvider implements ISpeechProvider {
  private apiKey: string | null = null
  private audioRecorder: AudioRecorder | null = null
  private isListeningState: boolean = false
  private currentOptions: SpeechRecognitionOptions | null = null

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || null
  }

  isSupported(): boolean {
    return !!this.apiKey && typeof MediaRecorder !== 'undefined'
  }

  async start(options: SpeechRecognitionOptions): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('OpenAI Whisper không khả dụng. Vui lòng cấu hình VITE_OPENAI_API_KEY trong .env')
    }

    if (this.isListeningState) {
      await this.stop()
    }

    this.currentOptions = options
    this.isListeningState = true
    options.onStart?.()

    try {
      this.audioRecorder = new MediaRecorderWrapper()
      await this.audioRecorder.start()
    } catch (error) {
      this.isListeningState = false
      this.currentOptions = null
      options.onError?.(error instanceof Error ? error : new Error('Lỗi khởi động ghi âm'))
    }
  }

  async stop(): Promise<void> {
    if (!this.isListeningState || !this.audioRecorder) {
      return
    }

    const options = this.currentOptions

    try {
      const audioBlob = await this.audioRecorder.stop()
      
      // Sử dụng trực tiếp blob để tạo File
      const mimeType = audioBlob.type || 'audio/webm'
      const extension = mimeType.includes('webm') ? 'webm' : 
                       mimeType.includes('mp4') ? 'mp4' :
                       mimeType.includes('ogg') ? 'ogg' : 'webm'
      
      const audioFile = new File([audioBlob], `audio.${extension}`, { type: mimeType })
      
      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('model', 'whisper-1')
      formData.append('language', options?.language?.split('-')[0] || 'vi')
      formData.append('response_format', 'json')

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Lỗi API OpenAI')
      }

      const data = await response.json()
      const transcript = data.text || ''

      // Post-process transcript
      const processedTranscript = this.postProcess(transcript)
      
      if (processedTranscript && options?.onResult) {
        options.onResult(processedTranscript, true)
      }

      options?.onEnd?.()
    } catch (error) {
      options?.onError?.(error instanceof Error ? error : new Error('Lỗi xử lý audio'))
      options?.onEnd?.()
    } finally {
      this.isListeningState = false
      this.currentOptions = null
      this.audioRecorder = null
    }
  }

  /**
   * Post-process transcript để cải thiện độ chính xác
   */
  private postProcess(text: string): string {
    if (!text) return ''

    // 1. Chuẩn hóa khoảng trắng
    let processed = text.replace(/\s+/g, ' ').trim()
    
    // 2. Sửa lỗi phổ biến với tiếng Việt từ AI
    const corrections: Record<string, string> = {
      // Lỗi dấu câu
      ' ,': ',',
      ' .': '.',
      ' :': ':',
      // Sửa từ phổ biến
      'được rồi': 'được rồi',
      'được không': 'được không',
      'không được': 'không được',
    }
    
    // Apply corrections
    Object.entries(corrections).forEach(([wrong, correct]) => {
      processed = processed.replace(new RegExp(wrong, 'gi'), correct)
    })
    
    // 3. Capitalize đầu câu
    if (processed.length > 0) {
      processed = processed.charAt(0).toUpperCase() + processed.slice(1)
    }
    
    return processed
  }

  isListening(): boolean {
    return this.isListeningState
  }

  getName(): string {
    return 'OpenAI Whisper'
  }

  getAccuracy(): number {
    return 0.95 // Độ chính xác rất cao
  }

  getSpeed(): number {
    return 2000 // ~2s latency (do cần upload và xử lý)
  }
}


