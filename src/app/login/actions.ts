'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type LoginState = { error?: string }

/**
 * 서버 액션 로그인 — 서버에서 비밀번호 검증 후 쿠키를 설정하고 곧바로 리다이렉트한다.
 * 클라이언트 fetch + 쿠키 반영 타이밍 race가 없어 모바일에서도 안정적이다.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get('password') ?? '')
  const fromRaw = String(formData.get('from') ?? '/')
  const from = fromRaw.startsWith('/') ? fromRaw : '/'

  if (!password) {
    return { error: '비밀번호를 입력하세요.' }
  }
  if (password !== process.env.AUTH_PASSWORD) {
    return { error: '비밀번호가 올바르지 않습니다.' }
  }
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return { error: '서버 설정 오류(AUTH_SECRET 미설정).' }
  }

  const store = await cookies()
  store.set('auth_token', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  redirect(from) // 성공 시 반환하지 않고 이동
}
