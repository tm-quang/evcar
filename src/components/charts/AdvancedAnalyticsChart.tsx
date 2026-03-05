import { useMemo, useState } from 'react'
import { BarChart } from '@mui/x-charts/BarChart'
import { LineChart } from '@mui/x-charts/LineChart'
import { axisClasses } from '@mui/x-charts/ChartsAxis'
import { FaChartBar, FaChartLine } from 'react-icons/fa'

type ChartDataPoint = {
    label: string
    income: number
    expense: number
    balance: number
}

type AdvancedAnalyticsChartProps = {
    data: ChartDataPoint[]
    height?: number
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)

export const AdvancedAnalyticsChart = ({ data, height = 300 }: AdvancedAnalyticsChartProps) => {
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

    const chartData = useMemo(() => {
        if (data.length === 0) return { xAxis: [], series: [] }

        return {
            xAxis: [{
                scaleType: 'band' as const,
                data: data.map(d => d.label),
                categoryGapRatio: 0.5,
                barGapRatio: 0.05
            }],
            series: [
                {
                    data: data.map(d => d.income),
                    label: 'Thu nhập',
                    color: '#22c55e', // green-500
                    valueFormatter: (v: number | null) => v ? formatCurrency(v) : '0 ₫',
                },
                {
                    data: data.map(d => d.expense),
                    label: 'Chi tiêu',
                    color: '#ef4444', // red-500
                    valueFormatter: (v: number | null) => v ? formatCurrency(v) : '0 ₫',
                },
            ]
        }
    }, [data])

    const lineChartData = useMemo(() => {
        if (data.length === 0) return { xAxis: [], series: [] }

        return {
            xAxis: [{
                scaleType: 'point' as const,
                data: data.map(d => d.label)
            }],
            series: [
                {
                    data: data.map(d => d.balance),
                    label: 'Dòng tiền ròng',
                    color: '#3b82f6', // blue-500
                    area: true,
                    showMark: true,
                    valueFormatter: (v: number | null) => v ? formatCurrency(v) : '0 ₫',
                }
            ]
        }
    }, [data])

    const stats = useMemo(() => {
        if (data.length === 0) return null
        const incomes = data.map(d => d.income)
        const expenses = data.map(d => d.expense)

        const maxIncome = Math.max(...incomes)
        const maxExpense = Math.max(...expenses)
        const avgIncome = incomes.reduce((a, b) => a + b, 0) / incomes.length
        const avgExpense = expenses.reduce((a, b) => a + b, 0) / expenses.length

        return { maxIncome, maxExpense, avgIncome, avgExpense }
    }, [data])

    if (data.length === 0) {
        return (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                <FaChartBar className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">Chưa có dữ liệu phân tích</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between px-5">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setChartType('bar')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${chartType === 'bar'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FaChartBar /> Thu/Chi
                    </button>
                    <button
                        onClick={() => setChartType('line')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${chartType === 'line'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FaChartLine /> Dòng tiền
                    </button>
                </div>

                {/* Quick Stats */}
                {stats && (
                    <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>TB Thu: {formatCurrency(stats.avgIncome)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span>TB Chi: {formatCurrency(stats.avgExpense)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Area */}
            <div className="w-[calc(100%+20px)] -ml-5" style={{ height }}>
                {chartType === 'bar' ? (
                    <BarChart
                        xAxis={chartData.xAxis}
                        series={chartData.series}
                        height={height}
                        margin={{ left: 40, right: 10, top: 10, bottom: 20 }}
                        grid={{ horizontal: true }}
                        slotProps={{
                        }}
                        sx={{
                            [`.${axisClasses.left} .${axisClasses.label}`]: {
                                transform: 'translate(-10px, 0)',
                            },
                            [`.${axisClasses.root}`]: {
                                [`.${axisClasses.tick}, .${axisClasses.line}`]: {
                                    stroke: '#cbd5e1',
                                    strokeWidth: 1,
                                },
                                [`.${axisClasses.tickLabel}`]: {
                                    fill: '#64748b',
                                    fontSize: 11,
                                },
                            },
                        }}
                    />
                ) : (
                    <LineChart
                        xAxis={lineChartData.xAxis}
                        series={lineChartData.series}
                        height={height}
                        margin={{ left: 40, right: 10, top: 10, bottom: 20 }}
                        grid={{ horizontal: true }}
                        slotProps={{
                        }}
                        sx={{
                            [`.${axisClasses.root}`]: {
                                [`.${axisClasses.tick}, .${axisClasses.line}`]: {
                                    stroke: '#cbd5e1',
                                    strokeWidth: 1,
                                },
                                [`.${axisClasses.tickLabel}`]: {
                                    fill: '#64748b',
                                    fontSize: 11,
                                },
                            },
                        }}
                    />
                )}
            </div>

            {/* Mobile Stats (visible only on small screens) */}
            {stats && (
                <div className="grid grid-cols-2 gap-3 sm:hidden pt-2 border-t border-slate-100 px-5">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">TB Thu nhập</span>
                        <span className="text-sm font-bold text-green-500">{formatCurrency(stats.avgIncome)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">TB Chi tiêu</span>
                        <span className="text-sm font-bold text-red-500">{formatCurrency(stats.avgExpense)}</span>
                    </div>
                </div>
            )}
        </div>
    )
}

