/**
 * TabBar — segmented control for switching between views.
 * Tabs: array of { value, label, icon?, activeColor? }
 */
export function TabBar({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1 ${className}`}>
      {tabs.map(tab => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            onClick={() => onChange?.(tab.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
              active ? `bg-white shadow-sm ${tab.activeColor || 'text-indigo-600'}` : 'text-gray-500'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export default TabBar
