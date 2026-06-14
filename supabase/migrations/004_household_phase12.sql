-- Finance App — Household Feature Phase 1+2 (v9)
-- Tabel: households, household_members, household_invites, household_categories, household_wallets
-- Jalankan di Supabase SQL Editor. Idempotent.
--
-- IMPORTANT: Urutan eksekusi:
-- 1) CREATE TABLE semua tabel tanpa RLS/policies
-- 2) CREATE FUNCTION helper (depends on tables)
-- 3) ENABLE RLS + CREATE POLICY (depends on functions)
-- 4) CREATE TRIGGER
-- Supabase 12+ kadang error 42P01 kalo function reference tabel yang belum ada.

-- ═══════════════════════════════════════════════════════════════
-- 1. TABLES (no RLS, no policies — yet)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_households_created_by ON households(created_by);

CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_members_unique
  ON household_members(household_id, user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_status ON household_members(status);

CREATE TABLE IF NOT EXISTS household_categories (
  id BIGSERIAL PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_categories_unique
  ON household_categories(household_id, name, type);
CREATE INDEX IF NOT EXISTS idx_household_categories_household ON household_categories(household_id);

CREATE TABLE IF NOT EXISTS household_wallets (
  id BIGSERIAL PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'e-wallet')),
  icon TEXT DEFAULT '',
  initial_balance BIGINT DEFAULT 0,
  is_savings BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_household_wallets_household ON household_wallets(household_id);

CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_invites_unique
  ON household_invites(household_id, email)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_household_invites_email ON household_invites(email, status);
CREATE INDEX IF NOT EXISTS idx_household_invites_household ON household_invites(household_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. HELPER FUNCTIONS (depends on tables above)
-- ═══════════════════════════════════════════════════════════════

-- Helper: cek apakah user adalah member yang accepted di household
CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
$$;

-- Helper: cek apakah user admin di household
CREATE OR REPLACE FUNCTION public.is_household_admin(p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'accepted'
  );
$$;

-- Helper: ambil email user saat ini (untuk invite lookup)
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. ENABLE RLS + POLICIES
-- ═══════════════════════════════════════════════════════════════

-- households
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view households they're a member of" ON households;
CREATE POLICY "Users can view households they're a member of"
  ON households FOR SELECT
  USING (public.is_household_member(id));

DROP POLICY IF EXISTS "Users can create a household" ON households;
CREATE POLICY "Users can create a household"
  ON households FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can update household" ON households;
CREATE POLICY "Admins can update household"
  ON households FOR UPDATE
  USING (public.is_household_admin(id));

DROP POLICY IF EXISTS "Admins can delete household" ON households;
CREATE POLICY "Admins can delete household"
  ON households FOR DELETE
  USING (public.is_household_admin(id));

-- household_members
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view household membership" ON household_members;
CREATE POLICY "Members can view household membership"
  ON household_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_household_member(household_id)
    OR invited_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can invite members" ON household_members;
CREATE POLICY "Admins can invite members"
  ON household_members FOR INSERT
  WITH CHECK (
    public.is_household_admin(household_id)
    OR (
      status = 'accepted' AND role = 'admin'
      AND EXISTS (
        SELECT 1 FROM households
        WHERE households.id = household_members.household_id
          AND households.created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can update members OR self can accept invite" ON household_members;
CREATE POLICY "Admins can update members OR self can accept invite"
  ON household_members FOR UPDATE
  USING (
    public.is_household_admin(household_id)
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.is_household_admin(household_id)
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can kick members OR self can leave" ON household_members;
CREATE POLICY "Admins can kick members OR self can leave"
  ON household_members FOR DELETE
  USING (
    public.is_household_admin(household_id)
    OR user_id = auth.uid()
  );

-- household_categories
ALTER TABLE household_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view household categories" ON household_categories;
CREATE POLICY "Members can view household categories"
  ON household_categories FOR SELECT
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Members can insert household categories" ON household_categories;
CREATE POLICY "Members can insert household categories"
  ON household_categories FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Members can delete household categories" ON household_categories;
CREATE POLICY "Members can delete household categories"
  ON household_categories FOR DELETE
  USING (public.is_household_member(household_id));

-- household_wallets
ALTER TABLE household_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view household wallets" ON household_wallets;
CREATE POLICY "Members can view household wallets"
  ON household_wallets FOR SELECT
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Members can insert household wallets" ON household_wallets;
CREATE POLICY "Members can insert household wallets"
  ON household_wallets FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Members can update household wallets" ON household_wallets;
CREATE POLICY "Members can update household wallets"
  ON household_wallets FOR UPDATE
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Members can delete household wallets" ON household_wallets;
CREATE POLICY "Members can delete household wallets"
  ON household_wallets FOR DELETE
  USING (public.is_household_member(household_id));

-- household_invites
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view household invites" ON household_invites;
CREATE POLICY "Admins can view household invites"
  ON household_invites FOR SELECT
  USING (public.is_household_admin(household_id));

DROP POLICY IF EXISTS "Invitees can view their own invites" ON household_invites;
CREATE POLICY "Invitees can view their own invites"
  ON household_invites FOR SELECT
  USING (email = public.get_my_email());

DROP POLICY IF EXISTS "Admins can create invites" ON household_invites;
CREATE POLICY "Admins can create invites"
  ON household_invites FOR INSERT
  WITH CHECK (public.is_household_admin(household_id));

DROP POLICY IF EXISTS "Invitees or admins can update invite" ON household_invites;
CREATE POLICY "Invitees or admins can update invite"
  ON household_invites FOR UPDATE
  USING (
    email = public.get_my_email()
    OR public.is_household_admin(household_id)
  );

DROP POLICY IF EXISTS "Admins can cancel invites" ON household_invites;
CREATE POLICY "Admins can cancel invites"
  ON household_invites FOR DELETE
  USING (public.is_household_admin(household_id));

-- ═══════════════════════════════════════════════════════════════
-- 4. TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-seed default categories pas household baru dibuat
CREATE OR REPLACE FUNCTION public.handle_new_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.household_categories (name, type, household_id) VALUES
    ('Belanja Bulanan', 'pengeluaran', NEW.id),
    ('Listrik', 'pengeluaran', NEW.id),
    ('Air', 'pengeluaran', NEW.id),
    ('Internet', 'pengeluaran', NEW.id),
    ('Gas', 'pengeluaran', NEW.id),
    ('Transportasi', 'pengeluaran', NEW.id),
    ('Makan di Luar', 'pengeluaran', NEW.id),
    ('Hiburan', 'pengeluaran', NEW.id),
    ('Kebutuhan Anak', 'pengeluaran', NEW.id),
    ('Lain-lain', 'pengeluaran', NEW.id),
    ('Gaji', 'pemasukan', NEW.id),
    ('Bonus', 'pemasukan', NEW.id),
    ('Transfer dari Pribadi', 'pemasukan', NEW.id),
    ('Lain-lain', 'pemasukan', NEW.id)
  ON CONFLICT (household_id, name, type) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_household_created ON households;
CREATE TRIGGER on_household_created
  AFTER INSERT ON households
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_household();

-- ═══════════════════════════════════════════════════════════════
-- 5. RPC: create_household (bypass RLS, atomik insert household + creator)
-- ═══════════════════════════════════════════════════════════════
-- Pakai SECURITY DEFINER biar insert ga ke-block RLS. Penting karena
-- di project Supabase tertentu (free tier / self-hosted), auth.uid()
-- di request bisa return null walaupun user udah login — kasus lu.
-- Function ini validate auth.uid() di SQL langsung, terus insert
-- pake privileges postgres role.

CREATE OR REPLACE FUNCTION public.create_household(p_name TEXT)
RETURNS TABLE(id UUID, name TEXT, created_by UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_household_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated — auth.uid() is null. Check your session token.';
  END IF;

  INSERT INTO public.households (name, created_by)
  VALUES (trim(p_name), v_user_id)
  RETURNING households.id, households.name, households.created_by, households.created_at
  INTO id, name, created_by, created_at;

  v_household_id := id;

  INSERT INTO public.household_members (household_id, user_id, role, status, accepted_at)
  VALUES (v_household_id, v_user_id, 'admin', 'accepted', NOW());

  RETURN NEXT;
END;
$$;

-- Grant execute ke authenticated users
GRANT EXECUTE ON FUNCTION public.create_household(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household(TEXT) TO anon;
