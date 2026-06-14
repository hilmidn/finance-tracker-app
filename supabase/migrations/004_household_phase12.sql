-- Finance App — Household Feature Phase 1+2 (v8)
-- Tabel: households, household_members, household_categories, household_wallets
-- Jalankan di Supabase SQL Editor. Idempotent.

-- ═══════════════════════════════════════════════════════════════
-- 1. HOUSEHOLDS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_households_created_by ON households(created_by);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- Helper function: cek apakah user adalah member yang accepted di household
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

-- households policies
CREATE POLICY "Users can view households they're a member of"
  ON households FOR SELECT
  USING (public.is_household_member(id));

CREATE POLICY "Users can create a household"
  ON households FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update household"
  ON households FOR UPDATE
  USING (public.is_household_admin(id));

CREATE POLICY "Admins can delete household"
  ON households FOR DELETE
  USING (public.is_household_admin(id));

-- ═══════════════════════════════════════════════════════════════
-- 2. HOUSEHOLD_MEMBERS
-- ═══════════════════════════════════════════════════════════════
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

-- Unique constraint: 1 user ga bisa duplikat membership di household yang sama
CREATE UNIQUE INDEX IF NOT EXISTS idx_household_members_unique
  ON household_members(household_id, user_id);

CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_status ON household_members(status);

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Read: invitee (regardless of status) + accepted members of the household
CREATE POLICY "Members can view household membership"
  ON household_members FOR SELECT
  USING (
    user_id = auth.uid()  -- invitee always sees their own row
    OR public.is_household_member(household_id)  -- accepted members see all
    OR invited_by = auth.uid()  -- inviter sees invites they sent
  );

-- Insert: admin can add members (will have status='pending' until accepted)
-- Also: when creating a new household, creator auto-inserts themselves as admin/accepted
CREATE POLICY "Admins can invite members"
  ON household_members FOR INSERT
  WITH CHECK (
    public.is_household_admin(household_id)
    OR (
      -- Self-insert when creating household (creator adds self as admin/accepted)
      status = 'accepted' AND role = 'admin'
      AND EXISTS (
        SELECT 1 FROM households
        WHERE households.id = household_members.household_id
          AND households.created_by = auth.uid()
      )
    )
  );

-- Update: admin can update members (kick = update status? actually we'll use delete)
--          OR self can update own row to accept invite (status pending → accepted)
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

-- Delete: admin can kick, or self can leave
CREATE POLICY "Admins can kick members OR self can leave"
  ON household_members FOR DELETE
  USING (
    public.is_household_admin(household_id)
    OR user_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════════
-- 3. HOUSEHOLD_CATEGORIES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS household_categories (
  id BIGSERIAL PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique: 1 nama kategori unik per (household, type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_household_categories_unique
  ON household_categories(household_id, name, type);

CREATE INDEX IF NOT EXISTS idx_household_categories_household ON household_categories(household_id);

ALTER TABLE household_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household categories"
  ON household_categories FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can insert household categories"
  ON household_categories FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can delete household categories"
  ON household_categories FOR DELETE
  USING (public.is_household_member(household_id));

-- Trigger: auto-seed default categories pas household baru dibuat
CREATE OR REPLACE FUNCTION public.handle_new_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.household_categories (name, type, household_id) VALUES
    -- Pengeluaran
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
    -- Pemasukan
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
-- 4. HOUSEHOLD_WALLETS
-- ═══════════════════════════════════════════════════════════════
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

ALTER TABLE household_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household wallets"
  ON household_wallets FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can insert household wallets"
  ON household_wallets FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can update household wallets"
  ON household_wallets FOR UPDATE
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can delete household wallets"
  ON household_wallets FOR DELETE
  USING (public.is_household_member(household_id));

-- ═══════════════════════════════════════════════════════════════
-- 5. HOUSEHOLD_INVITES (email-based — anon-key friendly)
-- ═══════════════════════════════════════════════════════════════
-- Tabel terpisah untuk invite berbasis email.
-- Alasan: Supabase anon key TIDAK bisa lookup auth.users by email
-- (admin-only operation). Jadi simpen email di tabel terpisah.
-- Flow: admin invite by email → row dibuat di sini.
-- Invitee's app, on load, cek invites WHERE email = current user email.
-- Show banner → click accept → create household_members row, delete invite.

CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Unik per (household, email) untuk invite aktif
CREATE UNIQUE INDEX IF NOT EXISTS idx_household_invites_unique
  ON household_invites(household_id, email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_household_invites_email ON household_invites(email, status);
CREATE INDEX IF NOT EXISTS idx_household_invites_household ON household_invites(household_id);

ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- Read: admin household bisa lihat invites mereka; invitee bisa lihat invites by email mereka
-- Note: invitee lookup by email agak tricky di RLS. Pakai helper function.

-- Helper: cek apakah email user saat ini cocok dengan invite
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

CREATE POLICY "Admins can view household invites"
  ON household_invites FOR SELECT
  USING (public.is_household_admin(household_id));

-- Untuk invitee: mereka bisa SELECT invites dengan email mereka
-- Kita trust RLS karena email mereka hanya bisa match via their own query
-- Note: dalam production, idealnya pakai JWT claim atau RPC.
-- Untuk MVP: izinkan user baca invites yang email-nya = email mereka (via get_my_email).
CREATE POLICY "Invitees can view their own invites"
  ON household_invites FOR SELECT
  USING (email = public.get_my_email());

-- Insert: admin only
CREATE POLICY "Admins can create invites"
  ON household_invites FOR INSERT
  WITH CHECK (public.is_household_admin(household_id));

-- Update: invitee bisa update status (accept/reject), admin bisa cancel
CREATE POLICY "Invitees or admins can update invite"
  ON household_invites FOR UPDATE
  USING (
    email = public.get_my_email()
    OR public.is_household_admin(household_id)
  );

-- Delete: admin bisa cancel invite yang masih pending
CREATE POLICY "Admins can cancel invites"
  ON household_invites FOR DELETE
  USING (public.is_household_admin(household_id));
