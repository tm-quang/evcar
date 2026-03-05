/**
 * Budget Alert Service
 * Tự động kiểm tra và gửi cảnh báo khi hạn mức đạt các ngưỡng
 */

import { fetchBudgets, getBudgetWithSpending, type BudgetWithSpending } from './budgetService'
import { createNotification } from './notificationService'
import { fetchCategories, type CategoryRecord } from './categoryService'
import { getCachedUser } from './userCache'

export type BudgetAlertThreshold = 80 | 90 | 100 | 110 | 120

export type BudgetAlert = {
  budgetId: string
  categoryName: string
  threshold: BudgetAlertThreshold
  usagePercentage: number
  spentAmount: number
  budgetAmount: number
  remainingAmount: number
  status: 'warning' | 'danger' | 'critical'
}

const ALERT_THRESHOLDS: BudgetAlertThreshold[] = [80, 90, 100, 110, 120]

// Storage key để lưu các alerts đã gửi (tránh duplicate)
const ALERT_STORAGE_KEY = 'bofin_budget_alerts_sent'

interface SentAlert {
  budgetId: string
  threshold: BudgetAlertThreshold
  timestamp: number
}

/**
 * Lấy danh sách alerts đã gửi từ localStorage
 */
const getSentAlerts = (): SentAlert[] => {
  try {
    const stored = localStorage.getItem(ALERT_STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as SentAlert[]
  } catch {
    return []
  }
}

/**
 * Lưu alert đã gửi vào localStorage
 */
const saveSentAlert = (budgetId: string, threshold: BudgetAlertThreshold): void => {
  try {
    const sentAlerts = getSentAlerts()
    const now = Date.now()
    
    // Xóa alerts cũ hơn 24 giờ
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const recentAlerts = sentAlerts.filter(alert => alert.timestamp > oneDayAgo)
    
    // Thêm alert mới
    recentAlerts.push({
      budgetId,
      threshold,
      timestamp: now,
    })
    
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(recentAlerts))
  } catch (error) {
    console.error('Error saving sent alert:', error)
  }
}

/**
 * Kiểm tra xem alert đã được gửi chưa
 */
const hasAlertBeenSent = (budgetId: string, threshold: BudgetAlertThreshold): boolean => {
  const sentAlerts = getSentAlerts()
  return sentAlerts.some(
    alert => alert.budgetId === budgetId && alert.threshold === threshold
  )
}

/**
 * Xác định threshold nào đã đạt được dựa trên usage percentage
 */
const getReachedThresholds = (percentage: number): BudgetAlertThreshold[] => {
  return ALERT_THRESHOLDS.filter(threshold => percentage >= threshold)
}

/**
 * Lấy threshold cao nhất đã đạt được
 */
const getHighestReachedThreshold = (percentage: number): BudgetAlertThreshold | null => {
  const reached = getReachedThresholds(percentage)
  return reached.length > 0 ? reached[reached.length - 1] : null
}

/**
 * Tạo message cho budget alert
 */
const createAlertMessage = (
  budget: BudgetWithSpending,
  categoryName: string,
  threshold: BudgetAlertThreshold
): string => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value)

  if (threshold === 80) {
    return `Hạn mức "${categoryName}" đã sử dụng ${budget.usage_percentage.toFixed(1)}% (${formatCurrency(budget.spent_amount)}/${formatCurrency(budget.amount)}). Còn lại ${formatCurrency(budget.remaining_amount)}.`
  }
  
  if (threshold === 90) {
    return `⚠️ Cảnh báo: Hạn mức "${categoryName}" đã sử dụng ${budget.usage_percentage.toFixed(1)}% (${formatCurrency(budget.spent_amount)}/${formatCurrency(budget.amount)}). Còn lại ${formatCurrency(budget.remaining_amount)}.`
  }
  
  if (threshold === 100) {
    return `🚨 Hạn mức "${categoryName}" đã vượt mức! Đã chi ${formatCurrency(budget.spent_amount)}/${formatCurrency(budget.amount)} (${budget.usage_percentage.toFixed(1)}%).`
  }
  
  if (threshold >= 110) {
    return `🚨🚨 Hạn mức "${categoryName}" đã vượt quá ${budget.usage_percentage.toFixed(1)}%! Đã chi ${formatCurrency(budget.spent_amount)}/${formatCurrency(budget.amount)}. Vượt quá ${formatCurrency(Math.abs(budget.remaining_amount))}.`
  }
  
  return `Hạn mức "${categoryName}" đã đạt ${budget.usage_percentage.toFixed(1)}%`
}

/**
 * Tạo title cho budget alert
 */
