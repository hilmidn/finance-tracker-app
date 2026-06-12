import { useSelector } from 'react-redux'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Wallet, Settings } from 'lucide-react'
import OfflineBanner from './OfflineBanner'

const tabsLeft = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
]

const tabsRight = [
  { to: '/wallets', icon: Wallet, label: 'Dompet' },
  { to: '/settings', icon: Settings, label: 'Pengaturan' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const isScan = location.pathname === '/scan'

  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto bg-gray-50">
      <OfflineBanner />
      <main className="flex-1 px-4 pt-3 pb-22 overflow-y-auto">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/95 backdrop-blur-lg border-t border-gray-200 safe-area-bottom z-40">
        <div className="flex justify-around items-center py-1.5 px-2">
          {/* Left tabs */}
          {tabsLeft.map(({ to, icon: Icon, label }) => (
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

          {/* Center Scan FAB */}
          <NavLink
            to="/scan"
            className="relative -mt-5 flex flex-col items-center"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 ${
              isScan
                ? 'bg-indigo-600 shadow-indigo-200 scale-110'
                : 'bg-indigo-600 shadow-indigo-200'
            }`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <path d="M7 12h10" />
                <path d="M12 7v10" />
              </svg>
            </div>
            <span className={`text-[10px] font-semibold mt-0.5 ${isScan ? 'text-indigo-600' : 'text-gray-500'}`}>Scan</span>
          </NavLink>

          {/* Right tabs */}
          {tabsRight.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
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
