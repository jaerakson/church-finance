import { Suspense } from 'react'
import { getOfferings } from '@/lib/google-sheets'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import CsvDownloadButton from '@/components/ui/CsvDownloadButton'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

// 수입재정집계표 컬럼 — 스프레드시트 구조와 동일
const COLS: { label: string; keys: string[] }[] = [
  { label: '주정헌금', keys: ['1'] },
  { label: '십일조', keys: ['2'] },
  { label: '감사헌금', keys: ['3'] },
  { label: '선교헌금', keys: ['4'] },
  { label: '절기헌금', keys: ['7', '8', '9', '10', '11'] }, // 신년·부활절·맥추절·추수·성탄
]
const BUILD_KEY = '5' // 건축헌금

type WeekRow = {
  month: string
  day: string
  cols: number[]      // COLS 순서대로
  sumExBuild: number  // 합계(건축헌금외)
  build: number       // 건축헌금
  note: string
}

export default async function IncomeSummaryPage({ searchParams }: Props) {
  const { year } = await searchParams
  const defYear = currentYear()
  const selectedYear = !year ? defYear : (year === 'all' ? 'all' : year)

  const allOfferings = await getOfferings().catch(() => [])
  const years = [...new Set(allOfferings.map((o) => o.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]
  const offerings = selectedYear === 'all' ? allOfferings : allOfferings.filter((o) => o.date?.startsWith(selectedYear))

  // 날짜별 집계
  const byDate: Record<string, typeof offerings> = {}
  for (const o of offerings) {
    if (!o.date) continue
    ;(byDate[o.date] ??= []).push(o)
  }

  const weeks: WeekRow[] = Object.keys(byDate).sort().map((date) => {
    const items = byDate[date]
    const cols = COLS.map((c) => items.filter((o) => c.keys.includes(o.typeKey)).reduce((s, o) => s + parseAmount(o.amount), 0))
    const sumExBuild = cols.reduce((s, n) => s + n, 0)
    const build = items.filter((o) => o.typeKey === BUILD_KEY).reduce((s, o) => s + parseAmount(o.amount), 0)
    const note = items.find((o) => COLS[4].keys.includes(o.typeKey) && o.note?.trim())?.note?.trim() ?? ''
    return { month: date.slice(5, 7), day: date.slice(8, 10), cols, sumExBuild, build, note }
  })

  // 월별 그룹 + 월 총계
  const months = [...new Set(weeks.map((w) => w.month))]
  const zero = () => COLS.map(() => 0)
  const sumRows = (rows: WeekRow[]) => ({
    cols: rows.reduce((acc, r) => acc.map((v, i) => v + r.cols[i]), zero()),
    sumExBuild: rows.reduce((s, r) => s + r.sumExBuild, 0),
    build: rows.reduce((s, r) => s + r.build, 0),
  })
  const grand = sumRows(weeks)

  // CSV (스프레드시트와 동일 구조)
  const csvHeaders = ['월', '주', ...COLS.map((c) => c.label), '합계(건축헌금외)', '건축헌금', '비고']
  const csvRows: (string | number)[][] = []
  for (const m of months) {
    const mw = weeks.filter((w) => w.month === m)
    for (const w of mw) csvRows.push([m, w.day, ...w.cols, w.sumExBuild, w.build, w.note])
    const ms = sumRows(mw)
    csvRows.push([`${m} 총계`, '', ...ms.cols, ms.sumExBuild, ms.build, ''])
  }
  csvRows.push(['총계', '', ...grand.cols, grand.sumExBuild, grand.build, ''])

  const fileLabel = selectedYear === 'all' ? '전체' : selectedYear

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">수입재정집계표</h1>
          <p className="text-sm text-gray-500 mt-1">주별 헌금 수입 · 합계(건축외) {grand.sumExBuild.toLocaleString()}원 · 건축 {grand.build.toLocaleString()}원</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <YearFilter years={years.length ? years : [defYear]} />
          </Suspense>
          <CsvDownloadButton filename={`수입재정집계표_${fileLabel}.csv`} headers={csvHeaders} rows={csvRows} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <th className="px-3 py-2.5 text-center font-semibold">월</th>
              <th className="px-3 py-2.5 text-center font-semibold">주</th>
              {COLS.map((c) => <th key={c.label} className="px-3 py-2.5 text-right font-semibold">{c.label}</th>)}
              <th className="px-3 py-2.5 text-right font-semibold">합계(건축외)</th>
              <th className="px-3 py-2.5 text-right font-semibold">건축헌금</th>
              <th className="px-3 py-2.5 text-left font-semibold">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {weeks.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>
            ) : (
              months.map((m) => {
                const mw = weeks.filter((w) => w.month === m)
                const ms = sumRows(mw)
                return [
                  ...mw.map((w, idx) => (
                    <tr key={`${m}-${w.day}-${idx}`} className="hover:bg-blue-50/50">
                      <td className="px-3 py-2 text-center text-gray-400">{idx === 0 ? `${Number(m)}월` : ''}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{Number(w.day)}</td>
                      {w.cols.map((n, i) => <td key={i} className="px-3 py-2 text-right text-gray-700">{n ? n.toLocaleString() : '-'}</td>)}
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{w.sumExBuild.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{w.build ? w.build.toLocaleString() : '-'}</td>
                      <td className="px-3 py-2 text-left text-xs text-gray-400">{w.note}</td>
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
            {weeks.length > 0 && (
              <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
                <td className="px-3 py-2.5 text-center text-blue-800" colSpan={2}>총계</td>
                {grand.cols.map((n, i) => <td key={i} className="px-3 py-2.5 text-right text-blue-900">{n.toLocaleString()}</td>)}
                <td className="px-3 py-2.5 text-right text-blue-900">{grand.sumExBuild.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right text-blue-900">{grand.build.toLocaleString()}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