const createAlertTitle = (categoryName: string, threshold: BudgetAlertThreshold): string => {
  if (threshold === 80) {
    return `Hạn mức "${categoryName}" đạt 80%`
  }
  if (threshold === 90) {
    return `Cảnh báo: Hạn mức "${categoryName}" đạt 90%`
  }
  if (threshold === 100) {
    return `Hạn mức "${categoryName}" đã vượt mức`
  }
  if (threshold >= 110) {
    return `Hạn mức "${categoryName}" vượt quá nhiều`
  }
  return `Cảnh báo hạn mức "${categoryName}"`
}

/**
 * Kiểm tra và gửi alerts cho tất cả budgets active
 */
export const checkAndSendBudgetAlerts = async (): Promise<BudgetAlert[]> => {
  try {
    const user = await getCachedUser()
    if (!user) {
      console.warn('User not logged in, skipping budget alerts')
      return []
    }

    // Lấy tất cả budgets active
    const budgets = await fetchBudgets({ is_active: true })
    if (budgets.length === 0) {
      return []
    }

    // Lấy categories để lấy tên
    const categories = await fetchCategories()
    const categoryMap = new Map<string, CategoryRecord>()
    categories.forEach(cat => categoryMap.set(cat.id, cat))

    const alerts: BudgetAlert[] = []

    // Kiểm tra từng budget
    for (const budget of budgets) {
      try {
        const budgetWithSpending = await getBudgetWithSpending(budget.id)
        const percentage = budgetWithSpending.usage_percentage
        const category = categoryMap.get(budget.category_id)
        const categoryName = category?.name || 'Hạng mục không xác định'

        // Lấy threshold cao nhất đã đạt được
        const highestThreshold = getHighestReachedThreshold(percentage)
        if (!highestThreshold) {
          continue // Chưa đạt threshold nào
        }

        // Kiểm tra xem đã gửi alert cho threshold này chưa
        if (hasAlertBeenSent(budget.id, highestThreshold)) {
          continue // Đã gửi rồi, bỏ qua
        }

        // Xác định status
        let status: 'warning' | 'danger' | 'critical' = 'warning'
        if (percentage >= 100) {
          status = percentage >= 120 ? 'critical' : 'danger'
        }

        // Tạo alert object
        const alert: BudgetAlert = {
          budgetId: budget.id,
          categoryName,
          threshold: highestThreshold,
          usagePercentage: percentage,
          spentAmount: budgetWithSpending.spent_amount,
          budgetAmount: budget.amount,
          remainingAmount: budgetWithSpending.remaining_amount,
          status,
        }

        // Gửi notification
        try {
          await createNotification({
            type: 'budget',
            title: createAlertTitle(categoryName, highestThreshold),
            message: createAlertMessage(budgetWithSpending, categoryName, highestThreshold),
            metadata: {
              budget_id: budget.id,
              category_id: budget.category_id,
              threshold: highestThreshold,
              usage_percentage: percentage,
              spent_amount: budgetWithSpending.spent_amount,
              budget_amount: budget.amount,
              remaining_amount: budgetWithSpending.remaining_amount,
              status,
            },
            related_id: budget.id,
            status: 'unread',
          })

          // Lưu alert đã gửi
          saveSentAlert(budget.id, highestThreshold)
          alerts.push(alert)
        } catch (error) {
          console.error(`Error sending alert for budget ${budget.id}:`, error)
        }
      } catch (error) {
        console.error(`Error checking budget ${budget.id}:`, error)
      }
    }

    return alerts
  } catch (error) {
    console.error('Error checking budget alerts:', error)
    return []
  }
}

/**
 * Xóa alerts đã gửi cho một budget (khi budget được cập nhật hoặc xóa)
 */
export const clearBudgetAlerts = (budgetId: string): void => {
  try {
    const sentAlerts = getSentAlerts()
    const filtered = sentAlerts.filter(alert => alert.budgetId !== budgetId)
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error clearing budget alerts:', error)
  }
}

/**
 * Xóa tất cả alerts đã gửi (reset)
 */
export const clearAllBudgetAlerts = (): void => {
  try {
    localStorage.removeItem(ALERT_STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing all budget alerts:', error)
  }
}

/**
 * Lấy danh sách budgets đang có cảnh báo (để hiển thị trên Dashboard)
 */
export const getBudgetsWithAlerts = async (): Promise<BudgetWithSpending[]> => {
  try {
    const budgets = await fetchBudgets({ is_active: true })
    const budgetsWithSpending = await Promise.all(
      budgets.map(b => getBudgetWithSpending(b.id))
    )

    // Lọc các budgets có usage >= 80%
    return budgetsWithSpending
      .filter(b => b.usage_percentage >= 80)
      .sort((a, b) => b.usage_percentage - a.usage_percentage)
  } catch (error) {
    console.error('Error getting budgets with alerts:', error)
    return []
  }
}


