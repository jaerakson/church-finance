import { NextResponse } from 'next/server'
import { getOfferings, getExpenses } from '@/lib/google-sheets'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const typeKey = searchParams.get('typeKey')
  const year = searchParams.get('year')
  const memberKey = searchParams.get('memberKey')
  const kind = searchParams.get('kind') ?? 'offering'

  if (!typeKey) {
    return NextResponse.json({ success: false, error: 'typeKey required' }, { status: 400 })
  }

  try {
    const items = kind === 'expense' ? await getExpenses() : await getOfferings()

    const filtered = items.filter((item) => {
      if (item.typeKey !== typeKey) return false
      if (year && !item.date?.startsWith(year)) return false
      if (memberKey && 'memberKey' in item && item.memberKey !== memberKey) return false
      return true
    })

    // 빈도순 금액 TOP5
    const counts: Record<string, number> = {}
    for (const item of filtered) {
      const amt = item.amount.replace(/,/g, '').trim()
      if (amt && !isNaN(Number(amt)) && Number(amt) > 0) {
        counts[amt] = (counts[amt] ?? 0) + 1
      }
    }

    const data = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([amount, count]) => ({ amount, count }))

    // 개인화 비교용 최근 입력 내역 (최신순 5건)
    const recent = [...filtered]
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, 5)
      .map((item) => ({
        date: item.date,
        amount: item.amount.replace(/,/g, '').trim(),
      }))

    return NextResponse.json({ success: true, data, recent })
  } catch (e) {
    console.error('[GET /api/stats/amounts]', e)
    return NextResponse.json({ success: false, error: '통계를 불러오지 못했습니다.' }, { status: 500 })
  }
}
