import { NextResponse } from 'next/server'
import { getMember, updateMember, deleteMember } from '@/lib/google-sheets'
import { Member } from '@/lib/types'

type Params = { params: Promise<{ rowIndex: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { rowIndex } = await params
  try {
    const member = await getMember(Number(rowIndex))
    if (!member) return NextResponse.json({ success: false, error: '교인을 찾을 수 없습니다.' }, { status: 404 })
    return NextResponse.json({ success: true, data: member })
  } catch (e) {
    console.error('[GET /api/members/:rowIndex]', e)
    return NextResponse.json({ success: false, error: '데이터를 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { rowIndex } = await params
  try {
    const body: Omit<Member, 'rowIndex'> = await request.json()
    await updateMember(Number(rowIndex), body)
    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    console.error('[PUT /api/members/:rowIndex]', e)
    return NextResponse.json({ success: false, error: '수정에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { rowIndex } = await params
  try {
    await deleteMember(Number(rowIndex))
    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    console.error('[DELETE /api/members/:rowIndex]', e)
    return NextResponse.json({ success: false, error: '삭제에 실패했습니다.' }, { status: 500 })
  }
}
