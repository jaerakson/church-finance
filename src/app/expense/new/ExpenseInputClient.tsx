'use client'

import { useState, useEffect, useCallback } from 'react'
import { Expense } from '@/lib/types'
import { EXPENSE_TYPES, lookupName } from '@/lib/constants'
import { today, currentYear, currentMonth } from '@/lib/date'
import Combobox, { ComboOption } from '@/components/ui/Combobox'

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
  const [monthList, setMonthList] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
    if (!typeKey) { setSuggestions([]); return }
    const year = date.slice(0, 4) || currentYear()
    fetch(`/api/stats/amounts?typeKey=${typeKey}&year=${year}&kind=expense`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setSuggestions(j.data) })
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
      setTypeKey('')
      setDescription('')
      setAmount('')
      setNote('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
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

          <Field label="지출 종류">
            <Combobox
              options={typeOptions}
              value={typeKey}
              onChange={setTypeKey}
              placeholder="지출 종류 검색..."
            />
          </Field>

          <Field label="내역">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 담임목사 사례비"
              className={inputCls}
            />
          </Field>

          {/* 금액 제안 */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">올해 자주 입력한 금액</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.amount}
                    type="button"
                    onClick={() => setAmount(s.amount)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      amount === s.amount
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:text-rose-600'
                    }`}
                  >
                    {Number(s.amount).toLocaleString()}원
                    <span className="ml-1 text-[10px] opacity-60">×{s.count}</span>
                  </button>
                ))}
              </div>
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
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모 (선택)" className={inputCls} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
