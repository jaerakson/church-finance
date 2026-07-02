import Link from 'next/link'
import { Suspense } from 'react'
import { getOfferings, getMembers, getLookupRows } from '@/lib/google-sheets'
import { OFFERING_TYPES } from '@/lib/constants'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import OfferingHistoryList from '@/components/offering/OfferingHistoryList'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default async function OfferingPage({ searchParams }: Props) {
  const { year } = await searchParams
  const defaultYear = currentYear()
  const selectedYear = year === 'all' ? 'all' : (year || defaultYear)

  const [allOfferings, members, offeringTypes] = await Promise.all([
    getOfferings().catch(() => []),
    getMembers().catch(() => []),
    getLookupRows('offeringType').catch(() => OFFERING_TYPES),
  ])

  const memberMap = Object.fromEntries(members.map((m) => [m.key, m.name]))
  const years = [...new Set(allOfferings.map((o) => o.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  const offerings = selectedYear === 'all'
    ? allOfferings
    : allOfferings.filter((o) => o.date?.startsWith(selectedYear))

  const grandTotal = offerings.reduce((s, o) => s + parseAmount(o.amount), 0)

  // 전체 기간 종류별 합계
  const totalByType = offeringTypes.map((t) => {
    const total = offerings.filter((o) => o.typeKey === t.key).reduce((s, o) => s + parseAmount(o.amount), 0)
    return { ...t, total }
  }).filter((t) => t.total > 0)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">헌금 내역</h1>
          <p className="text-sm text-gray-500 mt-1">총 {offerings.length}건 · {grandTotal.toLocaleString()}원</p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <YearFilter years={years.length ? years : [defaultYear]} />
          </Suspense>
          <Link href="/offering/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            + 헌금 입력
          </Link>
        </div>
      </div>

      {/* 종류별 요약 */}
      {totalByType.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {totalByType.map((t) => (
            <div key={t.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">{t.name}</p>
              <p className="text-base font-bold text-gray-900">{t.total.toLocaleString()}원</p>
            </div>
          ))}
        </div>
      )}

      {/* 날짜별 헌금 내역 (최근 5건 고정 · 펼침) */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">헌금 내역</h2>
        <OfferingHistoryList offerings={offerings} memberMap={memberMap} />
      </div>
    </div>
  )
}
