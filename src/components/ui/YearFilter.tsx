'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface Props {
  years: string[]
  allowAll?: boolean
}

export default function YearFilter({ years, allowAll = true }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const raw = searchParams.get('year') ?? String(new Date().getFullYear())
  // 전체 연도를 허용하지 않는 화면(재정집계표 등)에서는 'all'을 기본연도로 대체
  const current = !allowAll && raw === 'all' ? String(new Date().getFullYear()) : raw

  const onChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString())
    // '전체'도 year=all 로 명시 설정한다. (param 삭제 시 페이지가 기본연도로 되돌아가는 버그 방지)
    params.set('year', year)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={current === '' ? (allowAll ? 'all' : (years[0] ?? '')) : current}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 font-medium text-gray-900 dark:text-gray-100"
    >
      {allowAll && <option value="all">전체 연도</option>}
      {years.map((y) => (
        <option key={y} value={y}>{y}년</option>
      ))}
    </select>
  )
}
