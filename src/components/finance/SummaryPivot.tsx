'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type PivotItem = { key: string; name: string; budget: number; prev: number; current: number; total: number }
export type PivotSection = {
  category: string
  items: PivotItem[]
  subtotal: { budget: number; prev: number; current: number; total: number }
}

interface Props {
  title: string
  kind: 'income' | 'expense'
  sections: PivotSection[]
  grand: { budget: number; prev: number; current: number; total: number }
  grandLabel: string
  year: string
  half: string
  accent: 'blue' | 'rose'
}

const num = (n: number) => (n ? n.toLocaleString() : '-')

export default function SummaryPivot({ title, kind, sections, grand, grandLabel, year, half, accent }: Props) {
  // 기본은 모든 관(대분류) 접힌 상태로 시작한다.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(sections.map((s) => s.category)))
  const toggle = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

  const grandColor = accent === 'rose' ? 'text-rose-700 bg-rose-50' : 'text-blue-700 bg-blue-50'
  const link = (key: string, scope: 'current' | 'prev' | 'total') =>
    `/finance/summary/${kind}/${encodeURIComponent(key)}?year=${encodeURIComponent(year)}&half=${half}&scope=${scope}`

  return (
    <div className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 font-bold text-gray-800">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
            <th className="px-3 py-2 text-left font-semibold">항목</th>
            <th className="px-3 py-2 text-right font-semibold">예산</th>
            <th className="px-3 py-2 text-right font-semibold">직전누계</th>
            <th className="px-3 py-2 text-right font-semibold">현누계</th>
            <th className="px-3 py-2 text-right font-semibold">총합계</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sections.map((sec) => {
            const isCollapsed = collapsed.has(sec.category)
            return (
              <PivotGroup
                key={sec.category}
                sec={sec}
                isCollapsed={isCollapsed}
                onToggle={() => toggle(sec.category)}
                kind={kind}
                year={year}
                link={link}
              />
            )
          })}
          <tr className={`font-bold ${grandColor} border-t-2 border-gray-200`}>
            <td className="px-3 py-2.5">{grandLabel}</td>
            <td className="px-3 py-2.5 text-right">{num(grand.budget)}</td>
            <td className="px-3 py-2.5 text-right">{num(grand.prev)}</td>
            <td className="px-3 py-2.5 text-right">{num(grand.current)}</td>
            <td className="px-3 py-2.5 text-right">{num(grand.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PivotGroup({
  sec, isCollapsed, onToggle, kind, year, link,
}: {
  sec: PivotSection
  isCollapsed: boolean
  onToggle: () => void
  kind: 'income' | 'expense'
  year: string
  link: (key: string, scope: 'current' | 'prev' | 'total') => string
}) {
  return (
    <>
      <tr className="bg-gray-50/70 cursor-pointer hover:bg-gray-100/70" onClick={onToggle}>
        <td className="px-3 py-1.5 text-xs font-bold text-gray-600">
          <span className="inline-block w-4 text-gray-400">{isCollapsed ? '▶' : '▼'}</span>
          {sec.category}
        </td>
        <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-500">{num(sec.subtotal.budget)}</td>
        <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-500">{num(sec.subtotal.prev)}</td>
        <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-700">{num(sec.subtotal.current)}</td>
        <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-700">{num(sec.subtotal.total)}</td>
      </tr>
      {!isCollapsed &&
        sec.items.map((it) => (
          <tr key={it.key} className="hover:bg-blue-50/40">
            <td className="px-3 py-2 pl-8">
              <Link href={link(it.key, 'total')} className="text-blue-600 hover:text-blue-800 hover:underline">
                {it.name}
              </Link>
            </td>
            <td className="px-3 py-1 text-right">
              <BudgetCell kind={kind} year={year} typeKey={it.key} value={it.budget} />
            </td>
            <td className="px-3 py-2 text-right text-gray-500">
              {it.prev ? <Link href={link(it.key, 'prev')} className="hover:underline">{num(it.prev)}</Link> : '-'}
            </td>
            <td className="px-3 py-2 text-right text-gray-800">
              {it.current ? <Link href={link(it.key, 'current')} className="hover:underline font-medium">{num(it.current)}</Link> : '-'}
            </td>
            <td className="px-3 py-2 text-right text-gray-900 font-medium">
              {it.total ? <Link href={link(it.key, 'total')} className="hover:underline">{num(it.total)}</Link> : '-'}
            </td>
          </tr>
        ))}
    </>
  )
}

function BudgetCell({ kind, year, typeKey, value }: { kind: 'income' | 'expense'; year: string; typeKey: string; value: number }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const commit = async (raw: string) => {
    const amount = Number(raw.replace(/[^\d]/g, '')) || 0
    if (amount === value) return
    setSaving(true)
    setError(false)
    try {
      const res = await fetch('/api/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, kind, typeKey, amount }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      router.refresh()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      key={value}
      type="text"
      inputMode="numeric"
      defaultValue={value ? value.toLocaleString() : ''}
      disabled={saving}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      placeholder="예산 입력"
      title="클릭해서 예산을 입력하세요"
      className={`w-24 text-right text-sm rounded px-2 py-1 border ${error ? 'border-rose-400' : 'border-transparent hover:border-gray-200'} focus:border-blue-400 focus:bg-white focus:outline-none ${saving ? 'opacity-50' : ''} bg-transparent`}
    />
  )
}
