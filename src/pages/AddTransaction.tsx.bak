import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FaCalendar, FaImage, FaWallet, FaArrowDown, FaArrowUp, FaChevronDown, FaTimes, FaClock, FaStar, FaEdit, FaPlus, FaChevronRight, FaCamera, FaMapMarkerAlt, FaUser, FaPhone, FaMoneyBillWave, FaChartLine, FaExternalLinkAlt, FaMicrophone, FaCalculator } from 'react-icons/fa'

import HeaderBar from '../components/layout/HeaderBar'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { CustomSelect } from '../components/ui/CustomSelect'
import { getIconNodeFromCategory } from '../utils/iconLoader'
import { NumberPadModal } from '../components/ui/NumberPadModal'
import { CategoryPickerModal } from '../components/categories/CategoryPickerModal'
import { FavoriteCategoriesModal } from '../components/categories/FavoriteCategoriesModal'
import { DateTimePickerModal } from '../components/ui/DateTimePickerModal'
import { ModalFooterButtons } from '../components/ui/ModalFooterButtons'
import { fetchCategories, fetchCategoriesHierarchical, type CategoryRecord, type CategoryType, type CategoryWithChildren } from '../lib/categoryService'
import { getFavoriteCategories, initializeDefaultFavorites } from '../lib/favoriteCategoriesService'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { createTransaction, updateTransaction, type TransactionType } from '../lib/transactionService'
import { fetchWallets, getDefaultWallet, getTotalBalanceWalletIds, type WalletRecord } from '../lib/walletService'
import { uploadMultipleToCloudinary } from '../lib/cloudinaryService'
import { compressImageForTransaction } from '../utils/imageCompression'
import { useNotification } from '../contexts/notificationContext.helpers'
import { formatVNDInput, parseVNDInput } from '../utils/currencyInput'
import { getSupabaseClient } from '../lib/supabaseClient'
import { formatDateUTC7, getNowUTC7, getDateComponentsUTC7 } from '../utils/dateUtils'
import { reverseGeocode, isCoordinates, parseCoordinates, getMapsUrl } from '../utils/geocoding'
import { VoiceTransactionModal } from '../components/transactions/VoiceTransactionModal'
import { CalculatorModal } from '../components/settings/CalculatorModal'

