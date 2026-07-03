const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function currentYear(): string {
  return String(new Date().getFullYear())
}

export function currentHalf(): '1' | '2' {
  const d = new Date()
  // 한국 시간(KST)은 UTC+9 이므로 9시간(9 * 60 * 60 * 1000ms)을 더해 계산합니다.
  const kstMonth = new Date(d.getTime() + 9 * 60 * 60 * 1000).getUTCMonth() + 1
  return kstMonth >= 7 ? '2' : '1'
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatDateKo(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr ?? ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${dateStr.slice(5).replace('-', '/')} (${DAY_KO[d.getDay()]})`
}

export function dayOfWeekKo(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_KO[d.getDay()]
}

export function currentWeekRange(): { start: string; end: string } {
  const d = new Date()
  const day = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}
