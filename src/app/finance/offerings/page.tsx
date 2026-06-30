import { Suspense } from 'react'
import { getOfferings, getMembers } from '@/lib/google-sheets'
import { OFFERING_TYPES, lookupName } from '@/lib/constants'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import CsvDownloadButton from '@/components/ui/CsvDownloadButton'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

const DISPLAY_CAP = 500

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default async function OfferingDetailPage({ searchParams }: Props) {
  const { year } = await searchParams
  const defYear = currentYear()
  const selectedYear = !year ? defYear : (year === 'all' ? 'all' : year)

  const [allOfferings, members] = await Promise.all([getOfferings(), getMembers()]).catch(() => [[], []])
  const memberMap = Object.fromEntries(members.map((m) => [m.key, m.name]))
  const years = [...new Set(allOfferings.map((o) => o.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  const rows = (selectedYear === 'all' ? allOfferings : allOfferings.filter((o) => o.date?.startsWith(selectedYear)))
    .slice()
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const total = rows.reduce((s, o) => s + parseAmount(o.amount), 0)

  const csvHeaders = ['날짜', '교인', '헌금종류', '금액', '비고']
  const csvRows = rows.map((o) => [
    o.date,
    memberMap[o.memberKey] ?? o.memberKey,
    lookupName(OFFERING_TYPES, o.typeKey),
    parseAmount(o.amount),
    o.note ?? '',
  ])
  const fileLabel = selectedYear === 'all' ? '전체' : selectedYear
  const shown = rows.slice(0, DISPLAY_CAP)

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
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">교인</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">헌금종류</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">금액</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {shown.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>
            ) : (
              shown.map((o) => (
                <tr key={o.rowIndex} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{o.date}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{memberMap[o.memberKey] ?? o.memberKey}</td>
                  <td className="px-4 py-2.5 text-gray-600">{lookupName(OFFERING_TYPES, o.typeKey)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{parseAmount(o.amount).toLocaleString()}원</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{o.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
