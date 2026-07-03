'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

// 반기 선택: 1=상반기(1~6월), 2=하반기(7~12월)
export default function HalfFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('half') === '1' ? '1' : searchParams.get('half') === '2' ? '2' : ''

  const onChange = (half: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('half', half)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={current || (new Date().getMonth() + 1 >= 7 ? '2' : '1')}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 font-medium text-gray-900 dark:text-gray-100"
    >
      <option value="1">상반기 (1~6월)</option>
      <option value="2">하반기 (7~12월)</option>
    </select>
  )
}
