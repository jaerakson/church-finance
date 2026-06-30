import { NextResponse } from 'next/server'
import { getExpenses, addExpense } from '@/lib/google-sheets'
import { ExpenseFormData } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const monthFilter = searchParams.get('month')
  const yearFilter = searchParams.get('year')
  try {
    let data = await getExpenses()
    if (monthFilter) data = data.filter((e) => e.date?.startsWith(monthFilter))
    else if (yearFilter && yearFilter !== 'all') data = data.filter((e) => e.date?.startsWith(yearFilter))
    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('[GET /api/expense]', e)
    return NextResponse.json({ success: false, error: '데이터를 불러오지 못했습니다.' }, { status: 500 })
  }
}

const norm = (s: string) => (s ?? '').replace(/,/g, '').trim()

export async function POST(request: Request) {
  try {
    const body: ExpenseFormData = await request.json()
    // 중복 차단 — 같은 날짜·종류·내역·금액이 이미 있으면 절대 저장하지 않음
    const existing = await getExpenses()
    const dup = existing.some(
      (e) =>
        e.date === body.date &&
        e.typeKey === body.typeKey &&
        (e.description ?? '').trim() === (body.description ?? '').trim() &&
        norm(e.amount) === norm(body.amount),
    )
    if (dup) {
      return NextResponse.json(
        { success: false, error: '이미 동일한 지출 내역이 입력되어 있어 저장할 수 없습니다. (중복)' },
        { status: 409 },
      )
    }
    await addExpense(body)
    return NextResponse.json({ success: true, data: null }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/expense]', e)
    return NextResponse.json({ success: false, error: '저장에 실패했습니다.' }, { status: 500 })
  }
}
