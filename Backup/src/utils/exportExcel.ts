/**
 * Utility functions for exporting financial reports to Excel format
 * Uses ExcelJS library for advanced formatting (colors, borders, styles)
 */

import ExcelJS from 'exceljs'
import type { TransactionRecord } from '../lib/transactionService'
import type { CategoryRecord } from '../lib/categoryService'
import type { WalletRecord } from '../lib/walletService'
import { formatDateUTC7, getDateComponentsUTC7 } from './dateUtils'
import { formatVNDDisplay } from './currencyInput'

export type ExportOptions = {
  dateRange: {
    start: string
    end: string
    type: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  }
  typeFilter: 'all' | 'Thu' | 'Chi'
  categoryIds?: string[]
  groupByCategory?: boolean
  groupByDate?: boolean
  includeSummary?: boolean
  includeCharts?: boolean
}

/**
 * Get column number from cell address (e.g., "A1" -> 1, "E5" -> 5)
 */
const getColumnNumber = (address: string): number => {
  const match = address.match(/^([A-Z]+)/)
  if (!match) return 0
  const col = match[1]
  let result = 0
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
  }
  return result
}

/**
 * Format date for display
 */
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return formatDateUTC7(date)
  } catch {
    return dateStr
  }
}

/**
 * Format datetime for display
 */
const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return dateStr
  }
}

/**
 * Create header style
 */
const createHeaderStyle = (): Partial<ExcelJS.Style> => ({
  font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }, // Blue
  },
  alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { argb: 'FF1E40AF' } },
    bottom: { style: 'thin', color: { argb: 'FF1E40AF' } },
    left: { style: 'thin', color: { argb: 'FF1E40AF' } },
    right: { style: 'thin', color: { argb: 'FF1E40AF' } },
  },
})

/**
 * Create income row style
 */
const createIncomeRowStyle = (): Partial<ExcelJS.Style> => ({
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD1FAE5' }, // Light green
  },
  font: { color: { argb: 'FF065F46' }, size: 12 },
})

/**
 * Create expense row style
 */
const createExpenseRowStyle = (): Partial<ExcelJS.Style> => ({
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEE2E2' }, // Light red
  },
  font: { color: { argb: 'FF991B1B' }, size: 12 },
})

/**
 * Create summary style
 */
const createSummaryStyle = (): Partial<ExcelJS.Style> => ({
  font: { bold: true, size: 13 },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' }, // Light gray
  },
  border: {
    top: { style: 'medium', color: { argb: 'FF6B7280' } },
    bottom: { style: 'medium', color: { argb: 'FF6B7280' } },
    left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
    right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  },
})

/**
 * Add header row to worksheet
 */
const addHeaderRow = (
  worksheet: ExcelJS.Worksheet,
  headers: string[],
  startCol: number = 1
): void => {
  const headerStyle = createHeaderStyle()
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(1, startCol + index)
    cell.value = header
    cell.style = headerStyle
    worksheet.getColumn(startCol + index).width = Math.max(15, header.length + 2)
  })
}

/**
 * Add summary sheet
 */
