import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getOfferings, getExpenses, getMembers, getLookupRows } from '@/lib/google-sheets'
import { OFFERING_TYPES, EXPENSE_TYPES, lookupName } from '@/lib/constants'
import { currentYear } from '@/lib/date'
import OfferingHistoryList from '@/components/offering/OfferingHistoryList'
import ExpenseHistoryList from '@/components/expense/ExpenseHistoryList'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ kind: string; typeKey: string }>
  searchParams: Promise<{ year?: string; half?: string; scope?: string }>
}

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

const SCOPE_LABEL: Record<string, string> = { current: '현누계', prev: '직전누계', total: '총합계' }

export default async function SummaryDetailPage({ params, searchParams }: Props) {
  const { kind, typeKey: rawKey } = await params
  if (kind !== 'income' && kind !== 'expense') notFound()

  const typeKey = decodeURIComponent(rawKey)
  const sp = await searchParams
  const defYear = currentYear()
  const year = sp.year === 'all' || !sp.year ? defYear : sp.year
  const half = sp.half === '1' ? '1' : sp.half === '2' ? '2' : (new Date().getMonth() + 1 >= 7 ? '2' : '1')
  const scope = sp.scope === 'current' || sp.scope === 'prev' ? sp.scope : 'total'

  const monthNum = (d?: string) => Number((d ?? '').slice(5, 7)) || 0
  // scope 별 기간 필터
  const inScope = (d?: string) => {
    if (!(d ?? '').startsWith(year)) return false
    const m = monthNum(d)
    if (scope === 'current') return half === '1' ? m <= 6 : m >= 7
    if (scope === 'prev') return half === '2' && m <= 6
    // total: 연초부터 선택 반기 끝까지
    return half === '1' ? m <= 6 : m <= 12
  }

  const periodLabel = `${year}년 ${half === '1' ? '상반기' : '하반기'} · ${SCOPE_LABEL[scope]}`
  const backHref = `/finance/summary?year=${encodeURIComponent(year)}&half=${half}`

  if (kind === 'income') {
    const [allOfferings, members, offeringTypes] = await Promise.all([
      getOfferings().catch(() => []),
      getMembers().catch(() => []),
      getLookupRows('offeringType').catch(() => OFFERING_TYPES),
    ])
    const memberMap = Object.fromEntries(members.map((m) => [m.key, m.name]))
    const rows = allOfferings.filter((o) => o.typeKey === typeKey && inScope(o.date))
    const total = rows.reduce((s, o) => s + parseAmount(o.amount), 0)
    const typeName = lookupName(offeringTypes, typeKey)

    return (
      <DetailShell kind="income" typeName={typeName} periodLabel={periodLabel} count={rows.length} total={total} backHref={backHref}>
        <OfferingHistoryList offerings={rows} memberMap={memberMap} />
      </DetailShell>
    )
  }

  const [allExpenses, expenseTypes] = await Promise.all([
    getExpenses().catch(() => []),
    getLookupRows('expenseType').catch(() => EXPENSE_TYPES),
  ])
  const rows = allExpenses.filter((e) => e.typeKey === typeKey && inScope(e.date))
  const total = rows.reduce((s, e) => s + parseAmount(e.amount), 0)
  const typeName = lookupName(expenseTypes, typeKey)

  return (
    <DetailShell kind="expense" typeName={typeName} periodLabel={periodLabel} count={rows.length} total={total} backHref={backHref}>
      <ExpenseHistoryList expenses={rows} />
    </DetailShell>
  )
}

function DetailShell({
  kind, typeName, periodLabel, count, total, backHref, children,
}: {
  kind: 'income' | 'expense'
  typeName: string
  periodLabel: string
  count: number
  total: number
  backHref: string
  children: React.ReactNode
}) {
  const accent = kind === 'expense' ? 'text-rose-600' : 'text-blue-600'
  const kindLabel = kind === 'expense' ? '지출' : '수입(헌금)'

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← 재정집계표로
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>{kindLabel}</span>
          <span className="text-xs text-gray-400">{periodLabel}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{typeName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          총 {count.toLocaleString()}건 · <span className={`font-semibold ${accent}`}>{total.toLocaleString()}원</span>
        </p>
      </div>

      <p className="text-xs text-gray-400">날짜를 펼쳐 개별 내역을 확인하고, ✏️ 로 금액·내용을 바로 수정하거나 🗑️ 로 삭제할 수 있습니다.</p>

      {children}
    </div>
  )
}
