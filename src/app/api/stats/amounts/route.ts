import { NextResponse } from 'next/server'
import { getOfferings, getExpenses } from '@/lib/google-sheets'

// 헌금/지출 공통으로 다룰 최소 형태
type Row = {
  date: string
  amount: string
  typeKey: string
  memberKey?: string
  note?: string
  description?: string
}

function topStrings(values: string[], limit = 8): string[] {
  const counts: Record<string, number> = {}
  for (const v of values) {
    const t = v?.trim()
    if (t) counts[t] = (counts[t] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([s]) => s)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const typeKey = searchParams.get('typeKey')
  const asOf = searchParams.get('asOf') // 기준일 (YYYY-MM-DD). 이 날짜로부터 최근 1년
  const memberKey = searchParams.get('memberKey')
  const kind = searchParams.get('kind') ?? 'offering'

  if (!typeKey) {
    return NextResponse.json({ success: false, error: 'typeKey required' }, { status: 400 })
  }

  try {
    const items: Row[] = kind === 'expense' ? await getExpenses() : await getOfferings()

    // 종류(+교인) 기준 전체 기간 — 내역/비고 제안용
    const typeScoped = items.filter((item) => {
      if (item.typeKey !== typeKey) return false
      if (memberKey && item.memberKey !== memberKey) return false
      return true
    })

    // 금액·최근내역은 "최근 1년"(롤링 12개월) 기준
    const anchor = asOf ? new Date(`${asOf}T00:00:00`) : new Date()
    const cutoff = new Date(anchor)
    cutoff.setFullYear(cutoff.getFullYear() - 1)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const windowScoped = typeScoped.filter((i) => i.date && i.date >= cutoffStr)

    // 빈도순 금액 TOP5
    const counts: Record<string, number> = {}
    for (const item of windowScoped) {
      const amt = item.amount.replace(/,/g, '').trim()
      if (amt && !isNaN(Number(amt)) && Number(amt) > 0) {
        counts[amt] = (counts[amt] ?? 0) + 1
      }
    }
    const data = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([amount, count]) => ({ amount, count }))

    // 비교용 최근 입력 (최신순 5건)
    const recent = [...windowScoped]
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, 5)
      .map((item) => ({ date: item.date, amount: item.amount.replace(/,/g, '').trim() }))

    // 내역(지출 전용)·비고 제안 — 전체 기간 빈도순
    const descriptions = topStrings(typeScoped.map((i) => i.description ?? ''))
    const notes = topStrings(typeScoped.map((i) => i.note ?? ''))

    return NextResponse.json({ success: true, data, recent, descriptions, notes })
  } catch (e) {
    console.error('[GET /api/stats/amounts]', e)
    return NextResponse.json({ success: false, error: '통계를 불러오지 못했습니다.' }, { status: 500 })
  }
}
