type IncomeExpenseSummaryProps = {
  income: number
  expense: number
  isLoading?: boolean
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const IncomeExpenseSummary = ({ income, expense, isLoading = false }: IncomeExpenseSummaryProps) => {
  const difference = income - expense

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base text-slate-500">Khoản thu</p>
          <p className="text-base font-bold text-slate-300">...</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-base text-slate-500">Khoản chi</p>
          <p className="text-base font-bold text-slate-300">...</p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-slate-200 pt-3">
          <p className="text-base text-slate-500">Chênh lệch</p>
          <p className="text-base font-bold text-slate-300">...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Income */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-base text-slate-600">Khoản thu</p>
        <p className="text-base font-bold text-green-500 whitespace-nowrap">{formatCurrency(income)}</p>
      </div>

      {/* Expense */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-base text-slate-600">Khoản chi</p>
        <p className="text-base font-bold text-red-500 whitespace-nowrap">{formatCurrency(expense)}</p>
      </div>

      {/* Difference */}
      <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-slate-200 pt-3">
        <p className="text-base text-slate-600">Chênh lệch</p>
        <p className="text-base font-bold text-slate-900 whitespace-nowrap">
          {formatCurrency(difference)}
        </p>
      </div>
    </div>
  )
}


