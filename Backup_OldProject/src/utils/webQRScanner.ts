/**
 * Web QR Scanner Utility
 * Direct QR scanning for web browsers without modal UI
 */

import { MultiFormatReader, DecodeHintType, BarcodeFormat, HTMLCanvasElementLuminanceSource, BinaryBitmap, HybridBinarizer } from '@zxing/library'

interface WebQRScannerOptions {
  onSuccess: (result: string) => void
  onError?: (error: string) => void
}

let videoElement: HTMLVideoElement | null = null
let canvasElement: HTMLCanvasElement | null = null
let overlayElement: HTMLDivElement | null = null
let stream: MediaStream | null = null
let reader: MultiFormatReader | null = null
let scanningInterval: number | null = null
let isScanning = false

/**
 * Find the best camera (back camera with highest resolution)
 */
const findBestCamera = async (): Promise<string | null> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(device => device.kind === 'videoinput')

    if (videoDevices.length === 0) {
      return null
    }

    // Prefer back camera (environment facing)
    const backCameras = videoDevices.filter(device => {
      const label = device.label.toLowerCase()
      return label.includes('back') || label.includes('rear') || label.includes('environment')
    })

    const preferredDevices = backCameras.length > 0 ? backCameras : videoDevices
    return preferredDevices[0]?.deviceId || null
  } catch (error) {
    console.error('Error enumerating devices:', error)
    return null
  }
}

/**
 * Get camera constraints with best quality
 */
const getBestCameraConstraints = (deviceId: string | null): MediaStreamConstraints => {
  return {
    video: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      facingMode: deviceId ? undefined : 'environment',
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, min: 15 }
    }
  }
}

/**
 * Stop scanning and cleanup resources
 */
