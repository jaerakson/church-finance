import { NextResponse } from 'next/server'
import { getOfferings, addOffering } from '@/lib/google-sheets'
import { OfferingFormData } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateFilter = searchParams.get('date')
  const yearFilter = searchParams.get('year')
  try {
    let data = await getOfferings()
    if (dateFilter) data = data.filter((o) => o.date === dateFilter)
    else if (yearFilter && yearFilter !== 'all') data = data.filter((o) => o.date?.startsWith(yearFilter))
    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('[GET /api/offering]', e)
    return NextResponse.json({ success: false, error: '데이터를 불러오지 못했습니다.' }, { status: 500 })
  }
}

const norm = (s: string) => (s ?? '').replace(/,/g, '').trim()

export async function POST(request: Request) {
  try {
    const body: OfferingFormData = await request.json()
    // 중복 차단 — 같은 날짜·교인·종류·금액이 이미 있으면 절대 저장하지 않음
    const existing = await getOfferings()
    const dup = existing.some(
      (o) =>
        o.date === body.date &&
        o.memberKey === body.memberKey &&
        o.typeKey === body.typeKey &&
        norm(o.amount) === norm(body.amount),
    )
    if (dup) {
      return NextResponse.json(
        { success: false, error: '이미 동일한 헌금 내역이 입력되어 있어 저장할 수 없습니다. (중복)' },
        { status: 409 },
      )
    }
    await addOffering(body)
    return NextResponse.json({ success: true, data: null }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/offering]', e)
    return NextResponse.json({ success: false, error: '저장에 실패했습니다.' }, { status: 500 })
  }
}
