import { useState, useEffect } from 'react'
import { FaMicrophone, FaSpinner } from 'react-icons/fa'
import { voiceRecognitionService, parseVoiceInputToItems, type VoiceRecognitionOptions } from '../../utils/voiceRecognition'

interface VoiceInputButtonProps {
  onItemsRecognized: (items: Array<{ name: string; quantity: string }>) => void
  disabled?: boolean
}

export const VoiceInputButton = ({ onItemsRecognized, disabled = false }: VoiceInputButtonProps) => {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsSupported(voiceRecognitionService.isBrowserSupported())
  }, [])

  useEffect(() => {
    // Cleanup khi component unmount
    return () => {
      if (isListening) {
        voiceRecognitionService.stop()
      }
    }
  }, [isListening])

  const handleStartListening = () => {
    if (!isSupported) {
      setError('Trình duyệt không hỗ trợ nhận diện giọng nói')
      return
    }

    setError(null)
    setIsListening(true)

    const options: VoiceRecognitionOptions = {
      language: 'vi-VN',
      continuous: false,
      onStart: () => {
        setIsListening(true)
      },
      onResult: (transcript) => {
        console.log('Voice transcript:', transcript)
        
        // Parse transcript thành items
        const items = parseVoiceInputToItems(transcript)
        
        if (items.length > 0) {
          onItemsRecognized(items)
        } else {
          setError('Không thể nhận diện danh sách. Vui lòng thử lại và nói rõ hơn.')
        }
        
        setIsListening(false)
      },
      onError: (err) => {
        setError(err.message)
        setIsListening(false)
      },
      onEnd: () => {
        setIsListening(false)
      }
    }

    voiceRecognitionService.start(options)
  }

  const handleStopListening = () => {
    voiceRecognitionService.stop()
    setIsListening(false)
    setError(null)
  }

  if (!isSupported) {
    return null // Ẩn button nếu không hỗ trợ
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={isListening ? handleStopListening : handleStartListening}
        disabled={disabled}
        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
          isListening
            ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg animate-pulse'
            : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isListening ? (
          <>
            <FaSpinner className="h-4 w-4 animate-spin" />
            <span>Đang nghe...</span>
          </>
        ) : (
          <>
            <FaMicrophone className="h-4 w-4" />
            <span>Nhập bằng giọng nói</span>
          </>
        )}
      </button>

      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 z-10">
          {error}
        </div>
      )}
    </div>
  )
}


