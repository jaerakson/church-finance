import { Suspense } from 'react'
import { getOfferings, getExpenses, getAllLookups, getBudgetMap } from '@/lib/google-sheets'
import { OFFERING_TYPES, EXPENSE_TYPES, CATEGORIES } from '@/lib/constants'
import { LookupItem } from '@/lib/types'
import { currentYear } from '@/lib/date'
import DateFilter from '@/components/ui/DateFilter'
import CsvDownloadButton from '@/components/ui/CsvDownloadButton'
import PrintButton from '@/components/ui/PrintButton'
import StatusPivot from '@/components/finance/StatusPivot'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ date?: string }> }

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

function parseDateToNum(dStr?: string | unknown): number {
  if (!dStr) return 0
  const str = String(dStr).trim()
  if (!str) return 0
  // 모든 공백을 제거하고, 마침표(.)나 슬래시(/)를 하이픈(-)으로 치환합니다.
  const cleaned = str.replace(/\s+/g, '').replace(/[\/.]/g, '-')
  const parts = cleaned.split('-')
  // 마침표가 맨 끝에 있는 경우(예: 2026.6.28.) 빈 요소가 배열 끝에 생길 수 있으므로 제거합니다.
  const filteredParts = parts.filter(Boolean)
  if (filteredParts.length < 3) return 0
  const y = Number(filteredParts[0]) || 0
  const m = Number(filteredParts[1]) || 0
  const d = Number(filteredParts[2]) || 0
  return y * 10000 + m * 100 + d
}

type Totals = { budget: number; prev: number; current: number; total: number }

