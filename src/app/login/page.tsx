'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const params = useSearchParams()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // 모바일 자동완성/IME 로 state 반영이 늦는 경우를 대비해 DOM 값을 직접 읽는다
    const formPw = (new FormData(e.currentTarget).get('password') as string) ?? ''
    const pw = (formPw || password).trim()
    if (!pw) {
      setError('비밀번호를 입력하세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      const json = await res.json()
      if (json.success) {
        // 전체 페이지 이동으로 방금 설정된 쿠키가 확실히 전송되게 함 (모바일 라우터 race 방지)
        window.location.assign(params.get('from') || '/')
        return // 이동 중 로딩 상태 유지
      }
      setError('비밀번호가 올바르지 않습니다.')
      setLoading(false)
    } catch {
      setError('서버 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-1">검암중앙교회</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">재정관리 시스템</h1>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-12 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-300 touch-manipulation"
                >
                  <span className="text-lg">{showPassword ? '🙈' : '👁️'}</span>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl py-3.5 text-base font-semibold transition-colors touch-manipulation"
            >
              {loading ? '확인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
