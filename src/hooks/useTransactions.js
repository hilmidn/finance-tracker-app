import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const TX_SELECT = `
  *,
  categories (name),
  wallets (id, name, type, icon)
`

export function useTransactions(userId) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async (month) => {
    if (!userId) return
    setLoading(true)

    // Fetch regular transactions
    let txQuery = supabase
      .from('transactions')
      .select(TX_SELECT)
      .eq('user_id', userId)

    if (month) {
      const [year, m] = month.split('-')
      const start = `${year}-${m}-01`
      const end = new Date(year, parseInt(m), 0).toISOString().split('T')[0]
      txQuery = txQuery.gte('date', start).lte('date', end)
    }

    const [txResult, trResult] = await Promise.all([
      txQuery.order('date', { ascending: false }).order('created_at', { ascending: false }),
      fetchTransfers(userId, month),
    ])

    const txData = txResult.data || []
    const trData = trResult || []

    // Transform transfers to match transaction shape
    const transferItems = trData.map(tr => ({
      id: `transfer_${tr.id}`,
      __type: 'transfer',
      _raw: tr,
      type: 'transfer',
      amount: tr.amount,
      date: tr.date,
      note: tr.description || `Transfer: ${tr.from_wallet?.name || '?'} → ${tr.to_wallet?.name || '?'}`,
      created_at: tr.created_at,
      from_wallet: tr.from_wallet,
      to_wallet: tr.to_wallet,
      categories: { name: 'Transfer' },
      wallets: null,
    }))

    // Merge and sort by date descending, then created_at
    const merged = [...txData, ...transferItems].sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date)
      if (dateCmp !== 0) return dateCmp
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    setTransactions(merged)
    setLoading(false)
  }, [userId])

  const fetchTransfers = async (userId, month) => {
    let query = supabase
      .from('transfers')
      .select(`
        *,
        from_wallet:wallets!from_wallet_id(id, name, type, icon),
        to_wallet:wallets!to_wallet_id(id, name, type, icon)
      `)
      .eq('user_id', userId)

    if (month) {
      const [year, m] = month.split('-')
      const start = `${year}-${m}-01`
      const end = new Date(year, parseInt(m), 0).toISOString().split('T')[0]
      query = query.gte('date', start).lte('date', end)
    }

    const { data } = await query
    return data || []
  }

  useEffect(() => {
    if (userId) fetchTransactions()
  }, [userId, fetchTransactions])

  const addTransaction = useCallback(async (tx) => {
    if (!userId) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...tx, user_id: userId })
      .select(TX_SELECT)
      .single()

    if (!error && data) {
      setTransactions(prev => [data, ...prev])
    }
    return { data, error }
  }, [userId])

  const updateTransaction = useCallback(async (id, updates) => {
    if (!userId) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select(TX_SELECT)
      .single()

    if (!error && data) {
      setTransactions(prev => prev.map(t => (t.id === id && !t.__type) ? data : t))
    }
    return { data, error }
  }, [userId])

  const deleteTransaction = useCallback(async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (!error) {
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
    return { error }
  }, [])

  const deleteTransfer = useCallback(async (id) => {
    const { error } = await supabase
      .from('transfers')
      .delete()
      .eq('id', id)

    if (!error) {
      setTransactions(prev => prev.filter(t => !(t.__type === 'transfer' && t._raw?.id === id)))
    }
    return { error }
  }, [])

  const getSummary = useCallback(async (month) => {
    if (!userId) return null
    const [year, m] = month ? month.split('-') : [new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0')]
    const start = `${year}-${m}-01`
    const end = new Date(year, parseInt(m), 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)

    if (error) return null

    const pemasukan = data.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + t.amount, 0)
    const pengeluaran = data.filter(t => t.type === 'pengeluaran').reduce((sum, t) => sum + t.amount, 0)

    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran }
  }, [userId])

  const getCategoryBreakdown = useCallback(async (month) => {
    if (!userId) return []
    const [year, m] = month ? month.split('-') : [new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0')]
    const start = `${year}-${m}-01`
    const end = new Date(year, parseInt(m), 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        categories!inner(name)
      `)
      .eq('user_id', userId)
      .eq('type', 'pengeluaran')
      .gte('date', start)
      .lte('date', end)

    if (error) return []

    const breakdown = {}
    data.forEach(t => {
      const catName = t.categories?.name || 'Tanpa Kategori'
      breakdown[catName] = (breakdown[catName] || 0) + t.amount
    })

    return Object.entries(breakdown)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
  }, [userId])

  return {
    transactions,
    loading,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransfer,
    getSummary,
    getCategoryBreakdown,
  }
}
