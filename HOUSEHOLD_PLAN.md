# Household Feature — Implementation Plan

> Status: DRAFT — awaiting sign-off
> Last updated: 2026-06-14
> Stack: React 19 + Vite + Supabase + Redux Toolkit + React Query + Dexie

## Decisions Locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | Multi household per user | NO — 1 user = max 1 household |
| 2 | Member limit | NO LIMIT |
| 3 | Admin role | Creator = admin. Can: kick, transfer ownership, rename, delete |
| 4 | In-app notification | Banner (no realtime, no polling — refresh OK). Push notif OK as bonus |
| 5 | Share personal transaction | Combo: toggle in form + share button in list/detail |
| 6 | Default categories | Auto-seed on household create |
| 7 | Household wallets | YES — separate wallets for household, with own balance |
| 8 | Offline support | YES — full Dexie cache for household data |

## Final Architecture

### Data Model (Supabase)

```
households
├── id (uuid PK)
├── name (text)
├── created_by (uuid FK auth.users)
├── created_at, updated_at

household_members
├── id (uuid PK)
├── household_id (FK households)
├── user_id (uuid FK auth.users)
├── role ('admin' | 'member')
├── status ('pending' | 'accepted')
├── invited_by, invited_at, accepted_at

household_categories
├── id, household_id, name, type, created_at

household_wallets
├── id, household_id, name, type, icon, initial_balance, is_savings, created_at

household_transactions
├── id, household_id, household_wallet_id, type, category_id, amount,
│   note, date, source_transfer_id (nullable FK transfers), created_by, created_at

transactions (MODIFY)
└── + shared_to_household_id (nullable FK households.id)

wallets (MODIFY)
└── + household_id (nullable FK households.id) — either user_id OR household_id set
```

### RLS Policies (sketch)

- `households`: read = accepted members; write = admin
- `household_members`: read = invitee + inviter + accepted members; write = admin (manage) | self (accept/reject/leave)
- `household_categories`, `household_wallets`, `household_transactions`: read/write = accepted members

## User Stories

### US-1: Foundation & Create Household
- BE: SQL migration households + RLS, modify transactions add shared_to_household_id
- BE: API contracts (POST/PATCH/GET household)
- BE: 3 endpoints (create, rename, get my)
- FE: CreateHouseholdModal
- FE: Wire to SettingsPage

### US-2: Invite & Manage Members
- BE: SQL migration household_members + RLS
- BE: 7 API contracts (invite, accept, reject, list, kick, transfer-ownership, list-pending)
- BE: 7 endpoints
- FE: InviteMemberModal, MemberList, PendingInviteBanner, AcceptInviteModal
- FE: Wire to HouseholdSettingsPage

### US-3: Household Categories
- BE: SQL migration household_categories + RLS + seed default on create
- BE: 3 API contracts (GET/POST/DELETE)
- BE: 3 endpoints
- FE: HouseholdCategoriesTab

### US-4: Household Wallets
- BE: SQL migration household_wallets + RLS
- BE: 4 API contracts (GET/POST/PATCH/DELETE)
- BE: 4 endpoints
- FE: HouseholdWalletsPage, AddHouseholdWalletModal, HouseholdWalletBalanceCard

### US-5: Household Transactions
- BE: SQL migration household_transactions + RLS
- BE: 5 API contracts (GET list, POST, PATCH, DELETE, GET summary)
- BE: 5 endpoints
- FE: HouseholdTransactionsPage, HouseholdTransactionForm
- FE: Filter by member

### US-6: Household Dashboard & Saldo
- FE: HouseholdPage, HouseholdBalanceCard, HouseholdRecentTransactions, HouseholdMonthlySummary
- FE: HouseholdPicker in Layout (switch context)

### US-7: Auto-record Household Income from Personal Transfer
- BE: SQL migration: add household_id to wallets
- BE: Extend GET /wallets to include household_id
- FE: Modify useTransfers — auto-create household_transactions on transfer to household wallet
- FE: Modify WalletsPage — toggle "household wallet" on create

### US-8: Share Personal Transaction to Household
- BE: PATCH /transactions/:id extend with shared_to_household_id
- BE: GET /households/:id/shared-transactions
- BE: Modify GET /households/:id/transactions to include shared
- FE: TransactionForm — toggle "Share to household"
- FE: TransactionItem — share icon + unshare button
- FE: Display shared transactions in household context with badge

## Phased Delivery

| Phase | User Stories | Outcome |
|-------|--------------|---------|
| 1 | US-1, US-2 | Household lifecycle works (create, invite, manage) |
| 2 | US-3, US-4 | Resources (categories, wallets) can be set up |
| 3 | US-5, US-6 | Full household finance tracking works |
| 4 | US-7, US-8 | Cross-context integrations (auto income, sharing) |

## Open Questions

None — all decisions locked.

## Sign-off Required

Wait for user confirmation before any implementation.
