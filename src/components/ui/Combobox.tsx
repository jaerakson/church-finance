'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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
}

export default function Combobox({ options, value, onChange, placeholder, className }: Props) {
  const selected = options.find((o) => o.value === value)
  const [query, setQuery] = useState(selected?.label ?? '')
  const [open, setOpen] = useState(false)
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

  const filtered = query.trim()
    ? options.filter((o) => o.label.includes(query))
    : options

  const select = useCallback((opt: ComboOption) => {
    onChange(opt.value)
    setQuery(opt.label)
    setOpen(false)
  }, [onChange])

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto w-full text-sm">
          {filtered.map((opt) => (
            <li
              key={opt.value}
              onMouseDown={(e) => { e.preventDefault(); select(opt) }}
              className={`px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors ${opt.value === value ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-800'}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
