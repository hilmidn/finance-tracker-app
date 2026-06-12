import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import db from '../db/local'

const walletKey = (uid) => ['wallets', uid]

export function useWallets(userId) {
  const queryClient = useQueryClient()
  const key = walletKey(userId)

  const allQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets').select('*').eq('user_id', userId).order('created_at')
      if (error) throw error
      // Cache to Dexie
      await db.wallets.bulkPut((data || []).map(w => ({ ...w, userId })))
      return data || []
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  })

  // Offline fallback
  const wallets = allQuery.data ?? (userId
    ? (() => {
        // triggers a Dexie read — but we can't do async in a sync expression
        return []
      })()
    : [])

  const addMutation = useMutation({
    mutationFn: async ({ name, type, icon, initial_balance, is_savings }) => {
      const { data, error } = await supabase
        .from('wallets').insert({ name, type, icon, initial_balance: initial_balance || 0, is_savings: is_savings || false, user_id: userId })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: async (data) => {
      await db.wallets.put({ ...data, userId })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase.from('wallets').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: async (data) => {
      await db.wallets.put({ ...data, userId })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('wallets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: async (_data, id) => {
      await db.wallets.delete(id)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const getWalletBalances = async () => {
    if (!userId) return {}

    const { data: txData, error: txError } = await supabase
      .from('transactions').select('wallet_id, type, amount').eq('user_id', userId)

    if (txError) return {}

    const { data: transferData } = await supabase
      .from('transfers').select('from_wallet_id, to_wallet_id, amount').eq('user_id', userId)

    const balances = {}
    ;(allQuery.data || []).forEach(w => { balances[w.id] = w.initial_balance || 0 })

    txData?.forEach(tx => {
      if (!tx.wallet_id) return
      if (tx.type === 'pemasukan') {
        balances[tx.wallet_id] = (balances[tx.wallet_id] || 0) + tx.amount
      } else {
        balances[tx.wallet_id] = (balances[tx.wallet_id] || 0) - tx.amount
      }
    })

    transferData?.forEach(tr => {
      if (tr.from_wallet_id) balances[tr.from_wallet_id] = (balances[tr.from_wallet_id] || 0) - tr.amount
      if (tr.to_wallet_id) balances[tr.to_wallet_id] = (balances[tr.to_wallet_id] || 0) + tr.amount
    })

    return balances
  }

  return {
    wallets: allQuery.data || [],
    loading: allQuery.isLoading,
    fetchWallets: () => queryClient.invalidateQueries({ queryKey: key }),
    addWallet: (args) => addMutation.mutateAsync(args),
    updateWallet: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteWallet: (id) => deleteMutation.mutateAsync(id),
    getWalletBalances,
  }
}