const stopScanning = () => {
  if (scanningInterval !== null) {
    cancelAnimationFrame(scanningInterval)
    scanningInterval = null
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  if (videoElement) {
    videoElement.srcObject = null
    if (videoElement.parentNode) {
      videoElement.parentNode.removeChild(videoElement)
    }
    videoElement = null
  }

  if (overlayElement) {
    if (overlayElement.parentNode) {
      overlayElement.parentNode.removeChild(overlayElement)
    }
    overlayElement = null
  }

  if (canvasElement) {
    canvasElement = null
  }

  if (reader) {
    reader.reset()
    reader = null
  }

  isScanning = false
}

/**
 * Start QR scanning directly on web browser
 */
export const startWebQRScan = async (options: WebQRScannerOptions): Promise<void> => {
  const { onSuccess, onError } = options

  // Stop any existing scan
  stopScanning()

  if (isScanning) {
    return
  }

  try {
    isScanning = true

    // Find best camera
    const deviceId = await findBestCamera()

    // Get camera stream
    const constraints = getBestCameraConstraints(deviceId)
    stream = await navigator.mediaDevices.getUserMedia(constraints)

    // Create container for video and overlay
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '100vw'
    container.style.height = '100vh'
    container.style.zIndex = '9999'
    container.style.backgroundColor = '#000'

    // Create video element (fullscreen)
    videoElement = document.createElement('video')
    videoElement.style.width = '100%'
    videoElement.style.height = '100%'
    videoElement.style.objectFit = 'cover'
    videoElement.playsInline = true
    videoElement.muted = true
    videoElement.autoplay = true
    videoElement.srcObject = stream
    container.appendChild(videoElement)

    // Create overlay with scanning frame and close button
    overlayElement = document.createElement('div')
    overlayElement.style.position = 'absolute'
    overlayElement.style.top = '0'
    overlayElement.style.left = '0'
    overlayElement.style.width = '100%'
    overlayElement.style.height = '100%'
    overlayElement.style.pointerEvents = 'none'

    // Background overlay
    const bgOverlay = document.createElement('div')
    bgOverlay.style.position = 'absolute'
    bgOverlay.style.inset = '0'
    bgOverlay.style.background = 'rgba(0, 0, 0, 0.5)'
    overlayElement.appendChild(bgOverlay)

    // Scanning frame
    const frame = document.createElement('div')
    frame.style.position = 'absolute'
    frame.style.top = '50%'
    frame.style.left = '50%'
    frame.style.transform = 'translate(-50%, -50%)'
    frame.style.width = '280px'
    frame.style.height = '280px'
    frame.style.border = '4px solid #3b82f6'
    frame.style.borderRadius = '12px'
    frame.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)'

    // Corner decorations
    const corners = [
      { top: '-2px', left: '-2px', border: '4px solid #3b82f6', borderRadius: '4px 0 0 0' },
      { top: '-2px', right: '-2px', border: '4px solid #3b82f6', borderRadius: '0 4px 0 0' },
      { bottom: '-2px', left: '-2px', border: '4px solid #3b82f6', borderRadius: '0 0 0 4px' },
      { bottom: '-2px', right: '-2px', border: '4px solid #3b82f6', borderRadius: '0 0 4px 0' }
    ]

    corners.forEach(corner => {
      const cornerEl = document.createElement('div')
      cornerEl.style.position = 'absolute'
      cornerEl.style.width = '32px'
      cornerEl.style.height = '32px'
      Object.assign(cornerEl.style, corner)
      frame.appendChild(cornerEl)
    })

    overlayElement.appendChild(frame)

    // Instruction text
    const instruction = document.createElement('div')
    instruction.style.position = 'absolute'
    instruction.style.top = '50%'
    instruction.style.left = '50%'
    instruction.style.transform = 'translate(-50%, calc(-50% + 180px))'
    instruction.style.color = 'white'
    instruction.style.textAlign = 'center'
    instruction.style.fontSize = '14px'
    instruction.style.fontWeight = '500'
    instruction.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.5)'
    instruction.textContent = 'Di chuyển camera đến mã QR để quét'
    overlayElement.appendChild(instruction)

    // Close button
    const closeButton = document.createElement('button')
    closeButton.textContent = '×'
    closeButton.style.position = 'absolute'
    closeButton.style.top = '20px'
    closeButton.style.right = '20px'
    closeButton.style.width = '48px'
    closeButton.style.height = '48px'
    closeButton.style.borderRadius = '50%'
    closeButton.style.background = 'rgba(0, 0, 0, 0.6)'
    closeButton.style.border = '2px solid rgba(255, 255, 255, 0.3)'
    closeButton.style.color = 'white'
    closeButton.style.fontSize = '24px'
    closeButton.style.cursor = 'pointer'
    closeButton.style.display = 'flex'
    closeButton.style.alignItems = 'center'
    closeButton.style.justifyContent = 'center'
    closeButton.style.pointerEvents = 'auto'
    closeButton.style.transition = 'all 0.2s'
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.8)'
      closeButton.style.borderColor = 'rgba(255, 255, 255, 0.5)'
    })
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.6)'
      closeButton.style.borderColor = 'rgba(255, 255, 255, 0.3)'
    })
    closeButton.addEventListener('click', () => {
      stopScanning()
    })
    overlayElement.appendChild(closeButton)

    container.appendChild(overlayElement)
    document.body.appendChild(container)

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      if (!videoElement) {
        reject(new Error('Video element not created'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Camera timeout'))
      }, 5000)

      videoElement.onloadedmetadata = () => {
        clearTimeout(timeout)
        resolve()
      }

      videoElement.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('Camera error'))
      }

      videoElement.play().then(() => {
        if (videoElement && videoElement.readyState >= 2) {
          clearTimeout(timeout)
          resolve()
        }
      }).catch(reject)
    })

    // Create canvas for capturing frames
    canvasElement = document.createElement('canvas')

    // Initialize ZXing reader
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
    hints.set(DecodeHintType.TRY_HARDER, true)
    reader = new MultiFormatReader()
    reader.setHints(hints)

    // Start scanning loop
    const scanFrame = async () => {
      if (!videoElement || !reader || !canvasElement || !isScanning) {
        return
      }

      try {
        const video = videoElement
        const canvas = canvasElement
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        if (!ctx || video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
          if (isScanning) {
            scanningInterval = requestAnimationFrame(scanFrame)
          }
          return
        }

        // Set canvas size to match video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Decode QR code
        const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas)
        const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource))
        const result = reader.decode(binaryBitmap)

        if (result) {
          const text = result.getText()
          if (text) {
            // Success! Stop scanning and call callback
            stopScanning()
            onSuccess(text)
            return
          }
        }
      } catch (err) {
        // Ignore scanning errors (normal during scanning - no QR code found)
      }

      // Continue scanning
      if (isScanning) {
        scanningInterval = requestAnimationFrame(scanFrame)
      }
    }

    // Start scanning loop
    scanningInterval = requestAnimationFrame(scanFrame)

  } catch (error) {
    isScanning = false
    stopScanning()
    const errorMessage = error instanceof Error ? error.message : 'Không thể khởi động camera'
    console.error('Error starting camera:', error)
    if (onError) {
      onError(errorMessage)
    }
  }
}

/**
 * Stop current scan if any
 */
export const stopWebQRScan = (): void => {
  stopScanning()
}


