/**
 * Voice to Text Page - Enhanced Version
 * Trang chuyển đổi giọng nói thành văn bản với:
 * - Real-time interim results display
 * - Audio level visualization
 * - Enhanced Vietnamese processing
 * - Smooth animations
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaMicrophone, FaCopy, FaTrash, FaEdit, FaStop, FaCheck, FaVolumeUp } from 'react-icons/fa'
import HeaderBar from '../components/layout/HeaderBar'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { useNotification } from '../contexts/notificationContext.helpers'

export const VoiceToTextPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [text, setText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)

  // Voice input hook with enhanced options
  const voiceInput = useVoiceInput({
    fields: [
      {
        id: 'voice-input',
        onResult: (transcript) => {
          // Thêm transcript vào text hiện tại
          setText((prev) => {
            const newText = prev ? `${prev} ${transcript}` : transcript
            return newText.trim()
          })
          // Clear interim text sau khi có final result
          setInterimText('')
        },
        onInterimResult: (transcript) => {
          // Cập nhật interim text real-time
          setInterimText(transcript)
        },
      },
    ],
    onError: (errorMsg) => {
      showError(errorMsg)
    },
    continuous: true,
    autoRestart: true,
    enableVietnameseProcessing: true,
  })

  const isListening = voiceInput.isListening('voice-input')

  // Simulate audio level visualization when listening
  useEffect(() => {
    if (!isListening) {
      setAudioLevel(0)
      return
    }

    const interval = setInterval(() => {
      // Simulate random audio levels for visual feedback
      setAudioLevel(Math.random() * 100)
    }, 100)

    return () => clearInterval(interval)
  }, [isListening])

  // Copy text to clipboard
  const handleCopy = useCallback(async () => {
    const textToCopy = text || interimText
    if (!textToCopy.trim()) {
      showError('Không có văn bản để sao chép')
      return
    }

    try {
      await navigator.clipboard.writeText(textToCopy)
      success('Đã sao chép văn bản vào clipboard!')
    } catch (error) {
      showError('Không thể sao chép văn bản. Vui lòng thử lại.')
    }
  }, [text, interimText, success, showError])

  // Clear text
  const handleClear = useCallback(() => {
    setText('')
    setInterimText('')
    setIsEditing(false)
    setEditText('')
    success('Đã xóa văn bản')
  }, [success])

  // Start editing
  const handleStartEdit = useCallback(() => {
    setEditText(text)
    setIsEditing(true)
  }, [text])

  // Save edit
  const handleSaveEdit = useCallback(() => {
    setText(editText)
    setIsEditing(false)
    success('Đã lưu chỉnh sửa')
  }, [editText, success])

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditText('')
  }, [])

  // Handle voice input toggle
  const handleToggleVoice = useCallback(() => {
    if (isListening) {
      voiceInput.stopListening()
      setInterimText('')
    } else {
      voiceInput.startListening('voice-input')
    }
  }, [isListening, voiceInput])

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      voiceInput.stopListening()
    }
  }, [])

  // Calculate audio bars for visualization
  const getAudioBars = () => {
    const bars = []
    for (let i = 0; i < 5; i++) {
      const height = Math.max(4, (audioLevel / 100) * 24 * Math.random() + 4)
      bars.push(height)
    }
    return bars
  }

  const displayText = text + (interimText ? (text ? ' ' : '') + interimText : '')
  const hasContent = text || interimText

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      <HeaderBar
        variant="page"
        title="GHI CHÚ VĂN BẢN"
        onBack={() => navigate(-1)}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-24">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 pb-6">
          {/* Voice Input Section */}
          <div className="flex flex-col items-center gap-4 mb-2">
            {/* Microphone Button with Enhanced Design */}
            <div className="relative">
              <button
                type="button"
                onClick={handleToggleVoice}
                disabled={!voiceInput.isSupported}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${isListening
                    ? 'bg-gradient-to-br from-red-500 via-red-500 to-pink-600 text-white shadow-[0_8px_30px_rgb(239,68,68,0.4)] scale-110'
                    : 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white shadow-[0_8px_25px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_35px_rgb(59,130,246,0.4)] hover:scale-105 active:scale-95'
                  } ${!voiceInput.isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isListening ? 'Dừng nhận diện giọng nói' : 'Bắt đầu nhận diện giọng nói'}
              >
                {isListening ? (
                  <FaStop className="h-9 w-9 z-10 relative" />
                ) : (
                  <FaMicrophone className="h-9 w-9 z-10 relative" />
                )}

                {/* Enhanced Ripple effects when listening */}
                {isListening && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
                    <div className="absolute inset-0 rounded-full bg-red-300 animate-ping opacity-50" style={{ animationDelay: '0.3s' }} />
                    <div className="absolute inset-0 rounded-full bg-pink-300 animate-ping opacity-30" style={{ animationDelay: '0.6s' }} />
                  </>
                )}

                {/* Glow effect */}
                {!isListening && (
                  <div className="absolute inset-0 rounded-full bg-white/20 blur-xl animate-pulse" />
                )}
              </button>

              {/* Outer ring animation when listening */}
              {isListening && (
                <div className="absolute inset-0 rounded-full border-4 border-red-400/30 animate-ping" style={{ top: '-4px', left: '-4px', right: '-4px', bottom: '-4px' }} />
              )}
            </div>

            {/* Audio Level Visualization */}
            {isListening && (
              <div className="flex items-end gap-1 h-8">
                {getAudioBars().map((height, index) => (
                  <div
                    key={index}
                    className="w-2 bg-gradient-to-t from-red-500 to-pink-400 rounded-full transition-all duration-100"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            )}

            {/* Status Text with Better Design */}
            <div className="text-center px-4">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${isListening
                  ? 'bg-red-100 text-red-700 shadow-red-200/50'
                  : 'bg-blue-100 text-blue-700 shadow-blue-200/50'
                } transition-all duration-300`}>
                {isListening ? (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <p className="text-sm font-semibold">Đang lắng nghe...</p>
                  </>
                ) : (
                  <>
                    <FaMicrophone className="h-3.5 w-3.5" />
                    <p className="text-sm font-medium">Nhấn để bắt đầu nhận diện</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Text Display/Edit Area with Glassmorphism */}
          <div className="rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
            {/* Header with Actions */}
            {hasContent && (
              <div className="flex items-center justify-between border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {isListening ? 'Đang nhận diện...' : 'Văn bản đã chuyển đổi'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {!isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="p-2.5 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-md"
                        title="Chỉnh sửa"
                      >
                        <FaEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="p-2.5 rounded-xl text-slate-600 hover:bg-green-50 hover:text-green-600 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-md"
                        title="Sao chép"
                      >
                        <FaCopy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="p-2.5 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-md"
                        title="Xóa tất cả"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-4 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:scale-105 active:scale-95 flex items-center gap-2"
                        title="Lưu"
                      >
                        <FaCheck className="h-4 w-4" />
                        <span className="text-xs font-semibold">Lưu</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                        title="Hủy"
                      >
                        <span className="text-xs font-semibold">Hủy</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Text Content */}
            <div className="p-4">
              {isEditing ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full min-h-[180px] text-base text-slate-900 bg-transparent border-none outline-none resize-none focus:ring-0 placeholder:text-slate-400"
                  placeholder="Nhập hoặc chỉnh sửa văn bản của bạn..."
                  autoFocus
                />
              ) : hasContent ? (
                <div className="space-y-2">
                  {/* Final text */}
                  {text && (
                    <p className="text-base text-slate-900 whitespace-pre-wrap leading-relaxed">
                      {text}
                    </p>
                  )}
                  {/* Interim text (real-time) */}
                  {interimText && (
                    <p className="text-base text-slate-400 italic whitespace-pre-wrap leading-relaxed animate-pulse">
                      {interimText}
                      <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 animate-blink" />
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[280px] text-center py-8">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-blue-200 rounded-full blur-2xl opacity-30 animate-pulse" />
                    <FaMicrophone className="relative h-16 w-16 text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-semibold text-base mb-1">Chưa có văn bản</p>
                  <p className="text-sm text-slate-400 max-w-xs">
                    Nhấn nút microphone ở trên để bắt đầu chuyển đổi giọng nói thành văn bản
                  </p>
                </div>
              )}
            </div>

            {/* Word/Character Count with Better Design */}
            {hasContent && (
              <div className="border-t border-slate-200/50 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold text-blue-600">{displayText.split(/\s+/).filter((w) => w).length}</span>
                      <span>từ</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold text-indigo-600">{displayText.length}</span>
                      <span>ký tự</span>
                    </span>
                  </div>
                  {isListening && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600">
                      <FaVolumeUp className="h-3 w-3 animate-pulse" />
                      <span className="font-medium">Đang ghi</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Instructions with Enhanced Design */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 shadow-lg shadow-amber-200/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <span className="text-lg">💡</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 mb-2">Hướng dẫn sử dụng</h3>
                <ul className="space-y-1.5 text-xs text-amber-800">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Nhấn nút microphone để bắt đầu nhận diện giọng nói</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Nói rõ ràng, hệ thống sẽ hiển thị <b>ngay lập tức</b> khi bạn đang nói</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Tự động sửa lỗi chính tả và thêm dấu câu tiếng Việt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Có thể chỉnh sửa, sao chép hoặc xóa văn bản sau khi chuyển đổi</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Custom CSS for blink animation */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
      `}</style>
    </div>
  )
}

export default VoiceToTextPage

