import Link from 'next/link'
import { Suspense } from 'react'
import { getMembers, getOfferings, getExpenses } from '@/lib/google-sheets'
import { Offering, Expense } from '@/lib/types'
import { currentYear, today, sundaysUpTo } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import MissingSundayCheck, { SundayStatus } from '@/components/dashboard/MissingSundayCheck'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

function parseAmount(val: string): number {
  return Number(val.replace(/,/g, '')) || 0
}

function buildYearlyStats(offerings: Offering[], expenses: Expense[]) {
  const map: Record<string, { offering: number; expense: number }> = {}
  for (const o of offerings) {
    const year = o.date?.slice(0, 4)
    if (!year) continue
    map[year] = map[year] ?? { offering: 0, expense: 0 }
    map[year].offering += parseAmount(o.amount)
  }
  for (const e of expenses) {
    const year = e.date?.slice(0, 4)
    if (!year) continue
    map[year] = map[year] ?? { offering: 0, expense: 0 }
    map[year].expense += parseAmount(e.amount)
  }
  return Object.entries(map)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, { offering, expense }]) => ({ year, offering, expense, balance: offering - expense }))
}

export default async function DashboardPage({ searchParams }: Props) {
  const { year } = await searchParams
  const selectedYear = (!year || year === 'all') ? 'all' : year
  const defYear = currentYear()

  let members: Awaited<ReturnType<typeof getMembers>> = []
  let allOfferings: Offering[] = []
  let allExpenses: Expense[] = []
  let error = false

  try {
    ;[members, allOfferings, allExpenses] = await Promise.all([getMembers(), getOfferings(), getExpenses()])
  } catch {
    error = true
  }

  const years = [...new Set([
    ...allOfferings.map((o) => o.date?.slice(0, 4)),
    ...allExpenses.map((e) => e.date?.slice(0, 4)),
  ].filter(Boolean))].sort().reverse() as string[]

  const offerings = selectedYear === 'all' ? allOfferings : allOfferings.filter((o) => o.date?.startsWith(selectedYear))
  const expenses  = selectedYear === 'all' ? allExpenses  : allExpenses.filter((e)  => e.date?.startsWith(selectedYear))

  const totalOffering = offerings.reduce((s, o) => s + parseAmount(o.amount), 0)
  const totalExpense  = expenses.reduce((s, e)  => s + parseAmount(e.amount), 0)
  const yearlyStats   = buildYearlyStats(allOfferings, allExpenses)

  // 주일 입력 체크: 선택 연도(전체면 올해)의 1월 첫 주일~오늘까지 중 헌금/지출 누락 주 탐지
  const checkYear = selectedYear === 'all' ? defYear : selectedYear
  const offeringDates = new Set(allOfferings.map((o) => o.date))
  const expenseDates  = new Set(allExpenses.map((e) => e.date))
  const sundayStatuses: SundayStatus[] = sundaysUpTo(checkYear, today()).map((date) => ({
    date,
    hasOffering: offeringDates.has(date),
    hasExpense: expenseDates.has(date),
  }))

  const activeMemberCount = members.filter((m) => !m.hidden).length

  const stats = [
    { label: '총 교인 수',    value: `${activeMemberCount}명`,                            color: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',       icon: '👥' },
    { label: selectedYear === 'all' ? '누적 헌금' : `${selectedYear}년 헌금`, value: `${totalOffering.toLocaleString()}원`, color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300', icon: '💰' },
    { label: selectedYear === 'all' ? '누적 지출' : `${selectedYear}년 지출`, value: `${totalExpense.toLocaleString()}원`, color: 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300', icon: '📤' },
    { label: '잔액',          value: `${(totalOffering - totalExpense).toLocaleString()}원`, color: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',     icon: '📊' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">검암중앙교회 재정 현황</p>
        </div>
        <Suspense>
          <YearFilter years={years.length ? years : [defYear]} />
        </Suspense>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm">
          Google Sheets 데이터를 불러오지 못했습니다. API 연결을 확인해주세요.
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${s.color} text-xl mb-3`}>
              {s.icon}
            </div>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 주일 입력 체크 */}
      {!error && sundayStatuses.length > 0 && (
        <MissingSundayCheck year={checkYear} sundays={sundayStatuses} />
      )}

      {/* 연도별 통계 */}
      {yearlyStats.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">연도별 재정 통계</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">연도</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">헌금</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">지출</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">잔액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {yearlyStats.map((r) => (
                  <tr key={r.year} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${r.year === defYear ? 'bg-blue-50 dark:bg-blue-950' : 'dark:bg-gray-900'}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{r.year}년{r.year === defYear && <span className="ml-2 text-[10px] text-blue-500 dark:text-blue-400 font-normal">올해</span>}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-300 font-medium">{r.offering.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-medium">{r.expense.toLocaleString()}원</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.balance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-rose-600 dark:text-rose-400'}`}>
                      {r.balance.toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 퀵 액션 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/members',      label: '교인명부',  icon: '👥', cls: 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100' },
          { href: '/members/new',  label: '교인 등록', icon: '➕', cls: 'bg-blue-600 text-white' },
          { href: '/offering/new', label: '헌금 입력', icon: '💰', cls: 'bg-emerald-600 text-white' },
          { href: '/expense/new',  label: '지출 입력', icon: '📤', cls: 'bg-rose-600 text-white' },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className={`rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col items-center gap-2 text-center ${a.cls}`}>
            <span className="text-2xl">{a.icon}</span>
            <span className="text-sm font-semibold">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
