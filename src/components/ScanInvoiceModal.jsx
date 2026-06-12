import { useState, useRef, useCallback } from 'react'
import { createWorker } from 'tesseract.js'
import { X, Scan, Camera, Upload, FileText, AlertCircle, Check } from 'lucide-react'

/**
 * Parse OCR text from Indonesian receipts into items + total.
 * Heuristic: lines containing "Rp" / "Rp." / number patterns.
 */
function parseReceipt(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const items = []
  let totalAmount = 0
  let totalLine = null

  // Patterns: "BARANG  Rp15.000", "BARANG  15.000", "Rp 15.000"
  const priceRegex = /(?:Rp\.?\s*)?([\d,.]+)/gi
  const totalKeywords = /^(total|kembali|tunai|kartu|debit|kredit|bayar|pembayaran|grand\s*total)/i

  for (const line of lines) {
    // Skip header/footer noise
    if (/^(tanggal|waktu|kasir|no\.|nota|struk|terima\s*kasih|^=+|---|^\+)/i.test(line)) continue

    const cleaned = line.replace(/Rp\.?\s*/gi, '').trim()

    // Try to extract prices at end of line
    const priceMatch = cleaned.match(/([\d.]+)$/)
    if (priceMatch) {
      const rawPrice = priceMatch[1].replace(/\./g, '')
      const price = parseInt(rawPrice, 10)
      if (!isNaN(price) && price > 0) {
        const name = cleaned.replace(priceMatch[0], '').replace(/\s{2,}/g, ' ').trim()
        if (name && !/^\d+$/.test(name)) {
          // Check if this is total line
          if (totalKeywords.test(name)) {
            totalLine = { name, price }
          } else if (price < 100000000) { // Sanity cap ~100jt
            items.push({ name, price })
          }
        }
      }
    }
  }

  // Total: use explicit total line, else sum all items
  if (totalLine) {
    totalAmount = totalLine.price
  } else if (items.length > 0) {
    totalAmount = items.reduce((s, i) => s + i.price, 0)
  }

  return { items, totalAmount }
}

export default function ScanInvoiceModal({ onClose, onUseResult }) {
  const [step, setStep] = useState('select') // select | processing | result | error
  const [imageUrl, setImageUrl] = useState(null)
  const [progress, setProgress] = useState(0)
  const [ocrText, setOcrText] = useState('')
  const [result, setResult] = useState({ items: [], totalAmount: 0 })
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file) return

    // Show preview
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setStep('processing')
    setProgress(0)

    try {
      const worker = await createWorker('eng+ind', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      const { data } = await worker.recognize(file)
      await worker.terminate()

      const text = data.text.trim()
      setOcrText(text)

      const parsed = parseReceipt(text)
      setResult(parsed)
      setStep('result')
    } catch (err) {
      setError(err.message || 'Gagal membaca struk')
      setStep('error')
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleUseResult = () => {
    onUseResult({
      amount: result.totalAmount,
      note: result.items.map(i => i.name).join(', '),
      items: result.items,
      rawText: ocrText,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scan size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Scan Struk</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Step: Select */}
        {step === 'select' && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl mb-3">
              <Upload size={28} className="text-indigo-500" />
            </div>
            <p className="text-gray-700 font-medium mb-1">Upload foto struk</p>
            <p className="text-gray-400 text-sm">Atau tap untuk pilih file</p>
            <div className="flex gap-3 justify-center mt-4">
              <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                <Camera size={14} /> Kamera
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                <FileText size={14} /> JPG / PNG
              </span>
            </div>
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

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="text-center py-10">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="#6366f1" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-indigo-600">
                {progress}%
              </span>
            </div>
            <p className="text-gray-700 font-medium">Membaca struk...</p>
            <p className="text-gray-400 text-sm mt-1">OCR berjalan di browser, tetap aman</p>
            {imageUrl && (
              <img src={imageUrl} alt="Preview" className="mx-auto mt-4 max-h-32 rounded-xl opacity-50" />
            )}
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mb-3">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <p className="text-gray-700 font-medium mb-1">Gagal membaca struk</p>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setStep('select')}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Coba Lagi
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && (
          <div className="space-y-4">
            {imageUrl && (
              <img src={imageUrl} alt="Struk" className="w-full max-h-40 object-contain rounded-xl bg-gray-50" />
            )}

            {/* Items detected */}
            {result.items.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Item Terdeteksi</p>
                <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5">
                  {result.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate mr-2">{item.name}</span>
                      <span className="text-gray-900 font-medium shrink-0">
                        Rp{item.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-700">
                Tidak bisa mendeteksi item satu per satu. Menggunakan teks mentah sebagai catatan.
              </div>
            )}

            {/* Total */}
            {result.totalAmount > 0 && (
              <div className="bg-indigo-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-xl font-bold text-indigo-700">
                  Rp{result.totalAmount.toLocaleString('id-ID')}
                </span>
              </div>
            )}

            {/* Raw text */}
            <details className="text-xs text-gray-400">
              <summary className="cursor-pointer hover:text-gray-600">Teks mentah OCR</summary>
              <pre className="mt-2 bg-gray-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap max-h-24">
                {ocrText}
              </pre>
            </details>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Scan Lagi
              </button>
              <button
                onClick={handleUseResult}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Check size={18} /> Gunakan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
