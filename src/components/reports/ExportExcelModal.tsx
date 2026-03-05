import { useState } from 'react'
import { FaTimes, FaDownload, FaFileExcel } from 'react-icons/fa'
import type { ExportOptions } from '../../utils/exportExcel'
import type { DateRangeType } from '../../pages/Reports'

interface ExportExcelModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (options: ExportOptions) => Promise<void>
  dateRange: {
    start: string
    end: string
    type: DateRangeType
  }
  typeFilter: 'all' | 'Thu' | 'Chi'
  categoryIds: string[]
}

export const ExportExcelModal = ({
  isOpen,
  onClose,
  onExport,
  dateRange,
  typeFilter,
  categoryIds,
}: ExportExcelModalProps) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<Omit<ExportOptions, 'dateRange'>>({
    typeFilter,
    categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    groupByCategory: false,
    groupByDate: false,
    includeSummary: true,
    includeCharts: false,
  })

  if (!isOpen) return null

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport({
        ...exportOptions,
        dateRange,
      })
      onClose()
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-end sm:items-center p-0 sm:p-4 pointer-events-none">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 sm:animate-in sm:zoom-in-95 mt-12 sm:mt-0 max-h-[calc(100vh-3rem)] sm:max-h-[85vh] overflow-y-auto safe-area-bottom pointer-events-auto">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FaFileExcel className="text-green-600" />
            Xuất báo cáo Excel
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
            disabled={isExporting}
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-6">
          {/* Date Range Info */}
          <section className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-xs font-semibold text-blue-900 mb-1">Khoảng thời gian</p>
            <p className="text-sm text-blue-700">{dateRange.start} đến {dateRange.end}</p>
          </section>

          {/* Type Filter */}
          <section>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Loại giao dịch</h4>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'Thu', 'Chi'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setExportOptions(prev => ({ ...prev, typeFilter: type }))}
                  disabled={isExporting}
                  className={`rounded-xl py-2 text-sm font-semibold transition-all ${
                    exportOptions.typeFilter === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {type === 'all' ? 'Tất cả' : type === 'Thu' ? 'Thu nhập' : 'Chi tiêu'}
                </button>
              ))}
            </div>
          </section>

          {/* Export Options */}
          <section>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Tùy chọn xuất file</h4>
            <div className="space-y-3">
              {/* Include Summary */}
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Bao gồm bảng tổng quan</p>
                  <p className="text-xs text-slate-500">Thêm sheet phân tích tổng quan và theo danh mục</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.includeSummary}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeSummary: e.target.checked }))}
                  disabled={isExporting}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              {/* Group by Category */}
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Nhóm theo danh mục</p>
                  <p className="text-xs text-slate-500">Sắp xếp và nhóm giao dịch theo danh mục</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.groupByCategory}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, groupByCategory: e.target.checked }))}
                  disabled={isExporting}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              {/* Group by Date */}
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Nhóm theo ngày</p>
                  <p className="text-xs text-slate-500">Sắp xếp và nhóm giao dịch theo ngày</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.groupByDate}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, groupByDate: e.target.checked }))}
                  disabled={isExporting}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              {/* Use selected categories */}
              {categoryIds.length > 0 && (
                <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Chỉ xuất danh mục đã chọn</p>
                    <p className="text-xs text-slate-500">Chỉ xuất {categoryIds.length} danh mục đã lọc</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!exportOptions.categoryIds && exportOptions.categoryIds.length > 0}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      categoryIds: e.target.checked ? categoryIds : undefined,
                    }))}
                    disabled={isExporting}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Hủy
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/30 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Đang xuất...</span>
              </>
            ) : (
              <>
                <FaDownload className="h-4 w-4" />
                <span>Xuất Excel</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

