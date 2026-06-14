-- Finance App — Household Feature Phase 5 (v9)
-- Replace per-transaction share model with per-user share toggle.
-- Tabel changes:
--   - household_members: + share_personal_to_household (BOOLEAN)
--   - transactions: DROP shared_to_household_id, household_category_id, household_wallet_id
-- RPC: set_my_share_personal_to_household(BOOLEAN) — self-only toggle.
-- Jalankan di Supabase SQL Editor. Idempotent.

-- ═══════════════════════════════════════════════════════════════
-- 1. Per-user share preference
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE household_members
  ADD COLUMN IF NOT EXISTS share_personal_to_household BOOLEAN NOT NULL DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════
-- 2. Drop per-tx share model (replaced by per-user toggle)
-- ═══════════════════════════════════════════════════════════════
-- Drop policies referencing the columns first (required before DROP COLUMN)
DROP POLICY IF EXISTS "Household members can view shared transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;

DROP INDEX IF EXISTS idx_transactions_shared_household;

ALTER TABLE transactions DROP COLUMN IF EXISTS shared_to_household_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS household_category_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS household_wallet_id;

-- Recreate simplified INSERT/UPDATE policies (no more shared_to_household_id check)
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. New RLS: shared personal tx visible to household members
-- ═══════════════════════════════════════════════════════════════
-- Owner can still see own tx (existing "Users can view own transactions"
-- policy covers that). New policy widens the read window for household
-- members whose `share_personal_to_household = TRUE`.
DROP POLICY IF EXISTS "Household members can view shared personal transactions" ON transactions;
CREATE POLICY "Household members can view shared personal transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members sharer
      JOIN household_members viewer
        ON viewer.household_id = sharer.household_id
      WHERE sharer.user_id = transactions.user_id
        AND sharer.status = 'accepted'
        AND sharer.share_personal_to_household = TRUE
        AND viewer.user_id = auth.uid()
        AND viewer.status = 'accepted'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. RPC: self-only share preference toggle
-- ═══════════════════════════════════════════════════════════════
-- SECURITY DEFINER + body-level `WHERE user_id = auth.uid()` so the
-- user can only flip their own preference, even if RLS ever loosens.
CREATE OR REPLACE FUNCTION public.set_my_share_personal_to_household(p_value BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE household_members
  SET share_personal_to_household = p_value
  WHERE user_id = v_user_id
    AND status = 'accepted';
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_my_share_personal_to_household(BOOLEAN) TO authenticated;

-- After running this migration, run in Supabase SQL Editor:
--   NOTIFY pgrst, 'reload schema';
