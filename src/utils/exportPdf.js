import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'

const COLORS = {
  red: [239, 68, 68],
  green: [34, 197, 94],
  amber: [245, 158, 11],
  indigo: [99, 102, 241],
  gray: [107, 114, 128],
}

function formatDate(isoDate) {
  if (!isoDate) return '-'
  const [y, m, d] = isoDate.split('-')
  return `${d}-${m}-${y}`
}

function fmtRp(n) {
  return `Rp ${(n || 0).toLocaleString('id-ID')}`
}

export function exportToPDF({ transactions, user, monthLabel, savingsTransactions }) {
  const doc = new jsPDF()

  // --- Separate data ---
  const pengeluaran = transactions.filter(t => t.type === 'pengeluaran')
  const pemasukan = transactions.filter(t => t.type === 'pemasukan')
  const menabung = savingsTransactions || []

  const totalPengeluaran = pengeluaran.reduce((s, t) => s + t.amount, 0)
  const totalPemasukan = pemasukan.reduce((s, t) => s + t.amount, 0)
  const totalMenabung = menabung.reduce((s, t) => s + t.amount, 0)
  const saldo = totalPemasukan - totalPengeluaran

  const pageW = doc.internal.pageSize.getWidth()
  const ml = 14 // margin left
  const mr = 14 // margin right
  const contentW = pageW - ml - mr

  // =============================================
  // KOP — row 1: title left, month right
  // =============================================
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Finance App', ml, 22)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.gray)
  doc.text(monthLabel, pageW - mr, 22, { align: 'right' })

  // --- row 2: name left, timestamp right ---
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const now = new Date()
  const dateStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`

  doc.setFontSize(9)
  doc.text(`Akun: ${displayName}`, ml, 30)
  doc.text(`Diekspor: ${dateStr}`, pageW - mr, 30, { align: 'right' })

  // --- Garis horizontal ---
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(ml, 35, pageW - mr, 35)

  let y = 42

  // =============================================
  // Helper: render table with total row
  // =============================================
  const renderTable = (title, data, columns, headColor, totalLabel, totalValue, startY) => {
    if (data.length === 0) return startY

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(title, ml, startY)

    const body = data.map(item => columns.map(col => col.accessor(item)))

    // Total row — colspan 3 for label, colspan 2 for amount
    const colCount = columns.length
    const foot = [
      [
        { content: totalLabel, colSpan: colCount - 2, styles: { halign: 'left', fontStyle: 'bold', fontSize: 8 } },
        { content: fmtRp(totalValue), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 } },
      ],
    ]

    autoTable(doc, {
      startY: startY + 4,
      head: [columns.map(c => c.label)],
      body,
      foot,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: {
        fillColor: headColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [0, 0, 0],
      },
      columnStyles: columns.reduce((acc, col, idx) => {
        if (col.width !== 'auto') acc[idx] = { cellWidth: col.width }
        if (col.align === 'right') acc[idx] = { ...acc[idx], halign: 'right' }
        return acc
      }, {}),
      margin: { left: ml, right: mr },
      tableWidth: contentW,
    })

    return doc.lastAutoTable.finalY + 8
  }

  // --- Column definitions (all tables: note BEFORE jumlah, jumlah right-aligned) ---
  const dateCol = { label: 'Tanggal', width: 26, accessor: t => formatDate(t.date) }
  const catCol = { label: 'Kategori', width: 36, accessor: t => t.categories?.name || '-' }
  const walletCol = { label: 'Dompet', width: 28, accessor: t => t.wallets?.name || t._raw?.to_wallet?.name || '-' }
  const noteCol = { label: 'Catatan', width: 'auto', accessor: t => t.note || t.description || '-' }
  const amountCol = { label: 'Jumlah', width: 36, align: 'right', accessor: t => fmtRp(t.amount) }
  const fromCol = { label: 'Dari', width: 36, accessor: t => t._raw?.from_wallet?.name || '-' }
  const toCol = { label: 'Ke', width: 36, accessor: t => t._raw?.to_wallet?.name || '-' }

  // --- Tabel: Pengeluaran ---
  y = renderTable(
    'Pengeluaran',
    pengeluaran,
    [dateCol, catCol, walletCol, noteCol, amountCol],
    COLORS.red,
    'Total Pengeluaran',
    totalPengeluaran,
    y
  )

  // --- Tabel: Pemasukan ---
  y = renderTable(
    'Pemasukan',
    pemasukan,
    [dateCol, catCol, walletCol, noteCol, amountCol],
    COLORS.green,
    'Total Pemasukan',
    totalPemasukan,
    y
  )

  // --- Tabel: Menabung ---
  y = renderTable(
    'Menabung (Transfer ke Tabungan)',
    menabung,
    [dateCol, fromCol, toCol, noteCol, amountCol],
    COLORS.amber,
    'Total Menabung',
    totalMenabung,
    y
  )

  // --- Garis pemisah ---
  doc.setDrawColor(200, 200, 200)
  doc.line(ml, y - 2, pageW - mr, y - 2)

  // =============================================
  // Ringkasan — hanya Total Saldo
  // =============================================
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('Ringkasan', ml, y + 6)
  y += 12

  autoTable(doc, {
    startY: y,
    head: [],
    body: [['Total Saldo', fmtRp(saldo)]],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold', textColor: [0, 0, 0] },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] },
    },
    margin: { left: ml },
    tableWidth: 120,
  })

  y = doc.lastAutoTable.finalY + 10

  // =============================================
  // Analisa — tanpa emoji (biar ga aneh di PDF)
  // =============================================
  if (totalPemasukan > 0 || totalPengeluaran > 0 || totalMenabung > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Analisa', ml, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.gray)

    const tips = []

    // Top category
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
          tips.push(`[-] Pengeluaran terbesar: ${topCat[0]} (${Math.round(pct)}% dari total). Perlu dievaluasi.`)
        } else if (pct > 25) {
          tips.push(`[i] Pengeluaran terbesar: ${topCat[0]} (${Math.round(pct)}%). Masih wajar, pantau terus.`)
        }
      }
    }

    // Savings rate
    if (totalPemasukan > 0) {
      const savingRate = ((totalPemasukan - totalPengeluaran) / totalPemasukan) * 100
      if (savingRate < 0) {
        tips.push(`[!] Defisit! Pengeluaran lebih besar Rp ${Math.abs(saldo).toLocaleString('id-ID')} dari pemasukan.`)
      } else if (savingRate < 10) {
        tips.push(`[i] Saving rate ${Math.round(savingRate)}%. Idealnya minimal 10-20%.`)
      } else if (savingRate >= 20) {
        tips.push(`[+] Saving rate ${Math.round(savingRate)}%. Sangat baik!`)
      }
    } else if (totalPemasukan === 0 && totalPengeluaran > 0) {
      tips.push('[!] Tidak ada pemasukan tercatat bulan ini.')
    }

    // Menabung insight
    if (totalMenabung > 0) {
      tips.push(`[$] Menabung ${fmtRp(totalMenabung)} bulan ini. Konsisten!`)
    }

    tips.forEach(tip => {
      const lines = doc.splitTextToSize(tip, contentW)
      doc.text(lines, ml, y)
      y += lines.length * 5 + 2
    })
  }

  // --- Footer ---
  const footerY = doc.internal.pageSize.getHeight() - 12
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.gray)
  doc.text(`Dihasilkan oleh Finance App — ${now.toLocaleDateString('id-ID')}`, ml, footerY)

  // --- Save ---
  doc.save(`Laporan Keuangan ${monthLabel}.pdf`)
}
