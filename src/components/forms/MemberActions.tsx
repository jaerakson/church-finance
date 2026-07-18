'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  rowIndex: number
  name: string
  hidden: boolean
  hasOfferings: boolean
}

export default function MemberActions({ rowIndex, name, hidden, hasOfferings }: Props) {
  const router = useRouter()
  const [isHidden, setIsHidden] = useState(hidden)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleHidden = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/members/${rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !isHidden }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setIsHidden((v) => !v)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const remove = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/members/${rowIndex}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      router.push('/members')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
      setConfirmingDelete(false)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-lg px-3 py-2 text-xs">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleHidden}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
        >
          {isHidden ? '숨김 해제' : '숨기기 (교인 목록에서 제외)'}
        </button>

        {hasOfferings ? (
          <span className="text-xs text-gray-400" title="헌금 기록이 있는 교인은 삭제할 수 없습니다.">
            헌금 기록이 있어 삭제할 수 없습니다 · 숨기기를 사용하세요
          </span>
        ) : confirmingDelete ? (
          <span className="flex items-center gap-2">
            <span className="text-xs text-rose-600">{name}님을 삭제할까요? 되돌릴 수 없습니다.</span>
            <button
              type="button"
              onClick={remove}
              disabled={loading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={loading}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md text-xs font-medium transition-colors"
            >
              취소
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
          >
            삭제
          </button>
        )}
      </div>

      {isHidden && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          숨김 상태입니다 — 헌금 입력 목록에서 제외됩니다. (헌금 현황·성도별 내역에는 그대로 표시됩니다)
        </p>
      )}
    </div>
  )
}
