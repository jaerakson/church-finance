import Link from 'next/link'
import { Suspense } from 'react'
import { getExpenses, getLookupRows } from '@/lib/google-sheets'
import { EXPENSE_TYPES } from '@/lib/constants'
import { currentYear } from '@/lib/date'
import YearFilter from '@/components/ui/YearFilter'
import ExpenseHistoryList from '@/components/expense/ExpenseHistoryList'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default async function ExpensePage({ searchParams }: Props) {
  const { year } = await searchParams
  const defaultYear = currentYear()
  const selectedYear = year === 'all' ? 'all' : (year || defaultYear)

  const [allExpenses, expenseTypes] = await Promise.all([
    getExpenses().catch(() => []),
    getLookupRows('expenseType').catch(() => EXPENSE_TYPES),
  ])
  const years = [...new Set(allExpenses.map((e) => e.date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  const expenses = selectedYear === 'all'
    ? allExpenses
    : allExpenses.filter((e) => e.date?.startsWith(selectedYear))

  const grandTotal = expenses.reduce((s, e) => s + parseAmount(e.amount), 0)

  const totalByType = expenseTypes.map((t) => {
    const total = expenses.filter((e) => e.typeKey === t.key).reduce((s, e) => s + parseAmount(e.amount), 0)
    return { ...t, total }
  }).filter((t) => t.total > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">지출 내역</h1>
          <p className="text-sm text-gray-500 mt-1">총 {expenses.length}건 · {grandTotal.toLocaleString()}원</p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <YearFilter years={years.length ? years : [defaultYear]} />
          </Suspense>
          <Link href="/expense/new"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors">
            + 지출 입력
          </Link>
        </div>
      </div>

      {/* 종류별 요약 */}
      {totalByType.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {totalByType.map((t) => (
            <div key={t.key} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">{t.name}</p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">{t.total.toLocaleString()}원</p>
            </div>
          ))}
        </div>
      )}

      {/* 날짜별 지출 내역 (최근 5건 고정 · 펼침) */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">지출 내역</h2>
        <ExpenseHistoryList expenses={expenses} />
      </div>
    </div>
  )
}
