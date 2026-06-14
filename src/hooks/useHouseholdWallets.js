import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import db from '../db/local'

const walletKey = (householdId) => ['householdWallets', householdId]

/**
 * Household wallets CRUD + balance calculation.
 * Note: balance calculation will need household_transactions in Phase 3.
 * For Phase 2, balance is just initial_balance (no transactions yet).
 */
export function useHouseholdWallets(householdId) {
  const queryClient = useQueryClient()
  const key = walletKey(householdId)

  // List all wallets for household
  const allQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('household_wallets')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!householdId,
  })

  // Cache to Dexie
  if (allQuery.data) {
    allQuery.data.forEach(w => {
      db.householdWallets.put({
        ...w,
        householdId: w.household_id,
      }).catch(() => {})
    })
  }

  // Add wallet
  const addMutation = useMutation({
    mutationFn: async ({ name, type, icon, initial_balance, is_savings }) => {
      const { data, error } = await supabase
        .from('household_wallets')
        .insert({
          name,
          type,
          icon: icon || '',
          initial_balance: initial_balance || 0,
          is_savings: is_savings || false,
          household_id: householdId,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Update wallet
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('household_wallets')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Delete wallet
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('household_wallets')
        .delete()
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Balances (Phase 2: only initial_balance, Phase 3 will add tx-based calc)
  const balances = useMemo(() => {
    const b = {}
    ;(allQuery.data || []).forEach(w => { b[w.id] = w.initial_balance || 0 })
    return b
  }, [allQuery.data])

  // Memoized balance getters
  const totalBalance = useMemo(
    () => Object.values(balances).reduce((sum, b) => sum + (b || 0), 0),
    [balances]
  )
  const operasionalBalance = useMemo(() =>
    (allQuery.data || []).filter(w => !w.is_savings)
      .reduce((s, w) => s + (balances[w.id] || 0), 0),
    [allQuery.data, balances]
  )
  const savingsBalance = useMemo(() =>
    (allQuery.data || []).filter(w => w.is_savings)
      .reduce((s, w) => s + (balances[w.id] || 0), 0),
    [allQuery.data, balances]
  )

  const getBalance = useCallback((walletId) => balances[walletId] || 0, [balances])

  return {
    wallets: allQuery.data || [],
    balances,
    totalBalance,
    operasionalBalance,
    savingsBalance,
    getBalance,
    loading: allQuery.isLoading,
    addWallet: (args) => addMutation.mutateAsync(args),
    updateWallet: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteWallet: (id) => deleteMutation.mutateAsync(id),
  }
}
