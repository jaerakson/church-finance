'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface Props {
  months: string[]
  defaultMonth: string
}

export default function MonthFilter({ months, defaultMonth }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('month') || defaultMonth

  const onChange = (month: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (month === 'all') {
      params.delete('month')
    } else {
      params.set('month', month)
    }
    // 월 필터를 적용하면 연도 필터와 충돌하므로 year 파라미터는 삭제합니다.
    params.delete('year')
    router.push(`${pathname}?${params.toString()}`)
  }

  const formatMonthLabel = (m: string) => {
    if (m === 'all') return '전체 기간'
    const [y, mm] = m.split('-')
    return `${y}년 ${Number(mm)}월`
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 font-medium text-gray-700 dark:text-gray-300"
    >
      <option value="all">전체 월 선택</option>
      {months.map((m) => (
        <option key={m} value={m}>
          {formatMonthLabel(m)}
        </option>
      ))}
    </select>
  )
}
