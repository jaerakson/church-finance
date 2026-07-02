import { NextResponse } from 'next/server'
import { restoreToSpreadsheet } from '@/lib/google-sheets'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { targetSpreadsheetId, backup } = (body ?? {}) as {
    targetSpreadsheetId?: string
    backup?: { sheets?: Record<string, string[][]> }
  }

  if (!targetSpreadsheetId || typeof targetSpreadsheetId !== 'string') {
    return NextResponse.json({ success: false, error: '대상 스프레드시트 ID를 입력하세요.' }, { status: 400 })
  }
  if (!backup || typeof backup !== 'object' || !backup.sheets || typeof backup.sheets !== 'object') {
    return NextResponse.json({ success: false, error: '백업 파일 형식이 올바르지 않습니다. (sheets 없음)' }, { status: 400 })
  }

  try {
    const result = await restoreToSpreadsheet(targetSpreadsheetId.trim(), backup.sheets)
    return NextResponse.json({ success: true, data: result })
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code
    console.error('[POST /api/restore]', e)
    if (code === 404) {
      return NextResponse.json({ success: false, error: '대상 스프레드시트를 찾을 수 없습니다. ID를 확인하세요.' }, { status: 400 })
    }
    if (code === 403) {
      return NextResponse.json({ success: false, error: '대상 시트에 접근 권한이 없습니다. 서비스 계정 이메일에 편집자로 공유했는지 확인하세요.' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: '복원에 실패했습니다.' }, { status: 500 })
  }
}
