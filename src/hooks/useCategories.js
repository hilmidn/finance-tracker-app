import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import db from '../db/local'

const catKey = (uid) => ['categories', uid]

export function useCategories(userId) {
  const queryClient = useQueryClient()
  const key = catKey(userId)

  const allQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories').select('*').eq('user_id', userId).order('name')
      if (error) throw error
      // Cache to Dexie
      await db.categories.bulkPut((data || []).map(c => ({ ...c, userId })))
      const grouped = {
        pemasukan: (data || []).filter(c => c.type === 'pemasukan'),
        pengeluaran: (data || []).filter(c => c.type === 'pengeluaran'),
      }
      return grouped
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  })

  const categories = allQuery.data ?? { pemasukan: [], pengeluaran: [] }

  const addMutation = useMutation({
    mutationFn: async ({ name, type }) => {
      const { data, error } = await supabase
        .from('categories').insert({ name, type, user_id: userId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: async (data) => {
      await db.categories.put({ ...data, userId })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: async (_data, id) => {
      await db.categories.delete(id)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return {
    categories,
    loading: allQuery.isLoading,
    fetchCategories: () => queryClient.invalidateQueries({ queryKey: key }),
    addCategory: (name, type) => addMutation.mutateAsync({ name, type }),
    deleteCategory: (id, _type) => deleteMutation.mutateAsync(id),
  }
}
