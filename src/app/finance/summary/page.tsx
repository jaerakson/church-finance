import { Suspense } from 'react'
import { getOfferings, getExpenses } from '@/lib/google-sheets'
import { OFFERING_TYPES, EXPENSE_TYPES, CATEGORIES } from '@/lib/constants'
import { LookupItem } from '@/lib/types'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import CsvDownloadButton from '@/components/ui/CsvDownloadButton'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

type Section = { category: string; items: { name: string; actual: number }[]; subtotal: number }

// 항목들을 관(대분류)별로 묶어 소계와 함께 섹션으로 만든다.
// 합계가 실제 데이터와 항상 일치하도록, 목록에 없는 코드값(orphan)도 '기타'에 포함한다.
function buildSections(types: LookupItem[], actualByType: Record<string, number>): Section[] {
  const sections: Section[] = []
  const covered = new Set<string>()
  const total = (items: { actual: number }[]) => items.reduce((s, i) => s + i.actual, 0)

  for (const cat of CATEGORIES) {
    const catTypes = types.filter((t) => t.categoryKey === cat.key)
    if (!catTypes.length) continue
    catTypes.forEach((t) => covered.add(t.key))
    const items = catTypes.map((t) => ({ name: t.name, actual: actualByType[t.key] ?? 0 }))
    sections.push({ category: cat.name, items, subtotal: total(items) })
  }

  // 관이 없는 항목 + 데이터에만 존재하는 미등록 코드값
  const etc: { name: string; actual: number }[] = []
  for (const t of types) {
    if (!covered.has(t.key)) { etc.push({ name: t.name, actual: actualByType[t.key] ?? 0 }); covered.add(t.key) }
  }
  for (const [key, amt] of Object.entries(actualByType)) {
    if (!covered.has(key)) { etc.push({ name: `(코드 ${key})`, actual: amt }); covered.add(key) }
  }
  if (etc.length) sections.push({ category: '기타', items: etc, subtotal: total(etc) })
  return sections
}

