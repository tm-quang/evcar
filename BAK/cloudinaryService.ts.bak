/**
 * Cloudinary Service
 * Handles image uploads to Cloudinary
 * 
 * Required environment variables:
 * - VITE_CLOUDINARY_CLOUD_NAME
 * - VITE_CLOUDINARY_UPLOAD_PRESET
 * - VITE_CLOUDINARY_BASE_FOLDER (optional, default: 'bofin')
 * - VITE_CLOUDINARY_ICON_FOLDER (optional, default icon folder for icon uploads)
 * - VITE_CLOUDINARY_API_KEY (optional, for signed uploads)
 */

// Get base folder from environment or use default
const getBaseFolder = (): string => {
  return import.meta.env.VITE_CLOUDINARY_BASE_FOLDER || 'bofin'
}

// Get default icon folder from environment
// If set, all icon uploads will use this folder (relative to base folder or absolute)
const getDefaultIconFolder = (): string | null => {
  const iconFolder = import.meta.env.VITE_CLOUDINARY_ICON_FOLDER || null
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('[Cloudinary] Default icon folder:', iconFolder || 'not set')
  }
  return iconFolder
}

/**
 * Translate Cloudinary error messages to Vietnamese
 */
const translateCloudinaryError = (errorMessage: string): string => {
  const lowerMessage = errorMessage.toLowerCase()
  
  // File size errors
  if (lowerMessage.includes('file size') || lowerMessage.includes('too large')) {
    return 'Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 10MB.'
  }
  
  // File format errors
  if (lowerMessage.includes('format') || lowerMessage.includes('file type') || lowerMessage.includes('not supported')) {
    return 'Định dạng file không được hỗ trợ. Vui lòng chọn file hình ảnh (JPG, PNG, GIF, WebP).'
  }
  
  // Transformation errors
  if (lowerMessage.includes('transformation') && lowerMessage.includes('not allowed')) {
    return 'Cấu hình upload không hợp lệ. Vui lòng thử lại.'
  }
  
  // Upload preset errors
  if (lowerMessage.includes('upload preset') || lowerMessage.includes('preset')) {
    return 'Cấu hình upload không hợp lệ. Vui lòng kiểm tra lại cài đặt.'
  }
  
  // Network/connection errors
  if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
    return 'Lỗi kết nối. Vui lòng kiểm tra kết nối internet và thử lại.'
  }
  
  // Generic upload errors
  if (lowerMessage.includes('upload failed') || lowerMessage.includes('failed to upload')) {
    return 'Tải lên thất bại. Vui lòng thử lại.'
  }
  
  // Return original message if no translation found
  return errorMessage
}

export type CloudinaryUploadResponse = {
  public_id: string
  secure_url: string
  url: string
  width: number
  height: number
  format: string
  resource_type: string
}

export type CloudinaryUploadOptions = {
  folder?: string
  useDefaultIconFolder?: boolean // If true, use VITE_CLOUDINARY_ICON_FOLDER as default folder for icons
  transformation?: {
    width?: number
    height?: number
    crop?: string
    quality?: string | number
    format?: string
  }
}

/**
 * Upload image to Cloudinary
 * @param file - File to upload
 * @param options - Upload options (folder, transformations, etc.)
 * @returns Cloudinary upload response with secure URL
 */
