import { NextResponse } from 'next/server'
import { updateExpense, deleteExpense } from '@/lib/google-sheets'
import { ExpenseFormData } from '@/lib/types'

type Params = { params: Promise<{ rowIndex: string }> }

export async function PUT(request: Request, { params }: Params) {
  const { rowIndex } = await params
  try {
    const body: ExpenseFormData = await request.json()
    await updateExpense(Number(rowIndex), body)
    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    console.error('[PUT /api/expense/:rowIndex]', e)
    return NextResponse.json({ success: false, error: '수정에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { rowIndex } = await params
  try {
    await deleteExpense(Number(rowIndex))
    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    console.error('[DELETE /api/expense/:rowIndex]', e)
    return NextResponse.json({ success: false, error: '삭제에 실패했습니다.' }, { status: 500 })
  }
}