type TransactionFormState = {
  type: TransactionType
  wallet_id: string
  category_id: string
  amount: string
  description: string
  transaction_date: string
  transaction_time?: string
  location?: string
  recipient_name?: string
  is_borrowed?: boolean
  lender_name?: string
  lender_phone?: string
  borrow_date?: string
  exclude_from_reports?: boolean
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const AddTransactionPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { success, error: showError } = useNotification()

  const transactionId = searchParams.get('id')
  const defaultType = (searchParams.get('type') as TransactionType) || 'Chi'
  const isEditMode = !!transactionId

  const [formState, setFormState] = useState<TransactionFormState>({
    type: defaultType,
    wallet_id: '',
    category_id: '',
    amount: '',
    description: '',
    transaction_date: formatDateUTC7(getNowUTC7()),
  })

  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [defaultWalletId, setDefaultWalletId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false)
  const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false)
  const [favoriteCategories, setFavoriteCategories] = useState<CategoryWithChildren[]>([])
  const [isExpandedSectionOpen, setIsExpandedSectionOpen] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationCoordinates, setLocationCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Load wallets và categories
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [walletsData, categoriesData, defaultId] = await Promise.all([
          fetchWallets(false),
          fetchCategories(),
          getDefaultWallet(),
        ])

        setWallets(walletsData)
        setCategories(categoriesData)

        // Get selected wallets for default wallet selection
        const walletIds = await getTotalBalanceWalletIds()
        const selectedWallets = walletsData.filter((w) => walletIds.includes(w.id))

        // Set default wallet ID (first wallet in selected list or default wallet)
        if (selectedWallets.length > 0) {
          setDefaultWalletId(selectedWallets[0].id)
        } else if (defaultId) {
          setDefaultWalletId(defaultId)
        } else if (walletsData.length > 0) {
          setDefaultWalletId(walletsData[0].id)
        }

        // Load icons for all categories using icon_url from category
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          categoriesData.map(async (category) => {
            try {
              const iconNode = await getIconNodeFromCategory(category.icon_id, category.icon_url, 'h-full w-full object-cover rounded-full')
              if (iconNode) {
                iconsMap[category.id] = <span className="h-4 w-4 flex items-center justify-center rounded-full overflow-hidden">{iconNode}</span>
              } else {
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-4 w-4" />
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-4 w-4" />
              }
            }
          })
        )
        setCategoryIcons(iconsMap)

        // Load hierarchical categories and favorite categories
        const categoryTypeForFetch = defaultType === 'Chi' ? 'Chi tiêu' : 'Thu nhập'

        // Initialize default favorites for new users
        await initializeDefaultFavorites(categoryTypeForFetch)

        const [hierarchicalData, favoriteIdsArray] = await Promise.all([
          fetchCategoriesHierarchical(),
          getFavoriteCategories(categoryTypeForFetch),
        ])

        // Extract favorite categories (limit to 7)
        const favorites: CategoryWithChildren[] = []
        const favoriteIdsSet = new Set(favoriteIdsArray.slice(0, 7))

        // Helper to find category by ID in hierarchical structure
        const findCategoryById = (cats: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
          for (const cat of cats) {
            if (cat.id === id) return cat
            if (cat.children) {
              const found = findCategoryById(cat.children, id)
              if (found) return found
            }
          }
          return null
        }

        // Get favorite categories
        favoriteIdsSet.forEach((id) => {
          const category = findCategoryById(hierarchicalData, id)
          if (category) {
            favorites.push(category)
          }
        })

        setFavoriteCategories(favorites)

        // Load transaction if editing
        if (transactionId) {
          // Invalidate cache trước để đảm bảo lấy dữ liệu mới nhất từ database
          const { queryClient } = await import('../lib/react-query')
          await queryClient.invalidateQueries({ queryKey: ['transactions'] })

          // Load transaction trực tiếp từ database bằng ID
          const { getTransactionById } = await import('../lib/transactionService')
          const foundTransaction = await getTransactionById(transactionId)

          if (!foundTransaction) {
            setError('Không tìm thấy giao dịch. Vui lòng thử lại.')
            showError('Không tìm thấy giao dịch. Vui lòng thử lại.')
            return
          }

          // Tải toàn bộ dữ liệu từ transaction vào form
          // Parse transaction_date (YYYY-MM-DD) - ensure it's treated as UTC+7
          const dateStr = foundTransaction.transaction_date.split('T')[0]

          // Lấy time từ created_at của transaction để giữ nguyên thời gian tạo ban đầu
          let transactionTime = ''
          try {
            const createdDate = new Date(foundTransaction.created_at)
            const components = getDateComponentsUTC7(createdDate)
            transactionTime = `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}`
          } catch {
            // Fallback to current time if parsing fails
            const now = getNowUTC7()
            const components = getDateComponentsUTC7(now)
            transactionTime = `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}`
          }

          // Parse location to extract coordinates if stored
          const savedLocation = foundTransaction.location || ''
          let coords: { lat: number; lng: number } | null = null

          // Check if location contains coordinates (format: "address|lat,lng")
          if (savedLocation.includes('|')) {
            const parts = savedLocation.split('|')
            if (parts[1]) {
              coords = parseCoordinates(parts[1])
            }
          } else if (isCoordinates(savedLocation)) {
            // If it's just coordinates, parse them
            coords = parseCoordinates(savedLocation)
          }

          if (coords) {
            setLocationCoordinates(coords)
          }

          // Tải toàn bộ dữ liệu từ transaction vào form state
          setFormState({
            type: foundTransaction.type,
            wallet_id: foundTransaction.wallet_id,
            category_id: foundTransaction.category_id,
            amount: formatVNDInput(foundTransaction.amount.toString()),
            description: foundTransaction.description || '',
            transaction_date: dateStr,
            transaction_time: transactionTime,
            location: savedLocation, // Keep original format for saving
            recipient_name: foundTransaction.recipient_name || '',
            is_borrowed: foundTransaction.is_borrowed || false,
            lender_name: foundTransaction.lender_name || '',
            lender_phone: foundTransaction.lender_phone || '',
            borrow_date: foundTransaction.borrow_date || '',
            exclude_from_reports: foundTransaction.exclude_from_reports || false,
          })
          setUploadedImageUrls(foundTransaction.image_urls || [])
        } else {
          // Reset form when creating new transaction
          // Always start with empty wallet_id - user must select manually
          const now = getNowUTC7()
          const components = getDateComponentsUTC7(now)
          const currentTime = `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}`

          setFormState({
            type: defaultType,
            wallet_id: '', // Always empty - user must select wallet
            category_id: '',
            amount: '',
            description: '',
            transaction_date: formatDateUTC7(now),
            transaction_time: currentTime,
          })
          setUploadedFiles([])
          setUploadedImageUrls([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [transactionId, defaultType])

  // Update default wallet when wallets change
  useEffect(() => {
    const updateDefaultWallet = async () => {
      if (wallets.length > 0) {
        try {
          // Get selected wallet IDs (from Quản lý ví settings)
          const walletIds = await getTotalBalanceWalletIds()
          const selectedWallets = wallets.filter((w) => walletIds.includes(w.id))

          // Update default wallet ID if not set (for reference only, don't auto-select)
          if (selectedWallets.length > 0 && !defaultWalletId) {
            setDefaultWalletId(selectedWallets[0].id)
            // Don't auto-set wallet_id - user must select manually
          }
        } catch (error) {
          console.error('Error updating default wallet:', error)
          // Fallback: use Tiền mặt + Ngân hàng
          const netAssetsWallets = wallets.filter((w) => (w.type === 'Tiền mặt' || w.type === 'Ngân hàng') && w.is_active)

          // Update default wallet ID if not set (for reference only, don't auto-select)
          if (netAssetsWallets.length > 0 && !defaultWalletId) {
            setDefaultWalletId(netAssetsWallets[0].id)
            // Don't auto-set wallet_id - user must select manually
          }
        }
      }
    }
    updateDefaultWallet()
  }, [wallets, defaultWalletId, formState.type, formState.wallet_id])

  // Filter categories theo type
  const filteredCategories = categories.filter((cat) => {
    const categoryType: CategoryType = cat.type === 'Chi tiêu' ? 'Chi tiêu' : 'Thu nhập'
    return formState.type === 'Chi' ? categoryType === 'Chi tiêu' : categoryType === 'Thu nhập'
  })

  // Reset category khi type thay đổi
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const currentCategory = filteredCategories.find((cat) => cat.id === formState.category_id)
      if (!currentCategory) {
        setFormState((prev) => ({ ...prev, category_id: '' }))
      }
    } else {
      setFormState((prev) => ({ ...prev, category_id: '' }))
    }
  }, [formState.type, filteredCategories.length])

  // Don't auto-set wallet_id - user must select manually
  // Removed auto-selection logic to force user to choose wallet

  // Reload favorite categories when type changes
  useEffect(() => {
    const reloadFavorites = async () => {
      try {
        const categoryTypeForReload = formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'

        // Invalidate cache to ensure fresh data
        try {
          const { getCachedUser } = await import('../lib/userCache')
          const user = await getCachedUser()
          if (user) {
            const { queryClient } = await import('../lib/react-query')
            await queryClient.invalidateQueries({ queryKey: ['favoriteCategories', { categoryType: categoryTypeForReload }] })
          }
        } catch (cacheError) {
          console.warn('Error invalidating cache:', cacheError)
        }

        const [hierarchicalData, favoriteIdsArray] = await Promise.all([
          fetchCategoriesHierarchical(categoryTypeForReload),
          getFavoriteCategories(categoryTypeForReload),
        ])

        const favorites: CategoryWithChildren[] = []
        const favoriteIdsSet = new Set(favoriteIdsArray.slice(0, 7))

        const findCategoryById = (cats: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
          for (const cat of cats) {
            if (cat.id === id) return cat
            if (cat.children) {
              const found = findCategoryById(cat.children, id)
              if (found) return found
            }
          }
          return null
        }

        favoriteIdsSet.forEach((id) => {
          const category = findCategoryById(hierarchicalData, id)
          if (category) {
            favorites.push(category)
          }
        })

        setFavoriteCategories(favorites)
      } catch (error) {
        console.error('Error reloading favorites:', error)
      }
    }

    reloadFavorites()
  }, [formState.type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formState.wallet_id) {
      const message = 'Vui lòng chọn ví'
      setError(message)
      showError(message)
      return
    }
    if (!formState.category_id) {
      const message = 'Vui lòng chọn hạng mục'
      setError(message)
      showError(message)
      return
    }
    const amount = parseVNDInput(formState.amount)
    if (!amount || amount <= 0) {
      const message = 'Vui lòng nhập số tiền hợp lệ'
      setError(message)
      showError(message)
      return
    }
    if (!formState.transaction_date) {
      const message = 'Vui lòng chọn ngày giao dịch'
      setError(message)
      showError(message)
      return
    }

    // transaction_date only stores date (YYYY-MM-DD), time is for display only
    const finalTransactionDate = formState.transaction_date

    setIsSubmitting(true)
    try {
      // Upload images to Cloudinary if there are new files
      let imageUrls = [...uploadedImageUrls]
      if (uploadedFiles.length > 0) {
        setIsUploadingImages(true)
        try {
          const supabase = getSupabaseClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            throw new Error('Bạn cần đăng nhập để upload ảnh.')
          }

          const uploadResults = await uploadMultipleToCloudinary(uploadedFiles, {
            folder: `transactions/${user.id}`,
            transformation: {
              quality: 'auto',
              format: 'auto',
            },
          })

          const newUrls = uploadResults.map((result) => result.secure_url)
          imageUrls = [...imageUrls, ...newUrls]
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : 'Không thể upload ảnh'
          setError(message)
          showError(message)
          setIsUploadingImages(false)
          return
        } finally {
          setIsUploadingImages(false)
        }
      }

      if (isEditMode && transactionId) {
        // Ghi đè toàn bộ dữ liệu từ form lên transaction hiện tại
        await updateTransaction(transactionId, {
          wallet_id: formState.wallet_id,
          category_id: formState.category_id,
          type: formState.type,
          amount,
          description: formState.description.trim() || undefined,
          transaction_date: finalTransactionDate,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
          location: formState.location?.trim() || null,
          recipient_name: formState.recipient_name?.trim() || null,
          is_borrowed: formState.is_borrowed || false,
          lender_name: formState.is_borrowed ? (formState.lender_name?.trim() || null) : null,
          lender_phone: formState.is_borrowed ? (formState.lender_phone?.trim() || null) : null,
          borrow_date: formState.is_borrowed ? (formState.borrow_date || null) : null,
          exclude_from_reports: formState.exclude_from_reports || false,
        })
        success(`Đã cập nhật ${formState.type === 'Thu' ? 'khoản thu' : 'khoản chi'} thành công!`)
        // Navigate back after edit
        navigate(-1)
      } else {
        const result = await createTransaction({
          wallet_id: formState.wallet_id,
          category_id: formState.category_id,
          type: formState.type,
          amount,
          description: formState.description.trim() || undefined,
          transaction_date: finalTransactionDate,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
          location: formState.location?.trim() || null,
          recipient_name: formState.recipient_name?.trim() || null,
          is_borrowed: formState.is_borrowed || false,
          lender_name: formState.is_borrowed ? (formState.lender_name?.trim() || null) : null,
          lender_phone: formState.is_borrowed ? (formState.lender_phone?.trim() || null) : null,
          borrow_date: formState.is_borrowed ? (formState.borrow_date || null) : null,
          exclude_from_reports: formState.exclude_from_reports || false,
        })

        // Show budget warning if exists (soft limit)
        if (result.budgetWarning) {
          showError(result.budgetWarning)
        } else {
          success(`Đã thêm ${formState.type === 'Thu' ? 'khoản thu' : 'khoản chi'} thành công!`)
        }

        // Reset form for continuous input instead of navigating back
        const now = getNowUTC7()
        const components = getDateComponentsUTC7(now)
        const currentTime = `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}`

        // Reload data (wallets, categories, favorites) to get updated balances
        // Invalidate cache first to ensure we get fresh data from database
        try {
          const { queryClient } = await import('../lib/react-query')
          await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
          await queryClient.invalidateQueries({ queryKey: ['getDefaultWallet'] })
          await queryClient.invalidateQueries({ queryKey: ['getTotalBalanceWalletIds'] })

          // Small delay to ensure database transaction is committed
          await new Promise(resolve => setTimeout(resolve, 100))

          const [walletsData, categoriesData, defaultId] = await Promise.all([
            fetchWallets(false),
            fetchCategories(),
            getDefaultWallet(),
          ])

          setWallets(walletsData)
          setCategories(categoriesData)

          // Get selected wallets for default wallet
          const walletIds = await getTotalBalanceWalletIds()
          const selectedWallets = walletsData.filter((w) => walletIds.includes(w.id))

          // Determine wallet_id for reset
          let resetWalletId = ''
          // Use first wallet from selected wallets or default wallet
          resetWalletId = selectedWallets.length > 0 ? selectedWallets[0].id : (defaultId || '')

          // Update default wallet ID
          if (selectedWallets.length > 0) {
            setDefaultWalletId(selectedWallets[0].id)
          } else if (defaultId) {
            setDefaultWalletId(defaultId)
          }

          // Reload favorite categories
          const categoryTypeForReload = formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'
          const favoriteIdsArray = await getFavoriteCategories(categoryTypeForReload)
          const favoriteIdsSet = new Set(favoriteIdsArray)
          const favoriteCats = categoriesData.filter((cat) => favoriteIdsSet.has(cat.id))
          setFavoriteCategories(favoriteCats)

          // Reset form after data is reloaded
          setFormState((prev) => ({
            ...prev,
            amount: '',
            category_id: '',
            description: '',
            wallet_id: resetWalletId,
            transaction_date: formatDateUTC7(now),
            transaction_time: currentTime,
            location: '',
          }))
          setLocationCoordinates(null)
          setUploadedFiles([])
          setUploadedImageUrls([])
        } catch (reloadError) {
          console.error('Error reloading data:', reloadError)
          // Reset form even if reload fails
          setFormState((prev) => ({
            ...prev,
            amount: '',
            category_id: '',
            description: '',
            transaction_date: formatDateUTC7(now),
            transaction_time: currentTime,
            location: '',
            recipient_name: '',
            is_borrowed: false,
            lender_name: '',
            lender_phone: '',
            borrow_date: '',
            exclude_from_reports: false,
          }))
          setLocationCoordinates(null)
          setUploadedFiles([])
          setUploadedImageUrls([])
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (isEditMode ? 'Không thể cập nhật giao dịch' : 'Không thể tạo giao dịch')
      setError(message)
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Hàm submit transaction từ voice input
  const submitTransactionFromVoice = async (transactionData: {
    type: 'Thu' | 'Chi'
    amount: number
    category_id?: string
    wallet_id?: string
    transaction_date?: string
    description?: string
  }) => {
    // Validate required fields
    if (!transactionData.wallet_id && !defaultWalletId) {
      showError('Vui lòng chọn ví trước khi ghi âm')
      return false
    }
    if (!transactionData.category_id) {
      showError('Không thể nhận diện hạng mục. Vui lòng chọn thủ công.')
      return false
    }
    
    setIsSubmitting(true)
    try {
      const finalTransactionDate = transactionData.transaction_date || formatDateUTC7(getNowUTC7())
      const walletId = transactionData.wallet_id || defaultWalletId || ''
      
      const result = await createTransaction({
        wallet_id: walletId,
        category_id: transactionData.category_id,
        type: transactionData.type,
        amount: transactionData.amount,
        description: transactionData.description?.trim() || undefined,
        transaction_date: finalTransactionDate,
      })

      if (result.budgetWarning) {
        showError(result.budgetWarning)
      } else {
        success(`Đã thêm ${transactionData.type === 'Thu' ? 'khoản thu' : 'khoản chi'} thành công từ giọng nói!`)
      }
      
      // Reload data
      try {
        const { queryClient } = await import('../lib/react-query')
        await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
      } catch (err) {
        console.error('Error invalidating queries:', err)
      }
      
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tạo giao dịch'
      showError(message)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatVNDInput(e.target.value)
    setFormState((prev) => ({ ...prev, amount: formatted }))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) {
        // User cancelled or no files selected - this is normal, just reset input
        if (e.target === cameraInputRef.current && cameraInputRef.current) {
          cameraInputRef.current.value = ''
        }
        if (e.target === galleryInputRef.current && galleryInputRef.current) {
          galleryInputRef.current.value = ''
        }
        return
      }

      // Compress all images before adding to state
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith('image/')) {
            try {
              const compressed = await compressImageForTransaction(file, 1200, 1200, 50, 0.7)
              console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(2)}KB -> ${(compressed.size / 1024).toFixed(2)}KB`)
              return compressed
            } catch (error) {
              console.error('Error compressing image:', error)
              showError(`Không thể nén ảnh ${file.name}. Vui lòng thử lại.`)
              return null
            }
          }
          return file
        })
      )

      // Filter out null values (failed compressions)
      const validFiles = compressedFiles.filter((f): f is File => f !== null)
      if (validFiles.length > 0) {
        setUploadedFiles((prev) => [...prev, ...validFiles])
      }
    } catch (error) {
      console.error('Error handling files:', error)
      showError('Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại.')
    } finally {
      // Reset input value to allow selecting the same file again
      if (e.target === cameraInputRef.current && cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
      if (e.target === galleryInputRef.current && galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeImageUrl = (index: number) => {
    setUploadedImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar
        variant="page"
        title={isEditMode ? 'SỬA GIAO DỊCH' : formState.type === 'Thu' ? 'THÊM KHOẢN THU' : 'THÊM KHOẢN CHI'}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-2 pb-4 sm:pt-2 sm:pb-6">
          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600 sm:text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} id="transaction-form" className="space-y-2">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, type: 'Thu' }))}
                className={`group flex items-center justify-center gap-2 rounded-2xl border-2 py-3 px-4 text-center text-sm font-bold transition-all ${formState.type === 'Thu'
                  ? 'border-emerald-600 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:bg-emerald-50'
                  }`}
              >
                <FaArrowUp className="h-5 w-5" />
                <span>Khoản thu</span>
              </button>
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, type: 'Chi' }))}
                className={`group flex items-center justify-center gap-2 rounded-2xl border-2 py-3 px-4 text-center text-sm font-bold transition-all ${formState.type === 'Chi'
                  ? 'border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50'
                  }`}
              >
                <FaArrowDown className="h-5 w-5" />
                <span>Khoản chi</span>
              </button>
            </div>

            {/* Wallet Selection - For both Income and Expense */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                {formState.type === 'Chi' ? 'Chọn ví' : 'Chọn ví'} <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                options={wallets.map((wallet) => ({
                  value: wallet.id,
                  label: wallet.name,
                  metadata: formatCurrency(wallet.balance ?? 0),
                  icon: <FaWallet className="h-4 w-4" />,
                }))}
                value={formState.wallet_id}
                onChange={(value) => setFormState((prev) => ({ ...prev, wallet_id: value }))}
                placeholder={formState.type === 'Chi' ? 'Chọn ví' : 'Chọn ví'}
                loading={isLoading}
                emptyMessage="Chưa có ví"
                className="h-14"
              />
            </div>

            {/* Amount - Compact and Clean */}
            <div
              className="rounded-2xl bg-gradient-to-br from-white to-slate-50 shadow-md border border-slate-200/50 p-4 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md"
              onClick={() => setIsNumberPadOpen(true)}
            >
              <div className="flex items-center justify-between">
                <label htmlFor="amount" className="text-base font-semibold text-slate-600 shrink-0">
                  Số tiền
                </label>
                <div className="flex items-baseline gap-1.5 flex-1 justify-end">
                  <input
                    type="text"
                    inputMode="numeric"
                    id="amount"
                    value={formState.amount}
                    onChange={handleAmountChange}
                    onFocus={() => setIsNumberPadOpen(true)}
                    placeholder="0"
                    className={`text-right bg-transparent border-0 text-3xl font-bold transition-all placeholder:text-slate-300 focus:outline-none cursor-pointer min-w-[80px] ${formState.type === 'Thu'
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                      }`}
                    required
                    readOnly
                  />
                  <span className={`text-xl font-semibold shrink-0 ${formState.type === 'Thu' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                    ₫
                  </span>
                </div>
              </div>
            </div>

            {/* Category Selection Section - Redesigned */}
            <div className="rounded-2xl bg-white shadow-lg border border-slate-200/60 overflow-hidden">
              {/* Header Section */}
              <div className="px-3 py-2.5 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  {formState.category_id ? (
                    // Show selected category - Compact Design
                    <button
                      type="button"
                      onClick={() => setIsCategoryPickerOpen(true)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200/50 hover:border-sky-300 transition-all active:scale-[0.98] flex-1 group"
                    >
                      {/* Category Icon */}
                      <div className="flex h-10 w-10 items-center justify-center shrink-0">
                        {categoryIcons[formState.category_id] ? (
                          <span className="text-2xl">
                            {categoryIcons[formState.category_id]}
                          </span>
                        ) : (
                          <CategoryIcon
                            iconId={categories.find(c => c.id === formState.category_id)?.icon_id || ''}
                            iconUrl={categories.find(c => c.id === formState.category_id)?.icon_url}
                            className="h-10 w-10"
                            fallback={
                              <span className="text-xl font-bold text-slate-400">
                                {categories.find(c => c.id === formState.category_id)?.name[0]?.toUpperCase() || '?'}
                              </span>
                            }
                          />
                        )}
                      </div>
                      {/* Category Name */}
                      <span className="text-sm font-semibold text-slate-900 truncate flex-1 min-w-0">
                        {categories.find(c => c.id === formState.category_id)?.name || 'Chưa chọn'}
                      </span>
                      <FaChevronRight className="h-3.5 w-3.5 text-sky-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    // Show add button when no category selected - Modern Design
                    <button
                      type="button"
                      onClick={() => setIsCategoryPickerOpen(true)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 hover:from-slate-100 hover:to-slate-200 transition-all active:scale-[0.98] flex-1 group"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm shrink-0">
                        <FaPlus className="h-4 w-4 text-slate-600 group-hover:text-sky-600 transition-colors" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 truncate flex-1 min-w-0">Chọn hạng mục</span>
                      <FaChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:translate-x-0.5 group-hover:text-slate-600 transition-all" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-all shrink-0"
                  >
                    <span>Tất cả</span>
                    <FaChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Favorite Categories Section - Redesigned */}
              <div className="px-3 py-3 bg-gradient-to-b from-slate-50/50 to-transparent">
                {/* Section Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1 w-1 rounded-full bg-amber-400"></div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Mục thường dùng
                  </h4>
                </div>

                {/* Categories Grid - 4 columns, always 8 slots (7 categories + 1 edit button) */}
                <div className="grid grid-cols-4 gap-2.5">
                  {Array.from({ length: 8 }, (_, index) => {
                    // Last slot (index 7) is always the Edit button
                    if (index === 7) {
                      return (
                        <button
                          key="edit-button"
                          type="button"
                          onClick={() => setIsFavoriteModalOpen(true)}
                          className="flex flex-col items-center gap-1 p-1 rounded-xl border-2 border-dashed border-slate-300/60 bg-slate-50/30"                        >
                          <div className="flex h-20 w-20 items-center justify-center">
                            <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-300/60 flex items-center justify-center">
                              <FaEdit className="h-7 w-7 text-slate-600" />
                            </div>
                          </div>

                          <span className="text-[10px] font-bold text-center text-slate-700 leading-tight">
                            Chỉnh sửa
                          </span>
                        </button>
                      )
                    }

                    const category = favoriteCategories[index]
                    if (category) {
                      const isSelected = formState.category_id === category.id
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setFormState((prev) => ({ ...prev, category_id: category.id }))}
                          className={`relative flex flex-col items-center gap-1 p-1 rounded-xl transition-all active:scale-95 ${isSelected
                            ? 'bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-50 ring-2 ring-sky-400 shadow-md scale-105'
                            : 'bg-white hover:bg-slate-50 shadow-sm border border-slate-200/60 hover:border-slate-300 hover:shadow-md'
                            }`}
                        >
                          {/* Star Icon - Smaller, more subtle */}
                          <FaStar className={`absolute top-1 right-1 h-4 w-4 ${isSelected ? 'text-amber-500' : 'text-amber-500'
                            } fill-current drop-shadow-xl z-10`} />

                          {/* Category Icon - Sized to fit content */}
                          <div className="flex h-20 w-20 items-center justify-center transition-all">
                            <CategoryIcon
                              iconId={category.icon_id}
                              iconUrl={category.icon_url}
                              className="h-16 w-16"
                              fallback={
                                <span className="text-4xl font-bold text-slate-400">
                                  {category.name[0]?.toUpperCase() || '?'}
                                </span>
                              }
                            />
                          </div>

                          {/* Category Name - Better typography */}
                          <span
                            className={`text-[11px] font-semibold text-center leading-tight line-clamp-2 px-0.5 ${isSelected ? 'text-sky-900' : 'text-slate-700'
                              }`}
                          >
                            {category.name}
                          </span>
                        </button>
                      )
                    } else {
                      // Empty placeholder with dashed border
                      return (
                        <div
                          key={`empty-${index}`}
                          className="flex flex-col items-center gap-1 p-1 rounded-xl border-2 border-dashed border-slate-300/60 bg-slate-50/30"
                        >
                          <div className="flex h-20 w-20 items-center justify-center">
                            <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-300/60"></div>
                          </div>
                          <span className="text-[11px] font-semibold text-center text-slate-400 leading-tight">
                            Trống
                          </span>
                        </div>
                      )
                    }
                  })}
                </div>
              </div>
            </div>

            {/* Date and Time */}
            <div>
              <label className="mb-2 mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Thời gian giao dịch <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsDateTimePickerOpen(true)}
                className="relative flex w-full items-center justify-between rounded-2xl border-2 border-slate-200 bg-white p-4 pl-12 text-left transition-all hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/20"
              >
                <FaCalendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    {(() => {
                      // Parse date string YYYY-MM-DD directly (already in UTC+7 format)
                      const [year, month, day] = formState.transaction_date.split('-').map(Number)
                      const dateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`

                      // Check if today (in UTC+7)
                      const today = getNowUTC7()
                      const todayComponents = getDateComponentsUTC7(today)

                      if (year === todayComponents.year && month === todayComponents.month && day === todayComponents.day) {
                        return `Hôm nay - ${dateStr}`
                      }
                      return dateStr
                    })()}
                  </div>
                  {formState.transaction_time && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <FaClock className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{formState.transaction_time}</span>
                    </div>
                  )}
                </div>
                <FaChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </div>

            {/* Description - Optional */}
            <div>
              <label htmlFor="description" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mô tả (tùy chọn)
              </label>
              <input
                type="text"
                id="description"
                value={formState.description}
                onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Nhập mô tả giao dịch..."
                className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/20"
              />
            </div>

            {/* File Upload - Optional */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tải lên ảnh/hóa đơn (tùy chọn)
              </label>
              {/* Hidden file inputs */}
              {/* Camera input - CỐ ĐỊNH: chỉ mở camera để chụp ảnh, không cho chọn từ thư viện */}
              <input
                ref={cameraInputRef}
                type="file"
                id="camera-input"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              {/* Gallery input - CỐ ĐỊNH: chỉ mở thư viện/bộ sưu tập để chọn ảnh, không mở camera */}
              <input
                ref={galleryInputRef}
                type="file"
                id="gallery-input"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {/* Two buttons: Camera and Gallery - Chức năng cố định */}
              <div className="grid grid-cols-2 gap-3">
                {/* Nút Chụp ảnh - CỐ ĐỊNH: luôn mở camera */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      // Đảm bảo chỉ mở camera
                      if (cameraInputRef.current) {
                        cameraInputRef.current.click()
                      }
                    } catch (error) {
                      console.error('Error opening camera:', error)
                      showError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.')
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-sm font-medium text-slate-600 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                >
                  <FaCamera className="h-6 w-6" />
                  <span>Chụp ảnh</span>
                </button>
                {/* Nút Chọn từ thư viện - CỐ ĐỊNH: luôn mở bộ sưu tập */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      // Đảm bảo chỉ mở thư viện
                      if (galleryInputRef.current) {
                        galleryInputRef.current.click()
                      }
                    } catch (error) {
                      console.error('Error opening gallery:', error)
                      showError('Không thể mở bộ sưu tập. Vui lòng thử lại.')
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-sm font-medium text-slate-600 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                >
                  <FaImage className="h-6 w-6" />
                  <span>Chọn từ thư viện</span>
                </button>
              </div>
              {(uploadedFiles.length > 0 || uploadedImageUrls.length > 0) && (
                <div className="mt-3 space-y-2">
                  {uploadedImageUrls.map((url, index) => (
                    <div
                      key={`url-${index}`}
                      className="relative group rounded-xl border border-slate-200 bg-white overflow-hidden"
                    >
                      <img
                        src={url}
                        alt={`Receipt ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImageUrl(index)}
                        className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
                      >
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={`file-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FaImage className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate text-sm text-slate-700">{file.name}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expanded Section - Show for both income and expense transactions */}
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
              <button
                type="button"
                onClick={() => setIsExpandedSectionOpen(!isExpandedSectionOpen)}
                className="flex w-full items-center justify-between"
              >
                <span className="text-sm font-semibold text-slate-900">Thêm chi tiết</span>
                <FaChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${isExpandedSectionOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isExpandedSectionOpen && (
                <div className="mt-4 space-y-4">
                  {/* Location */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700">
                      Địa điểm, chuyến đi
                    </label>
                    <div className="flex gap-2">
                      {(() => {
                        // Parse location to display address only (hide coordinates)
                        let displayLocation = formState.location || ''
                        let hasCoordinates = false

                        if (displayLocation.includes('|')) {
                          const parts = displayLocation.split('|')
                          displayLocation = parts[0]
                          hasCoordinates = !!parts[1] && parseCoordinates(parts[1]) !== null
                        } else if (locationCoordinates) {
                          hasCoordinates = true
                        } else if (isCoordinates(displayLocation)) {
                          hasCoordinates = true
                        }

                        // Check if location can open maps (has coordinates or is an address)
                        const canOpenMaps = hasCoordinates || (displayLocation && displayLocation.trim().length > 0 && !isCoordinates(displayLocation))

                        return (
                          <>
                            <input
                              type="text"
                              value={displayLocation}
                              onChange={(e) => {
                                const newValue = e.target.value
                                setFormState((prev) => {
                                  // If location had coordinates format, keep coordinates
                                  if (prev.location?.includes('|')) {
                                    const parts = prev.location.split('|')
                                    return { ...prev, location: `${newValue}|${parts[1] || ''}` }
                                  }
                                  // If new value is coordinates, parse them
                                  if (isCoordinates(newValue)) {
                                    const coords = parseCoordinates(newValue)
                                    if (coords) {
                                      setLocationCoordinates(coords)
                                    }
                                  } else {
                                    // Clear coordinates if manual text input
                                    setLocationCoordinates(null)
                                  }
                                  return { ...prev, location: newValue }
                                })
                              }}
                              placeholder="Nhập địa điểm hoặc chuyến đi..."
                              className="flex-1 rounded-xl border-2 border-slate-200 bg-white p-3 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            />
                            {canOpenMaps && (
                              <button
                                type="button"
                                onClick={() => {
                                  const locationToUse = formState.location || ''
                                  let mapsUrl = ''

                                  // Check if location has coordinates in format "address|lat,lng"
                                  if (locationToUse.includes('|')) {
                                    const parts = locationToUse.split('|')
                                    if (parts[1]) {
                                      mapsUrl = getMapsUrl(parts[1])
                                    } else {
                                      mapsUrl = getMapsUrl(locationToUse)
                                    }
                                  } else if (locationCoordinates) {
                                    mapsUrl = getMapsUrl(`${locationCoordinates.lat},${locationCoordinates.lng}`)
                                  } else {
                                    mapsUrl = getMapsUrl(locationToUse)
                                  }

                                  window.open(mapsUrl, '_blank', 'noopener,noreferrer')
                                }}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-600 transition-all hover:border-emerald-300 hover:bg-emerald-100"
                                title="Mở bản đồ"
                              >
                                <FaExternalLinkAlt className="h-5 w-5" />
                              </button>
                            )}
                          </>
                        )
                      })()}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!navigator.geolocation) {
                            showError('Trình duyệt không hỗ trợ định vị')
                            return
                          }
                          setIsGettingLocation(true)
                          try {
                            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                              navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 0,
                              })
                            })

                            // Get coordinates
                            const lat = position.coords.latitude
                            const lng = position.coords.longitude

                            // Save coordinates for map opening
                            setLocationCoordinates({ lat, lng })

                            // Reverse geocoding to get address
                            try {
                              const address = await reverseGeocode(lat, lng)
                              if (address && !isCoordinates(address)) {
                                // Save address with coordinates for map access
                                setFormState((prev) => ({
                                  ...prev,
                                  location: `${address}|${lat.toFixed(6)},${lng.toFixed(6)}`,
                                }))
                                success('Đã lấy địa chỉ thành công')
                              } else {
                                // Fallback to coordinates if geocoding fails
                                setFormState((prev) => ({
                                  ...prev,
                                  location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                                }))
                                success('Đã lấy vị trí thành công')
                              }
                            } catch (geocodeError) {
                              console.error('Reverse geocoding error:', geocodeError)
                              // Fallback to coordinates
                              setFormState((prev) => ({
                                ...prev,
                                location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                              }))
                              success('Đã lấy vị trí thành công')
                            }
                          } catch (error) {
                            if (error instanceof GeolocationPositionError) {
                              if (error.code === error.PERMISSION_DENIED) {
                                showError('Bạn cần cấp quyền truy cập vị trí')
                              } else {
                                showError('Không thể lấy vị trí. Vui lòng thử lại.')
                              }
                            } else {
                              showError('Không thể lấy vị trí')
                            }
                          } finally {
                            setIsGettingLocation(false)
                          }
                        }}
                        disabled={isGettingLocation}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-sky-200 bg-sky-50 text-sky-600 transition-all hover:border-sky-300 hover:bg-sky-100 disabled:opacity-50"
                      >
                        {isGettingLocation ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                        ) : (
                          <FaMapMarkerAlt className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Recipient/Payer Name - Different label for income vs expense */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700">
                      {formState.type === 'Chi' ? 'Chi cho ai' : 'Thu từ ai'}
                    </label>
                    <div className="relative">
                      <FaUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formState.recipient_name || ''}
                        onChange={(e) => setFormState((prev) => ({ ...prev, recipient_name: e.target.value }))}
                        placeholder={formState.type === 'Chi' ? 'Nhập tên người nhận chi...' : 'Nhập tên người trả tiền...'}
                        className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  {/* Is Borrowed Toggle - Only for expense transactions */}
                  {formState.type === 'Chi' && (
                    <div>
                      <label className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Đi vay để chi cho khoản này</span>
                        <button
                          type="button"
                          onClick={() => setFormState((prev) => ({ ...prev, is_borrowed: !prev.is_borrowed }))}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${formState.is_borrowed ? 'bg-sky-500' : 'bg-slate-300'
                            }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${formState.is_borrowed ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                          />
                        </button>
                      </label>

                      {formState.is_borrowed && (
                        <div className="mt-3 space-y-3 rounded-xl border-2 border-sky-100 bg-sky-50 p-3">
                          {/* Lender Name */}
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-700">
                              Người cho vay
                            </label>
                            <div className="relative">
                              <FaMoneyBillWave className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={formState.lender_name || ''}
                                onChange={(e) => setFormState((prev) => ({ ...prev, lender_name: e.target.value }))}
                                placeholder="Nhập tên người cho vay..."
                                className="w-full rounded-lg border-2 border-sky-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                              />
                            </div>
                          </div>

                          {/* Lender Phone */}
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-700">
                              Số điện thoại
                            </label>
                            <div className="relative">
                              <FaPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="tel"
                                value={formState.lender_phone || ''}
                                onChange={(e) => setFormState((prev) => ({ ...prev, lender_phone: e.target.value }))}
                                placeholder="Nhập số điện thoại..."
                                className="w-full rounded-lg border-2 border-sky-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                              />
                            </div>
                          </div>

                          {/* Borrow Date */}
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-700">
                              Ngày vay
                            </label>
                            <input
                              type="date"
                              value={formState.borrow_date || ''}
                              onChange={(e) => setFormState((prev) => ({ ...prev, borrow_date: e.target.value }))}
                              max={formState.transaction_date}
                              className="w-full rounded-lg border-2 border-sky-200 bg-white py-2.5 px-4 text-sm text-slate-900 transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Exclude from Reports Toggle */}
                  <div className="rounded-xl border-2 border-amber-100 bg-amber-50 p-3">
                    <label className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FaChartLine className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-semibold text-slate-900">Không tính vào báo cáo</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Chỉ ghi nhớ lịch sử, không tính vào báo cáo, số dư hoặc bất kỳ thống kê nào
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, exclude_from_reports: !prev.exclude_from_reports }))}
                        className={`relative ml-3 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${formState.exclude_from_reports ? 'bg-amber-500' : 'bg-slate-300'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${formState.exclude_from_reports ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>
      </main>

      {/* Fixed Footer with Action Buttons */}
      <ModalFooterButtons
        onCancel={() => navigate(-1)}
        onConfirm={() => { }}
        confirmText={isUploadingImages ? 'Đang upload ảnh...' : isSubmitting ? 'Đang lưu...' : `${isEditMode ? 'Cập nhật' : 'Thêm'} ${formState.type === 'Thu' ? 'Thu' : 'Chi'}`}
        isSubmitting={isSubmitting}
        disabled={isSubmitting || isLoading || isUploadingImages || wallets.length === 0 || filteredCategories.length === 0}
        confirmButtonType="submit"
        formId="transaction-form"
        fixed={true}
      />

      {/* Number Pad Modal */}
      <NumberPadModal
        isOpen={isNumberPadOpen}
        onClose={() => setIsNumberPadOpen(false)}
        value={formState.amount}
        onChange={(value) => setFormState((prev) => ({ ...prev, amount: value }))}
        onConfirm={() => setIsNumberPadOpen(false)}
      />

      {/* Category Picker Modal */}
      <CategoryPickerModal
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        onSelect={(categoryId) => {
          setFormState((prev) => ({ ...prev, category_id: categoryId }))
          setIsCategoryPickerOpen(false)
        }}
        selectedCategoryId={formState.category_id}
        categoryType={formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'}
        onEditCategory={(categoryId) => {
          console.log('Edit category:', categoryId)
          setIsCategoryPickerOpen(false)
        }}
      />

      {/* DateTime Picker Modal */}
      <DateTimePickerModal
        isOpen={isDateTimePickerOpen}
        onClose={() => setIsDateTimePickerOpen(false)}
        onConfirm={(date, time) => {
          setFormState((prev) => ({
            ...prev,
            transaction_date: date,
            transaction_time: time,
          }))
        }}
        initialDate={formState.transaction_date}
        initialTime={formState.transaction_time}
        showTime={true}
      />

      {/* Favorite Categories Modal */}
      <FavoriteCategoriesModal
        isOpen={isFavoriteModalOpen}
        onClose={() => {
          setIsFavoriteModalOpen(false)
          // Reload favorites when modal closes
          const reloadFavorites = async () => {
            try {
              const categoryTypeForReload = formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'
              const [hierarchicalData, favoriteIdsArray] = await Promise.all([
                fetchCategoriesHierarchical(),
                getFavoriteCategories(categoryTypeForReload),
              ])
              const favorites: CategoryWithChildren[] = []
              const favoriteIdsSet = new Set(favoriteIdsArray.slice(0, 7))

              const findCategoryById = (cats: CategoryWithChildren[], id: string): CategoryWithChildren | null => {
                for (const cat of cats) {
                  if (cat.id === id) return cat
                  if (cat.children) {
                    const found = findCategoryById(cat.children, id)
                    if (found) return found
                  }
                }
                return null
              }

              favoriteIdsSet.forEach((id) => {
                const category = findCategoryById(hierarchicalData, id)
                if (category) {
                  favorites.push(category)
                }
              })

              setFavoriteCategories(favorites)
            } catch (error) {
              console.error('Error reloading favorites:', error)
            }
          }
          reloadFavorites()
        }}
        categoryType={formState.type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'}
      />

      {/* Voice Transaction Modal */}
      <VoiceTransactionModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSuccess={async (transactionData) => {
          console.log('Voice transaction data received:', transactionData)
          
          setIsVoiceModalOpen(false)
          
          // Tự động submit transaction từ voice data
          const success = await submitTransactionFromVoice(transactionData)
          
          if (!success) {
            // Nếu submit không thành công, điền dữ liệu vào form để người dùng có thể chỉnh sửa và submit thủ công
            setFormState((prev) => ({
              ...prev,
              type: transactionData.type,
              amount: transactionData.amount.toString(),
              category_id: transactionData.category_id || prev.category_id,
              wallet_id: transactionData.wallet_id || prev.wallet_id || defaultWalletId,
              transaction_date: transactionData.transaction_date || prev.transaction_date,
              description: transactionData.description || prev.description,
            }))
            showError('Không thể tự động lưu. Vui lòng kiểm tra và lưu thủ công.')
          }
        }}
        categories={categories}
        wallets={wallets}
      />

      {/* Floating Voice Button */}
      {!isEditMode && (
        <button
          type="button"
          onClick={() => setIsVoiceModalOpen(true)}
          className="fixed bottom-32 right-2 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 hover:shadow-blue-500/50"
          title="Ghi chép bằng giọng nói"
          aria-label="Ghi chép bằng giọng nói"
        >
          <FaMicrophone className="h-5 w-5" />
        </button>
      )}

      {/* Floating Calculator Button */}
      {!isEditMode && (
        <button
          type="button"
          onClick={() => setIsCalculatorModalOpen(true)}
          className="fixed bottom-20 right-2 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 hover:shadow-orange-500/50"
          title="Máy tính cầm tay"
          aria-label="Máy tính cầm tay"
        >
          <FaCalculator className="h-5 w-5" />
        </button>
      )}

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={isCalculatorModalOpen}
        onClose={() => setIsCalculatorModalOpen(false)}
      />
    </div>
  )
}

export default AddTransactionPage

