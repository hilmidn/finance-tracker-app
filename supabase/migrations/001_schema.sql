-- Finance App Schema
-- Jalankan SQL ini di Supabase SQL Editor setelah create project

-- 1. Categories
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Transactions
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  note TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Auto-create default categories on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (name, type, user_id) VALUES
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
    ('Lainnya', 'pengeluaran', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
