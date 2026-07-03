'use client'

import { toCsv } from '@/lib/csv'

interface Props {
  filename: string
  headers: string[]
  rows: (string | number)[][]
  label?: string
}

export default function CsvDownloadButton({ filename, headers, rows, label = 'CSV 다운로드' }: Props) {
  const onClick = () => {
    const csv = toCsv(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={rows.length === 0}
      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-950 disabled:opacity-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
    >
      <span>⬇</span> {label}
      <span className="text-xs text-gray-400">({rows.length.toLocaleString()})</span>
    </button>
  )
}
