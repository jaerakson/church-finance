'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface Props {
  dates: string[]
  defaultDate: string
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

export default function DateFilter({ dates, defaultDate }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('date') || defaultDate

  const onChange = (date: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (date === 'all') {
      params.delete('date')
    } else {
      params.set('date', date)
    }
    params.delete('year')
    router.push(`${pathname}?${params.toString()}`)
  }

  const formatDateLabel = (d: string) => {
    if (d === 'all') return '전체 기간'
    try {
      const date = new Date(d + 'T00:00:00')
      return `${d} (${DAY_KO[date.getDay()]})`
    } catch {
      return d
    }
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-700"
    >
      {dates.map((d) => (
        <option key={d} value={d}>
          {formatDateLabel(d)}
        </option>
      ))}
    </select>
  )
}
