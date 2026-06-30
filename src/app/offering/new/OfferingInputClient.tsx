'use client'

import { useState, useEffect, useCallback } from 'react'
import { Member, Offering } from '@/lib/types'
import { OFFERING_TYPES, lookupName } from '@/lib/constants'
import { today, currentYear, formatDateKo } from '@/lib/date'
import Combobox, { ComboOption } from '@/components/ui/Combobox'

interface Props {
  members: Member[]
}

interface RecentEntry {
  date: string
  amount: string
}

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default function OfferingInputClient({ members }: Props) {
  const memberOptions: ComboOption[] = members.map((m) => ({ value: m.key, label: m.name }))
  const typeOptions: ComboOption[] = OFFERING_TYPES.map((t) => ({ value: t.key, label: t.name }))
  const memberMap = Object.fromEntries(members.map((m) => [m.key, m.name]))

  const [date, setDate] = useState(today())
  const [typeKey, setTypeKey] = useState('')
  const [memberKey, setMemberKey] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [suggestions, setSuggestions] = useState<{ amount: string; count: number }[]>([])
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [todayList, setTodayList] = useState<Offering[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 수정 모드 상태
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch(`/api/offering?date=${date}`)
      const json = await res.json()
      if (json.success) setTodayList(json.data)
    } catch { /* silent */ }
  }, [date])

  useEffect(() => { fetchToday() }, [fetchToday])

  // 개인화 제안: 종류 + 교인 둘 다 선택돼야 호출
  useEffect(() => {
    if (!typeKey || !memberKey) { setSuggestions([]); setRecent([]); return }
    const year = date.slice(0, 4) || currentYear()
    const url = `/api/stats/amounts?typeKey=${typeKey}&memberKey=${memberKey}&year=${year}&kind=offering`
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setSuggestions(j.data ?? [])
          setRecent(j.recent ?? [])
        }
      })
      .catch(() => {})
  }, [typeKey, memberKey, date])

  const isDuplicate = Boolean(
    memberKey && typeKey &&
    todayList.some((o) => o.memberKey === memberKey && o.typeKey === typeKey && o.date === date)
  )

  const memberName = members.find((m) => m.key === memberKey)?.name ?? ''
  const personalized = Boolean(typeKey && memberKey)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberKey || !typeKey || !amount) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, memberKey, typeKey, amount, note }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setMemberKey('')
      setAmount('')
      setNote('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      await fetchToday()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (o: Offering) => {
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
      await fetchToday()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    }
  }

  const removeEntry = async (o: Offering) => {
    if (!confirm(`${memberMap[o.memberKey] ?? o.memberKey}님의 ${lookupName(OFFERING_TYPES, o.typeKey)} ${parseAmount(o.amount).toLocaleString()}원을 삭제할까요?`)) return
    setError(null)
    try {
      const res = await fetch(`/api/offering/${o.rowIndex}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      await fetchToday()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  const todayTotal = todayList.reduce((s, o) => s + parseAmount(o.amount), 0)

  const byType = OFFERING_TYPES.map((t) => {
    const items = todayList.filter((o) => o.typeKey === t.key)
    const total = items.reduce((s, o) => s + parseAmount(o.amount), 0)
    return { ...t, total, count: items.length }
  }).filter((t) => t.total > 0)

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── 입력 폼 ── */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-bold text-gray-900">헌금 입력</h2>

        {error && <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3 text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">✓ 저장되었습니다.</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="날짜">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="헌금 종류">
            <Combobox
              options={typeOptions}
              value={typeKey}
              onChange={setTypeKey}
              placeholder="헌금 종류 선택..."
            />
          </Field>

          <Field label="교인 이름" hint="이름을 입력하면 목록이 나타납니다">
            <Combobox
              options={memberOptions}
              value={memberKey}
              onChange={setMemberKey}
              placeholder="이름 검색..."
            />
          </Field>

          {/* 개인화 영역: 종류 + 교인 모두 선택 시 */}
          {personalized && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700">
                👤 {memberName}님 · {lookupName(OFFERING_TYPES, typeKey)} 개인 기록 (올해)
              </p>

              {/* 자주 입력한 금액 */}
              {suggestions.length > 0 ? (
                <div>
                  <p className="text-[11px] text-gray-500 mb-1.5">자주 입력한 금액</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.amount}
                        type="button"
                        onClick={() => setAmount(s.amount)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          amount === s.amount
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        {Number(s.amount).toLocaleString()}원
                        <span className="ml-1 text-[10px] opacity-60">×{s.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">올해 이 헌금 기록이 없습니다. (첫 입력)</p>
              )}

              {/* 비교 목록: 최근 입력 내역 */}
              {recent.length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-500 mb-1.5">최근 입력 내역 (비교용)</p>
                  <ul className="space-y-1">
                    {recent.map((r, i) => (
                      <li key={`${r.date}-${i}`} className="flex items-center justify-between text-[11px] text-gray-600">
                        <span className="text-gray-400">{r.date}</span>
                        <span className="font-medium">{Number(r.amount).toLocaleString()}원</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Field label="금액 (원)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={inputCls}
              min="0"
            />
          </Field>

          <Field label="비고">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="메모 (선택)"
              className={inputCls}
            />
          </Field>

          {/* 중복 경고 */}
          {isDuplicate && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
              ⚠️ <strong>{memberName}</strong>님의 <strong>{lookupName(OFFERING_TYPES, typeKey)}</strong> 헌금이 오늘 이미 입력되어 있습니다. 계속 입력할 수 있습니다.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !memberKey || !typeKey || !amount}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            {loading ? '저장 중...' : '헌금 입력'}
          </button>
        </form>
      </div>

      {/* ── 오늘 내역 ── */}
      <div className="w-full lg:w-96 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">오늘의 헌금 내역</h2>
            <span className="text-xs text-gray-400">{formatDateKo(date)}</span>
          </div>

          {/* 종류별 소계 */}
          {byType.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {byType.map((t) => (
                <div key={t.key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t.name} ({t.count}명)</span>
                  <span className="font-medium text-gray-800">{t.total.toLocaleString()}원</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-sm font-bold">
                <span className="text-gray-700">합계</span>
                <span className="text-blue-600">{todayTotal.toLocaleString()}원</span>
              </div>
            </div>
          )}

          {/* 개별 내역 (수정/삭제) */}
          {todayList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">입력된 내역이 없습니다.</p>
          ) : (
            <ul className="space-y-1 max-h-[28rem] overflow-y-auto">
              {[...todayList].reverse().map((o) => (
                <li key={o.rowIndex} className="py-2 border-b border-gray-50 last:border-0">
                  {editingRow === o.rowIndex ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">
                        {memberMap[o.memberKey] ?? o.memberKey}
                        <span className="ml-1.5 text-xs text-gray-400">{lookupName(OFFERING_TYPES, o.typeKey)}</span>
                      </p>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="금액"
                        min="0"
                      />
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
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1.5 text-xs font-medium transition-colors"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg py-1.5 text-xs font-medium transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{memberMap[o.memberKey] ?? o.memberKey}</p>
                        <p className="text-xs text-gray-400 truncate">{lookupName(OFFERING_TYPES, o.typeKey)}{o.note ? ` · ${o.note}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-800">{parseAmount(o.amount).toLocaleString()}원</span>
                        <button
                          type="button"
                          onClick={() => startEdit(o)}
                          className="ml-1 p-1 text-gray-300 hover:text-blue-500 transition-colors"
                          title="수정"
                        >✏️</button>
                        <button
                          type="button"
                          onClick={() => removeEntry(o)}
                          className="p-1 text-gray-300 hover:text-rose-500 transition-colors"
                          title="삭제"
                        >🗑️</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {hint && <span className="ml-1 text-xs text-gray-400 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}
