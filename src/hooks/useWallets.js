import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import db from '../db/local'

export function useWallets(userId) {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchWallets = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')

    if (!error && data) {
      setWallets(data)
      // Cache to Dexie
      await db.wallets.bulkPut(data.map(w => ({ ...w, userId })))
    } else {
      // Offline — read from Dexie
      const cached = await db.wallets.where('userId').equals(userId).toArray()
      setWallets(cached || [])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (userId) fetchWallets()
  }, [userId, fetchWallets])

  const addWallet = useCallback(async ({ name, type, icon, initial_balance, is_savings }) => {
    if (!userId) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('wallets')
      .insert({ name, type, icon, initial_balance: initial_balance || 0, is_savings: is_savings || false, user_id: userId })
      .select()
      .single()

    if (!error && data) {
      await db.wallets.put({ ...data, userId })
      setWallets(prev => [...prev, data])
    }
    return { data, error }
  }, [userId])

  const updateWallet = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('wallets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      await db.wallets.put({ ...data, userId })
      setWallets(prev => prev.map(w => w.id === id ? data : w))
    }
    return { data, error }
  }, [userId])

  const deleteWallet = useCallback(async (id) => {
    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', id)

    if (!error) {
      await db.wallets.delete(id)
      setWallets(prev => prev.filter(w => w.id !== id))
    }
    return { error }
  }, [])

  // Get balance for each wallet
  const getWalletBalances = useCallback(async () => {
    if (!userId) return {}

    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('wallet_id, type, amount')
      .eq('user_id', userId)

    if (txError) return {}

    const { data: transferData, error: transferError } = await supabase
      .from('transfers')
      .select('from_wallet_id, to_wallet_id, amount')
      .eq('user_id', userId)

    const balances = {}
    wallets.forEach(w => {
      balances[w.id] = w.initial_balance || 0
    })

    txData?.forEach(tx => {
      if (!tx.wallet_id) return
      if (tx.type === 'pemasukan') {
        balances[tx.wallet_id] = (balances[tx.wallet_id] || 0) + tx.amount
      } else {
        balances[tx.wallet_id] = (balances[tx.wallet_id] || 0) - tx.amount
      }
    })

    transferData?.forEach(tr => {
      if (tr.from_wallet_id) {
        balances[tr.from_wallet_id] = (balances[tr.from_wallet_id] || 0) - tr.amount
      }
      if (tr.to_wallet_id) {
        balances[tr.to_wallet_id] = (balances[tr.to_wallet_id] || 0) + tr.amount
      }
    })

    return balances
  }, [userId, wallets])

  return {
    wallets,
    loading,
    fetchWallets,
    addWallet,
    updateWallet,
    deleteWallet,
    getWalletBalances,
  }
}
