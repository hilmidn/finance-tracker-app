import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTransfers(userId) {
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTransfers = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('transfers')
      .select(`
        *,
        from_wallet:wallets!from_wallet_id(id, name, type, icon),
        to_wallet:wallets!to_wallet_id(id, name, type, icon)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error) setTransfers(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (userId) fetchTransfers()
  }, [userId, fetchTransfers])

  const addTransfer = useCallback(async (tr) => {
    if (!userId) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('transfers')
      .insert({ ...tr, user_id: userId })
      .select(`
        *,
        from_wallet:wallets!from_wallet_id(id, name, type, icon),
        to_wallet:wallets!to_wallet_id(id, name, type, icon)
      `)
      .single()

    if (!error && data) {
      setTransfers(prev => [data, ...prev])
    }
    return { data, error }
  }, [userId])

  const deleteTransfer = useCallback(async (id) => {
    const { error } = await supabase
      .from('transfers')
      .delete()
      .eq('id', id)

    if (!error) {
      setTransfers(prev => prev.filter(t => t.id !== id))
    }
    return { error }
  }, [])

  return {
    transfers,
    loading,
    fetchTransfers,
    addTransfer,
    deleteTransfer,
  }
}
