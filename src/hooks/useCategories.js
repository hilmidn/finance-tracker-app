import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCategories(userId) {
  const [categories, setCategories] = useState({ pemasukan: [], pengeluaran: [] })
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (!error && data) {
      setCategories({
        pemasukan: data.filter(c => c.type === 'pemasukan'),
        pengeluaran: data.filter(c => c.type === 'pengeluaran'),
      })
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (userId) fetchCategories()
  }, [userId, fetchCategories])

  const addCategory = useCallback(async (name, type) => {
    if (!userId) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, type, user_id: userId })
      .select()
      .single()

    if (!error) {
      setCategories(prev => ({
        ...prev,
        [type]: [...prev[type], data].sort((a, b) => a.name.localeCompare(b.name)),
      }))
    }
    return { data, error }
  }, [userId])

  const deleteCategory = useCallback(async (id, type) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (!error) {
      setCategories(prev => ({
        ...prev,
        [type]: prev[type].filter(c => c.id !== id),
      }))
    }
    return { error }
  }, [])

  return { categories, loading, fetchCategories, addCategory, deleteCategory }
}