const addSummarySheet = (
  workbook: ExcelJS.Workbook,
  transactions: TransactionRecord[],
  categories: CategoryRecord[],
  _wallets: WalletRecord[],
  options: ExportOptions
): void => {
  const summarySheet = workbook.addWorksheet('Tổng quan')
  
  // Calculate statistics
  const income = transactions
    .filter((t) => t.type === 'Thu')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const expense = transactions
    .filter((t) => t.type === 'Chi')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const balance = income - expense
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0

  // Title
  summarySheet.getCell(1, 1).value = 'BÁO CÁO TÀI CHÍNH'
  summarySheet.getCell(1, 1).style = {
    font: { bold: true, size: 18, color: { argb: 'FF1E40AF' } },
    alignment: { horizontal: 'center' },
  }
  summarySheet.mergeCells(1, 1, 1, 4)

  // Date range
  summarySheet.getCell(2, 1).value = `Khoảng thời gian: ${options.dateRange.start} đến ${options.dateRange.end}`
  summarySheet.getCell(2, 1).style = {
    font: { size: 13, italic: true },
    alignment: { horizontal: 'center' },
  }
  summarySheet.mergeCells(2, 1, 2, 4)

  // Summary table headers
  const summaryHeaders = ['Chỉ số', 'Giá trị', 'Mô tả', '']
  addHeaderRow(summarySheet, summaryHeaders, 1)

  // Summary data
  const summaryData = [
    ['Tổng thu nhập', formatVNDDisplay(income), 'Tổng số tiền thu được trong kỳ', ''],
    ['Tổng chi tiêu', formatVNDDisplay(expense), 'Tổng số tiền chi ra trong kỳ', ''],
    ['Dòng tiền ròng', formatVNDDisplay(balance), income >= expense ? 'Số dư dương' : 'Số dư âm', ''],
    ['Tỷ lệ tiết kiệm', `${savingsRate.toFixed(2)}%`, savingsRate >= 0 ? 'Tiết kiệm được' : 'Chi tiêu vượt thu nhập', ''],
    ['Số giao dịch', transactions.length.toString(), 'Tổng số giao dịch trong kỳ', ''],
  ]

  summaryData.forEach((row, index) => {
    const rowNum = index + 2
    row.forEach((cellValue, colIndex) => {
      const cell = summarySheet.getCell(rowNum, colIndex + 1)
      cell.value = cellValue
      if (colIndex === 0) {
        cell.style = {
          font: { bold: true, size: 12 },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
        }
      } else if (colIndex === 1) {
        cell.style = {
          font: { bold: true, size: 12, color: { argb: 'FF065F46' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          },
          numFmt: '#,##0 "VNĐ"',
        }
      } else {
        cell.style = {
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          },
        }
      }
    })
  })

  // Category summary
  let rowNum = 8
  summarySheet.getCell(rowNum, 1).value = 'Phân tích theo danh mục'
  summarySheet.getCell(rowNum, 1).style = {
    font: { bold: true, size: 14, color: { argb: 'FF1E40AF' } },
  }
  summarySheet.mergeCells(rowNum, 1, rowNum, 4)
  rowNum++

  const categoryHeaders = ['Danh mục', 'Loại', 'Số lượng', 'Tổng tiền']
  categoryHeaders.forEach((header, index) => {
    const cell = summarySheet.getCell(rowNum, index + 1)
    cell.value = header
    cell.style = createHeaderStyle()
    summarySheet.getColumn(index + 1).width = Math.max(15, header.length + 2)
  })
  rowNum++

  // Group by category (separate income and expense for each category)
  const categoryMap = new Map<string, { income: number; expense: number; incomeCount: number; expenseCount: number }>()
  transactions.forEach((t) => {
    const category = categories.find((c) => c.id === t.category_id)
    const categoryName = category?.name || 'Không xác định'
    const existing = categoryMap.get(categoryName) || { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 }
    const amount = Number(t.amount) || 0
    if (t.type === 'Thu') {
      existing.income += amount
      existing.incomeCount++
    } else {
      existing.expense += amount
      existing.expenseCount++
    }
    categoryMap.set(categoryName, existing)
  })

  Array.from(categoryMap.entries())
    .sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense))
    .forEach(([categoryName, data]) => {
      // Income row
      if (data.income > 0) {
        summarySheet.getCell(rowNum, 1).value = categoryName
        summarySheet.getCell(rowNum, 2).value = 'Thu nhập'
        summarySheet.getCell(rowNum, 3).value = data.incomeCount
        summarySheet.getCell(rowNum, 4).value = data.income
        summarySheet.getCell(rowNum, 4).numFmt = '#,##0 "VNĐ"'

        const style = createIncomeRowStyle()
        ;[1, 2, 3, 4].forEach((col) => {
          summarySheet.getCell(rowNum, col).style = {
            ...style,
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
            },
          }
        })
        rowNum++
      }

      // Expense row
      if (data.expense > 0) {
        summarySheet.getCell(rowNum, 1).value = categoryName
        summarySheet.getCell(rowNum, 2).value = 'Chi tiêu'
        summarySheet.getCell(rowNum, 3).value = data.expenseCount
        summarySheet.getCell(rowNum, 4).value = data.expense
        summarySheet.getCell(rowNum, 4).numFmt = '#,##0 "VNĐ"'

        const style = createExpenseRowStyle()
        ;[1, 2, 3, 4].forEach((col) => {
          summarySheet.getCell(rowNum, col).style = {
            ...style,
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
            },
          }
        })
        rowNum++
      }

    })
}

/**
 * Export transactions to Excel with advanced formatting
 */
