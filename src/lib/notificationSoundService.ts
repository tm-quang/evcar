/**
 * Notification Sound Service
 * Handles custom notification sounds
 */

const STORAGE_KEY = 'bofin_notification_sound'
const DEFAULT_SOUNDS = [
  { id: 'default', name: 'Mặc định', type: 'synthetic' },
  { id: 'bell', name: 'Chuông', type: 'synthetic' },
  { id: 'chime', name: 'Tiếng kêu', type: 'synthetic' },
  { id: 'ding', name: 'Ding', type: 'synthetic' },
]

export type SoundPreference = {
  type: 'default' | 'synthetic' | 'custom'
  soundId?: string // For synthetic sounds
  customSoundUrl?: string // For uploaded custom sounds
  customSoundData?: string // Base64 data URL for custom sounds
}

/**
 * Get current sound preference
 */
export const getSoundPreference = (): SoundPreference => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as SoundPreference
    }
  } catch (error) {
    console.warn('Error reading sound preference:', error)
  }
  // Default to ring.mp3 from public folder
  return { type: 'custom', customSoundUrl: '/ring.mp3' }
}

/**
 * Save sound preference
 */
export const saveSoundPreference = (preference: SoundPreference): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference))
  } catch (error) {
    console.warn('Error saving sound preference:', error)
  }
}

/**
 * Get default sounds list
 */
export const getDefaultSounds = () => {
  return DEFAULT_SOUNDS
}

/**
 * Play synthetic sound
 */
const playSyntheticSound = (soundId: string): void => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Different sounds based on soundId
    switch (soundId) {
      case 'bell':
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01)
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.4)
        break
      case 'chime':
        // Two-tone chime
        const chime1 = audioContext.createOscillator()
        const chime2 = audioContext.createOscillator()
        const gain1 = audioContext.createGain()
        const gain2 = audioContext.createGain()
        
        chime1.frequency.value = 523.25 // C5
        chime2.frequency.value = 659.25 // E5
        chime1.type = 'sine'
        chime2.type = 'sine'
        
        chime1.connect(gain1)
        chime2.connect(gain2)
        gain1.connect(audioContext.destination)
        gain2.connect(audioContext.destination)
        
        gain1.gain.setValueAtTime(0, audioContext.currentTime)
        gain2.gain.setValueAtTime(0, audioContext.currentTime)
        gain1.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
        gain2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.15)
        gain1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5)
        gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5)
        
        chime1.start(audioContext.currentTime)
        chime2.start(audioContext.currentTime + 0.1)
        chime1.stop(audioContext.currentTime + 0.5)
        chime2.stop(audioContext.currentTime + 0.5)
        break
      case 'ding':
        oscillator.frequency.value = 1000
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.2)
        break
      default:
        // Default sound (original)
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
    }
  } catch (error) {
    console.warn('Could not play synthetic sound:', error)
  }
}

/**
 * Play custom sound from URL or data
 */
const playCustomSound = (soundUrl?: string, soundData?: string): void => {
  try {
    const audio = new Audio()
    
    if (soundData) {
      // Use base64 data URL
      audio.src = soundData
    } else if (soundUrl) {
      // Use URL
      audio.src = soundUrl
    } else {
      console.warn('No custom sound data or URL provided')
      return
    }
    
    audio.volume = 0.7
    audio.play().catch((error) => {
      console.warn('Could not play custom sound:', error)
    })
  } catch (error) {
    console.warn('Error playing custom sound:', error)
  }
}

/**
 * Play notification sound based on preference
 */
export const playNotificationSound = (): void => {
  const preference = getSoundPreference()
  
  switch (preference.type) {
    case 'synthetic':
      if (preference.soundId) {
        playSyntheticSound(preference.soundId)
      } else {
        // Fallback to ring.mp3 if no synthetic sound selected
        playCustomSound('/ring.mp3')
      }
      break
    case 'custom':
      playCustomSound(preference.customSoundUrl, preference.customSoundData)
      break
    default:
      // Default sound - use ring.mp3 from public folder
      playCustomSound('/ring.mp3')
  }
}

/**
 * Convert file to base64 data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validate audio file
 */
export const validateAudioFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 2 * 1024 * 1024 // 2MB
  const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac']
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Chỉ chấp nhận file âm thanh (MP3, WAV, OGG, WebM, AAC)' }
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File quá lớn. Kích thước tối đa: 2MB' }
  }
  
  return { valid: true }
}


