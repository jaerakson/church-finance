생성일: 2026-06-29
관련 프로젝트: 검암중앙교회 재정관리
작성자: Claude (AI)
신뢰도: 높음
분석 대상: src/app/, src/components/, src/middleware.ts — 전체 UX 개선 작업

## 📌 TL;DR
- 연도 select 필터(기본 올해)를 대시보드·헌금·지출 페이지에 공통 적용
- 헌금·지출 입력을 좌(폼)+우(오늘/이달 내역) 분할 UI로 재설계, 자동 금액 제안 탑재
- 로그인 인증(공유 비밀번호+쿠키) 및 검색형 콤보박스 전면 적용

---

## 구현 내역

### 1. 로그인 인증
- `src/middleware.ts`: 모든 라우트에서 쿠키 `auth_token` 검사. 실패 시 `/login?from=원래경로` 리다이렉트
- `src/app/login/page.tsx`: 공유 비밀번호 입력 UI (교회 단일 계정)
- `src/app/api/auth/route.ts`: POST(로그인) / DELETE(로그아웃)
- `.env.local` 에 `AUTH_PASSWORD`, `AUTH_SECRET` 추가

### 2. 연도 필터
- `src/components/ui/YearFilter.tsx`: URL searchParams 기반 select 컴포넌트
- 대시보드(`/`), 헌금 목록(`/offering`), 지출 목록(`/expense`) 모두 적용
- 기본값: 현재 연도. "전체 연도" 옵션 포함

### 3. 검색형 콤보박스
- `src/components/ui/Combobox.tsx`: 텍스트 입력 → 실시간 필터링 드롭다운
- 헌금 입력의 교인 선택, 헌금 종류 선택에 적용
- 지출 입력의 지출 종류 선택에 적용

### 4. 헌금 입력 개선
- `src/app/offering/new/OfferingInputClient.tsx`
  - 좌: 입력 폼 (날짜·교인·종류·금액·비고)
  - 우: 오늘 입력 내역 + 종류별 소계 + 총합 실시간 표시
  - 헌금 종류 선택 시 → `/api/stats/amounts` 호출 → 올해 자주 쓴 금액 TOP5 버튼 표시
  - 중복 경고: 같은 날짜+교인+종류가 이미 있으면 노란 경고 배너 표시
  - 저장 후 교인/금액 초기화 (날짜·종류 유지) → 연속 입력 가능

### 5. 지출 입력 개선
- `src/app/expense/new/ExpenseInputClient.tsx`
  - 좌: 입력 폼 (날짜·종류·내역·금액·비고)
  - 우: 이달 지출 내역 + 총합
  - 지출 종류 선택 시 → 올해 자주 쓴 금액 TOP5 제안

### 6. 헌금 목록 개선
- 이번 주 요일별 헌금 현황 그래프 (일~토, 오늘 하이라이트)
- 날짜별 그룹화 목록 (날짜 헤더에 요일·일별 합계)
- 연도 필터 + 종류별 집계 카드

### 7. 금액 제안 API
- `src/app/api/stats/amounts/route.ts`: typeKey + year + kind(offering|expense) → 빈도 상위 5개 금액 반환

---

## ⚠️ 가정 및 한계
- 가정: AUTH_PASSWORD는 단순 평문 비교 (교회 내부 전용 소규모 시스템)
- 한계: JWT 서명 없이 `AUTH_SECRET` 쿠키 값 직접 비교 — 강도 높은 보안이 필요하다면 `jose` JWT 도입 필요
- 불확실: 구글 시트 API 호출이 많아질 경우 할당량(Quota) 문제 가능성 (현재 캐시 없음)

---

## 📋 후속 작업
- [ ] 로그인 비밀번호 변경: `.env.local`의 `AUTH_PASSWORD` 값을 실제 교회 비밀번호로 교체
- [ ] `AUTH_SECRET` 값도 추측 불가한 랜덤 문자열로 교체
- [ ] Google Sheets API 캐싱 도입 (Next.js unstable_cache 또는 revalidatePath 활용)
- [ ] 교인 삭제/수정 페이지 접근 권한 강화 (현재 로그인만으로 전체 허용)

---

## 📝 변경 이력
| 날짜 | 변경 내용 |
|------|----------|
| 2026-06-29 | 최초 작성 — 로그인, 연도 필터, 콤보박스, 헌금/지출 분할 입력 UI, 이번 주 요약 |
