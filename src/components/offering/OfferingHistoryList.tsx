'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Offering } from '@/lib/types'
import { OFFERING_TYPES, lookupName } from '@/lib/constants'
import { dayOfWeekKo } from '@/lib/date'

interface Props {
  offerings: Offering[]
  memberMap: Record<string, string>
}

const INITIAL_COUNT = 5

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default function OfferingHistoryList({ offerings, memberMap }: Props) {
  const router = useRouter()

  const byDate = offerings.reduce<Record<string, Offering[]>>((acc, o) => {
    acc[o.date] = acc[o.date] ?? []
    acc[o.date].push(o)
    return acc
  }, {})
  const sortedDates = Object.keys(byDate).sort().reverse()

  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [openType, setOpenType] = useState<string | null>(null) // `${date}__${typeKey}`

  // 수정/삭제 상태
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [confirmingRow, setConfirmingRow] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 개인화 제안: 같은 교인 + 같은 종류 기준
  const amountChips = (memberKey: string, typeKey: string): string[] => {
    const counts: Record<string, number> = {}
    offerings
      .filter((o) => o.memberKey === memberKey && o.typeKey === typeKey)
      .forEach((o) => {
        const a = o.amount.replace(/,/g, '').trim()
        if (a && Number(a) > 0) counts[a] = (counts[a] ?? 0) + 1
      })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a]) => a)
  }

  const noteChips = (memberKey: string, typeKey: string): string[] => {
    const seen = new Set<string>()
    offerings
      .filter((o) => o.memberKey === memberKey && o.typeKey === typeKey)
      .forEach((o) => { const n = o.note?.trim(); if (n) seen.add(n) })
    return [...seen].slice(0, 5)
  }

  const startEdit = (o: Offering) => {
    setError(null)
    setConfirmingRow(null)
    setEditingRow(o.rowIndex)
    setEditAmount(o.amount.replace(/,/g, '').trim())
    setEditNote(o.note ?? '')
  }

  const cancelEdit = () => {
    setEditingRow(null)
    setEditAmount('')
    setEditNote('')
  }

  const saveEdit = async (o: Offering) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/offering/${o.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: o.date,
          memberKey: o.memberKey,
          typeKey: o.typeKey,
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

  const removeEntry = async (o: Offering) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/offering/${o.rowIndex}`, { method: 'DELETE' })
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm">
        데이터가 없습니다.
      </div>
    )
  }

  const visibleDates = sortedDates.slice(0, visibleCount)

  const toggleDate = (date: string) => {
    setOpenType(null)
    setOpenDate(openDate === date ? null : date)
  }

  const toggleType = (date: string, typeKey: string) => {
    const k = `${date}__${typeKey}`
    setOpenType(openType === k ? null : k)
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}
      {visibleDates.map((date) => {
        const items = byDate[date]
        const dateTotal = items.reduce((s, o) => s + parseAmount(o.amount), 0)
        const isOpen = openDate === date

        // 헌금 종류별 집계
        const typeGroups = OFFERING_TYPES.map((t) => {
          const list = items.filter((o) => o.typeKey === t.key)
          return { key: t.key, name: t.name, list, total: list.reduce((s, o) => s + parseAmount(o.amount), 0) }
        }).filter((g) => g.list.length > 0)

        return (
          <div key={date} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* 날짜 헤더 (클릭) */}
            <button
              type="button"
              onClick={() => toggleDate(date)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                <span className="text-sm font-semibold text-gray-800">{date} ({dayOfWeekKo(date)})</span>
                <span className="text-xs text-gray-400">{items.length}건</span>
              </span>
              <span className="text-sm font-bold text-blue-600">{dateTotal.toLocaleString()}원</span>
            </button>

            {/* 펼침: 헌금 종류별 전체금액 */}
            {isOpen && (
              <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-2">
                {typeGroups.map((g) => {
                  const typeOpen = openType === `${date}__${g.key}`
                  return (
                    <div key={g.key} className="bg-white rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <span className="text-sm font-medium text-gray-700">
                          {g.name} <span className="text-xs text-gray-400">({g.list.length}명)</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900">{g.total.toLocaleString()}원</span>
                          <button
                            type="button"
                            onClick={() => toggleType(date, g.key)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                          >
                            {typeOpen ? '접기' : '펼쳐보기'}
                          </button>
                        </span>
                      </div>

                      {/* 세부내역: 개별 교인 (수정/삭제) */}
                      {typeOpen && (
                        <ul className="border-t border-gray-50 divide-y divide-gray-50">
                          {g.list.map((o) => (
                            <li key={o.rowIndex} className="px-3 py-2 text-sm">
                              {editingRow === o.rowIndex ? (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-900">{memberMap[o.memberKey] ?? o.memberKey}</p>

                                  {/* 개인화 영역: 금액 */}
                                  {amountChips(o.memberKey, o.typeKey).length > 0 && (
                                    <div>
                                      <p className="text-[11px] text-gray-400 mb-1">자주 쓴 금액</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {amountChips(o.memberKey, o.typeKey).map((a) => (
                                          <button
                                            key={a}
                                            type="button"
                                            onClick={() => setEditAmount(a)}
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                                              editAmount === a
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
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
                                    onChange={(e) => setEditAmount(e.target.value.replace(/[^\d]/g, ''))}
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="금액"
                                  />

                                  {/* 개인화 영역: 비고 */}
                                  {noteChips(o.memberKey, o.typeKey).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {noteChips(o.memberKey, o.typeKey).map((n) => (
                                        <button
                                          key={n}
                                          type="button"
                                          onClick={() => setEditNote(n)}
                                          className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                                            editNote === n
                                              ? 'bg-gray-700 text-white border-gray-700'
                                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                          }`}
                                        >{n}</button>
                                      ))}
                                    </div>
                                  )}
                                  <input
                                    value={editNote}
                                    onChange={(e) => setEditNote(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="비고"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => saveEdit(o)}
                                      disabled={busy}
                                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-1.5 text-xs font-medium transition-colors"
                                    >저장</button>
                                    <button
                                      type="button"
                                      onClick={cancelEdit}
                                      disabled={busy}
                                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg py-1.5 text-xs font-medium transition-colors"
                                    >취소</button>
                                  </div>
                                </div>
                              ) : confirmingRow === o.rowIndex ? (
                                <div className="flex items-center justify-between gap-2 bg-rose-50 rounded-lg px-2 py-1.5">
                                  <span className="text-xs text-rose-700">삭제할까요?</span>
                                  <span className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => removeEntry(o)}
                                      disabled={busy}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors"
                                    >삭제</button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmingRow(null)}
                                      disabled={busy}
                                      className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-md text-xs font-medium transition-colors"
                                    >취소</button>
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-gray-700 min-w-0 truncate">
                                    {memberMap[o.memberKey] ?? o.memberKey}
                                    {o.note ? <span className="ml-1.5 text-xs text-gray-400">{o.note}</span> : null}
                                  </span>
                                  <span className="flex items-center gap-1 whitespace-nowrap">
                                    <span className="font-medium text-gray-800">{parseAmount(o.amount).toLocaleString()}원</span>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(o)}
                                      className="ml-1 p-1 text-gray-300 hover:text-blue-500 transition-colors"
                                      title="수정"
                                    >✏️</button>
                                    <button
                                      type="button"
                                      onClick={() => { setEditingRow(null); setError(null); setConfirmingRow(o.rowIndex) }}
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
              </div>
            )}
          </div>
        )
      })}

      {visibleCount < sortedDates.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + INITIAL_COUNT)}
          className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700 bg-white rounded-xl border border-gray-100 shadow-sm transition-colors"
        >
          더보기 ({sortedDates.length - visibleCount}일 더)
        </button>
      )}
    </div>
  )
}
