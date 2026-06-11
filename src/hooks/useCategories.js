import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_CATEGORIES = {
  pemasukan: ['Gaji', 'Freelance', 'Investasi', 'Lainnya'],
  pengeluaran: ['Makan', 'Transport', 'Tagihan', 'Hiburan', 'Belanja', 'Kesehatan', 'Pendidikan', 'Lainnya'],
}

export function useCategories(userId) {
  const [categories, setCategories] = useState({ pemasukan: [], pengeluaran: [] })
  const [loading, setLoading] = useState(true)
  const seeding = useRef(false)

  const fetchCategories = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (!error && data) {
      if (data.length === 0 && !seeding.current) {
        seeding.current = true
        const seedData = []
        for (const [type, names] of Object.entries(DEFAULT_CATEGORIES)) {
          for (const name of names) {
            seedData.push({ name, type, user_id: userId })
          }
        }
        // ignoreDuplicates — aman kalo kebetulan 2x seed
        const { data: seeded } = await supabase
          .from('categories')
          .insert(seedData, { onConflict: 'user_id,name,type', ignoreDuplicates: true })
          .select()

        if (seeded && seeded.length > 0) {
          setCategories({
            pemasukan: seeded.filter(c => c.type === 'pemasukan').sort((a, b) => a.name.localeCompare(b.name)),
            pengeluaran: seeded.filter(c => c.type === 'pengeluaran').sort((a, b) => a.name.localeCompare(b.name)),
          })
        } else {
          // Seed di-skip (duplicate) — ambil data yang udah ada
          const { data: existing } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', userId)
            .order('name')
          if (existing) {
            setCategories({
              pemasukan: existing.filter(c => c.type === 'pemasukan'),
              pengeluaran: existing.filter(c => c.type === 'pengeluaran'),
            })
          }
        }
        seeding.current = false
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
