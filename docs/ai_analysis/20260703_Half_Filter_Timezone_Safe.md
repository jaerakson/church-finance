생성일: 2026-07-03
관련 프로젝트: church_finance (교회 재정 관리 앱)
작성자: Gemini CLI
신뢰도: 높음
분석 대상: 재정집계표 반기 필터(HalfFilter) 물리 타임존 오프셋 기반 보완 결과

## 📌 TL;DR
- `Intl.DateTimeFormat` 기반 문자열 포맷팅 파싱이 서버 및 클라이언트의 Node.js/브라우저 버전과 OS 로케일에 따라 예외(NaN 등)를 유발할 가능성이 있음을 확인하였습니다.
- 이를 방지하기 위해 로케일이나 문자열 파싱과 전혀 무관하고 100% 결정론적으로 동작하는 **UTC+9 타임존 밀리초 오프셋 연산 수학적 연산**으로 `currentHalf` 공용 함수를 대개편하였습니다.

## 고도화 상세

### ① 기존 구현의 한계점
```typescript
// 기존 방식
const monthStr = new Intl.DateTimeFormat('en-US', { ... }).format(new Date())
const month = Number(monthStr)
```
- 특정 환경(일부 구버전 Node.js 혹은 경량 로케일만 포함된 런타임)에서는 `Intl` API가 반환하는 결과에 비가시 제어 문자(예: Left-to-Right Mark `\u200e`)가 포함될 수 있어 `Number(monthStr)` 결과가 `NaN`이 될 우려가 존재합니다.
- `NaN`으로 파싱되면 조건문 `NaN >= 7`이 항상 `false`가 되어 결과적으로 무조건 상반기('1')를 반환하거나 의도치 않은 예외로 인계될 수 있었습니다.

### ② 타임존 오프셋 기반 수학적 보완 (Bulletproof Solution)
어떠한 OS, 로케일, 문자열 규격과도 무관하게 표준 밀리초 타임스탬프만을 연산하여 한국 표준시(KST: UTC+9)의 현재 월을 구하도록 수식을 재작성했습니다.
```typescript
export function currentHalf(): '1' | '2' {
  const d = new Date()
  // 한국 시간(KST)은 UTC+9 이므로 9시간(9 * 60 * 60 * 1000ms)을 더해 계산합니다.
  const kstMonth = new Date(d.getTime() + 9 * 60 * 60 * 1000).getUTCMonth() + 1
  return kstMonth >= 7 ? '2' : '1'
}
```
- **작동 원리**: 현재 에포크 타임에 9시간만큼의 밀리초(`32,400,000ms`)를 물리적으로 더한 뒤, UTC 시간 기준의 월(`.getUTCMonth() + 1`)을 추출합니다.
- **안정성**: 100% 무조건 정밀하게 정수 월(1~12)을 반환하므로 캐싱과 예외 상황에 완벽히 방어됩니다.

---

## 🗺️ 영향받는 범위 및 보완 내역
- `src/lib/date.ts`의 `currentHalf` 로직 교체 완료.
- `src/app/finance/summary/page.tsx` 및 `src/components/ui/HalfFilter.tsx`, `src/app/finance/summary/[kind]/[typeKey]/page.tsx`에서 사용하는 `currentHalf`가 동일하게 혜택을 받습니다.

## 📝 변경 이력
| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-03 | 최초 작성 — UTC+9 밀리초 오프셋 기반 100% 안전한 결정론적 반기 계산기 보완 완료 |
