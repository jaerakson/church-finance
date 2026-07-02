import BackupButton from '@/components/settings/BackupButton'
import RestoreForm from '@/components/settings/RestoreForm'

export const dynamic = 'force-dynamic'

export default function BackupPage() {
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? ''
  const currentId = process.env.GOOGLE_SPREADSHEET_ID ?? ''

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">데이터 백업 · 복원</h1>
        <p className="text-sm text-gray-500 mt-1">모든 시트(교인·헌금·지출·코드값·예산)를 JSON으로 백업하고, 필요 시 새 시트로 복원합니다.</p>
      </div>

      {/* 백업 */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-800">백업</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <BackupButton />
          <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
            <li>파일명에 백업 시각이 포함됩니다.</li>
            <li>정기적으로 내려받아 안전한 곳(로컬/드라이브)에 보관하세요.</li>
            <li>실수로 지운 정도는 구글 시트 <b>버전 기록</b>·<b>드라이브 휴지통(30일)</b>으로 더 쉽게 되돌릴 수 있습니다.</li>
          </ul>
        </div>
      </section>

      {/* 복원 */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-800">복원 (새 시트로)</h2>
        <p className="text-sm text-gray-500">스프레드시트가 통째로 사라져 버전기록·휴지통으로도 복구할 수 없을 때, 새 빈 시트를 만들어 백업 데이터를 채워 넣습니다.</p>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <RestoreForm serviceEmail={serviceEmail} defaultTargetId={currentId} />
        </div>
      </section>
    </div>
  )
}
