'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Expense } from '@/lib/types'
import { EXPENSE_TYPES, lookupName } from '@/lib/constants'
import { today, currentMonth } from '@/lib/date'
import Combobox, { ComboOption } from '@/components/ui/Combobox'
import SuggestInput, { Suggestion } from '@/components/ui/SuggestInput'
import AmountInput from '@/components/ui/AmountInput'

const typeOptions: ComboOption[] = EXPENSE_TYPES.map((t) => ({ value: t.key, label: t.name }))

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

export default function ExpenseInputClient() {
  const [date, setDate] = useState(today())
  const [typeKey, setTypeKey] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [suggestions, setSuggestions] = useState<{ amount: string; count: number }[]>([])
  const [descSuggestions, setDescSuggestions] = useState<Suggestion[]>([])
  const [noteSuggestions, setNoteSuggestions] = useState<Suggestion[]>([])
  const [monthList, setMonthList] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 키보드 연속 입력용 포커스 제어
  const descRef = useRef<HTMLInputElement | null>(null)
  const amountRef = useRef<HTMLInputElement | null>(null)
  const focusDesc = () => setTimeout(() => descRef.current?.focus(), 0)
  const focusAmount = () => setTimeout(() => amountRef.current?.focus(), 0)

  const fetchMonth = useCallback(async () => {
    const month = date.slice(0, 7)
    try {
      const res = await fetch(`/api/expense?month=${month}`)
      const json = await res.json()
      if (json.success) setMonthList(json.data)
    } catch { /* silent */ }
  }, [date])

  useEffect(() => { fetchMonth() }, [fetchMonth])

  useEffect(() => {
    if (!typeKey) { setSuggestions([]); setDescSuggestions([]); setNoteSuggestions([]); return }
    fetch(`/api/stats/amounts?typeKey=${typeKey}&asOf=${date}&kind=expense`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setSuggestions(j.data ?? [])
          setDescSuggestions(j.descriptions ?? [])
          setNoteSuggestions(j.notes ?? [])
        }
      })
      .catch(() => {})
  }, [typeKey, date])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!typeKey || !description || !amount) return
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
      // 지출 종류는 고정 → 같은 종류로 연속 입력
      setDescription('')
      setAmount('')
      setNote('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      focusDesc()
      await fetchMonth()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const monthTotal = monthList.reduce((s, e) => s + parseAmount(e.amount), 0)
  const month = date.slice(0, 7) || currentMonth()

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

          <Field label="지출 종류" hint="한 번 고르면 연속 입력 동안 고정됩니다">
            <Combobox
              options={typeOptions}
              value={typeKey}
              onChange={setTypeKey}
              onSelected={focusDesc}
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

          <Field label="금액 (원)" hint="↓ 로 최근 금액 선택 · Enter 로 저장">
            <AmountInput
              value={amount}
              onChange={setAmount}
              suggestions={suggestions}
              inputRef={amountRef}
              accent="rose"
              placeholder="0"
            />
          </Field>

          <Field label="비고">
            <SuggestInput
              value={note}
              onChange={setNote}
              suggestions={noteSuggestions}
              placeholder="메모 (선택)"
              accent="rose"
            />
          </Field>

          <button
            type="submit"
            disabled={loading || !typeKey || !description || !amount}
            className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            {loading ? '저장 중...' : '지출 입력'}
          </button>
        </form>
      </div>

      {/* ── 이달 내역 ── */}
      <div className="w-full lg:w-80">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">이달의 지출</h2>
            <span className="text-xs text-gray-400">{month}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold mb-4 pb-3 border-b border-gray-100">
            <span className="text-gray-600">합계</span>
            <span className="text-rose-600">{monthTotal.toLocaleString()}원</span>
          </div>
          {monthList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">이달 지출이 없습니다.</p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {[...monthList].reverse().map((e) => (
                <li key={e.rowIndex} className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{e.description}</p>
                    <p className="text-xs text-gray-400">{e.date} · {lookupName(EXPENSE_TYPES, e.typeKey)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                    {parseAmount(e.amount).toLocaleString()}원
                  </span>
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
