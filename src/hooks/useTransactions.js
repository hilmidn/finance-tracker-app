import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import db from '../db/local'

const TX_SELECT = `
  *,
  categories (name),
  wallets (id, name, type, icon)
`

function genId() { return crypto.randomUUID() }

// Helper: filter by month
function monthRange(month) {
  if (!month) return null
  const [y, m] = month.split('-')
  return { start: `${y}-${m}-01`, end: new Date(y, parseInt(m), 0).toISOString().split('T')[0] }
}

// Helper: shape transfer items for the merged list
function shapeTransfers(trData) {
  return (trData || []).map(tr => ({
    id: `transfer_${tr.id}`,
    __type: 'transfer',
    _raw: tr,
    type: 'transfer',
    amount: tr.amount,
    date: tr.date,
    note: tr.description || `Transfer: ${tr.from_wallet?.name || '?'} → ${tr.to_wallet?.name || '?'}`,
    created_at: tr.created_at,
    from_wallet: tr.from_wallet,
    to_wallet: tr.to_wallet,
    categories: { name: 'Transfer' },
    wallets: null,
  }))
}

function mergeAndSort(txData, trItems) {
  return [...txData, ...trItems].sort((a, b) => {
    const dc = b.date.localeCompare(a.date)
    return dc !== 0 ? dc : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function useTransactions(userId) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  // Track pending items
  useEffect(() => {
    if (!userId) return
    const check = async () => {
      const cnt = await db.transactions.where({ synced: false }).count()
      setPendingCount(cnt)
    }
    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [userId])

  const fetchTransfers = useCallback(async (userId, month) => {
    let query = supabase
      .from('transfers')
      .select(`
        *,
        from_wallet:wallets!from_wallet_id(id, name, type, icon, is_savings),
        to_wallet:wallets!to_wallet_id(id, name, type, icon, is_savings)
      `)
      .eq('user_id', userId)

    if (month) {
      const r = monthRange(month)
      if (r) query = query.gte('date', r.start).lte('date', r.end)
    }

    const { data } = await query
    return data || []
  }, [])

  const fetchTransactions = useCallback(async (month) => {
    if (!userId) return
    setLoading(true)

    // Try online first
    let txQuery = supabase
      .from('transactions')
      .select(TX_SELECT)
      .eq('user_id', userId)

    if (month) {
      const r = monthRange(month)
      if (r) txQuery = txQuery.gte('date', r.start).lte('date', r.end)
    }

    const [txResult, trResult] = await Promise.allSettled([
      txQuery.order('date', { ascending: false }).order('created_at', { ascending: false }),
      fetchTransfers(userId, month),
    ])

    if (txResult.status === 'fulfilled' && txResult.value.data) {
      // Online success — use server data
      const txData = txResult.value.data
      const trData = trResult.status === 'fulfilled' ? (trResult.value || []) : []
      const trItems = shapeTransfers(trData)
      const merged = mergeAndSort(txData, trItems)
      setTransactions(merged)

      // Cache to Dexie for offline
      for (const tx of txData) {
        await db.transactions.put({ ...tx, clientId: `srv_${tx.id}`, serverId: tx.id, synced: true })
      }
    } else {
      // Offline — read from Dexie
      const cachedTx = await db.transactions.toArray()
      // Filter by month if set
      let filtered = cachedTx
      if (month) {
        const r = monthRange(month)
        if (r) filtered = cachedTx.filter(t => t.date >= r.start && t.date <= r.end)
      }
      // Shape into the expected format (cached data already has joined fields embedded)
      const txData = filtered.filter(t => !t._deleted).map(t => ({
        id: t.serverId || t.clientId,
        __type: undefined,
        type: t.type,
        amount: t.amount,
        note: t.note,
        date: t.date,
        created_at: t.created_at,
        category_id: t.category_id,
        wallet_id: t.wallet_id,
        categories: { name: t._categoryName || '—' },
        wallets: t._walletName ? { id: t.wallet_id, name: t._walletName, type: t._walletType, icon: t._walletIcon } : null,
        _pending: !t.synced,
      }))

      // Read transfers from Dexie too
      const cachedTr = await db.transfers.toArray()
      let filteredTr = cachedTr
      if (month) {
        const r = monthRange(month)
        if (r) filteredTr = cachedTr.filter(t => t.date >= r.start && t.date <= r.end)
      }
      const trItems = filteredTr.filter(t => !t._deleted).map(tr => ({
        id: `transfer_${tr.serverId || tr.clientId}`,
        __type: 'transfer',
        _raw: {
          id: tr.serverId || tr.clientId,
          amount: tr.amount,
          date: tr.date,
          description: tr.description,
          created_at: tr.created_at,
          from_wallet: tr._fromWallet ? { id: tr.from_wallet_id, name: tr._fromWallet } : null,
          to_wallet: tr._toWallet ? { id: tr.to_wallet_id, name: tr._toWallet } : null,
        },
        type: 'transfer',
        amount: tr.amount,
        date: tr.date,
        note: tr.description || `Transfer: ${tr._fromWallet || '?'} → ${tr._toWallet || '?'}`,
        created_at: tr.created_at,
        categories: { name: 'Transfer' },
        wallets: null,
        _pending: !tr.synced,
      }))

      const merged = mergeAndSort(txData, trItems)
      setTransactions(merged)
    }

    setLoading(false)
  }, [userId, fetchTransfers])

  useEffect(() => {
    if (userId) fetchTransactions()
  }, [userId, fetchTransactions])

  // =========== ADD ===========
  const addTransaction = useCallback(async (tx) => {
    if (!userId) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...tx, user_id: userId })
      .select(TX_SELECT)
      .single()

    if (!error && data) {
      // Online success
      await db.transactions.put({ ...data, clientId: `srv_${data.id}`, serverId: data.id, synced: true })
      setTransactions(prev => [data, ...prev])
      return { data, error: null }
    }

    // Offline — save locally
    if (error?.message?.includes('Failed to fetch') || !navigator.onLine) {
      const clientId = genId()
      const localTx = {
        clientId,
        serverId: null,
        userId,
        type: tx.type,
        category_id: tx.category_id,
        wallet_id: tx.wallet_id,
        amount: tx.amount,
        note: tx.note || '',
        date: tx.date,
        created_at: new Date().toISOString(),
        _categoryName: '',
        _walletName: '',
        _walletType: '',
        _walletIcon: '',
        synced: false,
        _deleted: false,
      }
      await db.transactions.put(localTx)
      setPendingCount(c => c + 1)

      // Return a fake data object so UI can show it
      const fakeData = {
        id: clientId,
        __type: undefined,
        type: tx.type,
        amount: tx.amount,
        note: tx.note || '',
        date: tx.date,
        created_at: localTx.created_at,
        category_id: tx.category_id,
        wallet_id: tx.wallet_id,
        categories: { name: 'Menunggu sinkron...' },
        wallets: null,
        _pending: true,
      }
      setTransactions(prev => [fakeData, ...prev])
      return { data: fakeData, error: null }
    }

    return { data: null, error }
  }, [userId])

  // =========== UPDATE ===========
  const updateTransaction = useCallback(async (id, updates) => {
    if (!userId) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select(TX_SELECT)
      .single()

    if (!error && data) {
      await db.transactions.put({ ...data, clientId: `srv_${data.id}`, serverId: data.id, synced: true })
      setTransactions(prev => prev.map(t => (t.id === id && !t.__type) ? data : t))
      return { data, error: null }
    }

    // Offline — update local
    if (error?.message?.includes('Failed to fetch') || !navigator.onLine) {
      const existing = await db.transactions.where('serverId').equals(Number(id)).first()
      if (existing) {
        await db.transactions.put({ ...existing, ...updates, synced: false })
        setPendingCount(c => c + 1)
      }
      // Optimistic UI update
      setTransactions(prev => prev.map(t => (t.id === id && !t.__type) ? { ...t, ...updates, _pending: true } : t))
      return { data: { id, ...updates }, error: null }
    }

    return { data: null, error }
  }, [userId])

  // =========== DELETE ===========
  const deleteTransaction = useCallback(async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (!error) {
      await db.transactions.where('serverId').equals(Number(id)).delete()
      setTransactions(prev => prev.filter(t => t.id !== id))
      return { error: null }
    }

    // Offline — mark deleted
    if (error?.message?.includes('Failed to fetch') || !navigator.onLine) {
      const existing = await db.transactions.where('serverId').equals(Number(id)).first()
      if (existing) {
        await db.transactions.put({ ...existing, _deleted: true, synced: false })
        setPendingCount(c => c + 1)
      }
      setTransactions(prev => prev.filter(t => t.id !== id))
      return { error: null }
    }

    return { error }
  }, [])

  // =========== DELETE TRANSFER ===========
  const deleteTransfer = useCallback(async (id) => {
    const { error } = await supabase
      .from('transfers')
      .delete()
      .eq('id', id)

    if (!error) {
      await db.transfers.where('serverId').equals(Number(id)).delete()
      setTransactions(prev => prev.filter(t => !(t.__type === 'transfer' && t._raw?.id === id)))
      return { error: null }
    }

    if (error?.message?.includes('Failed to fetch') || !navigator.onLine) {
      const existing = await db.transfers.where('serverId').equals(Number(id)).first()
      if (existing) {
        await db.transfers.put({ ...existing, _deleted: true, synced: false })
        setPendingCount(c => c + 1)
      }
      setTransactions(prev => prev.filter(t => !(t.__type === 'transfer' && t._raw?.id === id)))
      return { error: null }
    }

    return { error }
  }, [])

  // =========== GET SUMMARY (try online, fallback local) ===========
  const getSummary = useCallback(async (month) => {
    if (!userId) return null
    const r = monthRange(month)
    if (!r) return null

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .gte('date', r.start)
      .lte('date', r.end)

    if (!error && data) {
      const pemasukan = data.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0)
      const pengeluaran = data.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0)
      return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran }
    }

    // Offline — compute from local
    const cached = await db.transactions
      .where('date')
      .between(r.start, r.end, true, true)
      .toArray()
    const filtered = cached.filter(t => !t._deleted)
    const pemasukan = filtered.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0)
    const pengeluaran = filtered.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0)
    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran }
  }, [userId])

  // =========== GET CATEGORY BREAKDOWN ===========
  const getCategoryBreakdown = useCallback(async (month) => {
    if (!userId) return []
    const r = monthRange(month)
    if (!r) return []

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, categories!inner(name)')
      .eq('user_id', userId)
      .eq('type', 'pengeluaran')
      .gte('date', r.start)
      .lte('date', r.end)

    if (!error && data) {
      const bk = {}
      data.forEach(t => { const n = t.categories?.name || '—'; bk[n] = (bk[n] || 0) + t.amount })
      return Object.entries(bk).map(([n, t]) => ({ name: n, total: t })).sort((a, b) => b.total - a.total)
    }

    // Offline fallback
    const cached = await db.transactions
      .where('date')
      .between(r.start, r.end, true, true)
      .toArray()
    const filtered = cached.filter(t => !t._deleted && t.type === 'pengeluaran')
    const bk = {}
    filtered.forEach(t => { const n = t._categoryName || '—'; bk[n] = (bk[n] || 0) + t.amount })
    return Object.entries(bk).map(([n, t]) => ({ name: n, total: t })).sort((a, b) => b.total - a.total)
  }, [userId])

  // =========== SAVINGS ===========
  const getMonthlySavings = useCallback(async (month) => {
    if (!userId) return 0
    const r = monthRange(month)
    if (!r) return 0

    const { data: savingsWallets } = await supabase
      .from('wallets').select('id').eq('user_id', userId).eq('is_savings', true)
    if (!savingsWallets || savingsWallets.length === 0) return 0
    const ids = savingsWallets.map(w => w.id)
    const { data } = await supabase
      .from('transfers').select('amount')
      .eq('user_id', userId)
      .gte('date', r.start).lte('date', r.end)
      .in('to_wallet_id', ids)
    return data?.reduce((s, t) => s + t.amount, 0) || 0
  }, [userId])

  const getSavingsHistory = useCallback(async () => {
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
      .eq('user_id', userId)
      .gte('date', startStr).lte('date', endDate)
      .in('to_wallet_id', ids)
    const byMonth = {}
    data?.forEach(t => { const k = t.date.substring(0, 7); byMonth[k] = (byMonth[k] || 0) + t.amount })
    const months = []
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      months.push({ month: k, name: names[d.getMonth()], total: byMonth[k] || 0 })
    }
    return months
  }, [userId])

  return {
    transactions,
    loading,
    pendingCount,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransfer,
    getSummary,
    getCategoryBreakdown,
    getMonthlySavings,
    getSavingsHistory,
  }
}
