import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { supabase } from '../lib/supabase'
import db from '../db/local'
import { store } from '../store'
import { setPendingCount } from '../store/uiSlice'

const TX_SELECT = `
  *,
  categories (name),
  wallets (id, name, type, icon)
`

function genId() { return crypto.randomUUID() }

function monthRange(month) {
  if (!month) return null
  const [y, m] = month.split('-')
  return { start: `${y}-${m}-01`, end: new Date(y, parseInt(m), 0).toISOString().split('T')[0] }
}

function shapeTransfers(trData) {
  return (trData || []).map(tr => ({
    id: `transfer_${tr.id}`,
    __type: 'transfer',
    _raw: tr,
    type: 'transfer',
    amount: tr.amount,
    date: tr.date,
    created_at: tr.created_at,
    categories: { name: 'Transfer' },
    wallets: null,
  }))
}

function findTxInDexie(id) {
  if (!id) return null
  const str = String(id)
  const isNumeric = /^\d+$/.test(str)
  if (isNumeric) {
    return db.transactions.where('serverId').equals(Number(id)).first()
  }
  return db.transactions.get(id)
}

function findTransferInDexie(id) {
  if (!id) return null
  const str = String(id)
  const isNumeric = /^\d+$/.test(str)
  if (isNumeric) {
    return db.transfers.where('serverId').equals(Number(id)).first()
  }
  return db.transfers.get(id)
}

async function updatePendingCount() {
  const all = await db.transactions.toArray()
  const allTr = await db.transfers.toArray()
  const cnt = all.filter(t => t.synced === false).length + allTr.filter(t => t.synced === false).length
  store.dispatch(setPendingCount(cnt))
}

