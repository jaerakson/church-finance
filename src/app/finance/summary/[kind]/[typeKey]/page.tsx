import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getOfferings, getExpenses, getMembers, getLookupRows } from '@/lib/google-sheets'
import { OFFERING_TYPES, EXPENSE_TYPES, lookupName } from '@/lib/constants'
import { Offering, Expense } from '@/lib/types'
import { currentYear } from '@/lib/date'
import OfferingHistoryList from '@/components/offering/OfferingHistoryList'
import ExpenseHistoryList from '@/components/expense/ExpenseHistoryList'
import ViewSwitch from '@/components/finance/ViewSwitch'
import PivotGrid, { PivotCell, PivotRowDef, PivotEntry } from '@/components/finance/PivotGrid'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ kind: string; typeKey: string }>
  searchParams: Promise<{ year?: string; half?: string; scope?: string; view?: string }>
}

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

const SCOPE_LABEL: Record<string, string> = { current: '현누계', prev: '직전누계', total: '총합계' }

type Pivot = { rows: PivotRowDef[]; dates: string[]; cells: Record<string, Record<string, PivotCell>> }

// 행(이름) × 열(날짜) 매트릭스. 같은 (행,날짜)에 2건 이상이면 합계만 표시(count>1).
function buildPivot(
  items: { rowIndex: number; date: string; amount: string; note?: string; rowKey: string; label: string; extra: Partial<PivotEntry> }[],
): Pivot {
  const cells: Record<string, Record<string, PivotCell>> = {}
  const rowMap = new Map<string, string>()
  const dateSet = new Set<string>()
  for (const it of items) {
    rowMap.set(it.rowKey, it.label)
    dateSet.add(it.date)
    const amt = parseAmount(it.amount)
    const byDate = (cells[it.rowKey] ??= {})
    const cur = byDate[it.date]
    if (!cur) {
      byDate[it.date] = { amount: amt, count: 1, entry: { rowIndex: it.rowIndex, date: it.date, amount: amt, note: it.note ?? '', ...it.extra } }
    } else {
      cur.amount += amt
      cur.count += 1
      cur.entry = null
    }
  }
  const rows = [...rowMap.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, 'ko'))
  const dates = [...dateSet].sort()
  return { rows, dates, cells }
}

export default async function SummaryDetailPage({ params, searchParams }: Props) {
  const { kind, typeKey: rawKey } = await params
  if (kind !== 'income' && kind !== 'expense') notFound()

  const typeKey = decodeURIComponent(rawKey)
  const sp = await searchParams
  const defYear = currentYear()
  const year = sp.year === 'all' || !sp.year ? defYear : sp.year
  const half = sp.half === '1' ? '1' : sp.half === '2' ? '2' : (new Date().getMonth() + 1 >= 7 ? '2' : '1')
  const scope = sp.scope === 'current' || sp.scope === 'prev' ? sp.scope : 'total'
  const view = sp.view === 'grid' ? 'grid' : 'list'

  const monthNum = (d?: string) => Number((d ?? '').slice(5, 7)) || 0
  const inScope = (d?: string) => {
    if (!(d ?? '').startsWith(year)) return false
    const m = monthNum(d)
    if (scope === 'current') return half === '1' ? m <= 6 : m >= 7
    if (scope === 'prev') return half === '2' && m <= 6
    return half === '1' ? m <= 6 : m <= 12
  }

  const periodLabel = `${year}년 ${half === '1' ? '상반기' : '하반기'} · ${SCOPE_LABEL[scope]}`
  const backHref = `/finance/summary?year=${encodeURIComponent(year)}&half=${half}`

  if (kind === 'income') {
    const [allOfferings, members, offeringTypes] = await Promise.all([
      getOfferings().catch(() => [] as Offering[]),
      getMembers().catch(() => []),
      getLookupRows('offeringType').catch(() => OFFERING_TYPES),
    ])
    const memberMap = Object.fromEntries(members.map((m) => [m.key, m.name]))
    const rows = allOfferings.filter((o) => o.typeKey === typeKey && inScope(o.date))
    const total = rows.reduce((s, o) => s + parseAmount(o.amount), 0)
    const typeName = lookupName(offeringTypes, typeKey)

    const body =
      view === 'grid' ? (
        <PivotGrid
          kind="income"
          typeKey={typeKey}
          accent="blue"
          {...buildPivot(rows.map((o) => ({
            rowIndex: o.rowIndex, date: o.date, amount: o.amount, note: o.note,
            rowKey: o.memberKey, label: memberMap[o.memberKey] ?? o.memberKey, extra: { memberKey: o.memberKey },
          })))}
        />
      ) : (
        <OfferingHistoryList offerings={rows} memberMap={memberMap} />
      )

    return (
      <DetailShell kind="income" typeName={typeName} periodLabel={periodLabel} count={rows.length} total={total} backHref={backHref}>
        {body}
      </DetailShell>
    )
  }

  const [allExpenses, expenseTypes] = await Promise.all([
    getExpenses().catch(() => [] as Expense[]),
    getLookupRows('expenseType').catch(() => EXPENSE_TYPES),
  ])
  const rows = allExpenses.filter((e) => e.typeKey === typeKey && inScope(e.date))
  const total = rows.reduce((s, e) => s + parseAmount(e.amount), 0)
  const typeName = lookupName(expenseTypes, typeKey)

  const body =
    view === 'grid' ? (
      <PivotGrid
        kind="expense"
        typeKey={typeKey}
        accent="rose"
        {...buildPivot(rows.map((e) => ({
          rowIndex: e.rowIndex, date: e.date, amount: e.amount, note: e.note,
          rowKey: e.description ?? '', label: (e.description ?? '').trim() || '(내역 없음)', extra: { description: e.description },
        })))}
      />
    ) : (
      <ExpenseHistoryList expenses={rows} />
    )

  return (
    <DetailShell kind="expense" typeName={typeName} periodLabel={periodLabel} count={rows.length} total={total} backHref={backHref}>
      {body}
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

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>{kindLabel}</span>
            <span className="text-xs text-gray-400">{periodLabel}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{typeName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            총 {count.toLocaleString()}건 · <span className={`font-semibold ${accent}`}>{total.toLocaleString()}원</span>
          </p>
        </div>
        <ViewSwitch />
      </div>

      {children}
    </div>
  )
}