export const uploadToCloudinary = async (
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResponse> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Missing Cloudinary environment variables. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.'
    )
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File phải là hình ảnh')
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('Kích thước file phải nhỏ hơn 10MB')
  }

  // Create FormData
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  
  // Determine folder to use
  let folderToUse: string | undefined
  
  // If useDefaultIconFolder is true, prioritize default icon folder
  if (options.useDefaultIconFolder) {
    const defaultIconFolder = getDefaultIconFolder()
    if (defaultIconFolder) {
      folderToUse = defaultIconFolder
      // Debug logging in development
      if (import.meta.env.DEV) {
        console.log('[Cloudinary] Using default icon folder:', defaultIconFolder)
      }
    } else {
      // Fallback to provided folder if default icon folder is not set
      folderToUse = options.folder
      if (import.meta.env.DEV) {
        console.log('[Cloudinary] Default icon folder not set, using provided folder:', options.folder)
      }
    }
  } else {
    // Use provided folder if useDefaultIconFolder is false
    folderToUse = options.folder
  }
  
  // Add folder if provided
  // If folder starts with '/', use it as-is, otherwise prepend base folder
  if (folderToUse) {
    const folderPath = folderToUse.startsWith('/') 
      ? folderToUse.slice(1) // Remove leading slash
      : `${getBaseFolder()}/${folderToUse}`
    formData.append('folder', folderPath)
  } else {
    // Use base folder as default
    formData.append('folder', getBaseFolder())
  }

  // Note: Transformation parameters are not allowed with unsigned upload presets
  // Transformations should be configured in the Upload Preset settings on Cloudinary Dashboard
  // or applied via URL transformations when displaying images
  // Client-side compression is already applied before upload

  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('Cloudinary upload request:', {
      cloudName,
      uploadPreset,
      folder: folderToUse || 'base folder',
      useDefaultIconFolder: options.useDefaultIconFolder,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })
  }

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      let errorMessage = `Tải lên thất bại: ${response.statusText}`
      try {
        const errorData = await response.json()
        const rawMessage = errorData.error?.message || errorMessage
        errorMessage = translateCloudinaryError(rawMessage)
        console.error('Cloudinary upload error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          cloudName,
          uploadPreset,
        })
      } catch {
        // If response is not JSON, get text
        const text = await response.text().catch(() => '')
        console.error('Cloudinary upload error (non-JSON):', {
          status: response.status,
          statusText: response.statusText,
          text,
          cloudName,
          uploadPreset,
        })
        errorMessage = translateCloudinaryError(text || errorMessage)
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return {
      public_id: data.public_id,
      secure_url: data.secure_url,
      url: data.url,
      width: data.width,
      height: data.height,
      format: data.format,
      resource_type: data.resource_type,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to upload image to Cloudinary')
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param files - Array of files to upload
 * @param options - Upload options
 * @returns Array of Cloudinary upload responses
 */
export const uploadMultipleToCloudinary = async (
  files: File[],
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResponse[]> => {
  const uploadPromises = files.map((file) => uploadToCloudinary(file, options))
  return Promise.all(uploadPromises)
}

/**
 * Delete image from Cloudinary
 * Note: This requires Cloudinary Admin API credentials
 * For client-side, consider using a backend endpoint
 * @param _publicId - Public ID of the image to delete
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  // Note: Deletion requires admin API which should be done server-side
  // This is a placeholder - implement on backend for security
  console.warn(`Delete from Cloudinary should be done server-side for security. Skipping removal for ${publicId}`)
  throw new Error('Delete operation must be performed server-side')
}

/**
 * Get optimized image URL from Cloudinary
 * @param url - Cloudinary URL
 * @param options - Transformation options
 * @returns Optimized image URL
 */
export const getOptimizedImageUrl = (
  url: string,
  options: CloudinaryUploadOptions['transformation'] = {}
): string => {
  if (!url.includes('cloudinary.com')) {
    return url // Return original URL if not from Cloudinary
  }

  const transforms: string[] = []
  if (options.width) {
    transforms.push(`w_${options.width}`)
  }
  if (options.height) {
    transforms.push(`h_${options.height}`)
  }
  if (options.crop) {
    transforms.push(`c_${options.crop}`)
  }
  if (options.quality) {
    transforms.push(`q_${options.quality}`)
  }
  if (options.format) {
    transforms.push(`f_${options.format}`)
  }

  if (transforms.length === 0) {
    return url
  }

  // Insert transformation into Cloudinary URL
  // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}
  const urlParts = url.split('/upload/')
  if (urlParts.length === 2) {
    return `${urlParts[0]}/upload/${transforms.join(',')}/${urlParts[1]}`
  }

  return url
}

