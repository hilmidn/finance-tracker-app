import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import db from '../db/local'

const catKey = (householdId) => ['householdCategories', householdId]

/**
 * Household categories CRUD.
 * Categories are seeded automatically on household creation (default 14 categories).
 * Members can add/remove more.
 */
export function useHouseholdCategories(householdId) {
  const queryClient = useQueryClient()
  const key = catKey(householdId)

  // List all categories for household
  const allQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('household_categories')
        .select('*')
        .eq('household_id', householdId)
        .order('type')
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!householdId,
  })

  // Cache to Dexie
  if (allQuery.data) {
    allQuery.data.forEach(c => {
      db.householdCategories.put({
        ...c,
        householdId: c.household_id,
      }).catch(() => {})
    })
  }

  // Grouped output
  const grouped = {
    pemasukan: (allQuery.data || []).filter(c => c.type === 'pemasukan'),
    pengeluaran: (allQuery.data || []).filter(c => c.type === 'pengeluaran'),
  }

  // Add category
  const addMutation = useMutation({
    mutationFn: async ({ name, type }) => {
      const { data, error } = await supabase
        .from('household_categories')
        .insert({ name: name.trim(), type, household_id: householdId })
        .select()
        .single()
      if (error) {
        if (error.code === '23505') {
          throw new Error('Kategori dengan nama ini sudah ada')
        }
        throw error
      }
      return data
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Delete category
  const deleteMutation = useMutation({
    mutationFn: async (categoryId) => {
      const { error } = await supabase
        .from('household_categories')
        .delete()
        .eq('id', categoryId)
      if (error) throw error
      return categoryId
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return {
    categories: grouped,
    raw: allQuery.data || [],
    loading: allQuery.isLoading,
    addCategory: (name, type) => addMutation.mutateAsync({ name, type }),
    deleteCategory: (categoryId) => deleteMutation.mutateAsync(categoryId),
  }
}
