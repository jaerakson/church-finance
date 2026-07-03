생성일: 2026-07-03
관련 프로젝트: church_finance (교회 재정 관리 앱)
작성자: Gemini CLI
신뢰도: 높음
분석 대상: Cloudflare Pages를 통한 Next.js 프로젝트 배포 설정

## 📌 TL;DR
- 본 프로젝트는 구글 시트 연동 API 및 세션 로그인 등 **풀스택 서버 기능(API Routes, Dynamic Routing)**을 탑재하고 있으므로, Cloudflare Pages 배포 시 반드시 **Full-stack (SSR/Edge Runtime) 방식**으로 구성해야 합니다.
- 정적 배포(Static Export) 방식을 사용하면 `/api/` 아래의 모든 API가 작동하지 않게 됩니다.

---

## 🛠️ Cloudflare Pages Git 연결 시 필수 입력값

Cloudflare 대시보드(`dash.cloudflare.com`)에서 Git 리포지토리를 연결할 때 아래 항목들을 그대로 입력해 주세요.

### 1. 빌드 및 배포 설정 (Build & deployment settings)

| 대시보드 항목명 | 권장 입력값 / 선택값 | 설명 |
| :--- | :--- | :--- |
| **Framework preset** | `Next.js` | Cloudflare의 Next.js 빌드 프리셋 선택 |
| **Build command** | `npx @cloudflare/next-on-pages` | Cloudflare Edge Runtime용 빌드 어댑터 명령 |
| **Build output directory** | `.vercel/output/static` | 빌드 시 생성되는 정적 출력 폴더 경로 |

---

### 2. ⚠️ 매우 중요: 빌드 완료 후 필수 추가 설정 2가지

빌드가 끝났거나 진행되는 동안 대시보드 메뉴에서 **반드시** 아래의 설정을 완료해 주어야 구글 시트 API 모듈이 오작동(런타임 에러)하는 것을 막을 수 있습니다.

#### ① 호환성 플래그 (Compatibility Flags) 추가
구글 API 등은 Node.js 기본 패키지(`crypto`, `fs` 등)를 내부적으로 호출하므로 호환 플래그가 필수입니다.
- **설정 위치**: Pages 프로젝트 대시보드 ➡️ `Settings` ➡️ `Functions` ➡️ `Compatibility flags`
- **설정 값**: `Production compatibility flags` 및 `Preview compatibility flags` 둘 다에 **`nodejs_compat`** 플래그를 추가합니다.

#### ② 환경 변수 (Environment Variables) 등록
구글 API 연동 및 보안 키를 등록해야 정상 작동합니다.
- **설정 위치**: Pages 프로젝트 대시보드 ➡️ `Settings` ➡️ `Environment variables`
- **등록할 키 목록** (로컬 `.env.local`에 있는 값들을 붙여넣기):
  - `GOOGLE_CLIENT_EMAIL`
  - `GOOGLE_PRIVATE_KEY`
  - `GOOGLE_SPREADSHEET_ID`
  - `AUTH_SECRET` (로그인 토큰 암호화 키)
  - `NEXT_PUBLIC_APP_URL` (배포된 도메인 URL)

---

## 📝 변경 이력
| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-03 | 최초 작성 — Cloudflare Pages 풀스택 배포 가이드 문서화 |
