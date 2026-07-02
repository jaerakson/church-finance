import BackupButton from '@/components/settings/BackupButton'

export const dynamic = 'force-dynamic'

export default function BackupPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">데이터 백업</h1>
        <p className="text-sm text-gray-500 mt-1">모든 시트(교인·헌금·지출·코드값·예산)를 한 개의 JSON 파일로 내려받습니다.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <BackupButton />
        <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
          <li>파일명에 백업 시각이 포함됩니다 (예: church-finance-backup-2026-07-02-10-00-00.json).</li>
          <li>정기적으로 내려받아 안전한 곳(로컬/드라이브)에 보관하세요.</li>
          <li>원본 구글 스프레드시트는 Google이 자동 버전 기록을 유지하므로, 이 백업은 추가 안전장치입니다.</li>
        </ul>
      </div>

      <p className="text-xs text-gray-400">
        복원이 필요하면 백업 JSON의 각 시트 값을 원본 스프레드시트에 붙여넣으면 됩니다. (자동 복원은 데이터 유실 위험이 있어 제공하지 않습니다.)
      </p>
    </div>
  )
}
