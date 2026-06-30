'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface Props {
  years: string[]
}

export default function YearFilter({ years }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('year') ?? String(new Date().getFullYear())

  const onChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (year === 'all') {
      params.delete('year')
    } else {
      params.set('year', year)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={current === '' ? 'all' : current}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
    >
      <option value="all">전체 연도</option>
      {years.map((y) => (
        <option key={y} value={y}>{y}년</option>
      ))}
    </select>
  )
}
