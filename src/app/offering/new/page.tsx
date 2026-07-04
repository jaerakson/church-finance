import { Suspense } from 'react'
import { getMembers } from '@/lib/google-sheets'
import OfferingInputClient from './OfferingInputClient'

// 교인 명단은 매 요청마다 시트에서 새로 읽어야 한다.
// (지정하지 않으면 빌드 시점에 정적 생성되어, 빌드 환경에서 시트 접근이 실패하면
//  members가 빈 배열로 고정되고 신규 교인도 반영되지 않는다)
export const dynamic = 'force-dynamic'

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
