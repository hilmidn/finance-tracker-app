import { useState, useRef, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { createWorker } from 'tesseract.js'
import { Camera, Upload, X, AlertCircle, Check, ArrowLeft, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'
import { useWallets } from '../hooks/useWallets'
import { useTransactions } from '../hooks/useTransactions'

/**
 * Parse OCR text from Indonesian receipts into items + total.
 * Strategy: kiri=nama, kanan=jumlah. Cari SEMUA angka di tiap baris,
 * ambil yang paling kanan sebagai harga.
 */
function parsePrice(raw) {
  // Bersihin spasi
  let s = raw.replace(/\s+/g, '')

  // Indonesian format: "18,000" → 18000 (koma ribuan)
  // "18.000" → 18000 (titik ribuan)
  // "1.234,50" → 1234.50 (titik ribuan, koma desimal)
  // Tapi di struk receh, desimal jarang — mostly ribuan

  if (s.includes(',') && s.includes('.')) {
    // Mixed: "1.234,50" → titik ribuan, koma desimal
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    const parts = s.split(',')
    // 3 digit setelah koma = ribuan (18,000), else desimal
    if (parts.length === 2 && parts[1].length === 3) {
      s = s.replace(',', '') // thousand
    } else if (parts.length === 2 && parts[1].length <= 2) {
      s = s.replace(',', '.') // decimal
    } else {
      s = s.replace(/,/g, '')
    }
  }

  // Remove all dots (thousand separators in Indo format)
  const numStr = s.replace(/\./g, '')
  const num = parseInt(numStr, 10)
  return isNaN(num) ? 0 : num
}

function parseReceipt(text) {
  let raw = text
    .replace(/\r/g, '')
    .trim()

  // ── Pre-process: merge split numbers like "18, 000" → "18,000" ──
  // OCR sering pisahin angka karena spasi tipis di struk
  // Hanya merge kalau ada koma/titik (ribuan separator)
  raw = raw.replace(/(\d)[,.]\s+(\d{1,3})/g, '$1$2')

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const items = []
  let totalAmount = 0
  let totalLine = null
  const totalKeywords = /^(total|kembali|tunai|kartu|debit|kredit|bayar|pembayaran|grand\s*total|sub\s*total)/i
  const skipPattern = /^(tanggal|waktu|jam|kasir|no\.|nota|struk|terima\s*kasih|^=+|---|^\++|member|anggota|alamat|telepon|npwp)/i

  for (const line of lines) {
    if (skipPattern.test(line)) continue
    const cleaned = line.replace(/Rp\.?\s*/gi, '').trim()
    if (!cleaned) continue

    // Token-based scanning: cari SEMUA angka per-token
    const tokens = cleaned.split(/\s+/)
    const found = [] // { token, value, index }

    let charIdx = 0
    for (const token of tokens) {
      // Skip token yg jelas bukan angka harga
      if (/^(ml|gr|kg|l|pcs|×|\d+ml)$/i.test(token) || token.startsWith('#') || token === '=' || token === '|') {
        charIdx += token.length + 1
        continue
      }
      const val = parsePrice(token)
      if (val > 0 && val < 100_000_000) {
        found.push({ value: val, index: charIdx, token })
      }
      charIdx += token.length + 1
    }

    if (found.length === 0) continue

    // Filter: angka yg beneran kelihatan seperti harga (≥ 1000)
    // Ini ngefilter produk code, quantity dll (726, 4, 400, 225, 1)
    const prices = found.filter(f => f.value >= 1000)
    const usable = prices.length > 0 ? prices : [found[found.length - 1]]

    if (usable.length === 1) {
      // ── Satu harga per baris ──
      const lastNum = usable[0]
      const price = lastNum.value
      const name = cleaned.substring(0, lastNum.index).replace(/[\s,:;\-–—|]+$/, '').trim()
      if (name && !/^\d+$/.test(name)) {
        if (totalKeywords.test(name)) totalLine = { name, price }
        else items.push({ name, price })
      }
    } else {
      // ── Multiple price anchors dalam satu baris (OCR merge lines) ──
      // Split: setiap price dapat nama dari teks sebelumnya
      let prevEnd = 0
      for (const p of usable) {
        let name = cleaned.substring(prevEnd, p.index).replace(/[\s,:;\-–—|#]+$/, '').trim()
        // Kalo nama sebelumnya keambil sama angka2 kecil, strip
        if (name) {
          // Bersihin sisa angka kecil yg ikut (produk code, qty)
          name = name.replace(/\s*\d{1,4}\s*/g, ' ').trim()
          if (name && !/^\d+$/.test(name)) {
            if (totalKeywords.test(name)) totalLine = { name, price: p.value }
            else items.push({ name, price: p.value })
          }
        }
        prevEnd = p.index + p.token.length
      }
    }
  }

  if (totalLine) totalAmount = totalLine.price
  else if (items.length > 0) totalAmount = items.reduce((s, i) => s + i.price, 0)

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
  const [type, setType] = useState('pengeluaran')
  const [categoryId, setCategoryId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Hooks — React Query cached data, no direct Supabase
  const { categories } = useCategories(userId)
  const { wallets: allWallets } = useWallets(userId)
  const { addTransaction } = useTransactions(userId)

  // Crop state
  const imageContainerRef = useRef(null)
  const imageRef = useRef(null)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [dragMode, setDragMode] = useState(null) // null | 'new' | 'move' | 'resize-*'
  const [dragStart, setDragStart] = useState(null) // {x,y} in image coords
  const [cropSnapshot, setCropSnapshot] = useState(null) // crop state when drag started
  const [imageLoaded, setImageLoaded] = useState(false)
  const fileInputRef = useRef(null)

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

  // Mouse/touch handlers for crop with resize handles + move
  const getScale = useCallback(() => {
    if (!imageRef.current || !imageContainerRef.current) return 1
    return imageRef.current.naturalWidth / imageContainerRef.current.offsetWidth
  }, [])

  const getPos = useCallback((e) => {
    const rect = imageContainerRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (imageRef.current.naturalWidth / rect.width),
      y: (clientY - rect.top) * (imageRef.current.naturalHeight / rect.height),
    }
  }, [])

  // Detect which handle is being clicked (in image coords)
  const getHandleAt = useCallback((pos) => {
    if (!crop || crop.w < 10 || crop.h < 10) return null
    const s = 12 * getScale() // threshold in image pixels (~12px screen)
    const handles = {
      'tl': { x: crop.x, y: crop.y },
      'tr': { x: crop.x + crop.w, y: crop.y },
      'bl': { x: crop.x, y: crop.y + crop.h },
      'br': { x: crop.x + crop.w, y: crop.y + crop.h },
      'l': { x: crop.x, y: crop.y + crop.h / 2 },
      'r': { x: crop.x + crop.w, y: crop.y + crop.h / 2 },
      't': { x: crop.x + crop.w / 2, y: crop.y },
      'b': { x: crop.x + crop.w / 2, y: crop.y + crop.h },
    }
    for (const [key, h] of Object.entries(handles)) {
      if (Math.abs(pos.x - h.x) < s && Math.abs(pos.y - h.y) < s) return key
    }
    return null
  }, [crop, getScale])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    const pos = getPos(e)
    const img = imageRef.current
    if (!img) return

    // Check if clicking on a handle
    const handle = getHandleAt(pos)
    if (handle) {
      setDragMode(`resize-${handle}`)
      setDragStart(pos)
      setCropSnapshot({ ...crop })
      return
    }

    // Check if clicking inside existing selection → move mode
    if (pos.x >= crop.x && pos.x <= crop.x + crop.w &&
        pos.y >= crop.y && pos.y <= crop.y + crop.h) {
      setDragMode('move')
      setDragStart(pos)
      setCropSnapshot({ ...crop })
      return
    }

    // Click outside → new selection
    setDragMode('new')
    setDragStart(pos)
    setCrop({ x: pos.x, y: pos.y, w: 1, h: 1 })
  }, [crop, getPos, getHandleAt])

  const handleMouseMove = useCallback((e) => {
    if (!dragMode) return
    const pos = getPos(e)
    const img = imageRef.current
    if (!img) return
    const maxX = img.naturalWidth
    const maxY = img.naturalHeight

    if (dragMode === 'new') {
      const x = Math.max(0, Math.min(dragStart.x, pos.x))
      const y = Math.max(0, Math.min(dragStart.y, pos.y))
      const w = Math.min(Math.abs(pos.x - dragStart.x), maxX - x)
      const h = Math.min(Math.abs(pos.y - dragStart.y), maxY - y)
      if (w > 2 || h > 2) setCrop({ x, y, w, h })
    } else if (dragMode === 'move') {
      const dx = pos.x - dragStart.x
      const dy = pos.y - dragStart.y
      setCrop({
        x: Math.max(0, Math.min(cropSnapshot.x + dx, maxX - cropSnapshot.w)),
        y: Math.max(0, Math.min(cropSnapshot.y + dy, maxY - cropSnapshot.h)),
        w: cropSnapshot.w,
        h: cropSnapshot.h,
      })
    } else if (dragMode.startsWith('resize-')) {
      const edge = dragMode.replace('resize-', '')
      let { x, y, w, h } = cropSnapshot
      const minSize = 20

      if (edge.includes('r')) {
        w = Math.max(minSize, Math.min(pos.x - cropSnapshot.x, maxX - cropSnapshot.x))
      }
      if (edge.includes('b')) {
        h = Math.max(minSize, Math.min(pos.y - cropSnapshot.y, maxY - cropSnapshot.y))
      }
      if (edge.includes('l')) {
        const newX = Math.min(pos.x, cropSnapshot.x + cropSnapshot.w - minSize)
        w = cropSnapshot.x + cropSnapshot.w - newX
        x = newX
      }
      if (edge.includes('t')) {
        const newY = Math.min(pos.y, cropSnapshot.y + cropSnapshot.h - minSize)
        h = cropSnapshot.y + cropSnapshot.h - newY
        y = newY
      }

      setCrop({
        x: Math.max(0, x),
        y: Math.max(0, y),
        w: Math.min(w, maxX - Math.max(0, x)),
        h: Math.min(h, maxY - Math.max(0, y)),
      })
    }
  }, [dragMode, dragStart, cropSnapshot, getPos])

  const handleMouseUp = useCallback(() => {
    setDragMode(null)
    setDragStart(null)
    setCropSnapshot(null)
  }, [])

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
      await addTransaction({
        type, category_id: parseInt(categoryId),
        wallet_id: walletId ? parseInt(walletId) : null,
        amount: result.totalAmount, note, date,
      })
      navigate('/transactions')
    } catch (err) {
      setError(err.message || 'Gagal menyimpan')
      setSaving(false)
    }
  }

  const amount = result.totalAmount || 0
  const catList = categories[type] || []
  const walletList = (allWallets || []).filter(w => !w.is_savings)

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
                {/* Crop border with interactive handles */}
                <div className="absolute border-2 border-indigo-400"
                  style={{
                    left: (crop.x / imageRef.current.naturalWidth * 100) + '%',
                    top: (crop.y / imageRef.current.naturalHeight * 100) + '%',
                    width: (crop.w / imageRef.current.naturalWidth * 100) + '%',
                    height: (crop.h / imageRef.current.naturalHeight * 100) + '%',
                  }}
                >
                  {/* Edge handles (bigger hit area) */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-3 cursor-n-resize" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-3 cursor-s-resize" />
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-6 w-3 cursor-w-resize" />
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 h-6 w-3 cursor-e-resize" />
                  {/* Corner handles */}
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-indigo-400 rounded-full cursor-nw-resize shadow-md" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-400 rounded-full cursor-ne-resize shadow-md" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-indigo-400 rounded-full cursor-sw-resize shadow-md" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-400 rounded-full cursor-se-resize shadow-md" />
                  {/* Move hint indicator in center */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-indigo-400/20 border border-indigo-300 flex items-center justify-center cursor-move">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
                    </div>
                  </div>
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
                {walletList.map(w => <option key={w.id} value={w.id}>{WALLET_ICONS[w.type] || '💳'} {w.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Jumlah (Rp)</label>
              <input type="number" inputMode="numeric" min="1" value={amount} readOnly
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-gray-50 text-gray-700 font-semibold focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Catatan</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Dari scan struk" rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
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
