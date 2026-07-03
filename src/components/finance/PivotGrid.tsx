'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type PivotEntry = {
  rowIndex: number
  date: string
  amount: number
  note: string
  memberKey?: string
  description?: string
}
// count===1 이면 entry(단일 행)로 수정 가능, count>1 이면 합계만 표시(목록 보기에서 수정)
export type PivotCell = { amount: number; count: number; entry: PivotEntry | null }
export type PivotRowDef = { key: string; label: string }

interface Props {
  kind: 'income' | 'expense'
  typeKey: string
  rows: PivotRowDef[]
  dates: string[]
  cells: Record<string, Record<string, PivotCell>>
  accent: 'blue' | 'rose'
}

const won = (n: number) => (n ? n.toLocaleString() : '')

export default function PivotGrid({ kind, typeKey, rows, dates, cells, accent }: Props) {
  const router = useRouter()
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ring = accent === 'rose' ? 'focus:ring-rose-400' : 'focus:ring-blue-400'
  const headBg = accent === 'rose' ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-blue-50 dark:bg-blue-950/30'

  const commit = async (rowKey: string, date: string, raw: string) => {
    const cell = cells[rowKey]?.[date]
    const amount = Number(raw.replace(/[^\d]/g, '')) || 0
    const prev = cell?.entry?.amount ?? 0
    if (cell && cell.count > 1) return // 합계 셀은 수정 불가
    if (amount === prev) return
    if (amount === 0 && !cell?.entry) return // 빈 셀에 0 입력 → 무시

    const cellId = `${rowKey}__${date}`
    setSavingCell(cellId)
    setError(null)
    try {
      let res: Response
      if (cell?.entry) {
        // 기존 단일 행 수정 (note 등 보존)
        const e = cell.entry
        const base = kind === 'income'
          ? { date: e.date, memberKey: e.memberKey, typeKey, amount, note: e.note }
          : { date: e.date, typeKey, description: e.description, amount, note: e.note }
        res = await fetch(`/api/${kind === 'income' ? 'offering' : 'expense'}/${e.rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(base),
        })
      } else {
        // 신규 생성
        const base = kind === 'income'
          ? { date, memberKey: rowKey, typeKey, amount, note: '' }
          : { date, typeKey, description: rowKey, amount, note: '' }
        res = await fetch(`/api/${kind === 'income' ? 'offering' : 'expense'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(base),
        })
      }
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSavingCell(null)
    }
  }

  const rowTotal = (rowKey: string) => dates.reduce((s, d) => s + (cells[rowKey]?.[d]?.amount ?? 0), 0)
  const dateTotal = (date: string) => rows.reduce((s, r) => s + (cells[r.key]?.[date]?.amount ?? 0), 0)
  const grandTotal = rows.reduce((s, r) => s + rowTotal(r.key), 0)

  if (rows.length === 0) {
    return <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center text-gray-400 dark:text-gray-500 text-sm">데이터가 없습니다.</div>
  }

  return (
    <div className="space-y-2">
      {error && <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        빈 칸에 금액을 입력하면 새 내역이 추가되고, 기존 금액을 고치면 바로 수정됩니다. (같은 날 2건 이상인 칸은 합계만 표시 — 기본 보기에서 수정)
      </p>
      <div className="overflow-auto rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 max-h-[70vh]">
        <table className="text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className={headBg}>
              <th className="sticky left-0 z-20 bg-inherit px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-r border-gray-100 dark:border-gray-800 min-w-[8rem]">이름</th>
              {dates.map((d) => (
                <th key={d} className="px-2 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap min-w-[6rem]">
                  {d.slice(5)}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 border-b border-l border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 dark:bg-gray-800 min-w-[7rem]">합계</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-gray-50 dark:bg-gray-950/40 dark:hover:bg-gray-800/50">
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-3 py-1 text-gray-800 dark:text-gray-200 border-r border-gray-100 dark:border-gray-800 font-medium whitespace-nowrap">{r.label}</td>
                {dates.map((d) => {
                  const cell = cells[r.key]?.[d]
                  const cellId = `${r.key}__${d}`
                  const multi = !!cell && cell.count > 1
                  return (
                    <td key={d} className="px-1 py-0.5 border-b border-gray-50 dark:border-gray-800 text-right">
                      {multi ? (
                        <span className="inline-block w-[5.5rem] px-2 py-1 text-gray-500 dark:text-gray-400 text-right" title={`${cell!.count}건 합계 — 기본 보기에서 수정`}>
                          {won(cell!.amount)}·{cell!.count}
                        </span>
                      ) : (
                        <input
                          key={cell?.entry?.amount ?? 0}
                          type="text"
                          inputMode="numeric"
                          defaultValue={cell?.entry ? won(cell.entry.amount) : ''}
                          disabled={savingCell === cellId}
                          onFocus={(e) => e.currentTarget.select()}
                          onBlur={(e) => commit(r.key, d, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          className={`w-[5.5rem] text-right rounded px-2 py-1 border ${cell?.entry ? 'border-transparent hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-700' : 'border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 dark:text-gray-300'} focus:bg-white dark:bg-gray-900 dark:focus:bg-gray-950 focus:border-blue-400 focus:outline-none focus:ring-1 ${ring} ${savingCell === cellId ? 'opacity-50' : ''} bg-transparent dark:text-gray-100`}
                        />
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-1 text-right font-semibold text-gray-900 dark:text-gray-100 border-l border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 dark:bg-gray-800/60 whitespace-nowrap">{rowTotal(r.key).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0">
            <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
              <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200 border-r border-t-2 border-gray-200 dark:border-gray-700">합계</td>
              {dates.map((d) => (
                <td key={d} className="px-2 py-2 text-right text-gray-800 dark:text-gray-100 border-t-2 border-gray-200 dark:border-gray-700 whitespace-nowrap">{won(dateTotal(d))}</td>
              ))}
              <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100 border-l border-t-2 border-gray-200 dark:border-gray-700 whitespace-nowrap">{grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
