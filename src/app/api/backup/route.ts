import { NextResponse } from 'next/server'
import { getAllRawData } from '@/lib/google-sheets'

// 전체 시트 원본을 JSON 한 파일로 내려받는다. (데이터 백업)
export async function GET() {
  try {
    const data = await getAllRawData()
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'church-finance',
      ...data,
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="church-finance-backup-${stamp}.json"`,
      },
    })
  } catch (e) {
    console.error('[GET /api/backup]', e)
    return NextResponse.json({ success: false, error: '백업 생성에 실패했습니다.' }, { status: 500 })
  }
}
