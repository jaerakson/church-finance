import { Suspense } from 'react'
import { getExpenses } from '@/lib/google-sheets'
import { EXPENSE_TYPES, lookupName } from '@/lib/constants'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import CsvDownloadButton from '@/components/ui/CsvDownloadButton'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

const DISPLAY_CAP = 500

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default async function ExpenseDetailPage({ searchParams }: Props) {
  const { year } = await searchParams
  const defYear = currentYear()
  const selectedYear = !year ? defYear : (year === 'all' ? 'all' : year)

  const allExpenses = await getExpenses().catch(() => [])
  const years = [...new Set(allExpenses.map((e) => e.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  const rows = (selectedYear === 'all' ? allExpenses : allExpenses.filter((e) => e.date?.startsWith(selectedYear)))
    .slice()
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const total = rows.reduce((s, e) => s + parseAmount(e.amount), 0)

  const csvHeaders = ['날짜', '지출종류', '내역', '금액', '비고']
  const csvRows = rows.map((e) => [
    e.date,
    lookupName(EXPENSE_TYPES, e.typeKey),
    e.description ?? '',
    parseAmount(e.amount),
    e.note ?? '',
  ])
  const fileLabel = selectedYear === 'all' ? '전체' : selectedYear
  const shown = rows.slice(0, DISPLAY_CAP)

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

      {shown.length < rows.length && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          화면에는 최신 {DISPLAY_CAP.toLocaleString()}건만 표시됩니다. 전체 {rows.length.toLocaleString()}건은 CSV로 다운로드하세요.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">날짜</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">지출종류</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">내역</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">금액</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {shown.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>
            ) : (
              shown.map((e) => (
                <tr key={e.rowIndex} className="hover:bg-rose-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{e.date}</td>
                  <td className="px-4 py-2.5 text-gray-600">{lookupName(EXPENSE_TYPES, e.typeKey)}</td>
                  <td className="px-4 py-2.5 text-gray-900">{e.description}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{parseAmount(e.amount).toLocaleString()}원</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{e.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
