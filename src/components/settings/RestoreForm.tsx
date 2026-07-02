'use client'

import { useState } from 'react'

interface Props {
  serviceEmail: string
  defaultTargetId: string
}

type RestoreResult = { restored: { sheet: string; rows: number }[]; skipped: string[] }

export default function RestoreForm({ serviceEmail, defaultTargetId }: Props) {
  const [targetId, setTargetId] = useState(defaultTargetId)
  const [fileName, setFileName] = useState<string | null>(null)
  const [backup, setBackup] = useState<{ sheets?: Record<string, string[][]> } | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RestoreResult | null>(null)

  const onFile = async (file: File | undefined) => {
    setError(null)
    setResult(null)
    if (!file) return
    setFileName(file.name)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      if (!json?.sheets || typeof json.sheets !== 'object') throw new Error('sheets 없음')
      setBackup(json)
    } catch {
      setBackup(null)
      setError('백업 파일을 읽지 못했습니다. church-finance-backup-*.json 파일인지 확인하세요.')
    }
  }

  const sheetCount = backup?.sheets ? Object.keys(backup.sheets).length : 0

  const submit = async () => {
    if (!backup || !targetId.trim() || confirmText.trim() !== '복원') return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSpreadsheetId: targetId.trim(), backup }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data as RestoreResult)
      setConfirmText('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '복원에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = !!backup && targetId.trim() !== '' && confirmText.trim() === '복원' && !busy

  return (
    <div className="space-y-4">
      {/* 준비 안내 */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900 space-y-1.5">
        <p className="font-semibold">복원 전 준비 (한 번만)</p>
        <ol className="list-decimal pl-5 space-y-1 text-blue-800">
          <li>구글 드라이브에서 <b>새 빈 스프레드시트</b>를 만듭니다.</li>
          <li>그 시트를 아래 서비스 계정 이메일에 <b>편집자로 공유</b>합니다:</li>
        </ol>
        <code className="block mt-1 px-2 py-1 bg-white border border-blue-200 rounded text-blue-900 break-all">{serviceEmail || '(서비스 계정 이메일 미설정)'}</code>
        <ol className="list-decimal pl-5 space-y-1 text-blue-800" start={3}>
          <li>새 시트 URL의 <b>ID</b>(/d/ 와 /edit 사이 문자열)를 아래에 붙여넣습니다.</li>
          <li>백업 JSON 파일을 올리고 복원합니다.</li>
        </ol>
      </div>

      {/* 대상 ID */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">대상 스프레드시트 ID</label>
        <input
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder="예: 1dShu54UEED..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400">기본값은 현재 앱이 사용 중인 시트입니다. 새 시트에 복원하려면 그 시트의 ID로 바꾸세요.</p>
      </div>

      {/* 파일 */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">백업 JSON 파일</label>
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        {fileName && backup && <p className="text-xs text-emerald-600">✓ {fileName} · 시트 {sheetCount}개 인식</p>}
      </div>

      {/* 경고 + 확인 */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        ⚠️ 복원은 대상 시트의 <b>데이터 탭(헌금·지출·교인·코드값·예산)을 백업 내용으로 덮어씁니다.</b> 수식/피벗 탭은 건드리지 않습니다.
        진행 전 <a href="/api/backup" className="underline font-medium">현재 상태 백업</a>을 먼저 받아두세요.
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">확인을 위해 <b>복원</b> 이라고 입력하세요</label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="복원"
          className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
      >
        {busy ? '복원 중...' : '백업으로 복원 실행'}
      </button>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {result && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 space-y-2">
          <p className="font-semibold">✓ 복원 완료</p>
          <ul className="text-emerald-800 space-y-0.5">
            {result.restored.map((r) => (
              <li key={r.sheet}>· {r.sheet}: {r.rows.toLocaleString()}행</li>
            ))}
          </ul>
          {result.skipped.length > 0 && (
            <p className="text-emerald-700 text-xs">건너뜀(수식/기타 탭): {result.skipped.join(', ')}</p>
          )}
          {targetId.trim() !== defaultTargetId && (
            <p className="text-xs text-emerald-700 mt-1">
              새 시트에 복원했다면, 앱이 이 시트를 쓰도록 <code>GOOGLE_SPREADSHEET_ID</code> 환경변수를 이 ID로 바꾸고 재배포하세요.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
