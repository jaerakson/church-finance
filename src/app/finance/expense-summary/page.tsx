import { Suspense } from 'react'
import { getExpenses, getAllLookups } from '@/lib/google-sheets'
import { EXPENSE_TYPES, CATEGORIES } from '@/lib/constants'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import CsvDownloadButton from '@/components/ui/CsvDownloadButton'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

// 지출재정집계표 컬럼 — 관(대분류)을 기준으로 그룹핑
const COLS: { label: string; categoryKeys: string[] }[] = [
  { label: '예배비', categoryKeys: ['3'] },
  { label: '선교비', categoryKeys: ['4'] },
  { label: '교육비', categoryKeys: ['5'] },
  { label: '관리비', categoryKeys: ['6'] },
]
const BUILD_CAT = '99' // 건축비

type DayRow = {
  month: string
  day: string
  cols: number[]      // COLS 순서대로
  sumExBuild: number  // 합계(건축비외)
  build: number       // 건축비
  note: string
}

export default async function ExpenseSummaryPage({ searchParams }: Props) {
  const { year } = await searchParams
  const defYear = currentYear()
  const selectedYear = !year ? defYear : (year === 'all' ? 'all' : year)

  const [allExpenses, lookups] = await Promise.all([
    getExpenses().catch(() => []),
    getAllLookups().catch(() => null),
  ])
  const expenseTypes = lookups?.expenseType ?? EXPENSE_TYPES
  const categories = lookups?.category ?? CATEGORIES

  const years = [...new Set(allExpenses.map((e) => e.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]
  const expenses = selectedYear === 'all' ? allExpenses : allExpenses.filter((e) => e.date?.startsWith(selectedYear))

  // 날짜별 집계
  const byDate: Record<string, typeof expenses> = {}
  for (const e of expenses) {
    if (!e.date) continue
    ;(byDate[e.date] ??= []).push(e)
  }

  // 각 지출 항목이 어떤 '관(categoryKey)'에 속하는지 매핑
  const typeToCat: Record<string, string> = {}
  for (const t of expenseTypes) {
    if (t.categoryKey) typeToCat[t.key] = t.categoryKey
  }

  const days: DayRow[] = Object.keys(byDate).sort().map((date) => {
    const items = byDate[date]
    const cols = COLS.map((c) => 
      items
        .filter((e) => c.categoryKeys.includes(typeToCat[e.typeKey]))
        .reduce((s, e) => s + parseAmount(e.amount), 0)
    )
    const sumExBuild = cols.reduce((s, n) => s + n, 0)
    const build = items
      .filter((e) => typeToCat[e.typeKey] === BUILD_CAT)
      .reduce((s, e) => s + parseAmount(e.amount), 0)
      
    // 비고에는 항목 내역을 간략히 모아서 표시 (빈 값 제외)
    const note = Array.from(new Set(items.map(e => e.description || e.note).filter(Boolean))).join(', ')
    
    return { month: date.slice(5, 7), day: date.slice(8, 10), cols, sumExBuild, build, note }
  })

  // 월별 그룹 + 월 총계
  const months = [...new Set(days.map((d) => d.month))]
  const zero = () => COLS.map(() => 0)
  const sumRows = (rows: DayRow[]) => ({
    cols: rows.reduce((acc, r) => acc.map((v, i) => v + r.cols[i]), zero()),
    sumExBuild: rows.reduce((s, r) => s + r.sumExBuild, 0),
    build: rows.reduce((s, r) => s + r.build, 0),
  })
  const grand = sumRows(days)

  // CSV
  const csvHeaders = ['월', '일', ...COLS.map((c) => c.label), '합계(건축비외)', '건축비', '내역(비고)']
  const csvRows: (string | number)[][] = []
  for (const m of months) {
    const md = days.filter((d) => d.month === m)
    for (const d of md) csvRows.push([m, d.day, ...d.cols, d.sumExBuild, d.build, d.note])
    const ms = sumRows(md)
    csvRows.push([`${m} 총계`, '', ...ms.cols, ms.sumExBuild, ms.build, ''])
  }
  csvRows.push(['총계', '', ...grand.cols, grand.sumExBuild, grand.build, ''])

  const fileLabel = selectedYear === 'all' ? '전체' : selectedYear

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">지출재정집계표</h1>
          <p className="text-sm text-gray-500 mt-1">일별 지출 내역 · 합계(건축외) {grand.sumExBuild.toLocaleString()}원 · 건축 {grand.build.toLocaleString()}원</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <YearFilter years={years.length ? years : [defYear]} />
          </Suspense>
          <CsvDownloadButton filename={`지출재정집계표_${fileLabel}.csv`} headers={csvHeaders} rows={csvRows} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <th className="px-3 py-2.5 text-center font-semibold">월</th>
              <th className="px-3 py-2.5 text-center font-semibold">일</th>
              {COLS.map((c) => <th key={c.label} className="px-3 py-2.5 text-right font-semibold">{c.label}</th>)}
              <th className="px-3 py-2.5 text-right font-semibold">합계(건축외)</th>
              <th className="px-3 py-2.5 text-right font-semibold">건축비</th>
              <th className="px-3 py-2.5 text-left font-semibold">내역(비고)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {days.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>
            ) : (
              months.map((m) => {
                const md = days.filter((d) => d.month === m)
                const ms = sumRows(md)
                return [
                  ...md.map((d, idx) => (
                    <tr key={`${m}-${d.day}-${idx}`} className="hover:bg-rose-50/50">
                      <td className="px-3 py-2 text-center text-gray-400">{idx === 0 ? `${Number(m)}월` : ''}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{Number(d.day)}</td>
                      {d.cols.map((n, i) => <td key={i} className="px-3 py-2 text-right text-gray-700">{n ? n.toLocaleString() : '-'}</td>)}
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{d.sumExBuild.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{d.build ? d.build.toLocaleString() : '-'}</td>
                      <td className="px-3 py-2 text-left text-xs text-gray-400 max-w-xs truncate" title={d.note}>{d.note}</td>
                    </tr>
                  )),
                  <tr key={`${m}-total`} className="bg-amber-50/60 font-semibold border-t border-amber-100">
                    <td className="px-3 py-2 text-center text-amber-700" colSpan={2}>{Number(m)}월 총계</td>
                    {ms.cols.map((n, i) => <td key={i} className="px-3 py-2 text-right text-amber-800">{n.toLocaleString()}</td>)}
                    <td className="px-3 py-2 text-right text-amber-900">{ms.sumExBuild.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-amber-800">{ms.build.toLocaleString()}</td>
                    <td />
                  </tr>,
                ]
              })
            )}
            {days.length > 0 && (
              <tr className="bg-rose-50 font-bold border-t-2 border-rose-200">
                <td className="px-3 py-2.5 text-center text-rose-800" colSpan={2}>총계</td>
                {grand.cols.map((n, i) => <td key={i} className="px-3 py-2.5 text-right text-rose-900">{n.toLocaleString()}</td>)}
                <td className="px-3 py-2.5 text-right text-rose-900">{grand.sumExBuild.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right text-rose-900">{grand.build.toLocaleString()}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
