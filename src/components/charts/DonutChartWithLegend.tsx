import { useMemo } from 'react'
import type { TransactionRecord } from '../../lib/transactionService'
import type { CategoryRecord, CategoryWithChildren } from '../../lib/categoryService'

type DonutChartData = {
  parent_category_id: string
  parent_category_name: string
  amount: number
  percentage: number
  color: string
}

type DonutChartWithLegendProps = {
  transactions: TransactionRecord[]
  categories: CategoryRecord[]
  parentCategories: CategoryWithChildren[]
  totalAmount: number
}

// Colors matching the image: yellow, red, teal, purple, etc.
const COLORS = [
  '#FCD34D', // yellow (amber-300)
  '#EF4444', // red
  '#14B8A6', // teal
  '#8B5CF6', // purple (violet-500)
  '#3B82F6', // blue
  '#EC4899', // pink
  '#10B981', // green
  '#F59E0B', // amber
  '#06B6D4', // cyan
  '#6366F1', // indigo
]

export const DonutChartWithLegend = ({
  transactions,
  categories,
  parentCategories,
  totalAmount,
}: DonutChartWithLegendProps) => {
  const chartData = useMemo(() => {
    if (transactions.length === 0 || totalAmount === 0 || parentCategories.length === 0) {
      return []
    }

    // Create a map of category ID to parent category
    // First, map all parent categories to themselves
    const categoryToParentMap = new Map<string, CategoryRecord>()
    parentCategories.forEach((parent) => {
      categoryToParentMap.set(parent.id, parent)
      // Then map all children to their parent
      if (parent.children) {
        parent.children.forEach((child) => {
          categoryToParentMap.set(child.id, parent)
        })
      }
    })

    // Also check if transaction category_id is directly a parent category
    // Group transactions by parent category
    const parentCategoryMap = new Map<string, number>()
    transactions.forEach((transaction) => {
      // First check if the category is directly a parent
      let parent = categoryToParentMap.get(transaction.category_id)
      
      // If not found, it might be a child category - find its parent
      if (!parent) {
        const category = categories.find((c) => c.id === transaction.category_id)
        if (category?.parent_id) {
          parent = categoryToParentMap.get(category.parent_id)
        }
      }

      if (parent) {
        const current = parentCategoryMap.get(parent.id) || 0
        parentCategoryMap.set(parent.id, current + transaction.amount)
      }
    })

    // Create chart data
    const entries = Array.from(parentCategoryMap.entries())
    const data: DonutChartData[] = entries
      .map(([parent_id, amount]) => {
        const parent = parentCategories.find((p) => p.id === parent_id)
        return {
          parent_category_id: parent_id,
          parent_category_name: parent?.name || 'Không xác định',
          amount,
          percentage: (amount / totalAmount) * 100,
          color: '', // Will be assigned after sort
        }
      })
      .sort((a, b) => b.amount - a.amount)
      .map((item, index) => ({
        ...item,
        color: COLORS[index % COLORS.length],
      }))

    return data
  }, [transactions, parentCategories, categories, totalAmount])

  // Calculate SVG path for donut chart
  const calculatePath = (data: DonutChartData[], index: number) => {
    if (data.length === 0 || index >= data.length) return ''

    const centerX = 100
    const centerY = 100
    const radius = 80
    const innerRadius = 40 // Giảm innerRadius để tăng độ dày của biểu đồ

    // Calculate cumulative angles
    let startAngle = -90 // Start from top
    for (let i = 0; i < index; i++) {
      startAngle += (data[i].percentage / 100) * 360
    }

    const percentage = data[index].percentage
    const endAngle = startAngle + (percentage / 100) * 360

    // Convert to radians
    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180

    // Calculate points on outer circle
    const x1 = centerX + radius * Math.cos(startAngleRad)
    const y1 = centerY + radius * Math.sin(startAngleRad)
    const x2 = centerX + radius * Math.cos(endAngleRad)
    const y2 = centerY + radius * Math.sin(endAngleRad)

    // Calculate points on inner circle
    const x3 = centerX + innerRadius * Math.cos(endAngleRad)
    const y3 = centerY + innerRadius * Math.sin(endAngleRad)
    const x4 = centerX + innerRadius * Math.cos(startAngleRad)
    const y4 = centerY + innerRadius * Math.sin(startAngleRad)

    // Determine if we need large arc
    const angleDiff = percentage === 100 ? 360 : ((endAngle - startAngle + 360) % 360)
    const largeArcFlag = angleDiff > 180 ? 1 : 0

    // Special handling for 100% (full circle)
    if (percentage === 100) {
      const midAngleRad = startAngleRad + Math.PI
      const xMid = centerX + radius * Math.cos(midAngleRad)
      const yMid = centerY + radius * Math.sin(midAngleRad)
      const xMidInner = centerX + innerRadius * Math.cos(midAngleRad)
      const yMidInner = centerY + innerRadius * Math.sin(midAngleRad)

      const path = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 1 1 ${xMid.toFixed(2)} ${yMid.toFixed(2)} A ${radius} ${radius} 0 1 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x4.toFixed(2)} ${y4.toFixed(2)} A ${innerRadius} ${innerRadius} 0 1 0 ${xMidInner.toFixed(2)} ${yMidInner.toFixed(2)} A ${innerRadius} ${innerRadius} 0 1 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
      return path
    }

    const path = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`

    return path
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-50">
        <img
          src="/savings-74.png"
          alt="Chưa có dữ liệu"
          className="h-48 w-48 object-contain opacity-60"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-row items-center gap-3">
      {/* Donut Chart - Left */}
      <div className="relative flex shrink-0 items-left justify-center">
        <svg
          viewBox="0 0 200 200"
          width="200"
          height="200"
          className="h-36 w-36 sm:h-40 sm:w-40"
          style={{ display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circles */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            opacity="0.3"
          />
          <circle
            cx="100"
            cy="100"
            r="50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            opacity="0.3"
          />

          {/* Chart segments */}
          {chartData.map((item, index) => {
            const pathData = calculatePath(chartData, index)
            if (!pathData) return null

            return (
              <path
                key={`path-${item.parent_category_id}-${index}`}
                d={pathData}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
                className="transition-all hover:opacity-90"
              />
            )
          })}
        </svg>
      </div>

      {/* Legend - Right */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {chartData.map((item) => {
          // Format percentage với dấu phẩy (vi-VN locale)
          const formattedPercentage = item.percentage.toFixed(2).replace('.', ',')
          
          return (
            <div key={item.parent_category_id} className="flex items-center gap-3">
              <div
                className="h-4 w-4 shrink-0 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1 text-sm font-medium text-slate-700 truncate min-w-0">
                {item.parent_category_name}
              </span>
              <span className="shrink-0 text-sm font-semibold text-slate-900 whitespace-nowrap">
                {formattedPercentage} %
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}


