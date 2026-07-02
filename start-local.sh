#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 교회 재정관리 앱 — 로컬 개발 서버 실행 스크립트
#
#   사용법:
#     ./start-local.sh            # 3001 포트로 실행 (기본)
#     PORT=3000 ./start-local.sh  # 다른 포트로 실행
#
#   최초 1회: chmod +x start-local.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# 이 스크립트가 있는 디렉터리(=app 루트)로 이동
cd "$(dirname "$0")"

PORT="${PORT:-3001}"

echo "▶ church-finance 로컬 서버 준비 중... (port ${PORT})"

# 1) Node 확인
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js 가 설치되어 있지 않습니다. https://nodejs.org 에서 설치 후 다시 실행하세요." >&2
  exit 1
fi
echo "  node $(node -v)"

# 2) 환경변수 파일 확인 (구글시트 연동에 필요)
if [ ! -f ".env.local" ]; then
  echo "⚠ .env.local 이 없습니다. Google Sheets 연동(GOOGLE_*)·로그인(AUTH_*) 설정이 필요합니다." >&2
  echo "  .env.example 를 참고해 .env.local 을 먼저 만들어 주세요." >&2
fi

# 3) 의존성 설치 (node_modules 없을 때만)
if [ ! -d "node_modules" ]; then
  echo "  의존성 설치 중 (npm install)..."
  npm install
fi

# 4) 포트 사용 중이면 안내
if command -v lsof >/dev/null 2>&1 && lsof -i ":${PORT}" >/dev/null 2>&1; then
  echo "⚠ 포트 ${PORT} 가 이미 사용 중입니다. 다른 포트로 실행하려면: PORT=3002 ./start-local.sh" >&2
fi

# 5) 개발 서버 실행
echo "▶ http://localhost:${PORT} 에서 실행합니다. (종료: Ctrl+C)"
exec npx next dev --port "${PORT}"
