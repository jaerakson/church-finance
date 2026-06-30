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

export async function POST(request: Request) {
  try {
    const body: ExpenseFormData = await request.json()
    await addExpense(body)
    return NextResponse.json({ success: true, data: null }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/expense]', e)
    return NextResponse.json({ success: false, error: '저장에 실패했습니다.' }, { status: 500 })
  }
}
