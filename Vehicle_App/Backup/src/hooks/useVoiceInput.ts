import { useState, useEffect, useCallback, useRef } from 'react'
import { speechRecognitionManager } from '../lib/speechRecognition/SpeechRecognitionManager'

export interface VoiceInputField {
  id: string
  onResult: (transcript: string) => void
  onInterimResult?: (transcript: string) => void
}

export interface UseVoiceInputOptions {
  fields: VoiceInputField[]
  onError?: (error: string) => void
  language?: string
  continuous?: boolean
  autoRestart?: boolean
  enableVietnameseProcessing?: boolean
}

export interface VoiceInputControls {
  isListening: (fieldId: string) => boolean
  startListening: (fieldId: string) => void
  stopListening: () => void
  reset: () => void
  isSupported: boolean
  interimText: string
  getInterimText: (fieldId: string) => string
}

/**
 * Custom hook để quản lý nhận diện giọng nói cho nhiều input fields
 * Enhanced version với real-time interim results
 * 
 * @param options - Cấu hình cho voice input
 * @returns Controls để quản lý voice recognition
 * 
 * @example
 * ```tsx
 * const voiceInput = useVoiceInput({
 *   fields: [
 *     {
 *       id: 'title',
 *       onResult: (text) => setTitle(text),
 *       onInterimResult: (text) => setInterimTitle(text) // Optional: real-time preview
 *     },
 *     {
 *       id: 'description',
 *       onResult: (text) => setDescription(text)
 *     }
 *   ],
 *   onError: (error) => showError(error),
 *   continuous: true, // Lắng nghe liên tục
 *   enableVietnameseProcessing: true // Bật xử lý tiếng Việt
 * })
 * 
 * // Sử dụng
 * <button onClick={() => voiceInput.startListening('title')}>
 *   {voiceInput.isListening('title') ? 'Đang nghe...' : 'Bắt đầu'}
 * </button>
 * 
 * // Hiển thị interim text
 * {voiceInput.interimText && (
 *   <p className="text-gray-400 italic">{voiceInput.interimText}</p>
 * )}
 * ```
 */
export const useVoiceInput = (options: UseVoiceInputOptions): VoiceInputControls => {
  const {
    fields,
    onError,
    language = 'vi-VN',
    continuous = true,
    autoRestart = true,
    enableVietnameseProcessing = true,
  } = options

  // Track listening state cho từng field
  const [listeningStates, setListeningStates] = useState<Record<string, boolean>>({})

  // Track interim text cho từng field
  const [interimTexts, setInterimTexts] = useState<Record<string, string>>({})

  // Track active field
  const activeFieldRef = useRef<string | null>(null)

  // Check browser support
  const isSupported = speechRecognitionManager.isSupported()

  // Reset tất cả states
  const reset = useCallback(() => {
    speechRecognitionManager.stop()
    setListeningStates({})
    setInterimTexts({})
    activeFieldRef.current = null
  }, [])

  // Dừng tất cả recognition đang chạy (trừ field được chỉ định)
  const stopAllExcept = useCallback((exceptFieldId?: string) => {
    Object.keys(listeningStates).forEach((fieldId) => {
      if (fieldId !== exceptFieldId && listeningStates[fieldId]) {
        speechRecognitionManager.stop()
        setListeningStates((prev) => ({ ...prev, [fieldId]: false }))
        setInterimTexts((prev) => ({ ...prev, [fieldId]: '' }))
      }
    })
  }, [listeningStates])

  // Bắt đầu nhận diện cho một field cụ thể
  const startListening = useCallback((fieldId: string) => {
    if (!isSupported) {
      const errorMsg = 'Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng sử dụng Chrome, Edge hoặc Safari.'
      onError?.(errorMsg)
      return
    }

    // Tìm field config
    const field = fields.find((f) => f.id === fieldId)
    if (!field) {
      console.warn(`Voice input field "${fieldId}" not found`)
      return
    }

    // Dừng tất cả recognition khác
    stopAllExcept(fieldId)

    // Set active field
    activeFieldRef.current = fieldId

    // Bắt đầu recognition cho field này
    setListeningStates((prev) => ({ ...prev, [fieldId]: true }))
    setInterimTexts((prev) => ({ ...prev, [fieldId]: '' }))

    speechRecognitionManager.start({
      language,
      continuous,
      interimResults: true,
      autoRestart,
      enableVietnameseProcessing,

      // Callback cho interim results (real-time)
      onInterimResult: (transcript: string) => {
        if (activeFieldRef.current === fieldId) {
          setInterimTexts((prev) => ({ ...prev, [fieldId]: transcript }))
          field.onInterimResult?.(transcript)
        }
      },

      // Callback cho final results
      onResult: (transcript: string, isFinal: boolean) => {
        if (activeFieldRef.current !== fieldId) return

        if (isFinal && transcript) {
          // Clear interim text khi có final result
          setInterimTexts((prev) => ({ ...prev, [fieldId]: '' }))
          field.onResult(transcript.trim())
        } else if (!isFinal) {
          // Interim result
          setInterimTexts((prev) => ({ ...prev, [fieldId]: transcript }))
          field.onInterimResult?.(transcript)
        }
      },

      onError: (error) => {
        onError?.(error.message)
        setListeningStates((prev) => ({ ...prev, [fieldId]: false }))
        setInterimTexts((prev) => ({ ...prev, [fieldId]: '' }))
      },

      onEnd: () => {
        // Chỉ set false nếu không có auto-restart hoặc manual stop
        if (!autoRestart || !continuous) {
          setListeningStates((prev) => ({ ...prev, [fieldId]: false }))
        }
      },
    }).catch((error) => {
      onError?.(error instanceof Error ? error.message : 'Lỗi khởi động nhận diện giọng nói')
      setListeningStates((prev) => ({ ...prev, [fieldId]: false }))
      setInterimTexts((prev) => ({ ...prev, [fieldId]: '' }))
    })
  }, [fields, isSupported, language, continuous, autoRestart, enableVietnameseProcessing, onError, stopAllExcept])

  // Dừng recognition cho tất cả fields
  const stopListening = useCallback(() => {
    speechRecognitionManager.stop()
    setListeningStates({})
    setInterimTexts({})
    activeFieldRef.current = null
  }, [])

  // Kiểm tra xem một field có đang lắng nghe không
  const isListening = useCallback((fieldId: string): boolean => {
    return listeningStates[fieldId] === true
  }, [listeningStates])

  // Lấy interim text cho một field cụ thể
  const getInterimText = useCallback((fieldId: string): string => {
    return interimTexts[fieldId] || ''
  }, [interimTexts])

  // Lấy interim text của active field
  const currentInterimText = activeFieldRef.current ? (interimTexts[activeFieldRef.current] || '') : ''

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      speechRecognitionManager.stop()
    }
  }, [])

  return {
    isListening,
    startListening,
    stopListening,
    reset,
    isSupported,
    interimText: currentInterimText,
    getInterimText,
  }
}

