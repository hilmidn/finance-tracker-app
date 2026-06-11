import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, BarChart3, Settings } from 'lucide-react'

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { to: '/analysis', icon: BarChart3, label: 'Analisis' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto bg-gray-50">
      <main className="flex-1 px-4 pt-5 pb-22 overflow-y-auto">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 backdrop-blur-lg border-t border-gray-200 safe-area-bottom">
        <div className="flex justify-around py-1.5">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-xl ${
                  isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