// 항목별 당일 메모(소분류) 상세 — 메모 문구별 금액 합계
type StatusDetail = { label: string; amount: number }
type StatusItem = { key: string; name: string; budget: number; prev: number; current: number; total: number; details: StatusDetail[] }
type StatusSection = {
  category: string
  items: StatusItem[]
  subtotal: Totals
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

// 항목을 관(대분류)별로 묶어 당일 금액 실적이 있는 항목들만 표시한다.
function buildSections(
  types: LookupItem[],
  currentMap: Record<string, number>,
  prevMap: Record<string, number>,
  budgetMap: Record<string, number>,
  categories: LookupItem[],
  detailsMap: Record<string, StatusDetail[]>,
): { sections: StatusSection[]; grand: Totals } {
  const sections: StatusSection[] = []
  const covered = new Set<string>()

  const makeItem = (key: string, name: string) => {
    const current = currentMap[key] ?? 0
    const prev = prevMap[key] ?? 0
    return { key, name, budget: budgetMap[key] ?? 0, prev, current, total: prev + current, details: detailsMap[key] ?? [] }
  }
  const sum = (items: StatusItem[]): Totals => ({
    budget: items.reduce((s, i) => s + i.budget, 0),
    prev: items.reduce((s, i) => s + i.prev, 0),
    current: items.reduce((s, i) => s + i.current, 0),
    total: items.reduce((s, i) => s + i.total, 0),
  })

  for (const cat of categories) {
    const catTypes = types.filter((t) => t.categoryKey === cat.key)
    if (!catTypes.length) continue
    catTypes.forEach((t) => covered.add(t.key))
    const items = catTypes
      .map((t) => makeItem(t.key, t.name))
      .filter((it) => it.current > 0) // 오직 당일 금액(실적)이 있는 것만 노출
    
    if (items.length > 0) {
      sections.push({ category: cat.name, items, subtotal: sum(items) })
    }
  }

  const etc: StatusItem[] = []
  for (const t of types) {
    if (!covered.has(t.key)) { 
      const item = makeItem(t.key, t.name)
      if (item.current > 0) etc.push(item)
      covered.add(t.key) 
    }
  }
  for (const key of new Set([...Object.keys(currentMap), ...Object.keys(prevMap)])) {
    if (!covered.has(key)) { 
      const item = makeItem(key, `(코드 ${key})`)
      if (item.current > 0) etc.push(item)
      covered.add(key) 
    }
  }
  if (etc.length) sections.push({ category: '기타', items: etc, subtotal: sum(etc) })

  const grand = sum(sections.flatMap((s) => s.items))
  return { sections, grand }
}

export default async function FinancialStatusPage({ searchParams }: Props) {
  const { date } = await searchParams
  const defYear = currentYear()

  const [allOfferings, allExpenses, lookups] = await Promise.all([
    getOfferings().catch(() => []),
    getExpenses().catch(() => []),
    getAllLookups().catch(() => null),
  ])

  const categories: LookupItem[] = lookups?.category ?? CATEGORIES
  const offeringTypes: LookupItem[] = lookups?.offeringType ?? OFFERING_TYPES
  const expenseTypes: LookupItem[] = lookups?.expenseType ?? EXPENSE_TYPES

  // 데이터에 존재하는 모든 고유 일자 목록 추출 (최근 순)
  const availableDates = [...new Set([
    ...allOfferings.map((o) => o.date),
    ...allExpenses.map((e) => e.date),
  ].filter(Boolean))].sort().reverse() as string[]

  // 기본값은 가장 최근에 등록된 수입/지출 일자
  const defaultDate = availableDates[0] || `${defYear}-01-01`
  const activeDate = !date || date === 'all' ? defaultDate : date

  const activeYear = activeDate.slice(0, 4)
  const dateObj = new Date(activeDate + 'T00:00:00')
  const dateLabel = `${activeDate.slice(0, 4)}년 ${Number(activeDate.slice(5, 7))}월 ${Number(activeDate.slice(8, 10))}일 (${DAY_KO[dateObj.getDay()]})`

  // 특정 연도 예산 가져오기
  const budgets = await getBudgetMap(activeYear).catch(() => ({ income: {}, expense: {} }))

  const activeDateNum = parseDateToNum(activeDate)

  // 일자 기준 필터 함수
  // 1) 당일 실적
  const inCurrentDate = (d?: string) => parseDateToNum(d) === activeDateNum
  // 2) 당해 연도 1월 1일부터 선택한 당일 직전일까지 누계
  const inPrevDatesAccum = (d?: string) => {
    if (!d) return false
    const dNum = parseDateToNum(d)
    const dYear = Math.floor(dNum / 10000)
    return dYear === Number(activeYear) && dNum < activeDateNum
  }

  const sumBy = (rows: { typeKey: string; amount: string; date: string }[], pred: (d: string) => boolean) => {
    const m: Record<string, number> = {}
    for (const r of rows) if (pred(r.date)) m[r.typeKey] = (m[r.typeKey] ?? 0) + parseAmount(r.amount)
    return m
  }

  // 당일 실적 항목별 메모(소분류) 상세를 수집한다.
  // 같은 메모 문구는 금액을 합산하고, 메모가 없는 항목은 제외한다.
  const detailsBy = (
    rows: { typeKey: string; amount: string; date: string }[],
    label: (r: { typeKey: string; amount: string; date: string }) => string,
  ): Record<string, StatusDetail[]> => {
    const grouped: Record<string, Map<string, number>> = {}
    for (const r of rows) {
      if (!inCurrentDate(r.date)) continue
      const text = label(r).trim()
      if (!text) continue
      const map = (grouped[r.typeKey] ??= new Map())
      map.set(text, (map.get(text) ?? 0) + parseAmount(r.amount))
    }
    const out: Record<string, StatusDetail[]> = {}
    for (const [key, map] of Object.entries(grouped)) {
      out[key] = [...map.entries()].map(([label, amount]) => ({ label, amount }))
    }
    return out
  }

  // 소분류(메모) 상세는 지출에만 표시한다. (내역 + 비고)
  const expenseDetails = detailsBy(allExpenses, (r) => {
    const e = r as { description?: string; note?: string }
    return [e.description, e.note].filter(Boolean).join(' · ')
  })

  const income = buildSections(
    offeringTypes,
    sumBy(allOfferings, inCurrentDate),
    sumBy(allOfferings, inPrevDatesAccum),
    budgets.income,
    categories,
    {}
  )

  const expense = buildSections(
    expenseTypes,
    sumBy(allExpenses, inCurrentDate),
    sumBy(allExpenses, inPrevDatesAccum),
    budgets.expense,
    categories,
    expenseDetails
  )

  // 당일 수입 중 건축헌금(typeKey: '5') 및 순수입(금액 = 총수입 - 건축헌금) 계산
  const currentOfferings = allOfferings.filter((o) => inCurrentDate(o.date))
  const buildOfferingAmt = currentOfferings
    .filter((o) => o.typeKey === '5')
    .reduce((s, o) => s + parseAmount(o.amount), 0)
  const netIncomeAmt = income.grand.current - buildOfferingAmt
  const incomeSubTitle = `수입 ${income.grand.current.toLocaleString()} - 건축 ${buildOfferingAmt.toLocaleString()} = ${netIncomeAmt.toLocaleString()}원`

  // CSV 헤더 및 데이터 생성 (연간예산 및 총합계 컬럼 제거, 당일실적 -> 금액 변경)
  const csvHeaders = ['구분', '관', '항목', '소분류(메모)', '직전누계(당일직전까지)', '금액(당일실적)']
  const csvRows: (string | number)[][] = []
  const pushSections = (label: string, secs: StatusSection[], grand: Totals) => {
    for (const sec of secs) {
      for (const it of sec.items) {
        const memo = it.details.map((d) => d.label).join(', ')
        csvRows.push([label, sec.category, it.name, memo, it.prev, it.current])
      }
      csvRows.push([label, sec.category, '소계', '', sec.subtotal.prev, sec.subtotal.current])
    }
    csvRows.push([label, '', `${label} 총계`, '', grand.prev, grand.current])
  }
  pushSections('수입(헌금)', income.sections, income.grand)
  pushSections('지출', expense.sections, expense.grand)

  return (
    <div className="space-y-6">
      {/* 화면 출력용 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">재정현황표</h1>
          <p className="text-sm text-gray-500 mt-1">{dateLabel} 기준</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Suspense>
            <DateFilter dates={availableDates} defaultDate={defaultDate} />
          </Suspense>
          <CsvDownloadButton filename={`재정현황표_${activeDate}.csv`} headers={csvHeaders} rows={csvRows} />
          <PrintButton />
        </div>
      </div>

      {/* 인쇄(Print) 모드 전용 대형 타이틀 */}
      <div className="hidden print:block text-center border-b border-gray-900 pb-3">
        <h1 className="text-2xl font-extrabold text-black">검암중앙교회 일간 재정현황표</h1>
        <p className="text-xs text-gray-700 mt-1.5 font-semibold">
          기준 일자: {dateLabel}  (출력일: {new Date().toLocaleDateString('ko-KR')})
        </p>
      </div>

      {/* 요약 현황 보드 (표 형태의 정갈한 디자인, 모바일 1열, 데스크톱/인쇄 3열 동시 지원) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-950/50 print:bg-white dark:bg-gray-900 print:border-gray-300 print:grid-cols-3 print:gap-4 print:p-3">
        {/* 수입 요약 */}
        <div className="space-y-1 text-xs md:text-sm">
          <span className="block text-xs font-semibold text-gray-400 print:text-black print:font-bold">수입 요약 (헌금 수납)</span>
          <p className="text-gray-600 dark:text-gray-300 print:text-black">총 수납액: <span className="font-semibold text-gray-900 dark:text-gray-100 print:text-black">{income.grand.current.toLocaleString()}원</span></p>
          <p className="text-gray-400 text-xs print:text-black">- 건축헌금: {buildOfferingAmt.toLocaleString()}원</p>
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-1 print:border-gray-400"></div>
          <p className="font-bold text-emerald-700 print:text-black text-xs md:text-sm">순수 수입: {netIncomeAmt.toLocaleString()}원</p>
        </div>

        {/* 지출 요약 */}
        <div className="space-y-1 text-xs md:text-sm">
          <span className="block text-xs font-semibold text-gray-400 print:text-black print:font-bold">지출 요약 (지급 지출)</span>
          <p className="text-gray-600 dark:text-gray-300 print:text-black">총 지출액: <span className="font-semibold text-gray-900 dark:text-gray-100 print:text-black">{expense.grand.current.toLocaleString()}원</span></p>
          <p className="text-gray-400 text-xs print:text-black">(예배비, 선교비, 교육비, 관리비)</p>
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-1 print:border-gray-400"></div>
          <p className="font-bold text-rose-600 print:text-black text-xs md:text-sm">실지출액: {expense.grand.current.toLocaleString()}원</p>
        </div>

        {/* 금회 차액 */}
        <div className="space-y-1 text-xs md:text-sm">
          <span className="block text-xs font-semibold text-gray-400 print:text-black print:font-bold">당일 잔액 (순차액)</span>
          <p className="text-gray-600 dark:text-gray-300 print:text-black">순수 수입: {netIncomeAmt.toLocaleString()}원</p>
          <p className="text-gray-400 text-xs print:text-black">- 실지출액: {expense.grand.current.toLocaleString()}원</p>
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-1 print:border-gray-400"></div>
          <p className={`font-extrabold text-xs md:text-sm ${netIncomeAmt - expense.grand.current >= 0 ? 'text-blue-700' : 'text-rose-600'} print:text-black`}>
            당일 차액: {(netIncomeAmt - expense.grand.current).toLocaleString()}원
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs print:hidden">
        <span className="text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          금액 = 선택한 일자의 당일 헌금 수입 및 지출 금액 실적만 깔끔하게 요약 표기합니다.
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 status-print-grid">
        <StatusPivot
          title="수입 (헌금 현황)"
          kind="income"
          sections={income.sections}
          grand={income.grand}
          grandLabel="총수입"
          accent="emerald"
          activeDate={activeDate}
        />
        <StatusPivot
          title="지출 (지출 현황)"
          kind="expense"
          sections={expense.sections}
          grand={expense.grand}
          grandLabel="총지출"
          accent="rose"
          activeDate={activeDate}
        />
      </div>

      {/* 브라우저별 인쇄 규격을 강제 교정하여 무조건 A4 한 장에 나란히 들어가도록 제어하는 인쇄 전용 CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: portrait;
            margin: 8mm 10mm 8mm 10mm !important;
          }
          body {
            background-color: white !important;
            color: black !important;
            zoom: 82% !important; /* 전체 페이지 크기를 82%로 축소하여 어떤 상황에서도 A4 1장에 안전하게 고정 */
          }
          /* 사이드바, 드롭다운, 모든 버튼 강제 가리기 */
          .print\\:hidden, [class*="print:hidden"], aside, header, select, button {
            display: none !important;
          }
          /* 여백 정리 및 본문 폭 100% 강제 */
          main {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          /* 수입/지출 표 좌우 강제 정렬 배치 */
          .status-print-grid {
            display: flex !important;
            flex-direction: row !important;
            gap: 16px !important;
            width: 100% !important;
            margin-top: 15px !important;
          }
          .status-print-grid > div {
            flex: 1 !important;
            width: calc(50% - 8px) !important;
            page-break-inside: avoid !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            overflow: hidden !important;
          }
          /* 인쇄 셀 패딩 및 텍스트 콤팩트 압축 */
          th, td {
            padding: 4px 6px !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
          .px-4 {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          .py-2.5, .py-2, .py-1.5 {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
          /* 강제 페이지 줄바꿈 금지 수식 */
          .status-print-grid, table, tr {
            page-break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  )
}
