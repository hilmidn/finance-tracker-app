-- Finance App — Household Feature Phase 3+4 (v9)
-- Tabel: household_transactions, transfers.to_household_wallet_id,
--         transactions.shared_to_household_id + household_category_id
-- Jalankan di Supabase SQL Editor. Idempotent.

-- ═══════════════════════════════════════════════════════════════
-- 1. HOUSEHOLD_TRANSACTIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS household_transactions (
  id BIGSERIAL PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  household_wallet_id BIGINT REFERENCES household_wallets(id) ON DELETE SET NULL,
  household_category_id BIGINT REFERENCES household_categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  note TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Kalau dibuat otomatis dari transfer personal → household, link ke transfer asal
  source_transfer_id BIGINT REFERENCES transfers(id) ON DELETE SET NULL,
  -- User yang buat transaksi (admin atau member)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent: add columns that may be missing if this migration was
-- updated after the table was already created.
ALTER TABLE household_transactions
  ADD COLUMN IF NOT EXISTS source_transfer_id BIGINT REFERENCES transfers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_household_tx_household ON household_transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_household_tx_wallet ON household_transactions(household_wallet_id);
CREATE INDEX IF NOT EXISTS idx_household_tx_category ON household_transactions(household_category_id);
CREATE INDEX IF NOT EXISTS idx_household_tx_date ON household_transactions(household_id, date);
CREATE INDEX IF NOT EXISTS idx_household_tx_source_transfer ON household_transactions(source_transfer_id);

ALTER TABLE household_transactions ENABLE ROW LEVEL SECURITY;

-- Read: household members bisa lihat semua transaksi household mereka
DROP POLICY IF EXISTS "Members can view household transactions" ON household_transactions;
CREATE POLICY "Members can view household transactions"
  ON household_transactions FOR SELECT
  USING (public.is_household_member(household_id));

-- Insert: members can create tx in their household
DROP POLICY IF EXISTS "Members can insert household transactions" ON household_transactions;
CREATE POLICY "Members can insert household transactions"
  ON household_transactions FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

-- Update: members can update (untuk edit/delete)
DROP POLICY IF EXISTS "Members can update household transactions" ON household_transactions;
CREATE POLICY "Members can update household transactions"
  ON household_transactions FOR UPDATE
  USING (public.is_household_member(household_id));

-- Delete: members can delete
DROP POLICY IF EXISTS "Members can delete household transactions" ON household_transactions;
CREATE POLICY "Members can delete household transactions"
  ON household_transactions FOR DELETE
  USING (public.is_household_member(household_id));

-- ═══════════════════════════════════════════════════════════════
-- 2. TRANSFER → HOUSEHOLD WALLET (US-7)
-- ═══════════════════════════════════════════════════════════════
-- Tambah kolom to_household_wallet_id ke transfers
-- Kalau di-set, berarti transfer ini hasilnya masuk ke dompet household
-- (otomatis create household_transactions type=pemasukan)
ALTER TABLE transfers
  ADD COLUMN IF NOT EXISTS to_household_wallet_id BIGINT REFERENCES household_wallets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_to_household_wallet ON transfers(to_household_wallet_id);

-- Update RLS: hanya block transfer yang sama wallet, kalau to_household_wallet_id di-set
-- to_wallet_id boleh NULL (transfer ke household)
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS different_wallets;
ALTER TABLE transfers ADD CONSTRAINT different_wallets
  CHECK (
    (to_wallet_id IS NOT NULL AND from_wallet_id <> to_wallet_id)
    OR (to_household_wallet_id IS NOT NULL)
  );

-- to_wallet_id jadi opsional (bisa NULL kalau transfer ke household)
ALTER TABLE transfers ALTER COLUMN to_wallet_id DROP NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 3. SHARE PERSONAL TRANSACTION TO HOUSEHOLD (US-8)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS shared_to_household_id UUID REFERENCES households(id) ON DELETE SET NULL;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS household_category_id BIGINT REFERENCES household_categories(id) ON DELETE SET NULL;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS household_wallet_id BIGINT REFERENCES household_wallets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_shared_household
  ON transactions(shared_to_household_id)
  WHERE shared_to_household_id IS NOT NULL;

-- Update RLS: tambah policy supaya household members bisa lihat
-- shared personal transactions di household mereka
DROP POLICY IF EXISTS "Household members can view shared transactions" ON transactions;
CREATE POLICY "Household members can view shared transactions"
  ON transactions FOR SELECT
  USING (
    shared_to_household_id IS NOT NULL
    AND public.is_household_member(shared_to_household_id)
  );

-- Update insert policy: kalau share, user harus member
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      shared_to_household_id IS NULL
      OR public.is_household_member(shared_to_household_id)
    )
  );

-- Update update policy: sama, hanya own + valid share
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      shared_to_household_id IS NULL
      OR public.is_household_member(shared_to_household_id)
    )
  );
