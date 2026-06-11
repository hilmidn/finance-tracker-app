import jsPDF from 'jspdf'
import 'jspdf-autotable'

const COLORS = {
  red: [239, 68, 68],
  green: [34, 197, 94],
  amber: [245, 158, 11],
  indigo: [99, 102, 241],
  gray: [107, 114, 128],
  lightBg: [249, 250, 251],
}

export function exportToPDF({ transactions, user, monthLabel, savingsTransactions }) {
  const doc = new jsPDF()

  // --- Separate data ---
  const pengeluaran = transactions.filter(t => t.type === 'pengeluaran')
  const pemasukan = transactions.filter(t => t.type === 'pemasukan')
  const menabung = savingsTransactions || []

  // --- Summary calculation ---
  const totalPemasukan = pemasukan.reduce((s, t) => s + t.amount, 0)
  const totalPengeluaran = pengeluaran.reduce((s, t) => s + t.amount, 0)
  const totalMenabung = menabung.reduce((s, t) => s + t.amount, 0)
  const saldo = totalPemasukan - totalPengeluaran

  // --- Kop ---
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Finance App', 14, 22)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(monthLabel, 14, 30)

  doc.setFontSize(9)
  doc.setTextColor(...COLORS.gray)
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  doc.text(`Akun: ${displayName}`, 14, 37)
  const now = new Date()
  const dateStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
  doc.text(`Diekspor: ${dateStr}`, 14, 42)

  // --- Garis horizontal ---
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(14, 46, pageW - 14, 46)

  let y = 52

  // --- Helper: render table section ---
  const renderTable = (title, data, columns, headColor, startY) => {
    if (data.length === 0) return startY

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(title, 14, startY)

    const body = data.map(item => columns.map(col => col.accessor(item)))

    doc.autoTable({
      startY: startY + 4,
      head: [columns.map(c => c.label)],
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: {
        fillColor: headColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: columns.reduce((acc, col, idx) => {
        acc[idx] = { cellWidth: col.width }
        return acc
      }, {}),
      margin: { left: 14, right: 14 },
      tableWidth: pageW - 28,
    })

    return doc.lastAutoTable.finalY + 10
  }

  const dateCol = { label: 'Tanggal', width: 28, accessor: t => t.date || '-' }
  const catCol = { label: 'Kategori', width: 38, accessor: t => t.categories?.name || '-' }
  const walletCol = { label: 'Dompet', width: 30, accessor: t => t.wallets?.name || t._raw?.to_wallet?.name || '-' }
  const amountCol = { label: 'Jumlah', width: 38, accessor: t => `Rp ${t.amount.toLocaleString('id-ID')}` }
  const noteCol = { label: 'Catatan', width: 'auto', accessor: t => t.note || t.description || '-' }
  const fromCol = { label: 'Dari', width: 30, accessor: t => t._raw?.from_wallet?.name || '-' }
  const toCol = { label: 'Ke', width: 30, accessor: t => t._raw?.to_wallet?.name || '-' }

  // --- Table: Pengeluaran ---
  y = renderTable(
    'Pengeluaran',
    pengeluaran,
    [dateCol, catCol, walletCol, amountCol, noteCol],
    COLORS.red,
    y
  )

  // --- Table: Pemasukan ---
  y = renderTable(
    'Pemasukan',
    pemasukan,
    [dateCol, catCol, walletCol, amountCol, noteCol],
    COLORS.green,
    y
  )

  // --- Table: Menabung ---
  y = renderTable(
    'Menabung (Transfer ke Tabungan)',
    menabung,
    [
      dateCol,
      { label: 'Dari', width: 38, accessor: t => t._raw?.from_wallet?.name || '-' },
      { label: 'Ke', width: 38, accessor: t => t._raw?.to_wallet?.name || '-' },
      amountCol,
      noteCol,
    ],
    COLORS.amber,
    y
  )

  // --- Garis pemisah ---
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y - 2, pageW - 14, y - 2)

  // --- Summary Section ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('Ringkasan', 14, y + 4)
  y += 10

  const summaryData = [
    ['Pemasukan', `Rp ${totalPemasukan.toLocaleString('id-ID')}`],
    ['Pengeluaran', `Rp ${totalPengeluaran.toLocaleString('id-ID')}`],
    ['Menabung', `Rp ${totalMenabung.toLocaleString('id-ID')}`],
    ['Sisa', `Rp ${saldo.toLocaleString('id-ID')}`],
  ]

  doc.autoTable({
    startY: y,
    head: [],
    body: summaryData.map(([label, val]) => [label, val]),
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: [0, 0, 0] },
      1: { cellWidth: 50, textColor: [0, 0, 0] },
    },
    margin: { left: 14 },
    tableWidth: 100,
  })

  y = doc.lastAutoTable.finalY + 10

  // --- Analisa singkat ---
  if (totalPemasukan > 0 || totalPengeluaran > 0 || totalMenabung > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Analisa', 14, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.gray)

    const tips = []

    // Top category analysis
    if (pengeluaran.length > 0) {
      const catTotals = {}
      pengeluaran.forEach(t => {
        const name = t.categories?.name || 'Lainnya'
        catTotals[name] = (catTotals[name] || 0) + t.amount
      })
      const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
      const topCat = sortedCats[0]
      if (topCat && totalPengeluaran > 0) {
        const pct = (topCat[1] / totalPengeluaran) * 100
        if (pct > 40) {
          tips.push(`⚠️ Pengeluaran terbesar: ${topCat[0]} (${Math.round(pct)}% dari total). Perlu dievaluasi.`)
        } else if (pct > 25) {
          tips.push(`📊 Pengeluaran terbesar: ${topCat[0]} (${Math.round(pct)}%). Masih wajar, pantau terus.`)
        }
      }
    }

    // Savings rate
    if (totalPemasukan > 0) {
      const savingRate = ((totalPemasukan - totalPengeluaran) / totalPemasukan) * 100
      if (savingRate < 0) {
        tips.push(`🔴 Defisit! Pengeluaran lebih besar Rp ${Math.abs(saldo).toLocaleString('id-ID')} dari pemasukan.`)
      } else if (savingRate < 10) {
        tips.push(`💡 Saving rate ${Math.round(savingRate)}%. Idealnya minimal 10-20%.`)
      } else if (savingRate >= 20) {
        tips.push(`👍 Saving rate ${Math.round(savingRate)}%. Sangat baik!`)
      }
    } else if (totalPemasukan === 0 && totalPengeluaran > 0) {
      tips.push('🔴 Tidak ada pemasukan tercatat bulan ini.')
    }

    // Menabung insight
    if (totalMenabung > 0) {
      tips.push(`🐷 Menabung Rp ${totalMenabung.toLocaleString('id-ID')} bulan ini. Konsisten!`)
    }

    tips.forEach((tip, i) => {
      const lines = doc.splitTextToSize(tip, pageW - 28)
      doc.text(lines, 14, y)
      y += lines.length * 5 + 2
    })
  }

  // --- Footer ---
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.gray)
  doc.text(`Dihasilkan oleh Finance App — ${now.toLocaleDateString('id-ID')}`, 14, footerY)

  // --- Save ---
  doc.save(`Laporan Keuangan ${monthLabel}.pdf`)
}
