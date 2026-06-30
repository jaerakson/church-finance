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

export async function POST(request: Request) {
  try {
    const body: OfferingFormData = await request.json()
    await addOffering(body)
    return NextResponse.json({ success: true, data: null }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/offering]', e)
    return NextResponse.json({ success: false, error: '저장에 실패했습니다.' }, { status: 500 })
  }
}
