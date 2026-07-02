'use client'

import { useState } from 'react'

export default function BackupButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const download = async () => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) throw new Error('백업 생성 실패')
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] ?? 'church-finance-backup.json'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setDone(filename)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '백업에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
      >
        {busy ? '백업 생성 중...' : '⬇ 전체 백업 다운로드 (JSON)'}
      </button>
      {done && <p className="text-sm text-emerald-600">✓ 저장됨: {done}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  )
}
