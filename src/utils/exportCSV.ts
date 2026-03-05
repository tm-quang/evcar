/**
 * Utility functions for exporting data to CSV format
 * CSV files can be easily imported into Google Sheets
 */

import type { TaskRecord } from '../lib/taskService'
import type { ReminderRecord } from '../lib/reminderService'
import { formatDateUTC7 } from './dateUtils'
import { formatVNDDisplay } from './currencyInput'

/**
 * Escape CSV field value (handles commas, quotes, newlines)
 */
const escapeCSVField = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Format date for CSV (YYYY-MM-DD format)
 */
const formatDateForCSV = (dateStr: string | null): string => {
  if (!dateStr) return ''
  try {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split('T')[0]
    }
    const date = new Date(dateStr)
    return formatDateUTC7(date)
  } catch {
    return dateStr
  }
}

/**
 * Format datetime for CSV
 */
const formatDateTimeForCSV = (dateStr: string | null): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const components = {
      year: date.getFullYear(),
      month: String(date.getMonth() + 1).padStart(2, '0'),
      day: String(date.getDate()).padStart(2, '0'),
      hour: String(date.getHours()).padStart(2, '0'),
      minute: String(date.getMinutes()).padStart(2, '0'),
      second: String(date.getSeconds()).padStart(2, '0'),
    }
    return `${components.year}-${components.month}-${components.day} ${components.hour}:${components.minute}:${components.second}`
  } catch {
    return dateStr
  }
}

/**
 * Convert tasks to CSV rows
 */
const tasksToCSVRows = (tasks: TaskRecord[]): string[][] => {
  const rows: string[][] = []
  
  // Header row
  rows.push([
    'Loại',
    'Tiêu đề',
    'Mô tả',
    'Trạng thái',
    'Độ ưu tiên',
    'Tiến độ (%)',
    'Deadline',
    'Tags',
    'Ngày tạo',
    'Ngày cập nhật',
    'Ngày hoàn thành',
  ])
  
  // Data rows
  tasks.forEach(task => {
    rows.push([
      'Công việc',
      escapeCSVField(task.title),
      escapeCSVField(task.description),
      escapeCSVField(
        task.status === 'completed' ? 'Hoàn thành' :
        task.status === 'in_progress' ? 'Đang làm' :
        task.status === 'cancelled' ? 'Đã hủy' : 'Chờ'
      ),
      escapeCSVField(
        task.priority === 'urgent' ? 'Khẩn cấp' :
        task.priority === 'high' ? 'Cao' :
        task.priority === 'low' ? 'Thấp' : 'Trung bình'
      ),
      String(task.progress || 0),
      formatDateForCSV(task.deadline),
      escapeCSVField(task.tags?.join(', ') || ''),
      formatDateTimeForCSV(task.created_at),
      formatDateTimeForCSV(task.updated_at),
      formatDateTimeForCSV(task.completed_at),
    ])
  })
  
  return rows
}

/**
 * Convert reminders to CSV rows (including plans and notes)
 */
const remindersToCSVRows = (reminders: ReminderRecord[]): string[][] => {
  const rows: string[][] = []
  
  // Header row
  rows.push([
    'Loại',
    'Tiêu đề',
    'Ghi chú',
    'Loại nhắc nhở',
    'Số tiền',
    'Ngày nhắc nhở',
    'Giờ nhắc nhở',
    'Lặp lại',
    'Màu sắc',
    'Thông báo',
    'Trạng thái',
    'Ngày tạo',
    'Ngày cập nhật',
    'Ngày hoàn thành',
  ])
  
  // Data rows
  reminders.forEach(reminder => {
    const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
    const type = isNote ? 'Ghi chú' : 'Kế hoạch'
    
    rows.push([
      type,
      escapeCSVField(reminder.title),
      escapeCSVField(reminder.notes),
      escapeCSVField(reminder.type || ''),
      reminder.amount ? formatVNDDisplay(reminder.amount) : '',
      formatDateForCSV(reminder.reminder_date),
      escapeCSVField(reminder.reminder_time || ''),
      escapeCSVField(
        reminder.repeat_type === 'daily' ? 'Hàng ngày' :
        reminder.repeat_type === 'weekly' ? 'Hàng tuần' :
        reminder.repeat_type === 'monthly' ? 'Hàng tháng' :
        reminder.repeat_type === 'yearly' ? 'Hàng năm' : 'Không lặp'
      ),
      escapeCSVField(reminder.color || ''),
      reminder.enable_notification ? 'Có' : 'Không',
      reminder.completed_at ? 'Hoàn thành' : 'Chưa hoàn thành',
      formatDateTimeForCSV(reminder.created_at),
      formatDateTimeForCSV(reminder.updated_at),
      formatDateTimeForCSV(reminder.completed_at),
    ])
  })
  
  return rows
}

/**
 * Convert rows to CSV string
 */
const rowsToCSVString = (rows: string[][]): string => {
  return rows.map(row => row.join(',')).join('\n')
}

/**
 * Download CSV file
 */
const downloadCSV = (csvContent: string, filename: string): void => {
  // Add BOM for UTF-8 to support Vietnamese characters in Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Export history data to CSV
 * Includes tasks, reminders (plans), and notes
 */
export const exportHistoryToCSV = (
  tasks: TaskRecord[],
  reminders: ReminderRecord[],
  filename?: string
): void => {
  const allRows: string[][] = []
  
  // Export tasks
  if (tasks.length > 0) {
    allRows.push(...tasksToCSVRows(tasks))
    allRows.push([]) // Empty row separator
  }
  
  // Export reminders (plans and notes)
  if (reminders.length > 0) {
    allRows.push(...remindersToCSVRows(reminders))
  }
  
  // Convert to CSV string
  const csvContent = rowsToCSVString(allRows)
  
  // Generate filename with timestamp
  const timestamp = formatDateUTC7(new Date()).replace(/-/g, '')
  const defaultFilename = `lich_su_ban_ghi_${timestamp}.csv`
  const finalFilename = filename || defaultFilename
  
  // Download
  downloadCSV(csvContent, finalFilename)
}

/**
 * Export only tasks to CSV
 */
export const exportTasksToCSV = (tasks: TaskRecord[], filename?: string): void => {
  const rows = tasksToCSVRows(tasks)
  const csvContent = rowsToCSVString(rows)
  const timestamp = formatDateUTC7(new Date()).replace(/-/g, '')
  const finalFilename = filename || `cong_viec_${timestamp}.csv`
  downloadCSV(csvContent, finalFilename)
}

/**
 * Export only reminders to CSV
 */
export const exportRemindersToCSV = (reminders: ReminderRecord[], filename?: string): void => {
  const rows = remindersToCSVRows(reminders)
  const csvContent = rowsToCSVString(rows)
  const timestamp = formatDateUTC7(new Date()).replace(/-/g, '')
  const finalFilename = filename || `ke_hoach_ghi_chu_${timestamp}.csv`
  downloadCSV(csvContent, finalFilename)
}


