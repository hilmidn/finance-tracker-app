import { format, addMonths, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * MonthPicker — month navigation with prev/next chevrons.
 * Displays "Januari 2026" etc in Bahasa Indonesia.
 * Emits 'yyyy-MM' strings.
 */
export function MonthPicker({ value, onChange }) {
  const current = new Date(value + '-01')

  const prev = () => {
    const m = subMonths(current, 1)
    onChange(format(m, 'yyyy-MM'))
  }

  const next = () => {
    const m = addMonths(current, 1)
    onChange(format(m, 'yyyy-MM'))
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-200">
      <button
        onClick={prev}
        aria-label="Bulan sebelumnya"
        className="p-1 hover:bg-gray-100 rounded-lg"
      >
        <ChevronLeft size={20} className="text-gray-600" />
      </button>
      <span className="font-semibold text-gray-800 capitalize">
        {format(current, 'MMMM yyyy', { locale: id })}
      </span>
      <button
        onClick={next}
        aria-label="Bulan berikutnya"
        className="p-1 hover:bg-gray-100 rounded-lg"
      >
        <ChevronRight size={20} className="text-gray-600" />
      </button>
    </div>
  )
}

export default MonthPicker
