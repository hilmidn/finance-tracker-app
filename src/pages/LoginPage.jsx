import { useState } from 'react'
import { Wallet } from 'lucide-react'

export default function LoginPage({ onSignIn, onSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = isSignUp ? await onSignUp(email, password) : await onSignIn(email, password)
    if (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-800">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-5 border border-white/20">
            <Wallet size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Catatan Keuangan</h1>
          <p className="text-sm text-indigo-200 mt-1">Pantau pemasukan & pengeluaranmu</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3.5 text-sm text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              minLength={6}
              required
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3.5 text-sm text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-900/30 rounded-xl px-4 py-2.5 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-indigo-900 rounded-xl py-3.5 font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? 'Tunggu...' : isSignUp ? 'Daftar' : 'Masuk'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-indigo-300">
          {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="text-white font-medium hover:underline"
          >
            {isSignUp ? 'Masuk' : 'Daftar'}
          </button>
        </p>
      </div>
    </div>
  )
}
