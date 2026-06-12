import Dexie from 'dexie'

const db = new Dexie('FinanceApp')

db.version(1).stores({
  transactions: 'clientId, serverId, userId, type, date, synced',
  transfers: 'clientId, serverId, userId, date, synced',
})

db.version(2).stores({
  transactions: 'clientId, serverId, userId, type, date, synced',
  transfers: 'clientId, serverId, userId, date, synced',
  wallets: 'id, userId, name, type, is_savings',
  categories: 'id, userId, name, type',
})

export default db
