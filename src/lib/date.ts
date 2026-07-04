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

// 지정 연도의 1월 첫 주일부터 asOf(포함)까지의 모든 주일(YYYY-MM-DD)을 반환한다.
// asOf 이후(미래) 주일은 제외한다. UTC 기준으로 계산해 로컬 타임존/DST 영향 없이 안정적이다.
export function sundaysUpTo(year: string, asOf: string): string[] {
  const y = Number(year)
  if (!y || !asOf) return []
  const result: string[] = []
  const d = new Date(Date.UTC(y, 0, 1))
  // 1월 1일 이후 첫 주일로 이동 (getUTCDay: 0=주일)
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7))
  for (;;) {
    const iso = d.toISOString().slice(0, 10)
    if (iso.slice(0, 4) !== String(y)) break // 해당 연도를 벗어남
    if (iso > asOf) break                     // 미래 주일 제외
    result.push(iso)
    d.setUTCDate(d.getUTCDate() + 7)
  }
  return result
}
