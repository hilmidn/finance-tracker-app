import { supabase } from '../lib/supabase'
import db from '../db/local'

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
  const pending = await db.transactions.where('synced').equals(false).toArray()
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
    const { clientId, synced, _deleted, serverId, ...data } = tx
    const { data: result, error } = await supabase
      .from('transactions')
      .insert({ ...data, user_id: tx.userId })
      .select('*')
      .single()
    if (!error && result) {
      await db.transactions.put({ ...tx, serverId: result.id, synced: true })
    }
  }

  for (const tx of toUpdate) {
    const { clientId, synced, _deleted, serverId, ...data } = tx
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
  const pending = await db.transfers.where('synced').equals(false).toArray()
  const toDelete = pending.filter(t => t._deleted)
  const toInsert = pending.filter(t => !t._deleted && !t.serverId)

  for (const tr of toDelete) {
    if (tr.serverId) {
      await supabase.from('transfers').delete().eq('id', tr.serverId)
    }
    await db.transfers.delete(tr.clientId)
  }

  for (const tr of toInsert) {
    const { clientId, synced, _deleted, serverId, ...data } = tr
    const { data: result, error } = await supabase
      .from('transfers')
      .insert({ ...data, user_id: tr.userId })
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
  notify()
  try {
    await Promise.all([syncTransactions(), syncTransfers()])
  } catch (e) {
    console.warn('Sync failed, will retry:', e.message)
  }
  syncing = false
  notify()
}

function handleOnline() {
  isOnline = true
  notify()
  doSync()
  clearInterval(timer)
  timer = setInterval(doSync, SYNC_INTERVAL)
}

function handleOffline() {
  isOnline = false
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
