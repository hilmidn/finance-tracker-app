import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTransactions(userId) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async (month) => {
    if (!userId) return
    setLoading(true)

    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories (name),
        wallets (id, name, type, icon)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (month) {
      const [year, m] = month.split('-')
      const start = `${year}-${m}-01`
      const end = new Date(year, parseInt(m), 0).toISOString().split('T')[0]
      query = query.gte('date', start).lte('date', end)
    }

    const { data, error } = await query

    if (!error) setTransactions(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (userId) fetchTransactions()
  }, [userId, fetchTransactions])

  const addTransaction = useCallback(async (tx) => {
    if (!userId) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...tx, user_id: userId })
      .select()
      .single()

    if (!error && data) {
      setTransactions(prev => [data, ...prev])
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
    deleteTransaction,
    getSummary,
    getCategoryBreakdown,
  }
}
