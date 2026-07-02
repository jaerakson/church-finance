import { Suspense } from 'react'
import { getOfferings, getMembers, getLookupRows } from '@/lib/google-sheets'
import { OFFERING_TYPES, lookupName } from '@/lib/constants'
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
  { key: 'member', header: '교인' },
  { key: 'type', header: '헌금종류' },
  { key: 'amount', header: '금액', align: 'right', format: 'won' },
  { key: 'note', header: '비고' },
]

export default async function OfferingDetailPage({ searchParams }: Props) {
  const { year } = await searchParams
  const defYear = currentYear()
  const selectedYear = year === 'all' ? 'all' : (year || defYear)

  const [allOfferings, members, offeringTypes] = await Promise.all([
    getOfferings().catch(() => []),
    getMembers().catch(() => []),
    getLookupRows('offeringType').catch(() => OFFERING_TYPES),
  ])
  const memberMap = Object.fromEntries(members.map((m) => [m.key, m.name]))
  const years = [...new Set(allOfferings.map((o) => o.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  const rows = (selectedYear === 'all' ? allOfferings : allOfferings.filter((o) => o.date?.startsWith(selectedYear)))
    .slice()
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const total = rows.reduce((s, o) => s + parseAmount(o.amount), 0)

  const tableRows = rows.map((o) => ({
    date: o.date,
    member: memberMap[o.memberKey] ?? o.memberKey,
    type: lookupName(offeringTypes, o.typeKey),
    amount: parseAmount(o.amount),
    note: o.note ?? '',
  }))

  const csvHeaders = ['날짜', '교인', '헌금종류', '금액', '비고']
  const csvRows = tableRows.map((r) => [r.date, r.member, r.type, r.amount, r.note])
  const fileLabel = selectedYear === 'all' ? '전체' : selectedYear

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">헌금 상세</h1>
          <p className="text-sm text-gray-500 mt-1">총 {rows.length.toLocaleString()}건 · {total.toLocaleString()}원</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <YearFilter years={years.length ? years : [defYear]} />
          </Suspense>
          <CsvDownloadButton filename={`헌금상세_${fileLabel}.csv`} headers={csvHeaders} rows={csvRows} />
        </div>
      </div>

      <PaginatedTable
        columns={COLUMNS}
        rows={tableRows}
        searchPlaceholder="날짜·교인·종류·금액·비고 검색..."
        accent="blue"
      />
    </div>
  )
}
