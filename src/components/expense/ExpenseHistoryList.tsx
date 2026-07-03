'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Expense } from '@/lib/types'
import { lookupName } from '@/lib/constants'
import { useLookups } from '@/lib/lookups'
import { dayOfWeekKo } from '@/lib/date'

interface Props {
  expenses: Expense[]
}

const INITIAL_COUNT = 5

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default function ExpenseHistoryList({ expenses }: Props) {
  const router = useRouter()
  const { expenseTypes } = useLookups()

  const byDate = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    acc[e.date] = acc[e.date] ?? []
    acc[e.date].push(e)
    return acc
  }, {})
  const sortedDates = Object.keys(byDate).sort().reverse()

  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const [openDate, setOpenDate] = useState<string | null>(null)

  // 수정/삭제 상태
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [confirmingRow, setConfirmingRow] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 개인화 제안: 같은 지출 종류 기준
  const amountChips = (typeKey: string): string[] => {
    const counts: Record<string, number> = {}
    expenses
      .filter((e) => e.typeKey === typeKey)
      .forEach((e) => {
        const a = e.amount.replace(/,/g, '').trim()
        if (a && Number(a) > 0) counts[a] = (counts[a] ?? 0) + 1
      })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a]) => a)
  }

  const descChips = (typeKey: string): string[] => {
    const seen = new Set<string>()
    expenses
      .filter((e) => e.typeKey === typeKey)
      .forEach((e) => { const d = e.description?.trim(); if (d) seen.add(d) })
    return [...seen].slice(0, 5)
  }

  const startEdit = (e: Expense) => {
    setError(null)
    setConfirmingRow(null)
    setEditingRow(e.rowIndex)
    setEditDescription(e.description ?? '')
    setEditAmount(e.amount.replace(/,/g, '').trim())
    setEditNote(e.note ?? '')
  }

  const cancelEdit = () => {
    setEditingRow(null)
    setEditDescription('')
    setEditAmount('')
    setEditNote('')
  }

  const saveEdit = async (e: Expense) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/expense/${e.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: e.date,
          typeKey: e.typeKey,
          description: editDescription,
          amount: editAmount,
          note: editNote,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      cancelEdit()
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const removeEntry = async (e: Expense) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/expense/${e.rowIndex}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setConfirmingRow(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (sortedDates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center text-gray-400 text-sm">
        데이터가 없습니다.
      </div>
    )
  }

  const visibleDates = sortedDates.slice(0, visibleCount)

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}
      {visibleDates.map((date) => {
        const items = byDate[date]
        const dateTotal = items.reduce((s, e) => s + parseAmount(e.amount), 0)
        const isOpen = openDate === date

        return (
          <div key={date} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* 날짜 헤더 (클릭) */}
            <button
              type="button"
              onClick={() => setOpenDate(isOpen ? null : date)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                <span className="text-sm font-semibold text-gray-800">{date} ({dayOfWeekKo(date)})</span>
                <span className="text-xs text-gray-400">{items.length}건</span>
              </span>
              <span className="text-sm font-bold text-rose-600">{dateTotal.toLocaleString()}원</span>
            </button>

            {/* 펼침: 세부내역 (수정/삭제) */}
            {isOpen && (
              <ul className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50">
                {items.map((e) => (
                  <li key={e.rowIndex} className="px-4 py-2.5 text-sm">
                    {editingRow === e.rowIndex ? (
                      <div className="space-y-2">
                        {/* 개인화 영역: 내역 */}
                        {descChips(e.typeKey).length > 0 && (
                          <div>
                            <p className="text-[11px] text-gray-400 mb-1">자주 쓴 내역</p>
                            <div className="flex flex-wrap gap-1.5">
                              {descChips(e.typeKey).map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => setEditDescription(d)}
                                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                                    editDescription === d
                                      ? 'bg-gray-700 text-white border-gray-700'
                                      : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                                  }`}
                                >{d}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <input
                          value={editDescription}
                          onChange={(ev) => setEditDescription(ev.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                          placeholder="내역"
                        />

                        {/* 개인화 영역: 금액 */}
                        {amountChips(e.typeKey).length > 0 && (
                          <div>
                            <p className="text-[11px] text-gray-400 mb-1">자주 쓴 금액</p>
                            <div className="flex flex-wrap gap-1.5">
                              {amountChips(e.typeKey).map((a) => (
                                <button
                                  key={a}
                                  type="button"
                                  onClick={() => setEditAmount(a)}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                                    editAmount === a
                                      ? 'bg-rose-600 text-white border-rose-600'
                                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-rose-300'
                                  }`}
                                >{Number(a).toLocaleString()}원</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editAmount === '' ? '' : Number(editAmount).toLocaleString()}
                          onChange={(ev) => setEditAmount(ev.target.value.replace(/[^\d]/g, ''))}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-500"
                          placeholder="금액"
                        />
                        <input
                          value={editNote}
                          onChange={(ev) => setEditNote(ev.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                          placeholder="비고"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(e)}
                            disabled={busy}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg py-1.5 text-xs font-medium transition-colors"
                          >저장</button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={busy}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:text-gray-300 rounded-lg py-1.5 text-xs font-medium transition-colors"
                          >취소</button>
                        </div>
                      </div>
                    ) : confirmingRow === e.rowIndex ? (
                      <div className="flex items-center justify-between gap-2 bg-rose-50 rounded-lg px-2 py-1.5">
                        <span className="text-xs text-rose-700 min-w-0 truncate">{e.description} 삭제할까요?</span>
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => removeEntry(e)}
                            disabled={busy}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors"
                          >삭제</button>
                          <button
                            type="button"
                            onClick={() => setConfirmingRow(null)}
                            disabled={busy}
                            className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300 rounded-md text-xs font-medium transition-colors"
                          >취소</button>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">
                          <span className="text-gray-900 dark:text-gray-100">{e.description}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {lookupName(expenseTypes, e.typeKey)}
                            {e.note ? ` · ${e.note}` : ''}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <span className="font-medium text-gray-800">{parseAmount(e.amount).toLocaleString()}원</span>
                          <button
                            type="button"
                            onClick={() => startEdit(e)}
                            className="ml-1 p-1 text-gray-300 hover:text-blue-500 transition-colors"
                            title="수정"
                          >✏️</button>
                          <button
                            type="button"
                            onClick={() => { setEditingRow(null); setError(null); setConfirmingRow(e.rowIndex) }}
                            className="p-1 text-gray-300 hover:text-rose-500 transition-colors"
                            title="삭제"
                          >🗑️</button>
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {visibleCount < sortedDates.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + INITIAL_COUNT)}
          className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors"
        >
          더보기 ({sortedDates.length - visibleCount}일 더)
        </button>
      )}
    </div>
  )
}
