import { Suspense } from 'react'
import { getMembers } from '@/lib/google-sheets'
import OfferingInputClient from './OfferingInputClient'

export default async function NewOfferingPage() {
  const members = await getMembers().catch(() => [])
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">헌금 입력</h1>
        <p className="text-sm text-gray-500 mt-1">교인명을 검색하고 헌금을 연속 입력하세요.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-gray-400">폼 로딩 중...</div>}>
        <OfferingInputClient members={members} />
      </Suspense>
    </div>
  )
}
