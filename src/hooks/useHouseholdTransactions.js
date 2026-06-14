import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { supabase } from '../lib/supabase'
import db from '../db/local'
import { store } from '../store'
import { setPendingCount } from '../store/uiSlice'

const HOUSEHOLD_TX_SELECT = `
  *,
  household_wallets:household_wallet_id (id, name, type, icon),
  household_categories:household_category_id (id, name, type)
`

function genId() { return crypto.randomUUID() }

function monthRange(month) {
  if (!month) return null
  const [y, m] = month.split('-')
  return { start: `${y}-${m}-01`, end: new Date(y, parseInt(m), 0).toISOString().split('T')[0] }
}

function findHouseholdTxInDexie(id) {
  if (!id) return null
  const str = String(id)
  const isNumeric = /^\d+$/.test(str)
  if (isNumeric) {
    return db.householdTransactions.where('serverId').equals(Number(id)).first()
  }
  return db.householdTransactions.get(id)
}

async function updatePendingCount() {
  const all = await db.householdTransactions.toArray()
  const cnt = all.filter(t => t.synced === false).length
  store.dispatch(setPendingCount(cnt))
}

/**
 * Household transactions CRUD.
 * Household context: members share a single ledger per household.
 *
 * Per-user share of personal transactions lives in the Shared tab of
 * the personal TransactionsPage and is fetched via useSharedPersonalTransactions.
 * This hook is intentionally household-ledger-only.
 *
 * @param {string} householdId - household UUID
 * @param {string} userId - current user id (for offline fallback)
 */
export function useHouseholdTransactions(householdId, userId) {
  const queryClient = useQueryClient()
  const key = ['householdTransactions', householdId]
  const online = useSelector((s) => s.ui.online)

  // Fetch all household transactions (no month filter, we filter client-side)
  const allQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!householdId) return []
      try {
        const { data, error } = await supabase
          .from('household_transactions')
          .select(HOUSEHOLD_TX_SELECT)
          .eq('household_id', householdId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
        if (error) throw error

        // Cache to Dexie
        for (const tx of data || []) {
          await db.householdTransactions.put({
            ...tx,
            clientId: `srv_${tx.id}`,
            serverId: tx.id,
            householdId: tx.household_id,
            householdWalletId: tx.household_wallet_id,
            householdCategoryId: tx.household_category_id,
            source_transfer_id: tx.source_transfer_id,
            synced: true,
          })
        }
        return data || []
      } catch (err) {
        if (!online || err.message?.includes('Failed to fetch')) {
          const cached = await db.householdTransactions.toArray()
          return cached.filter(t => t.householdId === householdId && !t._deleted)
        }
        throw err
      }
    },
    enabled: !!householdId,
  })

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (tx) => {
      const { data, error } = await supabase
        .from('household_transactions')
        .insert({ ...tx, created_by: userId })
        .select(HOUSEHOLD_TX_SELECT)
        .single()
      if (error) throw error
      return data
    },
    onError: async (_err, tx) => {
      const clientId = `hhtx_${genId()}`
      const localTx = {
        clientId,
        serverId: null,
        householdId: tx.household_id,
        householdWalletId: tx.household_wallet_id,
        householdCategoryId: tx.household_category_id,
        type: tx.type,
        amount: tx.amount,
        note: tx.note || '',
        date: tx.date,
        source_transfer_id: tx.source_transfer_id || null,
        created_by: userId,
        created_at: new Date().toISOString(),
        synced: false,
        _deleted: false,
      }
      await db.householdTransactions.put(localTx)
      await updatePendingCount()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('household_transactions')
        .update(updates)
        .eq('id', id)
        .select(HOUSEHOLD_TX_SELECT)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (data, { id }) => {
      const existing = await findHouseholdTxInDexie(id)
      if (existing) await db.householdTransactions.put({ ...existing, ...data, synced: true })
    },
    onError: async (_err, { id, updates }) => {
      const existing = await findHouseholdTxInDexie(id)
      if (existing) {
        await db.householdTransactions.put({ ...existing, ...updates, synced: false })
        await updatePendingCount()
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('household_transactions').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: async (_data, id) => {
      const existing = await findHouseholdTxInDexie(id)
      if (existing) await db.householdTransactions.delete(existing.clientId)
      await updatePendingCount()
    },
    onError: async (_err, id) => {
      const existing = await findHouseholdTxInDexie(id)
      if (existing) {
        await db.householdTransactions.put({ ...existing, _deleted: true, synced: false })
        await updatePendingCount()
      }
    },
  })

  // getSummary (month) — for household wallets page
  const getSummary = async (month) => {
    if (!householdId) return null
    const r = monthRange(month)
    if (!r) return null

    let txs = []
    try {
      const { data, error } = await supabase
        .from('household_transactions')
        .select('type, amount, household_wallet_id')
        .eq('household_id', householdId)
        .gte('date', r.start)
        .lte('date', r.end)
      if (!error && data) txs = data
    } catch (e) {
      void e
      const cached = await db.householdTransactions.toArray()
      txs = cached.filter(t => t.householdId === householdId && !t._deleted && t.date >= r.start && t.date <= r.end)
    }

    const pemasukan = txs.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0)
    const pengeluaran = txs.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0)
    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran }
  }

  // getCategoryBreakdown for household
  const getCategoryBreakdown = async (month) => {
    if (!householdId) return []
    const r = monthRange(month)
    if (!r) return []

    let txs = []
    try {
      const { data: hh } = await supabase
        .from('household_transactions')
        .select('type, amount, household_category_id, household_categories(name)')
        .eq('household_id', householdId)
        .eq('type', 'pengeluaran')
        .gte('date', r.start)
        .lte('date', r.end)
      txs = hh || []
    } catch (e) {
      void e
      const cached = await db.householdTransactions.toArray()
      txs = cached.filter(t => t.householdId === householdId && !t._deleted && t.type === 'pengeluaran' && t.date >= r.start && t.date <= r.end)
    }

    const bk = {}
    txs.forEach(t => { const n = t.household_categories?.name || '—'; bk[n] = (bk[n] || 0) + t.amount })
    return Object.entries(bk).map(([n, t]) => ({ name: n, total: t })).sort((a, b) => b.total - a.total)
  }

  return {
    transactions: allQuery.data || [],
    loading: allQuery.isLoading,
    addTransaction: (tx) => addMutation.mutateAsync(tx),
    updateTransaction: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteTransaction: (id) => deleteMutation.mutateAsync(id),
    getSummary,
    getCategoryBreakdown,
  }
}

// Hook for sync service to list pending household tx
export async function getPendingHouseholdTransactions() {
  const all = await db.householdTransactions.toArray()
  return all.filter(t => t.synced === false)
}
