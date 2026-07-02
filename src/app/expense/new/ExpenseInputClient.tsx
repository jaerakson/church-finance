'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Expense } from '@/lib/types'
import { lookupName } from '@/lib/constants'
import { useLookups } from '@/lib/lookups'
import { today, formatDateKo } from '@/lib/date'
import Combobox, { ComboOption } from '@/components/ui/Combobox'
import SuggestInput, { Suggestion } from '@/components/ui/SuggestInput'
import AmountInput from '@/components/ui/AmountInput'

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default function ExpenseInputClient() {
  const { expenseTypes } = useLookups()
  const typeOptions: ComboOption[] = expenseTypes.map((t) => ({ value: t.key, label: t.name }))
  const [date, setDate] = useState(today())
  const [typeKey, setTypeKey] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [suggestions, setSuggestions] = useState<{ amount: string; count: number }[]>([])
  const [descSuggestions, setDescSuggestions] = useState<Suggestion[]>([])
  const [noteSuggestions, setNoteSuggestions] = useState<Suggestion[]>([])
  const [todayList, setTodayList] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 수정/삭제 상태
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [confirmingRow, setConfirmingRow] = useState<number | null>(null)

  // 키보드 연속 입력용 포커스 제어
  const typeRef = useRef<HTMLInputElement | null>(null)
  const descRef = useRef<HTMLInputElement | null>(null)
  const amountRef = useRef<HTMLInputElement | null>(null)
  const noteRef = useRef<HTMLInputElement | null>(null)
  const focusType = () => setTimeout(() => typeRef.current?.focus(), 0)
  const focusDesc = () => setTimeout(() => descRef.current?.focus(), 0)
  const focusAmount = () => setTimeout(() => amountRef.current?.focus(), 0)
  const focusNote = () => setTimeout(() => noteRef.current?.focus(), 0)

  // 지출 종류를 고르면 내역·금액·비고는 항상 비우고 시작
  const handleTypeSelected = () => {
    setDescription('')
    setAmount('')
    setNote('')
    focusDesc()
  }

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch(`/api/expense?date=${date}`)
      const json = await res.json()
      if (json.success) setTodayList(json.data)
    } catch { /* silent */ }
  }, [date])

  useEffect(() => { fetchToday() }, [fetchToday])

  useEffect(() => {
    if (!typeKey) { setSuggestions([]); setDescSuggestions([]); setNoteSuggestions([]); return }
    // 금액 제안은 종류 + 내역 조건. 내역은 타이핑 중이므로 디바운스로 시트 조회 남발 방지.
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ typeKey, asOf: date, kind: 'expense' })
      if (description.trim()) params.set('description', description.trim())
      fetch(`/api/stats/amounts?${params.toString()}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.success) {
            setSuggestions(j.data ?? [])
            setDescSuggestions(j.descriptions ?? [])
            setNoteSuggestions(j.notes ?? [])
          }
        })
        .catch(() => {})
    }, 350)
    return () => clearTimeout(handle)
  }, [typeKey, date, description])

  // 완전 일치(날짜+종류+내역+금액) → 저장 차단
  const isExactDuplicate = Boolean(
    typeKey && description && amount &&
    todayList.some((e) => e.date === date && e.typeKey === typeKey && (e.description ?? '').trim() === description.trim() && parseAmount(e.amount) === parseAmount(amount))
  )

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!typeKey || !description || !amount) return
    if (isExactDuplicate) {
      setError('이미 동일한 지출 내역이 입력되어 있어 저장할 수 없습니다. (중복)')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, typeKey, description, amount, note }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      // 저장 후 지출 종류부터 다시 입력 (종류가 매번 달라, 종류 선택으로 복귀 · 나머지 항목 비움)
      setTypeKey('')
      setDescription('')
      setAmount('')
      setNote('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      focusType()
      await fetchToday()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (e: Expense) => {
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
    setError(null)
    try {
      const res = await fetch(`/api/expense/${e.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: e.date, typeKey: e.typeKey, description: editDescription, amount: editAmount, note: editNote }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      cancelEdit()
      await fetchToday()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    }
  }

  const removeEntry = async (e: Expense) => {
    setError(null)
    try {
      const res = await fetch(`/api/expense/${e.rowIndex}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setConfirmingRow(null)
      await fetchToday()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  const todayTotal = todayList.reduce((s, e) => s + parseAmount(e.amount), 0)

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── 입력 폼 ── */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-bold text-gray-900">지출 입력</h2>

        {error && <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3 text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">✓ 저장되었습니다.</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="날짜">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>

          <Field label="지출 종류" hint="저장하면 다시 종류 선택으로 돌아옵니다">
            <Combobox
              options={typeOptions}
              value={typeKey}
              onChange={setTypeKey}
              onSelected={handleTypeSelected}
              inputRef={typeRef}
              placeholder="지출 종류 검색..."
            />
          </Field>

          <Field label="내역" hint={typeKey ? '과거 내역 선택/직접입력 → Enter' : undefined}>
            <SuggestInput
              value={description}
              onChange={setDescription}
              suggestions={descSuggestions}
              placeholder="예: 담임목사 사례비"
              accent="rose"
              inputRef={descRef}
              onEnter={focusAmount}
            />
          </Field>

          <Field label="금액 (원)" hint="↓ 로 최근 금액 선택 · Enter 로 비고로 이동">
            <AmountInput
              value={amount}
              onChange={setAmount}
              suggestions={suggestions}
              inputRef={amountRef}
              onEnter={focusNote}
              accent="rose"
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
              accent="rose"
            />
          </Field>

          {isExactDuplicate && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium">
              🚫 같은 날짜에 <strong>{description}</strong> {parseAmount(amount).toLocaleString()}원이 이미 입력되어 있습니다. <strong>중복이라 저장할 수 없습니다.</strong>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !typeKey || !description || !amount || isExactDuplicate}
            className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            {loading ? '저장 중...' : isExactDuplicate ? '중복 — 저장 불가' : '지출 입력'}
          </button>
        </form>
      </div>

      {/* ── 금일 내역 (수정/삭제) ── */}
      <div className="w-full lg:w-80">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">금일의 지출</h2>
            <span className="text-xs text-gray-400">{formatDateKo(date)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold mb-4 pb-3 border-b border-gray-100">
            <span className="text-gray-600">합계</span>
            <span className="text-rose-600">{todayTotal.toLocaleString()}원</span>
          </div>
          {todayList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">오늘 지출이 없습니다.</p>
          ) : (
            <ul className="space-y-1 max-h-[28rem] overflow-y-auto">
              {[...todayList].reverse().map((e) => (
                <li key={e.rowIndex} className="py-2 border-b border-gray-50 last:border-0">
                  {editingRow === e.rowIndex ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">{lookupName(expenseTypes, e.typeKey)}</p>
                      <input
                        value={editDescription}
                        onChange={(ev) => setEditDescription(ev.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="내역"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editAmount === '' ? '' : Number(editAmount).toLocaleString()}
                        onChange={(ev) => setEditAmount(ev.target.value.replace(/[^\d]/g, ''))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="금액"
                      />
                      <input
                        value={editNote}
                        onChange={(ev) => setEditNote(ev.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="비고"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(e)}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-1.5 text-xs font-medium transition-colors"
                        >저장</button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg py-1.5 text-xs font-medium transition-colors"
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.description}</p>
                        <p className="text-xs text-gray-400 truncate">{lookupName(expenseTypes, e.typeKey)}{e.note ? ` · ${e.note}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-800">{parseAmount(e.amount).toLocaleString()}원</span>
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

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white'

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
