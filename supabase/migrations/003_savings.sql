-- Finance App — Savings Wallets (v7)
-- Jalankan di Supabase SQL Editor

-- 1. Add is_savings column to wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_savings BOOLEAN DEFAULT FALSE;

-- 2. Update trigger — Dompet Utama tetap sebagai non-savings (default FALSE)
-- Tidak perlu perubahan, default sudah FALSE
