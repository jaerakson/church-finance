'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

export interface Suggestion {
  value: string
  count?: number
}

interface Props {
  value: string
  onChange: (value: string) => void
  suggestions: Suggestion[]
  placeholder?: string
  accent?: 'blue' | 'rose'
  /** 외부에서 input 포커스를 제어하기 위한 ref */
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** Enter 시 다음 필드로 이동 (지정되면 Enter가 폼 제출 대신 이동으로 동작) */
  onEnter?: () => void
}

/**
 * 자유 입력형 콤보박스.
 * - 직접 타이핑해서 새 값을 넣을 수도 있고
 * - 기존에 입력된 값 목록(suggestions)을 드롭다운/키보드로 골라 넣을 수도 있다.
 */
export default function SuggestInput({ value, onChange, suggestions, placeholder, accent = 'blue', inputRef, onEnter }: Props) {
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
  const filtered = (q ? suggestions.filter((s) => s.value.includes(q)) : suggestions).filter((s) => s.value !== value)
  const ring = accent === 'rose' ? 'focus:ring-rose-500' : 'focus:ring-blue-500'
  const hover = accent === 'rose' ? 'hover:bg-rose-50 dark:hover:bg-rose-950/10' : 'hover:bg-blue-50 dark:hover:bg-blue-950/10'
  const active = accent === 'rose' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100' : 'bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'

  useEffect(() => { setActiveIndex(-1) }, [value, open])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const picking = open && activeIndex >= 0 && activeIndex < filtered.length
      if (picking) {
        e.preventDefault()
        onChange(filtered[activeIndex].value)
        setOpen(false)
        onEnter?.()
      } else if (onEnter) {
        // 다음 필드로 이동 (폼 제출 방지)
        e.preventDefault()
        setOpen(false)
        onEnter()
      } else {
        // onEnter 없음 → Enter가 폼을 제출하도록 둠
        setOpen(false)
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
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 dark:text-gray-50`}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:border-gray-800 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto w-full text-sm">
          {filtered.map((s, idx) => (
            <li
              key={s.value}
              onMouseDown={(e) => { e.preventDefault(); onChange(s.value); setOpen(false); onEnter?.() }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors text-gray-800 dark:text-gray-200 ${idx === activeIndex ? active : hover}`}
            >
              <span className="truncate">{s.value}</span>
              {s.count != null && <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">최근 {s.count}회</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
