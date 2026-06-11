-- Finance App Schema (v5)
-- Jalankan ulang SQL ini. Aman di-run ulang (idempotent).

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hapus duplikat: keep only the first entry for each (user_id, name, type)
DELETE FROM categories a USING (
  SELECT MIN(id) as id, user_id, name, type
  FROM categories
  GROUP BY user_id, name, type
  HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id
  AND a.name = b.name
  AND a.type = b.type
  AND a.id <> b.id;

-- Cegah duplikat kategori dengan nama yang sama per user
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_name_type_key;
ALTER TABLE categories ADD CONSTRAINT categories_user_id_name_type_key
  UNIQUE (user_id, name, type);

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
CREATE TABLE IF NOT EXISTS transactions (
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

-- 3. Trigger auto-seed kategori pas user baru dibuat
-- search_path wajib diset biar trigger bisa akses public.categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. RPC fallback (buat seed manual kalo perlu)
CREATE OR REPLACE FUNCTION seed_default_categories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO categories (name, type, user_id) VALUES
    ('Gaji', 'pemasukan', p_user_id),
    ('Freelance', 'pemasukan', p_user_id),
    ('Investasi', 'pemasukan', p_user_id),
    ('Lainnya', 'pemasukan', p_user_id),
    ('Makan', 'pengeluaran', p_user_id),
    ('Transport', 'pengeluaran', p_user_id),
    ('Tagihan', 'pengeluaran', p_user_id),
    ('Hiburan', 'pengeluaran', p_user_id),
    ('Belanja', 'pengeluaran', p_user_id),
    ('Kesehatan', 'pengeluaran', p_user_id),
    ('Pendidikan', 'pengeluaran', p_user_id),
    ('Lainnya', 'pengeluaran', p_user_id)
  ON CONFLICT (user_id, name, type) DO NOTHING;
END;
$$;
