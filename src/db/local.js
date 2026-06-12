import Dexie from 'dexie'

const db = new Dexie('FinanceApp')

db.version(1).stores({
  transactions: 'clientId, serverId, userId, type, date, synced',
  transfers: 'clientId, serverId, userId, date, synced',
})

export default db
