import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'

const H = {
  red: [239, 68, 68],
  green: [22, 163, 74],
  amber: [217, 119, 6],
  indigo: [99, 102, 241],
  gray: [107, 114, 128],
}

const TINT = {
  red: [254, 242, 242],
  green: [240, 253, 244],
  amber: [255, 251, 235],
  indigo: [238, 242, 255],
}

const NOW = new Date()

function dmy(iso) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

function rp(n) {
  return `Rp ${(n || 0).toLocaleString('id-ID')}`
}

export function exportToPDF({ transactions, user, monthLabel, savingsTransactions, walletSummary }) {
  const doc = new jsPDF()

  const pengeluaran = transactions.filter(t => t.type === 'pengeluaran')
  const pemasukan = transactions.filter(t => t.type === 'pemasukan')
  const menabung = savingsTransactions || []

  const totKeluar = pengeluaran.reduce((s, t) => s + t.amount, 0)
  const totMasuk = pemasukan.reduce((s, t) => s + t.amount, 0)
  const totNabung = menabung.reduce((s, t) => s + t.amount, 0)
  const saldo = totMasuk - totKeluar

  const PW = doc.internal.pageSize.getWidth()
  const ML = 14, MR = 14, CW = PW - ML - MR

  // ============== KOP ==============
  doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
  doc.text('Finance App', ML, 22)
  doc.setFont('helvetica', 'normal').setFontSize(12).setTextColor(...H.gray)
  doc.text(monthLabel, PW - MR, 22, { align: 'right' })

  const nama = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const ts = `${NOW.toLocaleDateString('id-ID')} ${NOW.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
  doc.setFontSize(9)
  doc.text(`Akun: ${nama}`, ML, 30)
  doc.text(`Diekspor: ${ts}`, PW - MR, 30, { align: 'right' })

  doc.setDrawColor(200, 200, 200).setLineWidth(0.5)
  doc.line(ML, 35, PW - MR, 35)

  let y = 42

  // ============== RENDER TABLE ==============
  const renderTable = (judul, data, cols, headColor, tintColor, totalLabel, totalVal, sy) => {
    if (!data.length) return sy

    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(0, 0, 0)
    doc.text(judul, ML, sy)

    const body = data.map(r => cols.map(c => c.accessor(r)))
    const n = cols.length

    const foot = [[
      { content: totalLabel, colSpan: n - 2, styles: { halign: 'left', fontStyle: 'bold', fontSize: 8 } },
      { content: rp(totalVal), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 } },
    ]]

    // Column styles: amount column (last) bold + right-align
    const colStyles = cols.reduce((acc, col, idx) => {
      const s = {}
      if (col.width !== 'auto') s.cellWidth = col.width
      if (idx === cols.length - 1) { s.halign = 'right'; s.fontStyle = 'bold' }
      acc[idx] = s
      return acc
    }, {})

    autoTable(doc, {
      startY: sy + 4,
      head: [cols.map(c => c.label)],
      body,
      foot,
      theme: 'grid',
      showHead: 'firstPage',
      showFoot: 'lastPage',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: headColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: tintColor, textColor: [0, 0, 0] },
      columnStyles: colStyles,
      margin: { left: ML, right: MR },
      tableWidth: CW,
    })
    return doc.lastAutoTable.finalY + 8
  }

  // ============== COLS ==============
  const dc = { label: 'Tanggal', width: 26, accessor: r => dmy(r.date) }
  const kc = { label: 'Kategori', width: 36, accessor: r => r.categories?.name || '-' }
  const wc = { label: 'Dompet', width: 28, accessor: r => r.wallets?.name || r._raw?.to_wallet?.name || '-' }
  const nc = { label: 'Catatan', width: 'auto', accessor: r => r.note || r.description || '-' }
  const ac = { label: 'Jumlah', width: 36, accessor: r => rp(r.amount) }
  const fc = { label: 'Dari', width: 36, accessor: r => r._raw?.from_wallet?.name || '-' }
  const tc = { label: 'Ke', width: 36, accessor: r => r._raw?.to_wallet?.name || '-' }

  // ============== TABEL ==============
  y = renderTable('Pengeluaran', pengeluaran, [dc, kc, wc, nc, ac], H.red, TINT.red, 'Total Pengeluaran', totKeluar, y)
  y = renderTable('Pemasukan', pemasukan, [dc, kc, wc, nc, ac], H.green, TINT.green, 'Total Pemasukan', totMasuk, y)
  y = renderTable('Menabung (Transfer ke Tabungan)', menabung, [dc, fc, tc, nc, ac], H.amber, TINT.amber, 'Total Menabung', totNabung, y)

  // ============== RINGKASAN WALLET ==============
  if (y > 200) { doc.addPage(); y = 22 }

  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(0, 0, 0)
  doc.text('Ringkasan Dompet', ML, y)
  y += 6

  if (walletSummary && walletSummary.length) {
    const wBody = walletSummary.map(w => [w.name, rp(w.balance)])
    const totalOperasional = walletSummary.filter(w => !w.is_savings).reduce((s, w) => s + w.balance, 0)
    const totalTabungan = walletSummary.filter(w => w.is_savings).reduce((s, w) => s + w.balance, 0)
    wBody.push(
      [{ content: 'Total Saldo Operasional', colSpan: 1, styles: { fontStyle: 'bold', fontSize: 9 } },
       { content: rp(totalOperasional), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }]
    )
    if (totalTabungan > 0) {
      wBody.push(
        [{ content: 'Total Saldo Tabungan', colSpan: 1, styles: { fontStyle: 'bold', fontSize: 9 } },
         { content: rp(totalTabungan), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }]
      )
    }

    autoTable(doc, {
      startY: y,
      head: [['Dompet', 'Saldo']],
      body: wBody,
      theme: 'grid',
      showHead: 'firstPage',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: H.indigo, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 'auto', fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: ML, right: MR },
      tableWidth: CW,
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // ============== ANALISA ==============
  if (y > 250) { doc.addPage(); y = 22 }

  if (totMasuk > 0 || totKeluar > 0 || totNabung > 0) {
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(0, 0, 0)
    doc.text('Analisa', ML, y)
    y += 6

    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...H.gray)
    const t = []

    if (pengeluaran.length) {
      const ct = {}
      pengeluaran.forEach(r => { const n = r.categories?.name || 'Lainnya'; ct[n] = (ct[n] || 0) + r.amount })
      const sc = Object.entries(ct).sort((a, b) => b[1] - a[1])
      if (sc[0] && totKeluar > 0) {
        const p = (sc[0][1] / totKeluar) * 100
        if (p > 40) t.push(`[-] Pengeluaran terbesar: ${sc[0][0]} (${Math.round(p)}% dari total). Perlu dievaluasi.`)
        else if (p > 25) t.push(`[i] Pengeluaran terbesar: ${sc[0][0]} (${Math.round(p)}%). Masih wajar, pantau terus.`)
      }
    }

    if (totMasuk > 0) {
      const sr = ((totMasuk - totKeluar) / totMasuk) * 100
      if (sr < 0) t.push(`[!] Defisit! Pengeluaran lebih besar Rp ${Math.abs(saldo).toLocaleString('id-ID')} dari pemasukan.`)
      else if (sr < 10) t.push(`[i] Saving rate ${Math.round(sr)}%. Idealnya minimal 10-20%.`)
      else if (sr >= 20) t.push(`[+] Saving rate ${Math.round(sr)}%. Sangat baik!`)
    } else if (totMasuk === 0 && totKeluar > 0) {
      t.push('[!] Tidak ada pemasukan tercatat bulan ini.')
    }

    if (totNabung > 0) t.push(`[$] Menabung ${rp(totNabung)} bulan ini. Konsisten!`)

    t.forEach(tip => {
      const lines = doc.splitTextToSize(tip, CW)
      doc.text(lines, ML, y)
      y += lines.length * 5 + 2
    })
  }

  // ============== FOOTER ==============
  doc.setFontSize(7).setTextColor(...H.gray)
  doc.text(`Dihasilkan oleh Finance App — ${NOW.toLocaleDateString('id-ID')}`, ML, doc.internal.pageSize.getHeight() - 12)

  doc.save(`Laporan Keuangan ${monthLabel}.pdf`)
}