export const exportTransactionsToExcel = async (
  transactions: TransactionRecord[],
  categories: CategoryRecord[],
  wallets: WalletRecord[],
  options: ExportOptions,
  filename?: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'BO Finance App'
  workbook.created = new Date()
  workbook.modified = new Date()

  // Add summary sheet if requested
  if (options.includeSummary) {
    addSummarySheet(workbook, transactions, categories, wallets, options)
  }

  // Main transactions sheet
  const worksheet = workbook.addWorksheet('Giao dịch')

  // Define columns
  const headers = [
    'Ngày giao dịch',
    'Loại',
    'Danh mục',
    'Mô tả',
    'Số tiền',
    'Ví',
    'Ghi chú',
    'Thẻ',
    'Địa điểm',
    'Người nhận',
    'Ngày tạo',
    'Ngày cập nhật',
  ]

  addHeaderRow(worksheet, headers)

  // Add data rows with grouping support
  let currentGroup: string | null = null
  let groupTotal = 0

  const addGroupHeader = (groupName: string) => {
    const rowNum = worksheet.rowCount + 1
    const groupRow = worksheet.addRow([groupName, '', '', '', '', '', '', '', '', '', '', ''])
    groupRow.getCell(1).value = groupName
    groupRow.getCell(1).style = {
      font: { bold: true, size: 13, color: { argb: 'FF1E40AF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFF6FF' }, // Light blue
      },
      border: {
        top: { style: 'medium', color: { argb: 'FF3B82F6' } },
        bottom: { style: 'thin', color: { argb: 'FF3B82F6' } },
        left: { style: 'thin', color: { argb: 'FF3B82F6' } },
        right: { style: 'thin', color: { argb: 'FF3B82F6' } },
      },
    }
    worksheet.mergeCells(rowNum, 1, rowNum, 12)
    return groupRow
  }

  const addGroupSummary = (total: number) => {
    const rowNum = worksheet.rowCount + 1
    const summaryRow = worksheet.addRow([])
    summaryRow.getCell(1).value = 'Tổng cộng:'
    summaryRow.getCell(5).value = total
    summaryRow.getCell(5).numFmt = '#,##0 "VNĐ"'
    summaryRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true, size: 12 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }, // Very light gray
        },
        border: {
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        },
      }
      const colNum = getColumnNumber(cell.address)
      if (colNum === 5) {
        cell.alignment = { horizontal: 'right' }
      }
    })
    worksheet.mergeCells(rowNum, 1, rowNum, 4)
    return summaryRow
  }

  // Sort transactions by date from low to high
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.transaction_date).getTime()
    const dateB = new Date(b.transaction_date).getTime()
    return dateA - dateB
  })

  sortedTransactions.forEach((transaction) => {
    // Determine group key
    let groupKey: string | null = null
    if (options.groupByCategory) {
      const categoryName = categories.find((c) => c.id === transaction.category_id)?.name || 'Không xác định'
      groupKey = `CATEGORY:${categoryName}`
    } else if (options.groupByDate) {
      groupKey = `DATE:${formatDate(transaction.transaction_date)}`
    }

    // Add group header if needed
    if (groupKey && groupKey !== currentGroup) {
      // Add summary for previous group
      if (currentGroup && groupTotal > 0) {
        addGroupSummary(groupTotal)
        groupTotal = 0
      }

      // Add empty row separator before new group (except first group)
      if (currentGroup) {
        worksheet.addRow([])
      }

      // Add new group header
      const groupName = groupKey.startsWith('CATEGORY:')
        ? `📁 ${groupKey.replace('CATEGORY:', '')}`
        : `📅 ${groupKey.replace('DATE:', '')}`
      addGroupHeader(groupName)
      currentGroup = groupKey
    }

    // Add transaction row
    const row = worksheet.addRow([
      formatDate(transaction.transaction_date),
      transaction.type === 'Thu' ? 'Thu nhập' : 'Chi tiêu',
      categories.find((c) => c.id === transaction.category_id)?.name || 'Không xác định',
      transaction.description || '',
      Number(transaction.amount) || 0,
      wallets.find((w) => w.id === transaction.wallet_id)?.name || 'Không xác định',
      transaction.notes || '',
      transaction.tags?.join(', ') || '',
      transaction.location || '',
      transaction.recipient_name || '',
      formatDateTime(transaction.created_at),
      formatDateTime(transaction.updated_at),
    ])

    // Accumulate group total
    if (groupKey) {
      groupTotal += Number(transaction.amount) || 0
    }

    // Apply row styling based on type
    const rowStyle = transaction.type === 'Thu' ? createIncomeRowStyle() : createExpenseRowStyle()
    row.eachCell((cell, colNumber) => {
      cell.style = {
        ...rowStyle,
        border: {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        },
        alignment: { vertical: 'middle', horizontal: colNumber === 5 ? 'right' : 'left', wrapText: true },
      }

      // Format number column (amount) with VNĐ
      if (colNumber === 5) {
        cell.numFmt = '#,##0 "VNĐ"'
      }
    })
  })

  // Add summary for last group if grouping
  if (currentGroup && groupTotal > 0) {
    addGroupSummary(groupTotal)
  }

  // Add empty row separator before total summary
  if (options.groupByCategory || options.groupByDate || sortedTransactions.length > 0) {
    worksheet.addRow([])
  }

  // Calculate totals
  const totalAmount = sortedTransactions
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const incomeTotal = sortedTransactions
    .filter((t) => t.type === 'Thu')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const expenseTotal = sortedTransactions
    .filter((t) => t.type === 'Chi')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const balance = incomeTotal - expenseTotal

  // Add "Tổng cộng:" row at the bottom of the amount column (column 5)
  const totalRow = worksheet.addRow([])
  totalRow.getCell(1).value = 'Tổng cộng:'
  totalRow.getCell(5).value = totalAmount
  totalRow.getCell(5).numFmt = '#,##0 "VNĐ"'
  
  totalRow.eachCell((cell) => {
    cell.style = {
      font: { bold: true, size: 13 },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }, // Very light gray
      },
      border: {
        top: { style: 'medium', color: { argb: 'FF6B7280' } },
        bottom: { style: 'medium', color: { argb: 'FF6B7280' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      },
    }
    const colNum = getColumnNumber(cell.address)
    if (colNum === 5) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
    }
  })
  worksheet.mergeCells(totalRow.number, 1, totalRow.number, 4)

  // Add detailed summary row
  worksheet.addRow([])
  const summaryRow = worksheet.addRow([])
  summaryRow.getCell(1).value = 'TỔNG CỘNG'
  summaryRow.getCell(4).value = 'Thu nhập:'
  summaryRow.getCell(5).value = incomeTotal
  summaryRow.getCell(5).numFmt = '#,##0 "VNĐ"'
  summaryRow.getCell(7).value = 'Chi tiêu:'
  summaryRow.getCell(8).value = expenseTotal
  summaryRow.getCell(8).numFmt = '#,##0 "VNĐ"'
  summaryRow.getCell(10).value = 'Cân đối:'
  summaryRow.getCell(11).value = balance
  summaryRow.getCell(11).numFmt = '#,##0 "VNĐ"'

  const summaryStyle = createSummaryStyle()
  summaryRow.eachCell((cell) => {
    cell.style = {
      ...summaryStyle,
      font: {
        ...summaryStyle.font,
        color: (() => {
          const colNum = getColumnNumber(cell.address)
          if (colNum === 11 && balance < 0) return { argb: 'FF991B1B' }
          if (colNum === 5) return { argb: 'FF065F46' }
          return summaryStyle.font?.color
        })(),
      },
    }
    const colNum = getColumnNumber(cell.address)
    if (colNum === 5 || colNum === 8 || colNum === 11) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
    }
  })

  // Set column widths
  worksheet.columns.forEach((column) => {
    if (!column.width) {
      column.width = 15
    }
  })
  worksheet.getColumn(1).width = 18 // Date column
  worksheet.getColumn(4).width = 30 // Description column
  worksheet.getColumn(5).width = 18 // Amount column

  // Generate filename with date and time
  const now = new Date()
  const components = getDateComponentsUTC7(now)
  const year = String(components.year)
  const month = String(components.month).padStart(2, '0')
  const day = String(components.day).padStart(2, '0')
  const hour = String(components.hour).padStart(2, '0')
  const minute = String(components.minute).padStart(2, '0')
  const second = String(components.second).padStart(2, '0')
  const timestamp = `${year}${month}${day}_${hour}${minute}${second}`
  const rangeLabel = RANGE_LABEL_MAP[options.dateRange.type] || 'tuy_chinh'
  const defaultFilename = `bao_cao_${rangeLabel}_${timestamp}.xlsx`
  const finalFilename = filename || defaultFilename

  // Download file
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', finalFilename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

const RANGE_LABEL_MAP: Record<string, string> = {
  day: 'ngay',
  week: 'tuan',
  month: 'thang',
  quarter: 'quy',
  year: 'nam',
  custom: 'tuy_chinh',
}