export default async function SummaryPage({ searchParams }: Props) {
  const { year } = await searchParams
  const defYear = currentYear()
  const selectedYear = !year ? defYear : (year === 'all' ? 'all' : year)

  const [allOfferings, allExpenses] = await Promise.all([getOfferings(), getExpenses()]).catch(() => [[], []])
  const years = [...new Set([...allOfferings, ...allExpenses].map((r) => r.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  const offerings = selectedYear === 'all' ? allOfferings : allOfferings.filter((o) => o.date?.startsWith(selectedYear))
  const expenses = selectedYear === 'all' ? allExpenses : allExpenses.filter((e) => e.date?.startsWith(selectedYear))

  const sumBy = (rows: { typeKey: string; amount: string }[]) => {
    const m: Record<string, number> = {}
    for (const r of rows) m[r.typeKey] = (m[r.typeKey] ?? 0) + parseAmount(r.amount)
    return m
  }
  const incomeSections = buildSections(OFFERING_TYPES, sumBy(offerings))
  const expenseSections = buildSections(EXPENSE_TYPES, sumBy(expenses))

  const totalIncome = incomeSections.reduce((s, x) => s + x.subtotal, 0)
  const totalExpense = expenseSections.reduce((s, x) => s + x.subtotal, 0)

  // CSV — 관 | 항목 | 예산 | 직전누계 | 현누계 | 총합계
  const csvHeaders = ['구분', '관', '항목', '예산', '직전누계', '현누계', '총합계']
  const csvRows: (string | number)[][] = []
  const pushSections = (label: string, sections: Section[], grandLabel: string, grand: number) => {
    for (const sec of sections) {
      for (const it of sec.items) csvRows.push([label, sec.category, it.name, '', '', it.actual, it.actual])
      csvRows.push([label, sec.category, '소계', '', '', sec.subtotal, sec.subtotal])
    }
    csvRows.push([label, '', grandLabel, '', '', grand, grand])
  }
  pushSections('수입', incomeSections, '총수입', totalIncome)
  pushSections('지출', expenseSections, '총지출', totalExpense)
  csvRows.push(['', '', '차액(수입-지출)', '', '', totalIncome - totalExpense, totalIncome - totalExpense])

  const fileLabel = selectedYear === 'all' ? '전체' : selectedYear

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">재정집계표</h1>
          <p className="text-sm text-gray-500 mt-1">
            수입 {totalIncome.toLocaleString()}원 · 지출 {totalExpense.toLocaleString()}원 · 차액 {(totalIncome - totalExpense).toLocaleString()}원
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <YearFilter years={years.length ? years : [defYear]} />
          </Suspense>
          <CsvDownloadButton filename={`재정집계표_${fileLabel}.csv`} headers={csvHeaders} rows={csvRows} />
        </div>
      </div>

      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        예산·직전누계는 입력 항목(추후 지원)이며, 현누계·총합계는 선택 연도의 실제 누계로 자동 계산됩니다.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <SummaryTable title="수입 (헌금)" sections={incomeSections} grandLabel="총수입" grand={totalIncome} accent="blue" />
        <SummaryTable title="지출" sections={expenseSections} grandLabel="총지출" grand={totalExpense} accent="rose" />
      </div>
    </div>
  )
}

function SummaryTable({ title, sections, grandLabel, grand, accent }: { title: string; sections: Section[]; grandLabel: string; grand: number; accent: 'blue' | 'rose' }) {
  const grandColor = accent === 'rose' ? 'text-rose-700 bg-rose-50' : 'text-blue-700 bg-blue-50'
  return (
    <div className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 font-bold text-gray-800">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
            <th className="px-3 py-2 text-left font-semibold">항목</th>
            <th className="px-3 py-2 text-right font-semibold">예산</th>
            <th className="px-3 py-2 text-right font-semibold">직전누계</th>
            <th className="px-3 py-2 text-right font-semibold">현누계</th>
            <th className="px-3 py-2 text-right font-semibold">총합계</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sections.map((sec) => (
            <SectionRows key={sec.category} sec={sec} />
          ))}
          <tr className={`font-bold ${grandColor} border-t-2 border-gray-200`}>
            <td className="px-3 py-2.5">{grandLabel}</td>
            <td className="px-3 py-2.5 text-right text-gray-400">-</td>
            <td className="px-3 py-2.5 text-right text-gray-400">-</td>
            <td className="px-3 py-2.5 text-right">{grand.toLocaleString()}</td>
            <td className="px-3 py-2.5 text-right">{grand.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function SectionRows({ sec }: { sec: Section }) {
  return (
    <>
      <tr className="bg-gray-50/60">
        <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold text-gray-500">{sec.category}</td>
      </tr>
      {sec.items.map((it) => (
        <tr key={it.name} className="hover:bg-gray-50/50">
          <td className="px-3 py-2 pl-6 text-gray-700">{it.name}</td>
          <td className="px-3 py-2 text-right text-gray-300">-</td>
          <td className="px-3 py-2 text-right text-gray-300">-</td>
          <td className="px-3 py-2 text-right text-gray-800">{it.actual ? it.actual.toLocaleString() : '-'}</td>
          <td className="px-3 py-2 text-right text-gray-800">{it.actual ? it.actual.toLocaleString() : '-'}</td>
        </tr>
      ))}
      <tr className="bg-amber-50/40 font-medium">
        <td className="px-3 py-1.5 pl-6 text-amber-700 text-xs">소계</td>
        <td className="px-3 py-1.5 text-right text-gray-300">-</td>
        <td className="px-3 py-1.5 text-right text-gray-300">-</td>
        <td className="px-3 py-1.5 text-right text-amber-800">{sec.subtotal.toLocaleString()}</td>
        <td className="px-3 py-1.5 text-right text-amber-800">{sec.subtotal.toLocaleString()}</td>
      </tr>
    </>
  )
}