export function useTransactions(userId) {
  const queryClient = useQueryClient()
  const txKey = ['transactions', userId]
  const online = useSelector((s) => s.ui.online)

  // ── Base query: fetch all transactions (no month filter) ──
  const fetchAll = async () => {
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select(TX_SELECT)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (txError) throw txError

    const { data: trData } = await supabase
      .from('transfers')
      .select('*, from_wallet:wallets!from_wallet_id(id,name,type,icon), to_wallet:wallets!to_wallet_id(id,name,type,icon)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    // Cache transactions to Dexie
    for (const tx of txData || []) {
      await db.transactions.put({ ...tx, clientId: `srv_${tx.id}`, serverId: tx.id, synced: true })
    }
    // Cache transfers to Dexie
    for (const tr of trData || []) {
      await db.transfers.put({ ...tr, clientId: `srv_${tr.id}`, serverId: tr.id, synced: true })
    }

    const merged = [...shapeTransfers(trData), ...(txData || [])]
    merged.sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || ''))
    return { txData: txData || [], trData: trData || [], merged }
  }

  const allQuery = useQuery({
    queryKey: txKey,
    queryFn: async () => {
      try {
        return await fetchAll()
      } catch (err) {
        if (!online || err.message?.includes('Failed to fetch')) {
          // Offline fallback — read from Dexie
          const txCached = await db.transactions.toArray()
          const trCached = await db.transfers.toArray()
          const merged = [
            ...shapeTransfers(trCached),
            ...txCached.filter(t => !t._deleted),
          ]
          merged.sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || ''))
          return { txData: txCached, trData: trCached, merged }
        }
        throw err
      }
    },
    enabled: !!userId,
  })

  // ── fetchTransactions(month) helper ──
  const fetchTransactions = async (month) => {
    const result = await queryClient.fetchQuery({ queryKey: txKey })
    if (!result) return []
    let list = result.merged
    if (month) {
      const r = monthRange(month)
      if (r) list = list.filter(t => t.date >= r.start && t.date <= r.end)
    }
    return list
  }

  // ── getSummary ──
  const getSummary = async (month) => {
    if (!userId) return null
    const r = monthRange(month)
    if (!r) return null

    try {
      const { data, error } = await supabase
        .from('transactions').select('type, amount')
        .eq('user_id', userId).gte('date', r.start).lte('date', r.end)
      if (!error && data) {
        const pemasukan = data.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0)
        const pengeluaran = data.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0)
        return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran }
      }
    } catch (_) { /* fall through */ }

    // Offline
    let cached = []
    try { cached = await db.transactions.toArray() } catch (_) { /* ignore */ }
    const filtered = cached.filter(t => !t._deleted)
      .filter(t => t.date >= r.start && t.date <= r.end)
    const pemasukan = filtered.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0)
    const pengeluaran = filtered.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0)
    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran }
  }

  // ── getCategoryBreakdown ──
  const getCategoryBreakdown = async (month) => {
    if (!userId) return []
    const r = monthRange(month)
    if (!r) return []

    try {
      const { data, error } = await supabase
        .from('transactions').select('type, amount, category_id, categories(name)')
        .eq('user_id', userId).eq('type', 'pengeluaran').gte('date', r.start).lte('date', r.end)
      if (!error && data) {
        const bk = {}
        data.forEach(t => { const n = t.categories?.name || '—'; bk[n] = (bk[n] || 0) + t.amount })
        return Object.entries(bk).map(([n, t]) => ({ name: n, total: t })).sort((a, b) => b.total - a.total)
      }
    } catch (_) { /* fall through */ }

    let cached = []
    try { cached = await db.transactions.toArray() } catch (_) { /* ignore */ }
    const filtered = cached.filter(t => !t._deleted && t.type === 'pengeluaran')
      .filter(t => t.date >= r.start && t.date <= r.end)
    const bk = {}
    filtered.forEach(t => { const n = t._categoryName || '—'; bk[n] = (bk[n] || 0) + t.amount })
    return Object.entries(bk).map(([n, t]) => ({ name: n, total: t })).sort((a, b) => b.total - a.total)
  }

  // ── getMonthlySavings ──
  const getMonthlySavings = async (month) => {
    if (!userId) return 0
    const r = monthRange(month)
    if (!r) return 0
    const { data: savingsWallets } = await supabase
      .from('wallets').select('id').eq('user_id', userId).eq('is_savings', true)
    if (!savingsWallets || savingsWallets.length === 0) return 0
    const ids = savingsWallets.map(w => w.id)
    const { data } = await supabase
      .from('transfers').select('amount')
      .eq('user_id', userId).gte('date', r.start).lte('date', r.end)
      .in('to_wallet_id', ids)
    return data?.reduce((s, t) => s + t.amount, 0) || 0
  }

  // ── getSavingsHistory ──
  const getSavingsHistory = async () => {
    if (!userId) return []
    const { data: savingsWallets } = await supabase
      .from('wallets').select('id').eq('user_id', userId).eq('is_savings', true)
    if (!savingsWallets || savingsWallets.length === 0) return []
    const ids = savingsWallets.map(w => w.id)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(); startDate.setMonth(startDate.getMonth() - 5); startDate.setDate(1)
    const startStr = startDate.toISOString().split('T')[0]
    const { data } = await supabase
      .from('transfers').select('amount, date')
      .eq('user_id', userId).gte('date', startStr).lte('date', endDate).in('to_wallet_id', ids)
    const byMonth = {}
    data?.forEach(t => { const k = t.date.substring(0, 7); byMonth[k] = (byMonth[k] || 0) + t.amount })
    const months = []
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ month: names[d.getMonth()], key: k, total: byMonth[k] || 0 })
    }
    return months
  }

  // ══════ MUTATIONS ══════

  const addMutation = useMutation({
    mutationFn: async (tx) => {
      const { data, error } = await supabase
        .from('transactions').insert({ ...tx, user_id: userId })
        .select(TX_SELECT).single()
      if (error) throw error
      return data
    },
    onError: async (_err, tx) => {
      const clientId = `tx_${genId()}`
      const localTx = {
        clientId, serverId: null, userId, type: tx.type, category_id: tx.category_id,
        wallet_id: tx.wallet_id, amount: tx.amount, note: tx.note || '',
        date: tx.date, created_at: new Date().toISOString(),
        shared_to_household_id: tx.shared_to_household_id || null,
        household_category_id: tx.household_category_id || null,
        household_wallet_id: tx.household_wallet_id || null,
        _categoryName: '', _walletName: '', _walletType: '', _walletIcon: '',
        synced: false, _deleted: false,
      }
      await db.transactions.put(localTx)
      await updatePendingCount()
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: txKey }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('transactions').update(updates).eq('id', id)
        .select(TX_SELECT).single()
      if (error) throw error
      return data
    },
    onSuccess: async (data, { id }) => {
      const existing = await findTxInDexie(id)
      if (existing) await db.transactions.put({ ...existing, ...data, synced: true })
    },
    onError: async (_err, { id, updates }) => {
      const existing = await findTxInDexie(id)
      if (existing) {
        await db.transactions.put({ ...existing, ...updates, synced: false })
        await updatePendingCount()
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: txKey }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: async (_data, id) => {
      const existing = await findTxInDexie(id)
      if (existing) await db.transactions.delete(existing.clientId)
      await updatePendingCount()
    },
    onError: async (_err, id) => {
      const existing = await findTxInDexie(id)
      if (existing) {
        await db.transactions.put({ ...existing, _deleted: true, synced: false })
        await updatePendingCount()
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: txKey }),
  })

  const deleteTransferMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('transfers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: async (_data, id) => {
      const existing = await findTransferInDexie(id)
      if (existing) await db.transfers.delete(existing.clientId)
      await updatePendingCount()
    },
    onError: async (_err, id) => {
      const existing = await findTransferInDexie(id)
      if (existing) {
        await db.transfers.put({ ...existing, _deleted: true, synced: false })
        await updatePendingCount()
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: txKey }),
  })

  const addTransaction = async (tx) => addMutation.mutateAsync(tx)
  const updateTransaction = async (id, updates) => updateMutation.mutateAsync({ id, updates })
  const deleteTransaction = async (id) => deleteMutation.mutateAsync(id)
  const deleteTransfer = async (id) => deleteTransferMutation.mutateAsync(id)

  return {
    transactions: allQuery.data?.merged || [],
    txRaw: allQuery.data?.txData || [],
    trRaw: allQuery.data?.trData || [],
    loading: allQuery.isLoading,
    error: allQuery.error,
    addTransaction, updateTransaction, deleteTransaction, deleteTransfer,
    fetchTransactions, getSummary, getCategoryBreakdown,
    getMonthlySavings, getSavingsHistory,
  }
}

