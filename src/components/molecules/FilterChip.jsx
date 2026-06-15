/**
 * FilterChip — selectable pill for filters/categories.
 * Replaces inline button patterns in TransactionsPage filters.
 */
export function FilterChip({ selected = false, onClick, children, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
        selected
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

export default FilterChip
