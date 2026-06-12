import { supabase } from '../lib/supabase'
import db from '../db/local'
import { store } from '../store'
import { setOnline, setSyncing, setPendingCount } from '../store/uiSlice'

const SYNC_INTERVAL = 30000 // retry every 30s

let listeners = []
let isOnline = navigator.onLine
let syncing = false
let timer = null

function notify() {
  listeners.forEach(fn => fn({ isOnline, syncing }))
}

export function onNetworkChange(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(f => f !== fn) }
}

async function syncTransactions() {
  const all = await db.transactions.toArray()
  const pending = all.filter(t => t.synced === false)
  const toDelete = pending.filter(t => t._deleted)
  const toInsert = pending.filter(t => !t._deleted && !t.serverId)
  const toUpdate = pending.filter(t => !t._deleted && t.serverId)

  for (const tx of toDelete) {
    if (tx.serverId) {
      await supabase.from('transactions').delete().eq('id', tx.serverId)
    }
    await db.transactions.delete(tx.clientId)
  }

  for (const tx of toInsert) {
    // Strip local-only fields (underscore-prefixed) + Dexie internals
    const { clientId, synced, _deleted, serverId, userId, _categoryName, _walletName, _walletType, _walletIcon, ...data } = tx
    const { data: result, error } = await supabase
      .from('transactions')
      .insert({ ...data, user_id: userId })
      .select('*')
      .single()
    if (!error && result) {
      await db.transactions.put({ ...tx, serverId: result.id, synced: true })
    }
  }

  for (const tx of toUpdate) {
    const { clientId, synced, _deleted, serverId, userId, _categoryName, _walletName, _walletType, _walletIcon, ...data } = tx
    const { error } = await supabase
      .from('transactions')
      .update(data)
      .eq('id', serverId)
    if (!error) {
      await db.transactions.put({ ...tx, synced: true })
    }
  }
}

async function syncTransfers() {
  const all = await db.transfers.toArray()
  const pending = all.filter(t => t.synced === false)
  const toDelete = pending.filter(t => t._deleted)
  const toInsert = pending.filter(t => !t._deleted && !t.serverId)

  for (const tr of toDelete) {
    if (tr.serverId) {
      await supabase.from('transfers').delete().eq('id', tr.serverId)
    }
    await db.transfers.delete(tr.clientId)
  }

  for (const tr of toInsert) {
    const { clientId, synced, _deleted, serverId, userId, ...data } = tr
    const { data: result, error } = await supabase
      .from('transfers')
      .insert({ ...data, user_id: userId })
      .select('*')
      .single()
    if (!error && result) {
      await db.transfers.put({ ...tr, serverId: result.id, synced: true })
    }
  }
}

async function doSync() {
  if (syncing || !isOnline) return
  syncing = true
  store.dispatch(setSyncing(true))
  notify()
  try {
    await Promise.all([syncTransactions(), syncTransfers()])
    // Update pending count after sync
    const all = await db.transactions.toArray()
    const allTr = await db.transfers.toArray()
    const cnt = all.filter(t => t.synced === false).length + allTr.filter(t => t.synced === false).length
    store.dispatch(setPendingCount(cnt))
  } catch (e) {
    console.warn('Sync failed, will retry:', e.message)
  }
  syncing = false
  store.dispatch(setSyncing(false))
  notify()
}

function handleOnline() {
  isOnline = true
  store.dispatch(setOnline(true))
  notify()
  doSync()
  clearInterval(timer)
  timer = setInterval(doSync, SYNC_INTERVAL)
}

function handleOffline() {
  isOnline = false
  store.dispatch(setOnline(false))
  notify()
  clearInterval(timer)
}

export function startSync() {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  if (isOnline) {
    timer = setInterval(doSync, SYNC_INTERVAL)
    doSync()
  }
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    clearInterval(timer)
  }
}
