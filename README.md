# Noura

Smart finance for everyday life — mobile-first, dibangun dengan Vite + React + Supabase.

## Fitur

- 📊 Dashboard ringkasan bulanan (pemasukan, pengeluaran, saldo)
- 💳 Tambah transaksi dengan kategori
- 📋 Daftar transaksi filter per bulan
- 📈 Analisis pengeluaran per kategori + tips
- ⚙️ Kelola kategori
- 🔐 Auth via Supabase

## Setup

1. Buat project di [Supabase](https://supabase.com)
2. Jalankan SQL di `supabase/migrations/001_schema.sql`
3. Copy `.env.example` ke `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
4. `npm install`
5. `npm run dev` — local development
6. `npm run build` — production build
