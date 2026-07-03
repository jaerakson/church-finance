'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

export interface AmountSuggestion {
  amount: string // raw digits
  count: number
}

interface Props {
  value: string // raw digits
  onChange: (raw: string) => void
  suggestions: AmountSuggestion[]
  placeholder?: string
  accent?: 'blue' | 'rose'
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** Enter 시 다음 동작 (지정되면 Enter가 폼 제출 대신 이동/처리) */
  onEnter?: () => void
}

/**
 * 금액 입력 — 비고(SuggestInput)처럼 동작.
 * - 천단위 콤마 표시, 숫자만 입력
 * - 최근 자주 쓴 금액을 드롭다운에서 ↑↓ + Enter 로 선택 (클릭 불필요)
 * - 강조된 제안이 없을 때 Enter 는 폼 제출로 흘려보냄(연속 저장)
 */
export default function AmountInput({ value, onChange, suggestions, placeholder, accent = 'blue', inputRef, onEnter }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = value.trim()
  const filtered = q ? suggestions.filter((s) => s.amount.includes(q)) : suggestions
  const ring = accent === 'rose' ? 'focus:ring-rose-500' : 'focus:ring-blue-500'
  const hover = accent === 'rose' ? 'hover:bg-rose-50' : 'hover:bg-blue-50'
  const activeBg = accent === 'rose' ? 'bg-rose-100' : 'bg-blue-100'
  const display = value === '' ? '' : Number(value).toLocaleString()

  useEffect(() => { setActiveIndex(-1) }, [value, open])

  const pick = (raw: string) => { onChange(raw); setOpen(false); onEnter?.() }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const picking = open && activeIndex >= 0 && activeIndex < filtered.length
      if (picking) {
        e.preventDefault()
        onChange(filtered[activeIndex].amount)
        setOpen(false)
      } else if (onEnter) {
        e.preventDefault()
        setOpen(false)
        onEnter()
      } else {
        setOpen(false) // 폼 제출로 흘려보냄
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value.replace(/[^\d]/g, '')); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 ${ring} bg-white dark:bg-gray-900`}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto w-full text-sm">
          {filtered.map((s, idx) => (
            <li
              key={s.amount}
              onMouseDown={(e) => { e.preventDefault(); pick(s.amount) }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${idx === activeIndex ? activeBg : hover}`}
            >
              <span className="font-medium text-gray-800">{Number(s.amount).toLocaleString()}원</span>
              <span className="text-[10px] text-gray-400">최근 {s.count}회</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
