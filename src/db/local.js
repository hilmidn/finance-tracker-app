import Dexie from 'dexie'

const db = new Dexie('Noura')

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

// v4: Household transactions + transfers + per-tx share index
db.version(4).stores({
  transactions: 'clientId, serverId, userId, type, date, synced, shared_to_household_id',
  transfers: 'clientId, serverId, userId, date, synced, to_household_wallet_id',
  wallets: 'id, userId, name, type, is_savings',
  categories: 'id, userId, name, type',
  // Household tables — primarily cache, mutations are server-first
  households: 'id, createdBy, name',
  householdMembers: 'id, householdId, userId, status, role, [householdId+userId]',
  householdCategories: 'id, householdId, name, type, [householdId+name+type]',
  householdWallets: 'id, householdId, name, type, is_savings',
  householdTransactions: 'clientId, serverId, householdId, householdWalletId, householdCategoryId, type, date, source_transfer_id, synced',
})

// v5: Drop per-tx share index (replaced by per-user share toggle).
// `shared_to_household_id` is no longer a server column, so any offline
// cached value would be stale noise. The index is dropped here; new
// rows won't have the field and RLS handles visibility.
db.version(5).stores({
  transactions: 'clientId, serverId, userId, type, date, synced',
})

export default db
