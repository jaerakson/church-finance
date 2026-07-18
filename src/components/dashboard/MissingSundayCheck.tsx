import Link from 'next/link'
import { formatDateKo } from '@/lib/date'

export interface SundayStatus {
  date: string
  hasOffering: boolean
  hasExpense: boolean
}

interface Props {
  year: string
  /** 검사 대상 주일 전체(오늘까지, 미래 제외) */
  sundays: SundayStatus[]
}

const MAX_SHOWN = 8

export default function MissingSundayCheck({ year, sundays }: Props) {
  // 헌금 또는 지출이 빠진 주일만, 최근 순으로
  const missing = sundays
    .filter((s) => !s.hasOffering || !s.hasExpense)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const shown = missing.slice(0, MAX_SHOWN)
  const rest = missing.length - shown.length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          주일 입력 체크
          <span className="ml-2 text-xs font-normal text-gray-400">{year}년 · 오늘까지</span>
        </h2>
        {missing.length > 0 && (
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 rounded-full px-2.5 py-1">
            미입력 {missing.length}주
          </span>
        )}
      </div>

      {missing.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm px-4 py-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <span className="text-lg">✓</span>
          <span>{year}년 모든 주일의 헌금·지출이 입력되었습니다.</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
          {shown.map((s) => (
            <div key={s.date} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-amber-500">⚠️</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {formatDateKo(s.date)}
                </span>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                {s.hasOffering ? (
                  <span className="text-xs text-gray-400 dark:text-gray-500">헌금 ✓</span>
                ) : (
                  <Link
                    href={`/offering/new?date=${s.date}`}
                    className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-2.5 py-1 transition-colors"
                  >
                    헌금 입력
                  </Link>
                )}
                {s.hasExpense ? (
                  <span className="text-xs text-gray-400 dark:text-gray-500">지출 ✓</span>
                ) : (
                  <Link
                    href={`/expense/new?date=${s.date}`}
                    className="text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md px-2.5 py-1 transition-colors"
                  >
                    지출 입력
                  </Link>
                )}
              </div>
            </div>
          ))}
          {rest > 0 && (
            <p className="px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500">
              그 외 {rest}주가 더 있습니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
