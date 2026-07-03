'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLookups } from '@/lib/lookups'
import { LookupItem } from '@/lib/types'

type Kind = 'income' | 'expense'
type BudgetState = { income: Record<string, number>; expense: Record<string, number> }

interface Props {
  year: string
}

export default function BudgetEditor({ year }: Props) {
  const { categories, offeringTypes, expenseTypes } = useLookups()
  const [budgets, setBudgets] = useState<BudgetState>({ income: {}, expense: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/budget?year=${year}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const next: BudgetState = { income: {}, expense: {} }
      for (const b of json.data as { kind: Kind; typeKey: string; amount: number }[]) {
        next[b.kind][b.typeKey] = b.amount
      }
      setBudgets(next)
    } catch {
      setError('예산을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { load() }, [load])

  const save = async (kind: Kind, typeKey: string, amount: number) => {
    setBudgets((prev) => ({ ...prev, [kind]: { ...prev[kind], [typeKey]: amount } }))
    try {
      const res = await fetch('/api/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, kind, typeKey, amount }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
    } catch {
      setError('저장에 실패했습니다. 다시 시도하세요.')
    }
  }

  const totalIncome = Object.values(budgets.income).reduce((s, n) => s + n, 0)
  const totalExpense = Object.values(budgets.expense).reduce((s, n) => s + n, 0)

  if (loading) return <p className="text-center py-16 text-gray-400 text-sm">불러오는 중...</p>

  return (
    <div className="space-y-4">
      {error && <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="grid lg:grid-cols-2 gap-6">
        <KindSection
          title="수입 (헌금) 예산"
          kind="income"
          types={offeringTypes}
          categories={categories}
          values={budgets.income}
          total={totalIncome}
          accent="blue"
          onSave={save}
        />
        <KindSection
          title="지출 예산"
          kind="expense"
          types={expenseTypes}
          categories={categories}
          values={budgets.expense}
          total={totalExpense}
          accent="rose"
          onSave={save}
        />
      </div>
    </div>
  )
}

function KindSection({
  title, kind, types, categories, values, total, accent, onSave,
}: {
  title: string
  kind: Kind
  types: LookupItem[]
  categories: LookupItem[]
  values: Record<string, number>
  total: number
  accent: 'blue' | 'rose'
  onSave: (kind: Kind, typeKey: string, amount: number) => void
}) {
  const grand = accent === 'rose' ? 'text-rose-700 bg-rose-50' : 'text-blue-700 bg-blue-50'
  const covered = new Set<string>()
  const groups = categories
    .map((cat) => {
      const items = types.filter((t) => t.categoryKey === cat.key)
      items.forEach((t) => covered.add(t.key))
      return { category: cat.name, items }
    })
    .filter((g) => g.items.length)
  const etc = types.filter((t) => !covered.has(t.key))
  if (etc.length) groups.push({ category: '기타', items: etc })

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-800 dark:text-gray-100">{title}</div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {groups.map((g) => (
          <div key={g.category}>
            <p className="px-4 py-1.5 bg-gray-50 dark:bg-gray-950/70 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400">{g.category}</p>
            {g.items.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-3 px-4 py-1.5">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t.name}</span>
                <input
                  key={values[t.key] ?? 0}
                  type="text"
                  inputMode="numeric"
                  defaultValue={values[t.key] ? values[t.key].toLocaleString() : ''}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => {
                    const amount = Number(e.target.value.replace(/[^\d]/g, '')) || 0
                    if (amount !== (values[t.key] ?? 0)) onSave(kind, t.key, amount)
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  placeholder="0"
                  className={`w-32 text-right text-sm rounded px-2 py-1 border border-gray-200 dark:border-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 ${accent === 'rose' ? 'focus:ring-rose-300' : 'focus:ring-blue-300'} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={`flex items-center justify-between px-4 py-2.5 font-bold border-t-2 border-gray-200 dark:border-gray-700 ${grand}`}>
        <span>합계</span>
        <span>{total.toLocaleString()}원</span>
      </div>
    </div>
  )
}
