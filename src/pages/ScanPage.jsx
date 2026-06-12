import { useState, useRef, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { createWorker } from 'tesseract.js'
import { Camera, Upload, X, AlertCircle, Check, ArrowLeft, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Parse OCR text from Indonesian receipts into items + total.
 */
function parseReceipt(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const items = []
  let totalAmount = 0
  let totalLine = null
  const totalKeywords = /^(total|kembali|tunai|kartu|debit|kredit|bayar|pembayaran|grand\s*total)/i

  for (const line of lines) {
    if (/^(tanggal|waktu|kasir|no\.|nota|struk|terima\s*kasih|^=+|---|^\+)/i.test(line)) continue
    const cleaned = line.replace(/Rp\.?\s*/gi, '').trim()
    const priceMatch = cleaned.match(/([\d.]+)$/)
    if (priceMatch) {
      const rawPrice = priceMatch[1].replace(/\./g, '')
      const price = parseInt(rawPrice, 10)
      if (!isNaN(price) && price > 0) {
        const name = cleaned.replace(priceMatch[0], '').replace(/\s{2,}/g, ' ').trim()
        if (name && !/^\d+$/.test(name)) {
          if (totalKeywords.test(name)) {
            totalLine = { name, price }
          } else if (price < 100000000) {
            items.push({ name, price })
          }
        }
      }
    }
  }

  if (totalLine) {
    totalAmount = totalLine.price
  } else if (items.length > 0) {
    totalAmount = items.reduce((s, i) => s + i.price, 0)
  }

  return { items, totalAmount }
}

const WALLET_ICONS = { cash: '\uD83D\uDC5B', bank: '\uD83C\uDFE6', 'e-wallet': '\uD83D\uDCF1' }

export default function ScanPage() {
  const user = useSelector((s) => s.auth.user)
  const userId = user?.id
  const navigate = useNavigate()

  const [step, setStep] = useState('select') // select | crop | processing | result | error
  const [imageUrl, setImageUrl] = useState(null)
  const [progress, setProgress] = useState(0)
  const [ocrText, setOcrText] = useState('')
  const [result, setResult] = useState({ items: [], totalAmount: 0 })
  const [error, setError] = useState('')

  // Save form
  const [categories, setCategories] = useState([])
  const [wallets, setWallets] = useState([])
  const [type, setType] = useState('pengeluaran')
  const [categoryId, setCategoryId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Crop state
  const imageContainerRef = useRef(null)
  const imageRef = useRef(null)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const fileInputRef = useRef(null)

  // Load categories + wallets
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data: cats } = await supabase.from('categories').select('*').eq('user_id', userId)
      if (cats) setCategories(cats)
      const { data: wall } = await supabase.from('wallets').select('*').eq('user_id', userId).eq('is_savings', false).order('created_at')
      if (wall) setWallets(wall)
    })()
  }, [userId])

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }
  }, [imageUrl])

  const handleFile = useCallback((file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setImageLoaded(false)
    setCrop({ x: 0, y: 0, w: 0, h: 0 })
    setStep('crop')
  }, [])

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    const img = imageRef.current
    if (img) {
      // Default crop: 80% of image centered
      const w = Math.round(img.naturalWidth * 0.85)
      const h = Math.round(img.naturalHeight * 0.85)
      const x = Math.round((img.naturalWidth - w) / 2)
      const y = Math.round((img.naturalHeight - h) / 2)
      setCrop({ x, y, w, h })
    }
  }, [])

  // Mouse/touch handlers for crop
  const getPos = (e) => {
    const rect = imageContainerRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (imageRef.current.naturalWidth / rect.width),
      y: (clientY - rect.top) * (imageRef.current.naturalHeight / rect.height),
    }
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    const pos = getPos(e)
    setIsDragging(true)
    setDragStart(pos)
    setCrop({ x: pos.x, y: pos.y, w: 0, h: 0 })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const pos = getPos(e)
    const img = imageRef.current
    const maxX = img.naturalWidth
    const maxY = img.naturalHeight
    setCrop({
      x: Math.max(0, Math.min(dragStart.x, pos.x)),
      y: Math.max(0, Math.min(dragStart.y, pos.y)),
      w: Math.min(Math.abs(pos.x - dragStart.x), maxX - Math.min(dragStart.x, pos.x)),
      h: Math.min(Math.abs(pos.y - dragStart.y), maxY - Math.min(dragStart.y, pos.y)),
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  const getScale = () => {
    if (!imageRef.current || !imageContainerRef.current) return 1
    return imageRef.current.naturalWidth / imageContainerRef.current.offsetWidth
  }

  const handleCropAndScan = useCallback(async () => {
    if (crop.w < 20 || crop.h < 20) {
      setError('Area terlalu kecil, perbesar pilihan')
      setStep('error')
      return
    }

    const img = imageRef.current
    const canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    canvas.width = crop.w
    canvas.height = crop.h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)

    setStep('processing')
    setProgress(0)

    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95))
      const worker = await createWorker('eng+ind', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      const { data } = await worker.recognize(blob)
      await worker.terminate()

      const text = data.text.trim()
      setOcrText(text)
      const parsed = parseReceipt(text)
      setResult(parsed)
      setNote(parsed.items.map(i => i.name).join(', '))
      setStep('result')
    } catch (err) {
      setError(err.message || 'Gagal membaca struk')
      setStep('error')
    }
  }, [crop])

  const handleSave = async () => {
    if (!result.totalAmount || !categoryId) return
    setSaving(true)
    try {
      const { error: saveErr } = await supabase
        .from('transactions')
        .insert({ user_id: userId, type, category_id: parseInt(categoryId), wallet_id: walletId ? parseInt(walletId) : null, amount: result.totalAmount, note, date })
      if (saveErr) throw saveErr
      navigate('/transactions')
    } catch (err) {
      setError(err.message || 'Gagal menyimpan')
      setSaving(false)
    }
  }

  const amount = result.totalAmount || 0
  const catList = categories.filter(c => c.type === type)

  return (
    <div className="space-y-4">
      {/* ── STEP: Select ── */}
      {step === 'select' && (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-28 h-28 rounded-3xl bg-indigo-50 flex items-center justify-center mb-5 cursor-pointer hover:bg-indigo-100 transition-colors active:scale-95"
          >
            <Camera size={44} className="text-indigo-500" />
          </div>
          <p className="text-gray-700 font-semibold text-lg mb-1">Scan Struk</p>
          <p className="text-gray-400 text-sm mb-6 text-center">Foto struk belanjaan, nanti otomatis<br/>dibaca & dijumlah</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-indigo-600 text-white rounded-xl px-8 py-3.5 font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <Camera size={20} /> Buka Kamera
          </button>
          <button
            onClick={() => { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click(); setTimeout(() => fileInputRef.current.setAttribute('capture', 'environment'), 100) }}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors inline-flex items-center gap-1.5"
          >
            <Upload size={16} /> Pilih dari Galeri
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* ── STEP: Crop ── */}
      {step === 'crop' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { setStep('select'); setImageUrl(null) }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h2 className="text-sm font-semibold text-gray-700">Pilih Area Struk</h2>
            <button
              onClick={handleCropAndScan}
              className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Scan
            </button>
          </div>
          <div
            ref={imageContainerRef}
            className="relative bg-black rounded-2xl overflow-hidden select-none touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Struk"
              className="w-full block"
              onLoad={handleImageLoad}
              draggable={false}
            />
            {/* Crop overlay */}
            {imageLoaded && crop.w > 0 && crop.h > 0 && (
              <>
                {/* Darkened area outside crop */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'cover' }}>
                  <defs>
                    <mask id="cropMask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect
                        x={(crop.x / (imageRef.current?.naturalWidth || 1)) * 100 + '%'}
                        y={(crop.y / (imageRef.current?.naturalHeight || 1)) * 100 + '%'}
                        width={(crop.w / (imageRef.current?.naturalWidth || 1)) * 100 + '%'}
                        height={(crop.h / (imageRef.current?.naturalHeight || 1)) * 100 + '%'}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="black" fillOpacity="0.45" mask="url(#cropMask)" />
                </svg>
                {/* Crop border */}
                <div
                  className="absolute border-2 border-indigo-400 pointer-events-none"
                  style={{
                    left: (crop.x / imageRef.current.naturalWidth * 100) + '%',
                    top: (crop.y / imageRef.current.naturalHeight * 100) + '%',
                    width: (crop.w / imageRef.current.naturalWidth * 100) + '%',
                    height: (crop.h / imageRef.current.naturalHeight * 100) + '%',
                  }}
                >
                  {/* Corner handles */}
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-indigo-400 rounded-full" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-400 rounded-full" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-indigo-400 rounded-full" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-400 rounded-full" />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-gray-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            Seret untuk pilih area struk, lalu tap Scan
          </div>
        </div>
      )}

      {/* ── STEP: Processing ── */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="relative mx-auto w-28 h-28 mb-5">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#6366f1" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-indigo-600">{progress}%</span>
          </div>
          <p className="text-gray-700 font-medium">Membaca struk...</p>
          <p className="text-gray-400 text-sm mt-1">OCR jalan di browser, data aman</p>
        </div>
      )}

      {/* ── STEP: Error ── */}
      {step === 'error' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-4">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <p className="text-gray-700 font-semibold mb-1">Gagal</p>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <div className="flex gap-3">
            <button onClick={() => { setStep('crop'); setError('') }} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">Kembali</button>
            <button onClick={() => { setStep('select'); setImageUrl(null); setError('') }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">Coba Lagi</button>
          </div>
        </div>
      )}

      {/* ── STEP: Result ── */}
      {step === 'result' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Hasil Scan</h2>
            <button onClick={() => { setStep('select'); setImageUrl(null); setResult({ items: [], totalAmount: 0 }) }} className="text-sm text-indigo-600 font-medium hover:text-indigo-700">Scan Lagi</button>
          </div>

          {result.items.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Item Terdeteksi</p>
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {result.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate mr-2">{item.name}</span>
                    <span className="text-gray-900 font-medium shrink-0">Rp{item.price.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {amount > 0 && (
            <div className="bg-indigo-50 rounded-2xl p-5 flex justify-between items-center">
              <span className="text-base font-medium text-gray-700">Total</span>
              <span className="text-2xl font-bold text-indigo-700">Rp{amount.toLocaleString('id-ID')}</span>
            </div>
          )}

          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-600">Teks mentah OCR</summary>
            <pre className="mt-2 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-32 text-xs">{ocrText}</pre>
          </details>

          {/* Save Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Simpan sebagai Transaksi</h3>

            <div className="flex rounded-xl bg-gray-50 p-1 border border-gray-100">
              <button type="button" onClick={() => { setType('pengeluaran'); setCategoryId('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${type === 'pengeluaran' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}>
                <ArrowDownToLine size={16} /> Keluar
              </button>
              <button type="button" onClick={() => { setType('pemasukan'); setCategoryId('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${type === 'pemasukan' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>
                <ArrowUpFromLine size={16} /> Masuk
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Kategori</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="">Pilih kategori...</option>
                {catList.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Dompet</label>
              <select value={walletId} onChange={e => setWalletId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="">Pilih dompet (opsional)...</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{WALLET_ICONS[w.type] || '💳'} {w.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Jumlah (Rp)</label>
              <input type="number" inputMode="numeric" min="1" value={amount} readOnly
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-gray-50 text-gray-700 font-semibold focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tanggal</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Catatan</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Dari scan struk"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>

            <button onClick={handleSave} disabled={saving || !categoryId}
              className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 active:scale-[0.98]">
              {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
