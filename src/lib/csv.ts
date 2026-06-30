// CSV 생성 유틸 — 한글 Excel 호환을 위해 UTF-8 BOM 포함

function escapeField(value: string | number | null | undefined): string {
  const v = value == null ? '' : String(value)
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeField).join(','))
  return '﻿' + lines.join('\r\n')
}
