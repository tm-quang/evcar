import { fetchCategories, createCategory, type CategoryRecord } from './categoryService'
import { createTransaction } from './transactionService'
import { formatDateUTC7, getNowUTC7 } from '../utils/dateUtils'

/**
 * Get or create category for wallet transfer
 * Category name: "Chuyển đổi giữa ví"
 */
export const getOrCreateTransferCategory = async (
  type: 'Chi' | 'Thu'
): Promise<CategoryRecord> => {
  const categories = await fetchCategories()
  const categoryType = type === 'Chi' ? 'Chi tiêu' : 'Thu nhập'
  const categoryName = 'Chuyển đổi giữa ví'

  // Try to find existing category
  let transferCategory = categories.find(
    (cat) => cat.name === categoryName && cat.type === categoryType
  )

  // If not found, create it
  if (!transferCategory) {
    transferCategory = await createCategory({
      name: categoryName,
      type: categoryType,
      icon_id: 'transfer-icon', // Use a default icon ID, can be updated later
      icon_url: '/icons_categories/trao_doi.png', // Use exchange icon
      display_order: 999, // Put at the end
    })
  }

  return transferCategory
}

/**
 * Transfer balance between wallets
 * Creates two transactions:
 * 1. Expense transaction from source wallet
 * 2. Income transaction to target wallet
 */
export const transferWalletBalance = async (
  sourceWalletId: string,
  targetWalletId: string,
  amount: number
): Promise<void> => {
  if (amount <= 0) {
    throw new Error('Số tiền chuyển đổi phải lớn hơn 0')
  }

  if (sourceWalletId === targetWalletId) {
    throw new Error('Không thể chuyển đổi số dư vào chính ví đó')
  }

  // Get or create categories for transfer
  const [expenseCategory, incomeCategory] = await Promise.all([
    getOrCreateTransferCategory('Chi'),
    getOrCreateTransferCategory('Thu'),
  ])

  const transactionDate = formatDateUTC7(getNowUTC7())

  // Create expense transaction from source wallet
  const expenseDescription = `Chuyển đổi sang ví khác`
  await createTransaction({
    wallet_id: sourceWalletId,
    category_id: expenseCategory.id,
    type: 'Chi',
    amount,
    description: expenseDescription,
    transaction_date: transactionDate,
    exclude_from_reports: false, // Include in reports
  })

  // Create income transaction to target wallet
  const incomeDescription = `Chuyển đổi từ ví khác`
  await createTransaction({
    wallet_id: targetWalletId,
    category_id: incomeCategory.id,
    type: 'Thu',
    amount,
    description: incomeDescription,
    transaction_date: transactionDate,
    exclude_from_reports: false, // Include in reports
  })
}


