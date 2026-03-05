import { useEffect, useState, useMemo } from 'react'
import { getIconNodeFromCategory } from '../../utils/iconLoader'

type CategoryIconProps = {
  iconId: string
  iconUrl?: string | null // URL ảnh từ category (optional, ưu tiên nếu có)
  className?: string
  fallback?: React.ReactNode
  size?: number | string // Kích thước icon (ví dụ: 96, "96x96", "h-24 w-24")
}

/**
 * Component để load và hiển thị icon của category
 * Chỉ sử dụng image_url từ bảng icons_images (icon_type = 'image' hoặc 'svg')
 * Ưu tiên sử dụng icon_url từ category nếu có
 * 
 * @param size - Kích thước icon (ví dụ: 96 cho 96x96px, hoặc "h-24 w-24" cho Tailwind classes)
 */
export const CategoryIcon = ({ iconId, iconUrl, className, fallback = null, size }: CategoryIconProps) => {
  // Xác định className dựa trên size prop hoặc className mặc định
  const finalClassName = useMemo(() => {
    if (className) return className
    
    if (typeof size === 'number') {
      // Nếu size là số, tạo className với pixel
      return `h-[${size}px] w-[${size}px]`
    } else if (typeof size === 'string' && size.includes('x')) {
      // Nếu size là "96x96", tách ra
      const [width, height] = size.split('x')
      return `h-[${height}px] w-[${width}px]`
    } else if (typeof size === 'string') {
      // Nếu size là Tailwind class như "h-24 w-24"
      return size
    } else {
      // Mặc định
      return 'h-5 w-5'
    }
  }, [className, size])
  
  const [iconNode, setIconNode] = useState<React.ReactNode>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadIcon = async () => {
      // Chỉ return early nếu cả iconId và iconUrl đều không có
      // Nếu có iconUrl, vẫn load ảnh ngay cả khi iconId là empty string
      if (!iconId && !iconUrl) {
        if (isMounted) {
          setIconNode(fallback)
          setIsLoading(false)
        }
        return
      }

      try {
        // Debug: log iconUrl để kiểm tra
        if (iconUrl) {
          console.log('CategoryIcon: Loading icon from iconUrl:', iconUrl, 'for iconId:', iconId || '(empty)')
        }
        
        // Ưu tiên sử dụng icon_url từ category nếu có, sau đó mới load từ database
        // Truyền className vào để ảnh fill vừa vặn container
        const node = await getIconNodeFromCategory(iconId || '', iconUrl, 'h-full w-full object-cover rounded-full')
        
        if (isMounted) {
          if (node) {
            // Wrap trong container với className để control kích thước
            setIconNode(
              <span className={`${finalClassName} flex items-center justify-center overflow-hidden rounded-full`}>
                {node}
              </span>
            )
          } else {
            // Không tìm thấy icon, sử dụng fallback
            console.warn('CategoryIcon: No icon node found for iconId:', iconId || '(empty)', 'iconUrl:', iconUrl)
            setIconNode(fallback)
          }
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error loading category icon:', iconId || '(empty)', 'iconUrl:', iconUrl, error)
        if (isMounted) {
          // Lỗi khi load icon, sử dụng fallback
          setIconNode(fallback)
          setIsLoading(false)
        }
      }
    }

    loadIcon()

    return () => {
      isMounted = false
    }
  }, [iconId, iconUrl, finalClassName, fallback])

  if (isLoading) {
    return <span className={`${finalClassName} animate-pulse bg-slate-200 rounded`} />
  }

  // Nếu không có icon, hiển thị fallback hoặc chữ cái đầu
  if (!iconNode) {
    if (fallback) {
      return <>{fallback}</>
    }
    // Fallback mặc định: hiển thị chữ cái đầu của iconId
    return (
      <span className={`${finalClassName} flex items-center justify-center text-slate-400 text-xs font-semibold`}>
        {iconId?.[0]?.toUpperCase() || '?'}
      </span>
    )
  }

  return <>{iconNode}</>
}

