import { useSelector } from 'react-redux'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import ScanPage from './pages/ScanPage'
import WalletsPage from './pages/WalletsPage'
import SettingsPage from './pages/SettingsPage'
import HouseholdSettingsPage from './pages/HouseholdSettingsPage'
import HouseholdWalletsPage from './pages/HouseholdWalletsPage'
import HouseholdTransactionsPage from './pages/HouseholdTransactionsPage'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, loading } = useSelector((s) => s.auth)
  const { signIn, signUp, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} />
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/wallets" element={<WalletsPage />} />
          <Route path="/settings" element={<SettingsPage onSignOut={signOut} />} />
          <Route path="/household" element={<HouseholdSettingsPage />} />
          <Route path="/household/wallets" element={<HouseholdWalletsPage />} />
          <Route path="/household/transactions" element={<HouseholdTransactionsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
