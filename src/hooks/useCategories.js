import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_CATEGORIES = {
  pemasukan: ['Gaji', 'Freelance', 'Investasi', 'Lainnya'],
  pengeluaran: ['Makan', 'Transport', 'Tagihan', 'Hiburan', 'Belanja', 'Kesehatan', 'Pendidikan', 'Lainnya'],
}

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
      if (data.length === 0) {
        // First time — seed default categories
        const seedData = []
        for (const [type, names] of Object.entries(DEFAULT_CATEGORIES)) {
          for (const name of names) {
            seedData.push({ name, type, user_id: userId })
          }
        }
        const { data: seeded, error: seedErr } = await supabase
          .from('categories')
          .insert(seedData)
          .select()

        if (!seedErr && seeded) {
          setCategories({
            pemasukan: seeded.filter(c => c.type === 'pemasukan').sort((a, b) => a.name.localeCompare(b.name)),
            pengeluaran: seeded.filter(c => c.type === 'pengeluaran').sort((a, b) => a.name.localeCompare(b.name)),
          })
        }
      } else {
        setCategories({
          pemasukan: data.filter(c => c.type === 'pemasukan'),
          pengeluaran: data.filter(c => c.type === 'pengeluaran'),
        })
      }
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
