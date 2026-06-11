import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import WalletsPage from './pages/WalletsPage'
import AnalysisPage from './pages/AnalysisPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()

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
          <Route path="/" element={<DashboardPage user={user} />} />
          <Route path="/transactions" element={<TransactionsPage userId={user.id} />} />
          <Route path="/wallets" element={<WalletsPage userId={user.id} />} />
          <Route path="/analysis" element={<AnalysisPage userId={user.id} />} />
          <Route path="/settings" element={<SettingsPage userId={user.id} onSignOut={signOut} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
