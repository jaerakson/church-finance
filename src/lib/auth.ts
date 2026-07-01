// AUTH_SECRET(한글 등 비ASCII 포함 가능)을 ASCII 토큰(hex)으로 변환한다.
// 쿠키 값으로 비ASCII 문자를 쓰면 모바일/네트워크 환경에 따라 인코딩이 어긋나
// 로그인이 풀리는 문제가 생길 수 있어, 쿠키에는 항상 ASCII 해시를 저장한다.
// Web Crypto(crypto.subtle)는 Edge(미들웨어)와 Node(라우트) 양쪽에서 동작한다.
export async function authToken(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`church-finance::${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const AUTH_COOKIE = 'auth_token'
