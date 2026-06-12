import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const transferKey = (uid) => ['transfers', uid]

export function useTransfers(userId) {
  const queryClient = useQueryClient()
  const key = transferKey(userId)

  const allQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfers')
        .select('*, from_wallet:wallets!from_wallet_id(id,name,type,icon), to_wallet:wallets!to_wallet_id(id,name,type,icon)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: async (tr) => {
      const { data, error } = await supabase
        .from('transfers').insert({ ...tr, user_id: userId })
        .select('*, from_wallet:wallets!from_wallet_id(id,name,type,icon), to_wallet:wallets!to_wallet_id(id,name,type,icon)')
        .single()
      if (error) throw error
      return data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      // Also invalidate transactions since transfers affect wallet balances
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('transfers').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
    },
  })

  return {
    transfers: allQuery.data || [],
    loading: allQuery.isLoading,
    addTransfer: (tr) => addMutation.mutateAsync(tr),
    deleteTransfer: (id) => deleteMutation.mutateAsync(id),
  }
}
