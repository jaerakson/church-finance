import { NextResponse } from 'next/server'
import { getLookupRows, addLookupRow, updateLookupRow, deleteLookupRow, isLookupInUse } from '@/lib/google-sheets'
import { LookupKind } from '@/lib/types'

const KINDS: LookupKind[] = ['category', 'department', 'position', 'offeringType', 'expenseType']

function isKind(v: string | null): v is LookupKind {
  return !!v && (KINDS as string[]).includes(v)
}

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get('kind')
  if (!isKind(kind)) return NextResponse.json({ success: false, error: 'invalid kind' }, { status: 400 })
  try {
    return NextResponse.json({ success: true, data: await getLookupRows(kind) })
  } catch (e) {
    console.error('[GET /api/lookups]', e)
    return NextResponse.json({ success: false, error: '불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { kind, name, categoryKey } = await request.json()
    if (!isKind(kind)) return NextResponse.json({ success: false, error: 'invalid kind' }, { status: 400 })
    if (!name?.trim()) return NextResponse.json({ success: false, error: '이름을 입력하세요.' }, { status: 400 })
    await addLookupRow(kind, name.trim(), categoryKey)
    return NextResponse.json({ success: true, data: null }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/lookups]', e)
    return NextResponse.json({ success: false, error: '저장에 실패했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { kind, rowIndex, key, name, categoryKey } = await request.json()
    if (!isKind(kind)) return NextResponse.json({ success: false, error: 'invalid kind' }, { status: 400 })
    if (!name?.trim()) return NextResponse.json({ success: false, error: '이름을 입력하세요.' }, { status: 400 })
    await updateLookupRow(kind, Number(rowIndex), String(key), name.trim(), categoryKey)
    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    console.error('[PUT /api/lookups]', e)
    return NextResponse.json({ success: false, error: '수정에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const sp = new URL(request.url).searchParams
  const kind = sp.get('kind')
  const rowIndex = Number(sp.get('rowIndex'))
  const key = sp.get('key') ?? ''
  if (!isKind(kind)) return NextResponse.json({ success: false, error: 'invalid kind' }, { status: 400 })
  try {
    if (await isLookupInUse(kind, key)) {
      return NextResponse.json(
        { success: false, error: '사용 중인 항목이라 삭제할 수 없습니다. (연결된 데이터가 있음)' },
        { status: 409 },
      )
    }
    await deleteLookupRow(kind, rowIndex)
    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    console.error('[DELETE /api/lookups]', e)
    return NextResponse.json({ success: false, error: '삭제에 실패했습니다.' }, { status: 500 })
  }
}
