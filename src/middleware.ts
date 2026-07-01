import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authToken, AUTH_COOKIE } from '@/lib/auth'

const PUBLIC_PREFIXES = ['/login', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value
  const secret = process.env.AUTH_SECRET

  if (!secret || !token || token !== (await authToken(secret))) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
