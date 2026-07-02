'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Member, Offering } from '@/lib/types'
import { lookupName } from '@/lib/constants'
import { useLookups } from '@/lib/lookups'
import { today, formatDateKo } from '@/lib/date'
import Combobox, { ComboOption } from '@/components/ui/Combobox'
import SuggestInput, { Suggestion } from '@/components/ui/SuggestInput'
import AmountInput from '@/components/ui/AmountInput'

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

export default function OfferingInputClient({ members: initialMembers }: Props) {
  const { offeringTypes } = useLookups()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const memberOptions: ComboOption[] = members.map((m) => ({ value: m.key, label: m.name }))
  const typeOptions: ComboOption[] = offeringTypes.map((t) => ({ value: t.key, label: t.name }))
  const memberMap = Object.fromEntries(members.map((m) => [m.key, m.name]))

  const [date, setDate] = useState(today())
  const [typeKey, setTypeKey] = useState('')
  const [memberKey, setMemberKey] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [creatingMember, setCreatingMember] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [suggestions, setSuggestions] = useState<{ amount: string; count: number }[]>([])
  const [noteSuggestions, setNoteSuggestions] = useState<Suggestion[]>([])
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [todayList, setTodayList] = useState<Offering[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 키보드 연속 입력용 포커스 제어
  const memberInputRef = useRef<HTMLInputElement | null>(null)
  const amountRef = useRef<HTMLInputElement | null>(null)
  const noteRef = useRef<HTMLInputElement | null>(null)
  const focusMember = () => setTimeout(() => memberInputRef.current?.focus(), 0)
  const focusAmount = () => setTimeout(() => amountRef.current?.focus(), 0)
  const focusNote = () => setTimeout(() => noteRef.current?.focus(), 0)

  // 수정 모드 상태
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [confirmingRow, setConfirmingRow] = useState<number | null>(null)

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
    if (!typeKey || !memberKey) { setSuggestions([]); setRecent([]); setNoteSuggestions([]); return }
    const url = `/api/stats/amounts?typeKey=${typeKey}&memberKey=${memberKey}&asOf=${date}&kind=offering`
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setSuggestions(j.data ?? [])
          setRecent(j.recent ?? [])
          setNoteSuggestions(j.notes ?? [])
        }
      })
      .catch(() => {})
  }, [typeKey, memberKey, date])

  // 완전 일치(날짜+교인+종류+금액) → 저장 차단
  const isExactDuplicate = Boolean(
    memberKey && typeKey && amount &&
    todayList.some((o) => o.memberKey === memberKey && o.typeKey === typeKey && o.date === date && parseAmount(o.amount) === parseAmount(amount))
  )
  // 날짜+교인+종류 일치(금액만 다름) → 안내(허용)
  const isSoftDuplicate = !isExactDuplicate && Boolean(
    memberKey && typeKey &&
    todayList.some((o) => o.memberKey === memberKey && o.typeKey === typeKey && o.date === date)
  )

  const memberName = members.find((m) => m.key === memberKey)?.name ?? ''
  const personalized = Boolean(typeKey && memberKey)
  const showMemberMissing = Boolean(memberQuery.trim() && !memberKey && !members.some((m) => m.name === memberQuery.trim()))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberKey || !typeKey || !amount) return
    if (isExactDuplicate) {
      setError('이미 동일한 헌금 내역이 입력되어 있어 저장할 수 없습니다. (중복)')
      return
    }
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
      setMemberQuery('')
      setAmount('')
      setNote('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      focusMember() // 같은 종류로 다음 사람 연속 입력
      await fetchToday()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 교인이 없을 때 즉시 등록 (이름만) → 자동 선택
  const handleCreateMember = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || creatingMember) return
    setCreatingMember(true)
    setError(null)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          departmentKey: '', positionKey: '', phone: '', email: '', address: '',
          registeredAt: today(), baptizedAt: '',
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const created = json.data as Member
      setMembers((prev) => [...prev, created])
      setMemberKey(created.key)
      setMemberQuery(created.name)
      focusAmount() // 등록 직후 바로 금액 입력
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '교인 등록에 실패했습니다.')
    } finally {
      setCreatingMember(false)
    }
  }

  const startEdit = (o: Offering) => {
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
    setError(null)
    try {
      const res = await fetch(`/api/offering/${o.rowIndex}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setConfirmingRow(null)
      await fetchToday()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  const todayTotal = todayList.reduce((s, o) => s + parseAmount(o.amount), 0)

  const byType = offeringTypes.map((t) => {
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

          <Field label="헌금 종류" hint="한 번 고르면 연속 입력 동안 고정됩니다">
            <Combobox
              options={typeOptions}
              value={typeKey}
              onChange={setTypeKey}
              onSelected={focusMember}
              placeholder="헌금 종류 선택..."
            />
          </Field>

          <Field label="교인 이름" hint="이름 입력 → Enter → 금액 → Enter 로 빠르게">
            <Combobox
              options={memberOptions}
              value={memberKey}
              onChange={setMemberKey}
              onQueryChange={setMemberQuery}
              onCreateNew={handleCreateMember}
              createLabel={(q) => `+ "${q}" 새 교인으로 바로 등록`}
              inputRef={memberInputRef}
              onSelected={focusAmount}
              placeholder="이름 검색..."
            />
            {showMemberMissing && (
              <div className="mt-2 flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="text-xs text-amber-700">
                  &lsquo;{memberQuery.trim()}&rsquo; 교인이 없습니다.
                </span>
                <button
                  type="button"
                  onClick={() => handleCreateMember(memberQuery)}
                  disabled={creatingMember}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-xs font-medium whitespace-nowrap transition-colors"
                >
                  {creatingMember ? '등록 중...' : '바로 등록'}
                </button>
              </div>
            )}
          </Field>

          {/* 개인화 영역: 종류 + 교인 모두 선택 시 (비교용) */}
          {personalized && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-700">
                👤 {memberName}님 · {lookupName(offeringTypes, typeKey)} 개인 기록 (최근 1년)
              </p>

              {recent.length > 0 ? (
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
              ) : (
                <p className="text-[11px] text-gray-400">최근 1년 이 헌금 기록이 없습니다. (첫 입력)</p>
              )}
            </div>
          )}

          <Field label="금액 (원)" hint="↓ 로 최근 금액 선택 · Enter 로 비고로 이동">
            <AmountInput
              value={amount}
              onChange={setAmount}
              suggestions={suggestions}
              inputRef={amountRef}
              onEnter={focusNote}
              placeholder="0"
            />
          </Field>

          <Field label="비고" hint="↓ 로 선택 · Enter 로 저장">
            <SuggestInput
              value={note}
              onChange={setNote}
              suggestions={noteSuggestions}
              inputRef={noteRef}
              placeholder="메모 (선택)"
            />
          </Field>

          {/* 중복 차단 (완전 일치) */}
          {isExactDuplicate && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium">
              🚫 <strong>{memberName}</strong>님의 <strong>{lookupName(offeringTypes, typeKey)}</strong> {parseAmount(amount).toLocaleString()}원이 이미 입력되어 있습니다. <strong>중복이라 저장할 수 없습니다.</strong>
            </div>
          )}
          {/* 중복 안내 (금액만 다름 — 허용) */}
          {isSoftDuplicate && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
              ⚠️ <strong>{memberName}</strong>님의 <strong>{lookupName(offeringTypes, typeKey)}</strong> 헌금이 오늘 이미 있습니다(금액 다름). 확인 후 저장하세요.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !memberKey || !typeKey || !amount || isExactDuplicate}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            {loading ? '저장 중...' : isExactDuplicate ? '중복 — 저장 불가' : '헌금 입력'}
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
                        <span className="ml-1.5 text-xs text-gray-400">{lookupName(offeringTypes, o.typeKey)}</span>
                      </p>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editAmount === '' ? '' : Number(editAmount).toLocaleString()}
                        onChange={(e) => setEditAmount(e.target.value.replace(/[^\d]/g, ''))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="금액"
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
                  ) : confirmingRow === o.rowIndex ? (
                    <div className="flex items-center justify-between gap-2 bg-rose-50 rounded-lg px-2 py-1.5">
                      <span className="text-xs text-rose-700 min-w-0 truncate">{memberMap[o.memberKey] ?? o.memberKey} 삭제할까요?</span>
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => removeEntry(o)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-medium transition-colors"
                        >삭제</button>
                        <button
                          type="button"
                          onClick={() => setConfirmingRow(null)}
                          className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-md text-xs font-medium transition-colors"
                        >취소</button>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{memberMap[o.memberKey] ?? o.memberKey}</p>
                        <p className="text-xs text-gray-400 truncate">{lookupName(offeringTypes, o.typeKey)}{o.note ? ` · ${o.note}` : ''}</p>
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
                          onClick={() => { setEditingRow(null); setError(null); setConfirmingRow(o.rowIndex) }}
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
