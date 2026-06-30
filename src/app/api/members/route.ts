import { NextResponse } from 'next/server'
import { getMembers, addMember } from '@/lib/google-sheets'
import { MemberFormData } from '@/lib/types'

export async function GET() {
  try {
    const members = await getMembers()
    return NextResponse.json({ success: true, data: members })
  } catch (e) {
    console.error('[GET /api/members]', e)
    return NextResponse.json({ success: false, error: '데이터를 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: MemberFormData = await request.json()
    const member = await addMember(body)
    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/members]', e)
    return NextResponse.json({ success: false, error: '저장에 실패했습니다.' }, { status: 500 })
  }
}
