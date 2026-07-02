import { Suspense } from 'react'
import { getOfferings, getMembers, getLookupRows } from '@/lib/google-sheets'
import { OFFERING_TYPES } from '@/lib/constants'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import CsvDownloadButton from '@/components/ui/CsvDownloadButton'
import PaginatedTable, { Column } from '@/components/ui/PaginatedTable'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

const COLUMNS: Column[] = [
  { key: 'member', header: '교인' },
  { key: 'count', header: '헌금 건수', align: 'right', format: 'number' },
  { key: 'total', header: '총 헌금액', align: 'right', format: 'won' },
]

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default async function MemberOfferingPage({ searchParams }: Props) {
  const { year } = await searchParams
  const defYear = currentYear()
  const selectedYear = !year ? defYear : (year === 'all' ? 'all' : year)

  const [allOfferings, members, offeringTypes] = await Promise.all([
    getOfferings().catch(() => []),
    getMembers().catch(() => []),
    getLookupRows('offeringType').catch(() => OFFERING_TYPES),
  ])
  const memberMap = Object.fromEntries(members.map((m) => [m.key, m.name]))
  const years = [...new Set(allOfferings.map((o) => o.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  const filtered = selectedYear === 'all' ? allOfferings : allOfferings.filter((o) => o.date?.startsWith(selectedYear))

  // 교인별 집계
  const agg: Record<string, { count: number; total: number; byType: Record<string, number> }> = {}
  for (const o of filtered) {
    const m = (agg[o.memberKey] ??= { count: 0, total: 0, byType: {} })
    const amt = parseAmount(o.amount)
    m.count += 1
    m.total += amt
    m.byType[o.typeKey] = (m.byType[o.typeKey] ?? 0) + amt
  }

  const list = Object.entries(agg)
    .map(([key, v]) => ({ key, name: memberMap[key] ?? key, ...v }))
    .sort((a, b) => b.total - a.total)

  const grandTotal = list.reduce((s, m) => s + m.total, 0)

  // CSV: 교인, 건수, 총액 + 헌금종류별 컬럼
  const csvHeaders = ['교인', '건수', '총액', ...offeringTypes.map((t) => t.name)]
  const csvRows = list.map((m) => [
    m.name,
    m.count,
    m.total,
    ...offeringTypes.map((t) => m.byType[t.key] ?? 0),
  ])
  const fileLabel = selectedYear === 'all' ? '전체' : selectedYear

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">성도별 헌금 내역</h1>
          <p className="text-sm text-gray-500 mt-1">{list.length.toLocaleString()}명 · {grandTotal.toLocaleString()}원</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <YearFilter years={years.length ? years : [defYear]} />
          </Suspense>
          <CsvDownloadButton filename={`성도별헌금_${fileLabel}.csv`} headers={csvHeaders} rows={csvRows} />
        </div>
      </div>

      <PaginatedTable
        columns={COLUMNS}
        rows={list.map((m) => ({ member: m.name, count: m.count, total: m.total }))}
        searchPlaceholder="교인 이름 검색..."
        accent="blue"
      />
      <p className="text-xs text-gray-400">기본 정렬은 총 헌금액순이며, 헌금 종류별 상세 금액은 CSV 다운로드에 포함됩니다.</p>
    </div>
  )
}
