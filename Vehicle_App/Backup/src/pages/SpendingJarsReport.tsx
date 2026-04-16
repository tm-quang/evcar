import { useCallback, useEffect, useState, useMemo } from 'react'
import { FaChartPie, FaWallet, FaPiggyBank, FaExclamationCircle, FaTrophy } from 'react-icons/fa'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import HeaderBar from '../components/layout/HeaderBar'
import { fetchJars, enrichJar, formatJarCurrency, type JarWithStats } from '../lib/jarService'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export const SpendingJarsReportPage = () => {
  const [jars, setJars] = useState<JarWithStats[]>([])
  const [loading, setLoading] = useState(true)

  const loadJars = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchJars()
      setJars(data.map(enrichJar))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadJars() }, [loadJars])

  const fmt = formatJarCurrency

  const stats = useMemo(() => {
    let budgetTotal = 0
    let budgetSpent = 0
    let savingsTotalTarget = 0
    let savingsCurrent = 0
    let overBudgetJars: JarWithStats[] = []
    let nearTargetJars: JarWithStats[] = []

    const budgetData: any[] = []
    
    jars.forEach(jar => {
      if (jar.jar_type === 'budget') {
        const limit = jar.budget_amount || 0
        budgetTotal += limit
        budgetSpent += jar.current_amount
        if (jar.current_amount > 0) {
           budgetData.push({ name: jar.name, value: jar.current_amount, color: jar.color })
        }
        if (limit > 0 && jar.current_amount > limit) {
          overBudgetJars.push(jar)
        }
      } else {
        const target = jar.target_amount || 0
        savingsTotalTarget += target
        savingsCurrent += jar.current_amount
        if (target > 0) {
          const pct = jar.current_amount / target
          if (pct >= 0.8 && pct < 1) nearTargetJars.push(jar)
        }
      }
    })

    budgetData.sort((a,b) => b.value - a.value)
    overBudgetJars.sort((a,b) => b.current_amount - a.current_amount)
    nearTargetJars.sort((a,b) => (b.current_amount / (b.target_amount||1)) - (a.current_amount / (a.target_amount||1)))

    return {
      budgetTotal,
      budgetSpent,
      budgetPct: budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0,
      savingsTotalTarget,
      savingsCurrent,
      savingsPct: savingsTotalTarget > 0 ? (savingsCurrent / savingsTotalTarget) * 100 : 0,
      budgetData: budgetData.slice(0, 6), // top 6 for chart
      overBudgetJars,
      nearTargetJars
    }
  }, [jars])

  if (loading) {
     return (
       <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
         <HeaderBar variant="page" title="BÁO CÁO HŨ CHI TIÊU" />
         <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
         </div>
       </div>
     )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="BÁO CÁO HŨ CHI TIÊU" />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-4">

          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-4">
             <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80">
               <div className="h-10 w-10 rounded-full bg-sky-50 flex items-center justify-center mb-4">
                 <FaWallet className="text-sky-500 h-4 w-4" />
               </div>
               <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Đã chi / Ngân sách</p>
               <p className="text-[15px] font-black text-slate-800">{fmt(stats.budgetSpent)}</p>
               <p className="text-[11px] font-bold text-slate-400 mt-1">/ {fmt(stats.budgetTotal)}</p>
               <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                 <div className={`h-full rounded-full transition-all ${stats.budgetPct > 100 ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${Math.min(100, stats.budgetPct)}%`}} />
               </div>
             </div>
             
             <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80">
               <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                 <FaPiggyBank className="text-emerald-500 h-4 w-4" />
               </div>
               <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Đã góp / Mục tiêu</p>
               <p className="text-[15px] font-black text-slate-800">{fmt(stats.savingsCurrent)}</p>
               <p className="text-[11px] font-bold text-slate-400 mt-1">/ {fmt(stats.savingsTotalTarget)}</p>
               <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                 <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, stats.savingsPct)}%`}} />
               </div>
             </div>
          </div>

          {/* Budget Chart */}
          {stats.budgetData.length > 0 && (
            <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80">
              <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
                <FaChartPie className="text-indigo-500" />
                CƠ CẤU CHI TIÊU
              </h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.budgetData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.budgetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => fmt(Number(value))}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-3 justify-center">
                 {stats.budgetData.map((entry, idx) => (
                   <div key={idx} className="flex items-center gap-2">
                     <span className="h-3 w-3 rounded-full" style={{ background: entry.color || COLORS[idx%COLORS.length] }} />
                     <span className="text-[11px] font-bold text-slate-600">{entry.name}</span>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* Attention sections */}
          {stats.overBudgetJars.length > 0 && (
            <div className="rounded-[24px] bg-red-50/50 p-6 border border-red-100">
              <h3 className="text-sm font-black text-red-600 mb-4 flex items-center gap-2">
                <FaExclamationCircle />
                VƯỢT NGÂN SÁCH
              </h3>
              <div className="space-y-3">
                {stats.overBudgetJars.map(jar => (
                  <div key={jar.id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-red-50">
                     <div className="flex items-center gap-3">
                        <span className="text-2xl">{jar.icon}</span>
                        <div>
                           <p className="font-bold text-slate-800 text-sm">{jar.name}</p>
                           <p className="text-xs text-slate-500">{fmt(jar.budget_amount || 0)}</p>
                        </div>
                     </div>
                     <span className="font-bold text-red-500 text-sm">{fmt(jar.current_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.nearTargetJars.length > 0 && (
            <div className="rounded-[24px] bg-emerald-50/50 p-6 border border-emerald-100">
              <h3 className="text-sm font-black text-emerald-600 mb-4 flex items-center gap-2">
                <FaTrophy />
                SẮP ĐẠT MỤC TIÊU TIẾT KIỆM
              </h3>
              <div className="space-y-3">
                {stats.nearTargetJars.map(jar => (
                  <div key={jar.id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-emerald-50">
                     <div className="flex items-center gap-3">
                        <span className="text-2xl">{jar.icon}</span>
                        <div>
                           <p className="font-bold text-slate-800 text-sm">{jar.name}</p>
                           <p className="text-xs text-slate-500">Mục tiêu: {fmt(jar.target_amount || 0)}</p>
                        </div>
                     </div>
                     <span className="font-bold text-emerald-500 text-sm">{Math.round((jar.current_amount/(jar.target_amount||1))*100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default SpendingJarsReportPage
