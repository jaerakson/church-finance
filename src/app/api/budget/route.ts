import { NextResponse } from 'next/server'
import { getBudgets, setBudget, BudgetKind } from '@/lib/google-sheets'

function isKind(v: unknown): v is BudgetKind {
  return v === 'income' || v === 'expense'
}

export async function GET(request: Request) {
  const year = new URL(request.url).searchParams.get('year')
  if (!year) return NextResponse.json({ success: false, error: 'year required' }, { status: 400 })
  try {
    return NextResponse.json({ success: true, data: await getBudgets(year) })
  } catch (e) {
    console.error('[GET /api/budget]', e)
    return NextResponse.json({ success: false, error: '예산을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { year, kind, typeKey, amount } = await request.json()
    if (!year || !isKind(kind) || !typeKey) {
      return NextResponse.json({ success: false, error: 'invalid input' }, { status: 400 })
    }
    await setBudget(String(year), kind, String(typeKey), Number(amount) || 0)
    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    console.error('[PUT /api/budget]', e)
    return NextResponse.json({ success: false, error: '예산 저장에 실패했습니다.' }, { status: 500 })
  }
}
