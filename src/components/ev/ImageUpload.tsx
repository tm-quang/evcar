import { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { uploadToCloudinary } from '../../lib/cloudinaryService'

interface ImageUploadProps {
    value: string | null
    onChange: (url: string | null) => void
    onFileSelect?: (file: File) => void
    label?: string
    maxSize?: number // in MB
}

export function ImageUpload({
    value,
    onChange,
    onFileSelect,
    label = 'Ảnh hóa đơn',
    maxSize = 5,
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(value)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (file: File) => {
        setError(null)

        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
            setError(`Ảnh quá lớn. Vui lòng chọn ảnh dưới ${maxSize}MB.`)
            return
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn file ảnh.')
            return
        }

        try {
            // Create preview locally first
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreview(reader.result as string)
            }
            reader.readAsDataURL(file)

            if (onFileSelect) {
                // Deferred upload mode
                setIsUploading(true) // Show loading while compressing

                // Compress image
                const compressed = await compressImage(file)

                setIsUploading(false)
                onFileSelect(compressed)
            } else {
                // Immediate upload mode (Legacy)
                setIsUploading(true)

                // Compress and upload
                const compressed = await compressImage(file)
                const result = await uploadToCloudinary(compressed, {
                    folder: 'fuel_receipts',
                })

                onChange(result.secure_url)
                setPreview(result.secure_url)
                setIsUploading(false)
            }
        } catch (err) {
            console.error('Upload error:', err)
            setError('Không thể xử lý ảnh. Vui lòng thử lại.')
            setPreview(null)
            setIsUploading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const handleRemove = () => {
        onChange(null)
        setPreview(null)
        setError(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (cameraInputRef.current) cameraInputRef.current.value = ''
    }

    const handleCameraClick = () => {
        cameraInputRef.current?.click()
    }

    const handleFileClick = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
                {label}
            </label>

            {/* Preview */}
            {preview && (
                <div className="relative rounded-lg border border-slate-200 overflow-hidden">
                    <img
                        src={preview}
                        alt="Receipt preview"
                        className="w-full h-48 object-cover"
                    />
                    {!isUploading && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {/* Upload Buttons */}
            {!preview && (
                <div className="grid grid-cols-2 gap-2">
                    {/* Camera Button (Mobile) */}
                    <button
                        type="button"
                        onClick={handleCameraClick}
                        disabled={isUploading}
                        className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                        <Camera className="h-5 w-5" />
                        <span className="text-sm font-medium">Chụp ảnh</span>
                    </button>

                    {/* File Picker Button */}
                    <button
                        type="button"
                        onClick={handleFileClick}
                        disabled={isUploading}
                        className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                    >
                        <Upload className="h-5 w-5" />
                        <span className="text-sm font-medium">Chọn ảnh</span>
                    </button>
                </div>
            )}

            {/* Hidden File Inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Error Message */}
            {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                    <X className="h-4 w-4" />
                    {error}
                </p>
            )}

            {/* Loading State */}
            {isUploading && !preview && (
                <div className="flex items-center justify-center gap-2 py-8 text-blue-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Đang tải ảnh lên...</span>
                </div>
            )}

            {/* Empty State */}
            {!preview && !isUploading && !error && (
                <div className="text-center py-2">
                    <ImageIcon className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">
                        Chụp hoặc chọn ảnh hóa đơn (tùy chọn)
                    </p>
                </div>
            )}
        </div>
    )
}

/**
 * Compress image before uploading
 */
async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                // Max dimensions
                const maxWidth = 1920
                const maxHeight = 1920

                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width
                        width = maxWidth
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height
                        height = maxHeight
                    }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            })
                            resolve(compressedFile)
                        } else {
                            resolve(file)
                        }
                    },
                    'image/jpeg',
                    0.8
                )
            }
            img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
    })
}

