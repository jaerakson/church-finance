import LookupManager from '@/components/settings/LookupManager'

export const dynamic = 'force-dynamic'

export default function CodesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">코드값 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          지출분류·헌금분류·관(대분류)·소속·직분을 앱에서 직접 등록·수정·삭제합니다.
          사용 중인 항목(연결된 헌금/지출/교인 데이터가 있는 경우)은 삭제되지 않습니다.
        </p>
      </div>
      <LookupManager />
    </div>
  )
}
