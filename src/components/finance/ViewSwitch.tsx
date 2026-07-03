'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

// 드릴다운 표시 방식 전환: list=기본 보기(날짜별 목록), grid=표 편집(행=이름 × 열=날짜)
export default function ViewSwitch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('view') === 'grid' ? 'grid' : 'list'

  const onChange = (view: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 font-medium"
    >
      <option value="list">기본 보기</option>
      <option value="grid">표 편집 (행=이름·열=날짜)</option>
    </select>
  )
}