// ── Standalone helper for arbitrary userId (used in analysis page) ──
export function useSummary(userId, month) {
  return useQuery({
    queryKey: ['summary', userId, month],
    queryFn: async () => {
      const r = monthRange(month)
      if (!r) return null
      const { data, error } = await supabase
        .from('transactions').select('type, amount')
        .eq('user_id', userId).gte('date', r.start).lte('date', r.end)
      if (error) throw error
      const pemasukan = data.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0)
      const pengeluaran = data.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0)
      return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran, error: null }
    },
    enabled: !!userId && !!month,
  })
}

export function useMonthlySavings(userId, month) {
  return useQuery({
    queryKey: ['monthlySavings', userId, month],
    queryFn: async () => {
      const r = monthRange(month)
      if (!r) return 0
      const { data: savingsWallets } = await supabase
        .from('wallets').select('id').eq('user_id', userId).eq('is_savings', true)
      if (!savingsWallets || savingsWallets.length === 0) return 0
      const ids = savingsWallets.map(w => w.id)
      const { data } = await supabase
        .from('transfers').select('amount')
        .eq('user_id', userId).gte('date', r.start).lte('date', r.end)
        .in('to_wallet_id', ids)
      return data?.reduce((s, t) => s + t.amount, 0) || 0
    },
    enabled: !!userId && !!month,
  })
}

export function useCategoryBreakdown(userId, month) {
  return useQuery({
    queryKey: ['categoryBreakdown', userId, month],
    queryFn: async () => {
      const r = monthRange(month)
      if (!r) return []
      const { data, error } = await supabase
        .from('transactions').select('type, amount, category_id, categories(name)')
        .eq('user_id', userId).eq('type', 'pengeluaran').gte('date', r.start).lte('date', r.end)
      if (error) throw error
      const bk = {}
      data.forEach(t => { const n = t.categories?.name || '—'; bk[n] = (bk[n] || 0) + t.amount })
      return Object.entries(bk).map(([n, t]) => ({ name: n, total: t })).sort((a, b) => b.total - a.total)
    },
    enabled: !!userId && !!month,
  })
}
