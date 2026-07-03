import { Suspense } from 'react'
import ExpenseInputClient from './ExpenseInputClient'

export default function NewExpensePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">지출 입력</h1>
        <p className="text-sm text-gray-500 mt-1">지출 종류를 검색하고 금액을 입력하세요.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-gray-400">폼 로딩 중...</div>}>
        <ExpenseInputClient />
      </Suspense>
    </div>
  )
}
