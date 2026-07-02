import { Suspense } from 'react'
import { getExpenses, getLookupRows } from '@/lib/google-sheets'
import { EXPENSE_TYPES, lookupName } from '@/lib/constants'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import CsvDownloadButton from '@/components/ui/CsvDownloadButton'
import PaginatedTable, { Column } from '@/components/ui/PaginatedTable'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

const COLUMNS: Column[] = [
  { key: 'date', header: '날짜' },
  { key: 'type', header: '지출종류' },
  { key: 'description', header: '내역' },
  { key: 'amount', header: '금액', align: 'right', format: 'won' },
  { key: 'note', header: '비고' },
]

export default async function ExpenseDetailPage({ searchParams }: Props) {
  const { year } = await searchParams
  const defYear = currentYear()
  const selectedYear = year === 'all' ? 'all' : (year || defYear)

  const [allExpenses, expenseTypes] = await Promise.all([
    getExpenses().catch(() => []),
    getLookupRows('expenseType').catch(() => EXPENSE_TYPES),
  ])
  const years = [...new Set(allExpenses.map((e) => e.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  const rows = (selectedYear === 'all' ? allExpenses : allExpenses.filter((e) => e.date?.startsWith(selectedYear)))
    .slice()
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const total = rows.reduce((s, e) => s + parseAmount(e.amount), 0)

  const tableRows = rows.map((e) => ({
    date: e.date,
    type: lookupName(expenseTypes, e.typeKey),
    description: e.description ?? '',
    amount: parseAmount(e.amount),
    note: e.note ?? '',
  }))

  const csvHeaders = ['날짜', '지출종류', '내역', '금액', '비고']
  const csvRows = tableRows.map((r) => [r.date, r.type, r.description, r.amount, r.note])
  const fileLabel = selectedYear === 'all' ? '전체' : selectedYear

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">지출 상세</h1>
          <p className="text-sm text-gray-500 mt-1">총 {rows.length.toLocaleString()}건 · {total.toLocaleString()}원</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <YearFilter years={years.length ? years : [defYear]} />
          </Suspense>
          <CsvDownloadButton filename={`지출상세_${fileLabel}.csv`} headers={csvHeaders} rows={csvRows} />
        </div>
      </div>

      <PaginatedTable
        columns={COLUMNS}
        rows={tableRows}
        searchPlaceholder="날짜·종류·내역·금액·비고 검색..."
        accent="rose"
      />
    </div>
  )
}
