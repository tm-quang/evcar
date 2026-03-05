import { useState, useEffect, useRef } from 'react'
import { FaTimes, FaMicrophone, FaSpinner } from 'react-icons/fa'
import { voiceRecognitionService, parseVoiceTransaction, type VoiceRecognitionOptions } from '../../utils/voiceTransactionParser'

interface VoiceTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (transactionData: {
    type: 'Thu' | 'Chi'
    amount: number
    category_id?: string
    wallet_id?: string
    transaction_date?: string
    description?: string
  }) => void
  categories?: Array<{ id: string; name: string }>
  wallets?: Array<{ id: string; name: string }>
}

export const VoiceTransactionModal = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  wallets,
}: VoiceTransactionModalProps) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const animationRef = useRef<number | null>(null)
  const finalTranscriptRef = useRef<string>('') // Lưu transcript cuối cùng để parse
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!isOpen) {
      cleanup()
      return
    }

    return () => {
      cleanup()
    }
  }, [isOpen])

  const cleanup = () => {
    // Stop voice recognition
    if (isListening) {
      voiceRecognitionService.stop()
      setIsListening(false)
    }

    // Stop audio analysis
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect()
      microphoneRef.current = null
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

        setTranscript('')
        setError(null)
        setAudioLevel(0)
        finalTranscriptRef.current = ''
  }

  const startAudioVisualization = async () => {
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      // Create analyser
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      // Create microphone source
      const microphone = audioContext.createMediaStreamSource(stream)
      microphone.connect(analyser)
      microphoneRef.current = microphone

      // Start animation loop
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      const timeDataArray = new Uint8Array(bufferLength)

      const animate = () => {
        if (!analyserRef.current || !isListening) return

        analyserRef.current.getByteFrequencyData(dataArray)
        analyserRef.current.getByteTimeDomainData(timeDataArray)
        
        // Calculate average audio level from frequency data
        const sum = dataArray.reduce((a, b) => a + b, 0)
        const average = sum / bufferLength
        
        // Also calculate from time domain for better responsiveness
        let sumTime = 0
        for (let i = 0; i < timeDataArray.length; i++) {
          const amplitude = Math.abs(timeDataArray[i] - 128)
          sumTime += amplitude
        }
        const avgTime = sumTime / timeDataArray.length
        
        // Combine both for more accurate level
        const combinedLevel = (average + avgTime) / 2
        const normalizedLevel = Math.min(Math.max(combinedLevel / 128, 0), 1) // Normalize to 0-1
        
        setAudioLevel(normalizedLevel)

        if (isListening) {
          animationRef.current = requestAnimationFrame(animate)
        }
      }

      animate()
    } catch (err) {
      console.error('Error starting audio visualization:', err)
      // Continue without visualization if it fails
    }
  }

  const handleStartListening = async () => {
    if (!voiceRecognitionService.isBrowserSupported()) {
      setError('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói')
      return
    }

    setError(null)
    setTranscript('')
    setIsListening(true)

    // Start audio visualization
    await startAudioVisualization()

    const options: VoiceRecognitionOptions = {
      language: 'vi-VN',
      continuous: true, // Continuous để có transcript real-time
      onStart: () => {
        setIsListening(true)
      },
      onResult: (interimTranscript, finalTranscript) => {
        // Update transcript in real-time
        // Combine both interim and final for better UX
        let combinedTranscript = ''
        if (finalTranscript) {
          finalTranscriptRef.current = finalTranscript // Lưu transcript cuối cùng
          combinedTranscript = finalTranscript
        }
        if (interimTranscript) {
          combinedTranscript = combinedTranscript ? `${combinedTranscript} ${interimTranscript}` : interimTranscript
        }
        if (combinedTranscript) {
          setTranscript(combinedTranscript)
        }
      },
      onError: (err) => {
        setError(err.message)
        setIsListening(false)
        cleanup()
      },
      onEnd: () => {
        setIsListening(false)
        
        // Parse transcript and create transaction
        // Sử dụng finalTranscriptRef để đảm bảo có transcript mới nhất
        const transcriptToParse = finalTranscriptRef.current.trim() || transcript.trim()
        if (transcriptToParse) {
          console.log('Parsing transcript:', transcriptToParse)
          try {
            const transactionData = parseVoiceTransaction(transcriptToParse, categories, wallets)
            console.log('Parsed transaction data:', transactionData)
            if (transactionData) {
              onSuccess(transactionData)
              onClose()
            } else {
              setError('Không thể nhận diện thông tin giao dịch. Vui lòng thử lại và nói rõ hơn.')
            }
          } catch (err) {
            console.error('Error parsing transaction:', err)
            setError('Lỗi xử lý dữ liệu. Vui lòng thử lại.')
          }
        } else {
          setError('Không có nội dung ghi âm. Vui lòng thử lại.')
        }
        
        cleanup()
      }
    }

    voiceRecognitionService.start(options)
  }

  const handleStopListening = () => {
    voiceRecognitionService.stop()
    setIsListening(false)
    
    // Đợi một chút để đảm bảo transcript được cập nhật
    setTimeout(() => {
      // Parse transcript and create transaction when manually stopped
      const transcriptToParse = finalTranscriptRef.current.trim() || transcript.trim()
      console.log('Stopped - Parsing transcript:', transcriptToParse)
      if (transcriptToParse) {
        try {
          const transactionData = parseVoiceTransaction(transcriptToParse, categories, wallets)
          console.log('Stopped - Parsed transaction data:', transactionData)
          if (transactionData) {
            onSuccess(transactionData)
            onClose()
          } else {
            setError('Không thể nhận diện thông tin giao dịch. Vui lòng thử lại và nói rõ hơn.')
          }
        } catch (err) {
          console.error('Error parsing transaction:', err)
          setError('Lỗi xử lý dữ liệu. Vui lòng thử lại.')
        }
      } else {
        setError('Không có nội dung ghi âm. Vui lòng thử lại.')
      }
    }, 100) // Đợi 100ms để đảm bảo transcript được cập nhật
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 pointer-events-none">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 fade-in duration-300 mt-12 sm:mt-0 max-h-[calc(100vh-3rem)] sm:max-h-[85vh] overflow-y-auto safe-area-bottom pointer-events-auto">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="text-lg font-bold text-slate-900">Ghi chép bằng giọng nói</h3>
          <button
            onClick={() => {
              handleStopListening()
              onClose()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* Audio Visualizer */}
        <div className="px-6 py-8 flex items-center justify-center">
          {isListening ? (
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Ripple waves - Badge sóng */}
              <div
                className="absolute inset-0 rounded-full border-2 border-blue-400/60"
                style={{
                  animation: 'ripple-wave 2s ease-out infinite',
                }}
              />
              <div
                className="absolute inset-0 rounded-full border-2 border-purple-400/60"
                style={{
                  animation: 'ripple-wave 2s ease-out infinite',
                  animationDelay: '0.5s',
                }}
              />
              <div
                className="absolute inset-0 rounded-full border-2 border-blue-300/40"
                style={{
                  animation: 'ripple-wave 2s ease-out infinite',
                  animationDelay: '1s',
                }}
              />
              
              {/* Pulsing circle background */}
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-30"
                style={{
                  transform: `scale(${1 + audioLevel * 0.5})`,
                  transition: 'transform 0.1s ease-out',
                }}
              />
              
              {/* Microphone icon */}
              <FaMicrophone className="absolute h-8 w-8 text-blue-600 z-10" />
            </div>
          ) : (
            <div className="w-32 h-32 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-300 to-purple-200">
              <FaMicrophone className="h-12 w-12 text-blue-700" />
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="px-6 pb-6">
          <div className="rounded-2xl bg-slate-100 p-4 min-h-[100px] max-h-[150px] overflow-y-auto">
            {transcript ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {transcript}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic text-center">
                {isListening ? 'Đang nghe...' : 'Bấm "Chạm để nói" để bắt đầu ghi âm,'}
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 pb-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-slate-100 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 bg-slate-200 hover:bg-slate-50 transition"
          >
            Hủy
          </button>
          {!isListening ? (
            <button
              onClick={handleStartListening}
              className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-purple-700 transition"
            >
              Chạm để nói
            </button>
          ) : (
            <button
              onClick={handleStopListening}
              className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-600 transition flex items-center justify-center gap-2"
            >
              <FaSpinner className="h-4 w-4 animate-spin" />
              Bấm để dừng
            </button>
          )}
        </div>

        {/* Add CSS animations */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          @keyframes ripple-wave {
            0% {
              transform: scale(0.8);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.4;
            }
            100% {
              transform: scale(1.6);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </div>
  )
}


