import { Suspense } from 'react'
import Link from 'next/link'
import { getOfferings, getExpenses, getAllLookups, getBudgetMap } from '@/lib/google-sheets'
import { OFFERING_TYPES, EXPENSE_TYPES, CATEGORIES } from '@/lib/constants'
import { LookupItem } from '@/lib/types'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import HalfFilter from '@/components/ui/HalfFilter'
import CsvDownloadButton from '@/components/ui/CsvDownloadButton'
import SummaryPivot, { PivotSection } from '@/components/finance/SummaryPivot'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string; half?: string }> }

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

type Totals = { budget: number; prev: number; current: number; total: number }

// 항목을 관(대분류)별로 묶어 예산·직전누계·현누계·총합계를 계산한다.
// 합계가 실제 데이터와 항상 일치하도록, 목록에 없는 코드값(orphan)도 '기타'에 포함한다.
function buildSections(
  types: LookupItem[],
  currentMap: Record<string, number>,
  prevMap: Record<string, number>,
  budgetMap: Record<string, number>,
  categories: LookupItem[],
): { sections: PivotSection[]; grand: Totals } {
  const sections: PivotSection[] = []
  const covered = new Set<string>()

  const makeItem = (key: string, name: string) => {
    const current = currentMap[key] ?? 0
    const prev = prevMap[key] ?? 0
    return { key, name, budget: budgetMap[key] ?? 0, prev, current, total: prev + current }
  }
  const sum = (items: ReturnType<typeof makeItem>[]): Totals => ({
    budget: items.reduce((s, i) => s + i.budget, 0),
    prev: items.reduce((s, i) => s + i.prev, 0),
    current: items.reduce((s, i) => s + i.current, 0),
    total: items.reduce((s, i) => s + i.total, 0),
  })

  for (const cat of categories) {
    const catTypes = types.filter((t) => t.categoryKey === cat.key)
    if (!catTypes.length) continue
    catTypes.forEach((t) => covered.add(t.key))
    const items = catTypes.map((t) => makeItem(t.key, t.name))
    sections.push({ category: cat.name, items, subtotal: sum(items) })
  }

  const etc: ReturnType<typeof makeItem>[] = []
  for (const t of types) {
    if (!covered.has(t.key)) { etc.push(makeItem(t.key, t.name)); covered.add(t.key) }
  }
  for (const key of new Set([...Object.keys(currentMap), ...Object.keys(prevMap)])) {
    if (!covered.has(key)) { etc.push(makeItem(key, `(코드 ${key})`)); covered.add(key) }
  }
  if (etc.length) sections.push({ category: '기타', items: etc, subtotal: sum(etc) })

  const grand = sum(sections.flatMap((s) => s.items))
  return { sections, grand }
}

export default async function SummaryPage({ searchParams }: Props) {
  const { year, half: halfParam } = await searchParams
  const defYear = currentYear()
  const selectedYear = year === 'all' ? 'all' : (year || defYear)
  // 재정집계는 반기 결산 구조 → 연도 지정 필수. 'all'이면 기본연도로 대체.
  const activeYear = selectedYear === 'all' ? defYear : selectedYear
  const half = halfParam === '1' ? '1' : halfParam === '2' ? '2' : (new Date().getMonth() + 1 >= 7 ? '2' : '1')

  const [allOfferings, allExpenses, lookups, budgets] = await Promise.all([
    getOfferings().catch(() => []),
    getExpenses().catch(() => []),
    getAllLookups().catch(() => null),
    getBudgetMap(activeYear).catch(() => ({ income: {}, expense: {} })),
  ])
  const categories: LookupItem[] = lookups?.category ?? CATEGORIES
  const offeringTypes: LookupItem[] = lookups?.offeringType ?? OFFERING_TYPES
  const expenseTypes: LookupItem[] = lookups?.expenseType ?? EXPENSE_TYPES
  const years = [...new Set([...allOfferings, ...allExpenses].map((r) => r.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  const monthNum = (d?: string) => Number((d ?? '').slice(5, 7)) || 0
  const inCurrent = (d?: string) => (d ?? '').startsWith(activeYear) && (half === '1' ? monthNum(d) <= 6 : monthNum(d) >= 7)
  const inPrev = (d?: string) => half === '2' && (d ?? '').startsWith(activeYear) && monthNum(d) <= 6

  const sumBy = (rows: { typeKey: string; amount: string; date: string }[], pred: (d: string) => boolean) => {
    const m: Record<string, number> = {}
    for (const r of rows) if (pred(r.date)) m[r.typeKey] = (m[r.typeKey] ?? 0) + parseAmount(r.amount)
    return m
  }

  const income = buildSections(offeringTypes, sumBy(allOfferings, inCurrent), sumBy(allOfferings, inPrev), budgets.income, categories)
  const expense = buildSections(expenseTypes, sumBy(allExpenses, inCurrent), sumBy(allExpenses, inPrev), budgets.expense, categories)

  const halfLabel = half === '1' ? '상반기(1~6월)' : '하반기(7~12월)'

  // CSV — 구분 | 관 | 항목 | 예산 | 직전누계 | 현누계 | 총합계
  const csvHeaders = ['구분', '관', '항목', '예산', '직전누계', '현누계', '총합계']
  const csvRows: (string | number)[][] = []
  const pushSections = (label: string, secs: PivotSection[], grand: typeof income.grand) => {
    for (const sec of secs) {
      for (const it of sec.items) csvRows.push([label, sec.category, it.name, it.budget, it.prev, it.current, it.total])
      csvRows.push([label, sec.category, '소계', sec.subtotal.budget, sec.subtotal.prev, sec.subtotal.current, sec.subtotal.total])
    }
    csvRows.push([label, '', label === '수입' ? '총수입' : '총지출', grand.budget, grand.prev, grand.current, grand.total])
  }
  pushSections('수입', income.sections, income.grand)
  pushSections('지출', expense.sections, expense.grand)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">재정집계표</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeYear}년 {halfLabel} · 수입 {income.grand.total.toLocaleString()}원 · 지출 {expense.grand.total.toLocaleString()}원 · 차액 {(income.grand.total - expense.grand.total).toLocaleString()}원
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Suspense>
            <YearFilter years={years.length ? years : [defYear]} />
          </Suspense>
          <Suspense>
            <HalfFilter />
          </Suspense>
          <CsvDownloadButton filename={`재정집계표_${activeYear}_${half === '1' ? '상반기' : '하반기'}.csv`} headers={csvHeaders} rows={csvRows} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          직전누계 = 같은 해 이전 반기 누계, 현누계 = 선택 반기 실적, 총합계 = 직전+현. 관을 클릭해 접기/펼치기, 항목·금액을 클릭하면 일자별 내역을 수정할 수 있습니다.
        </span>
        <Link href="/finance/budget" className="text-blue-600 hover:text-blue-800 hover:underline px-2 py-2 font-medium whitespace-nowrap">
          연간 예산 일괄 관리 →
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SummaryPivot title="수입 (헌금)" kind="income" sections={income.sections} grand={income.grand} grandLabel="총수입" year={activeYear} half={half} accent="blue" />
        <SummaryPivot title="지출" kind="expense" sections={expense.sections} grand={expense.grand} grandLabel="총지출" year={activeYear} half={half} accent="rose" />
      </div>
    </div>
  )
}
