import { useMemo } from 'react'

type HorizontalBarChartProps = {
  income: number
  expense: number
  height?: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const HorizontalBarChart = ({ income, expense, height = 60 }: HorizontalBarChartProps) => {
  const maxValue = useMemo(() => {
    return Math.max(income, expense, 1) // At least 1 to avoid division by zero
  }, [income, expense])

  const incomeHeight = maxValue > 0 ? (income / maxValue) * 100 : 0
  const expenseHeight = maxValue > 0 ? (expense / maxValue) * 100 : 0

  return (
    <div className="flex items-end gap-2 h-full">
      {/* Income Bar (Vertical - Left) - Green */}
      <div
        className="rounded-sm bg-green-500 shrink-0"
        style={{
          width: '45px',
          height: `${Math.max((incomeHeight / 100) * height, income > 0 ? 4 : 0)}px`,
          minHeight: income > 0 ? '4px' : '0px'
        }}
        title={`Thu: ${formatCurrency(income)}`}
      />

      {/* Expense Bar (Vertical - Right) - Red */}
      <div
        className="rounded-sm bg-red-500 shrink-0"
        style={{
          width: '45px',
          height: `${Math.max((expenseHeight / 100) * height, expense > 0 ? 4 : 0)}px`,
          minHeight: expense > 0 ? '4px' : '0px'
        }}
        title={`Chi: ${formatCurrency(expense)}`}
      />
    </div>
  )
}


