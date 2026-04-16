/**
 * Image compression utility
 * Compresses and resizes images before upload
 */

/**
 * Compress and resize image to fit avatar requirements
 * @param file - Original image file
 * @param maxWidth - Maximum width (default: 200)
 * @param maxHeight - Maximum height (default: 200)
 * @param maxSizeKB - Maximum file size in KB (default: 250)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed File or null if compression fails
 */
export const compressImageForAvatar = async (
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200,
  maxSizeKB: number = 250,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height

        // Resize if needed while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Không thể tạo canvas context'))
          return
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)

        // Try different quality levels to meet size requirement
        const tryCompress = (q: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Không thể nén ảnh'))
                return
              }

              const sizeKB = blob.size / 1024

              // If size is acceptable or quality is too low, use this
              if (sizeKB <= maxSizeKB || q <= 0.1) {
                const compressedFile = new File(
                  [blob],
                  file.name,
                  {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  }
                )
                resolve(compressedFile)
              } else {
                // Try lower quality
                tryCompress(q - 0.1)
              }
            },
            'image/jpeg',
            q
          )
        }

        tryCompress(quality)
      }

      img.onerror = () => {
        reject(new Error('Không thể load ảnh'))
      }

      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }

    reader.onerror = () => {
      reject(new Error('Không thể đọc file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Compress and resize image for icon images
 * Icons are compressed to very small size for fast loading
 * Supports PNG (with transparency) and JPEG formats
 * @param file - Original image file
 * @param maxWidth - Maximum width (default: 96 for PNG, 128 for JPEG)
 * @param maxHeight - Maximum height (default: 96 for PNG, 128 for JPEG)
 * @param maxSizeKB - Maximum file size in KB (default: 30 for PNG, 10 for JPEG)
 * @param quality - JPEG quality 0-1 (default: 0.6, not used for PNG)
 * @param preserveTransparency - Keep PNG format for transparency (default: true)
 * @returns Compressed File
 */
export const compressImageForIcon = async (
  file: File,
  maxWidth: number = 96,
  maxHeight: number = 96,
  maxSizeKB: number = 30,
  quality: number = 0.6,
  preserveTransparency: boolean = true
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height

        // Resize if needed while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        // Determine output format
        // If preserveTransparency is true and original is PNG, keep PNG
        // Otherwise use JPEG for better compression
        const fileName = file.name.toLowerCase()
        const isPngOriginal = fileName.endsWith('.png')
        const usePNG = preserveTransparency && isPngOriginal
        
        const outputType = usePNG ? 'image/png' : 'image/jpeg'
        const outputExtension = usePNG ? 'png' : 'jpg'

        // For PNG, we can't control quality, so we need to reduce size if needed
        // For JPEG, we can reduce quality
        const tryCompress = (currentWidth: number, currentHeight: number, q: number): void => {
          // Create canvas with current dimensions
          const canvas = document.createElement('canvas')
          canvas.width = currentWidth
          canvas.height = currentHeight
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('Không thể tạo canvas context'))
            return
          }

          // Draw image to canvas
          ctx.drawImage(img, 0, 0, currentWidth, currentHeight)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Không thể nén ảnh'))
                return
              }

              const sizeKB = blob.size / 1024

              // If size is acceptable, use this
              if (sizeKB <= maxSizeKB) {
                const originalName = file.name.replace(/\.[^/.]+$/, '')
                const newFileName = `${originalName}.${outputExtension}`
                
                const compressedFile = new File(
                  [blob],
                  newFileName,
                  {
                    type: outputType,
                    lastModified: Date.now(),
                  }
                )
                resolve(compressedFile)
              } else if (usePNG) {
                // For PNG, try reducing size further (minimum 64x64)
                const newWidth = Math.max(64, Math.floor(currentWidth * 0.8))
                const newHeight = Math.max(64, Math.floor(currentHeight * 0.8))
                
                if (newWidth < currentWidth || newHeight < currentHeight) {
                  tryCompress(newWidth, newHeight, q)
                } else {
                  // Can't reduce more, accept current size
                  const originalName = file.name.replace(/\.[^/.]+$/, '')
                  const newFileName = `${originalName}.${outputExtension}`
                  
                  const compressedFile = new File(
                    [blob],
                    newFileName,
                    {
                      type: outputType,
                      lastModified: Date.now(),
                    }
                  )
                  resolve(compressedFile)
                }
              } else {
                // For JPEG, try lower quality
                const minQuality = maxSizeKB <= 10 ? 0.05 : 0.1
                const step = maxSizeKB <= 10 ? 0.05 : 0.1
                if (q > minQuality) {
                  tryCompress(currentWidth, currentHeight, Math.max(minQuality, q - step))
                } else {
                  // Can't reduce more, accept current size
                  const originalName = file.name.replace(/\.[^/.]+$/, '')
                  const newFileName = `${originalName}.${outputExtension}`
                  
                  const compressedFile = new File(
                    [blob],
                    newFileName,
                    {
                      type: outputType,
                      lastModified: Date.now(),
                    }
                  )
                  resolve(compressedFile)
                }
              }
            },
            outputType,
            usePNG ? undefined : q // PNG doesn't support quality parameter
          )
        }

        tryCompress(width, height, quality)
      }

      img.onerror = () => {
        reject(new Error('Không thể load ảnh'))
      }

      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }

    reader.onerror = () => {
      reject(new Error('Không thể đọc file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Compress and resize image for transaction receipts/images
 * Optimized for maximum 50KB file size
 * @param file - Original image file
 * @param maxWidth - Maximum width (default: 1200)
 * @param maxHeight - Maximum height (default: 1200)
 * @param maxSizeKB - Maximum file size in KB (default: 50)
 * @param quality - JPEG quality 0-1 (default: 0.7)
 * @returns Compressed File
 */
export const compressImageForTransaction = async (
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  maxSizeKB: number = 50,
  quality: number = 0.7
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height

        // Resize if needed while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Không thể tạo canvas context'))
          return
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Try different quality levels to meet size requirement
        const tryCompress = (q: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Không thể nén ảnh'))
                return
              }

              const sizeKB = blob.size / 1024

              // If size is acceptable or quality is too low, use this
              if (sizeKB <= maxSizeKB || q <= 0.1) {
                const originalName = file.name.replace(/\.[^/.]+$/, '')
                const compressedFile = new File(
                  [blob],
                  `${originalName}_compressed.jpg`,
                  {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  }
                )
                resolve(compressedFile)
              } else {
                // Try lower quality (reduce by 0.05 each time)
                tryCompress(Math.max(0.1, q - 0.05))
              }
            },
            'image/jpeg',
            q
          )
        }

        tryCompress(quality)
      }

      img.onerror = () => {
        reject(new Error('Không thể load ảnh'))
      }

      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }

    reader.onerror = () => {
      reject(new Error('Không thể đọc file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Check if file size is acceptable
 * @param file - File to check
 * @param maxSizeKB - Maximum size in KB
 * @returns true if file size is acceptable
 */
export const isFileSizeAcceptable = (file: File, maxSizeKB: number): boolean => {
  return file.size / 1024 <= maxSizeKB
}


