'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'

export interface ComboOption {
  value: string
  label: string
}

interface Props {
  options: ComboOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** 입력한 텍스트가 어떤 옵션과도 일치하지 않을 때 "새로 만들기" 행을 노출하고, 클릭/Enter 시 호출 */
  onCreateNew?: (query: string) => void
  /** 새로 만들기 행에 표시할 라벨 (기본: "+ '{query}' 추가") */
  createLabel?: (query: string) => string
  /** 사용자가 입력한 텍스트가 바뀔 때마다 호출 (미존재 안내 등에 활용) */
  onQueryChange?: (query: string) => void
  /** 외부에서 input 포커스를 제어하기 위한 ref */
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** 옵션이 선택(마우스/Enter)되면 호출 — 다음 필드로 포커스 이동 등에 사용 */
  onSelected?: () => void
}

export default function Combobox({
  options, value, onChange, placeholder, className,
  onCreateNew, createLabel, onQueryChange, inputRef, onSelected,
}: Props) {
  const selected = options.find((o) => o.value === value)
  const [query, setQuery] = useState(selected?.label ?? '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(selected?.label ?? '')
  }, [value, selected?.label])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const trimmed = query.trim()
  // 이미 선택된 값을 그대로 표시 중일 때는 필터링하지 않고 전체 목록을 보여준다
  // (그래야 선택 후에도 ↓ 키로 다른 항목으로 바꿀 수 있다)
  const showingSelected = selected != null && query === selected.label
  const filtered = (trimmed && !showingSelected) ? options.filter((o) => o.label.includes(query)) : options
  const hasExact = options.some((o) => o.label === trimmed)
  const showCreate = Boolean(onCreateNew && trimmed && !showingSelected && !hasExact)
  const itemCount = filtered.length + (showCreate ? 1 : 0)

  // 입력/열림 변화 시 첫 항목을 활성화 → Enter로 최상단 일치 항목 바로 선택
  useEffect(() => { setActiveIndex(0) }, [query, open])

  const select = useCallback((opt: ComboOption) => {
    onChange(opt.value)
    setQuery(opt.label)
    onQueryChange?.(opt.label)
    setOpen(false)
    onSelected?.()
  }, [onChange, onQueryChange, onSelected])

  const choose = (idx: number) => {
    if (idx < filtered.length) select(filtered[idx])
    else if (showCreate) { onCreateNew!(trimmed); setOpen(false) }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true); setActiveIndex((i) => Math.min(i + 1, itemCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // 콤보박스에서 Enter는 폼 제출이 아니라 "선택"으로 동작
      e.preventDefault()
      if (open && itemCount > 0) choose(activeIndex)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); onChange(''); onQueryChange?.(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        autoComplete="off"
      />
      {open && (filtered.length > 0 || showCreate) && (
        <ul className="absolute z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto w-full text-sm">
          {filtered.map((opt, idx) => (
            <li
              key={opt.value}
              onMouseDown={(e) => { e.preventDefault(); select(opt) }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`px-3 py-2.5 cursor-pointer transition-colors ${idx === activeIndex ? 'bg-blue-100' : 'hover:bg-blue-50'} ${opt.value === value ? 'font-medium text-blue-700' : 'text-gray-800'}`}
            >
              {opt.label}
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={(e) => { e.preventDefault(); onCreateNew!(trimmed); setOpen(false) }}
              onMouseEnter={() => setActiveIndex(filtered.length)}
              className={`px-3 py-2.5 cursor-pointer font-medium border-t border-gray-100 ${activeIndex === filtered.length ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-emerald-50 text-emerald-700'}`}
            >
              {createLabel ? createLabel(trimmed) : `+ "${trimmed}" 추가`}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
