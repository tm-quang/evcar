import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import toast from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { initNativeAppBehavior, setupInstallPrompt, optimizePerformance } from './utils/nativeAppBehavior'
import { setupConsoleOverride } from './utils/consoleOverride'
import { registerServiceWorker } from './lib/serviceWorkerManager'
import './utils/checkCloudinaryConfig' // Auto-check Cloudinary config in dev mode

// Declare global window.onQRCodeScanned function
declare global {
  interface Window {
    onQRCodeScanned?: (scanResult: string) => void
  }
}

// Setup global QR code scanned callback
// This function can be called from external systems (native apps, other QR scanners, etc.)
// Android app có thể gọi hàm này trực tiếp sau khi scan QR thành công
window.onQRCodeScanned = function(scanResult: string) {
  console.log('onQRCodeScanned called with result:', scanResult)
  
  // Hiển thị thông báo với nội dung QR code (chỉ hiển thị nội dung, không có dòng "Trang tại...")
  if (scanResult && scanResult.trim()) {
    // Sử dụng toast để hiển thị chỉ nội dung QR code
    toast(scanResult.trim(), {
      duration: 3000,
      position: 'top-center',
      style: {
        borderRadius: '12px',
        padding: '12px 20px',
        maxWidth: '90%',
        fontSize: '16px',
        fontWeight: '600',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#ffffff',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
      },
      icon: '✓',
    })

    // Tự động điều hướng đến trang QR Result với kết quả quét
    // Encode scanResult để tránh lỗi với các ký tự đặc biệt trong URL
    const encodedResult = encodeURIComponent(scanResult.trim())
    // Điều hướng đến trang QR Result
    window.location.href = `/qr-result?result=${encodedResult}`
  }
}

// Override console to prevent sensitive data leaks
setupConsoleOverride()

// Initialize native app behaviors
initNativeAppBehavior()
setupInstallPrompt()
// addHapticFeedback() - Disabled: Removed haptic feedback/vibration
optimizePerformance()

// Register service worker for PWA background notifications
if ('serviceWorker' in navigator) {
  registerServiceWorker().catch((error) => {
    console.error('Failed to register service worker:', error)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
