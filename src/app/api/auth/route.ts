import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()
  if (!password || password !== process.env.AUTH_PASSWORD) {
    return NextResponse.json({ success: false }, { status: 401 })
  }

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set('auth_token', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete('auth_token')
  return res
}
