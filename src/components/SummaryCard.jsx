export default function SummaryCard({ title, amount, type, loading }) {
  const colorMap = {
    income: 'text-green-600',
    expense: 'text-red-500',
    total: 'text-indigo-600',
  }

  const bgMap = {
    income: 'bg-green-50 border-green-200',
    expense: 'bg-red-50 border-red-200',
    total: 'bg-indigo-50 border-indigo-200',
  }

  return (
    <div className={`rounded-xl border p-4 ${bgMap[type]} ${type === 'total' ? 'col-span-full' : ''}`}>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      {loading ? (
        <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className={`text-xl font-bold ${colorMap[type]}`}>
          Rp {amount?.toLocaleString('id-ID') ?? 0}
        </p>
      )}
    </div>
  )
}
