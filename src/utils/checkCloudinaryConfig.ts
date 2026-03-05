/**
 * Utility to check Cloudinary configuration
 * Use this to debug environment variables
 */

export const checkCloudinaryConfig = () => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  const baseFolder = import.meta.env.VITE_CLOUDINARY_BASE_FOLDER || 'bofin'
  const iconFolder = import.meta.env.VITE_CLOUDINARY_ICON_FOLDER || null

  const config = {
    cloudName,
    uploadPreset,
    baseFolder,
    iconFolder,
    isValid: !!cloudName && !!uploadPreset,
  }

  // Auto-log in development mode
  if (import.meta.env.DEV) {
    console.log('[Cloudinary Config]', config)
    if (!iconFolder) {
      console.warn('[Cloudinary Config] VITE_CLOUDINARY_ICON_FOLDER is not set. Icons will use individual folders.')
    } else {
      console.log(`[Cloudinary Config] Icon folder set to: "${iconFolder}" → ${baseFolder}/${iconFolder}`)
    }
  }

  return config
}

// Auto-check on import in dev mode
if (import.meta.env.DEV) {
  checkCloudinaryConfig()
}


