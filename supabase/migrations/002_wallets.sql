-- Finance App — Wallets & Transfers (v6)
-- Jalankan di Supabase SQL Editor

-- 1. Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'e-wallet')),
  icon TEXT DEFAULT '',
  initial_balance BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallets"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
  ON wallets FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_wallet_id BIGINT REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  to_wallet_id BIGINT REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  description TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_wallets CHECK (from_wallet_id <> to_wallet_id)
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transfers"
  ON transfers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transfers"
  ON transfers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transfers"
  ON transfers FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Add wallet_id to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS wallet_id BIGINT REFERENCES wallets(id) ON DELETE SET NULL;

-- 4. Update trigger — seed default wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seed categories
  INSERT INTO public.categories (name, type, user_id) VALUES
    ('Gaji', 'pemasukan', NEW.id),
    ('Freelance', 'pemasukan', NEW.id),
    ('Investasi', 'pemasukan', NEW.id),
    ('Lainnya', 'pemasukan', NEW.id),
    ('Makan', 'pengeluaran', NEW.id),
    ('Transport', 'pengeluaran', NEW.id),
    ('Tagihan', 'pengeluaran', NEW.id),
    ('Hiburan', 'pengeluaran', NEW.id),
    ('Belanja', 'pengeluaran', NEW.id),
    ('Kesehatan', 'pengeluaran', NEW.id),
    ('Pendidikan', 'pengeluaran', NEW.id),
    ('Lainnya', 'pengeluaran', NEW.id)
  ON CONFLICT (user_id, name, type) DO NOTHING;

  -- Seed default wallet
  INSERT INTO public.wallets (name, type, icon, initial_balance, user_id) VALUES
    ('Dompet Utama', 'cash', '👛', 0, NEW.id);

  RETURN NEW;
END;
$$;
