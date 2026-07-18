import { Suspense } from 'react'
import ExpenseInputClient from './ExpenseInputClient'

export default function NewExpensePage() {
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">지출 입력</h1>
      </div>
      <Suspense fallback={<div className="text-sm text-gray-400">폼 로딩 중...</div>}>
        <ExpenseInputClient />
      </Suspense>
    </div>
  )
}
