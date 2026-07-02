import { Suspense } from 'react'
import Link from 'next/link'
import { currentYear } from '@/lib/date'
import { YEARS } from '@/lib/constants'
import YearFilter from '@/components/ui/YearFilter'
import BudgetEditor from '@/components/finance/BudgetEditor'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ year?: string }> }

export default async function BudgetPage({ searchParams }: Props) {
  const { year } = await searchParams
  const activeYear = !year || year === 'all' ? currentYear() : year

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/finance/summary" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            ← 재정집계표로
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">연간 예산 관리</h1>
          <p className="text-sm text-gray-500 mt-1">{activeYear}년 항목별 예산을 입력하면 재정집계표에 반영됩니다. (입력 후 자동 저장)</p>
        </div>
        <Suspense>
          <YearFilter years={YEARS} allowAll={false} />
        </Suspense>
      </div>

      <BudgetEditor key={activeYear} year={activeYear} />
    </div>
  )
}
