import { google } from 'googleapis'
import { Member, MemberFormData, Offering, OfferingFormData, Expense, ExpenseFormData, LookupRow, LookupKind } from './types'
import { SHEETS } from './constants'

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function getRange(sheet: string, range: string): Promise<string[][]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!${range}`,
  })
  return (res.data.values ?? []) as string[][]
}

// colEnd로 열 범위를 명시적으로 제한한다. 범위를 A:Z처럼 열어두면 Sheets API의 테이블 자동
// 감지가 빠른 연속 저장 중 엉뚱한 열에서 시작해버리는 사고가 날 수 있다(실제 발생 이력 있음).
async function appendRow(sheet: string, values: string[], colEnd: string): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:${colEnd}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

function colLetter(n: number): string {
  return String.fromCharCode(64 + n)
}

// 시트(탭)가 없으면 생성하고 헤더 행을 넣는다. (예산 탭 최초 사용 시)
// 한 번 확인/생성된 탭은 캐시해 매 호출마다 spreadsheets.get 하지 않는다.
const ensuredSheets = new Set<string>()
async function ensureSheet(title: string, header: string[]): Promise<void> {
  if (ensuredSheets.has(title)) return
  const sheets = getSheets()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: 'sheets.properties.title' })
  const exists = (meta.data.sheets ?? []).some((s) => s.properties?.title === title)
  if (exists) { ensuredSheets.add(title); return }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  })
  await appendRow(title, header, colLetter(header.length))
  ensuredSheets.add(title)
}

async function updateRow(sheet: string, rowIndex: number, values: string[], colEnd: string): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A${rowIndex}:${colEnd}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

async function clearRow(sheet: string, rowIndex: number, colEnd: string): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A${rowIndex}:${colEnd}${rowIndex}`,
  })
}

// ─── 교인명부 ────────────────────────────────────────────────
// 컬럼: A=교인키, B=이름, C=소속, D=직분, E=전화번호, F=이메일, G=주소, H=사진, I=서명, J=등록일, K=세례일

function rowToMember(row: string[], rowIndex: number): Member {
  const g = (i: number) => row[i] ?? ''
  return { rowIndex, key: g(0), name: g(1), departmentKey: g(2), positionKey: g(3), phone: g(4), email: g(5), address: g(6), registeredAt: g(9), baptizedAt: g(10) }
}

export async function getMembers(): Promise<Member[]> {
  const rows = await getRange(SHEETS.MEMBER, 'A2:K')
  return rows.map((r, i) => rowToMember(r, i + 2)).filter((m) => m.name)
}

export async function getMember(rowIndex: number): Promise<Member | null> {
  const rows = await getRange(SHEETS.MEMBER, `A${rowIndex}:K${rowIndex}`)
  if (!rows[0]) return null
  return rowToMember(rows[0], rowIndex)
}

export async function addMember(data: MemberFormData): Promise<Member> {
  const rows = await getRange(SHEETS.MEMBER, 'A2:A')
  const maxKey = rows.reduce((max, r) => Math.max(max, Number(r[0]) || 0), 0)
  const newKey = String(maxKey + 1)
  const row = [newKey, data.name, data.departmentKey, data.positionKey, data.phone, data.email, data.address, '', '', data.registeredAt, data.baptizedAt]
  await appendRow(SHEETS.MEMBER, row, 'K')
  // rowIndex는 추정치 (선택은 key 기준이라 이 흐름에서는 사용되지 않음)
  return {
    rowIndex: rows.length + 2,
    key: newKey,
    name: data.name,
    departmentKey: data.departmentKey,
    positionKey: data.positionKey,
    phone: data.phone,
    email: data.email,
    address: data.address,
    registeredAt: data.registeredAt,
    baptizedAt: data.baptizedAt,
  }
}

export async function updateMember(rowIndex: number, data: MemberFormData): Promise<void> {
  const existing = await getMember(rowIndex)
  const row = [existing?.key ?? '', data.name, data.departmentKey, data.positionKey, data.phone, data.email, data.address, '', '', data.registeredAt, data.baptizedAt]
  await updateRow(SHEETS.MEMBER, rowIndex, row, 'K')
}

export async function deleteMember(rowIndex: number): Promise<void> {
  await clearRow(SHEETS.MEMBER, rowIndex, 'K')
}

// ─── 헌금 ────────────────────────────────────────────────────
// 컬럼: A=날짜, B=교인명부, C=비고, D=헌금분류, E=금액

function rowToOffering(row: string[], rowIndex: number): Offering {
  const g = (i: number) => row[i] ?? ''
  return { rowIndex, date: g(0), memberKey: g(1), note: g(2), typeKey: g(3), amount: g(4) }
}

export async function getOfferings(): Promise<Offering[]> {
  const rows = await getRange(SHEETS.OFFERING, 'A2:E')
  return rows.map((r, i) => rowToOffering(r, i + 2)).filter((o) => o.date)
}

export async function addOffering(data: OfferingFormData): Promise<void> {
  await appendRow(SHEETS.OFFERING, [data.date, data.memberKey, data.note, data.typeKey, data.amount], 'E')
}

export async function updateOffering(rowIndex: number, data: OfferingFormData): Promise<void> {
  await updateRow(SHEETS.OFFERING, rowIndex, [data.date, data.memberKey, data.note, data.typeKey, data.amount], 'E')
}

export async function deleteOffering(rowIndex: number): Promise<void> {
  await clearRow(SHEETS.OFFERING, rowIndex, 'E')
}

// ─── 지출 ────────────────────────────────────────────────────
// 컬럼: A=날짜, B=지출분류, C=내역, D=금액, E=비고

function rowToExpense(row: string[], rowIndex: number): Expense {
  const g = (i: number) => row[i] ?? ''
  return { rowIndex, date: g(0), typeKey: g(1), description: g(2), amount: g(3), note: g(4) }
}

export async function getExpenses(): Promise<Expense[]> {
  const rows = await getRange(SHEETS.EXPENSE, 'A2:E')
  return rows.map((r, i) => rowToExpense(r, i + 2)).filter((e) => e.date)
}

export async function addExpense(data: ExpenseFormData): Promise<void> {
  await appendRow(SHEETS.EXPENSE, [data.date, data.typeKey, data.description, data.amount, data.note], 'E')
}

export async function updateExpense(rowIndex: number, data: ExpenseFormData): Promise<void> {
  await updateRow(SHEETS.EXPENSE, rowIndex, [data.date, data.typeKey, data.description, data.amount, data.note], 'E')
}

export async function deleteExpense(rowIndex: number): Promise<void> {
  await clearRow(SHEETS.EXPENSE, rowIndex, 'E')
}

// ─── 코드값(룩업) 관리 ────────────────────────────────────────
// 시트별 컬럼 배치가 달라 kind 별로 매핑한다.
//  관/소속/직분:   [키, 이름]              (A,B)
//  헌금분류:       [키, 이름, 관]          (A,B,C)
//  지출분류:       [키, 관, 이름]          (A,B,C)  ← 이름이 C열
const LOOKUP_CONFIG: Record<LookupKind, { sheet: string; nameCol: number; catCol?: number; colEnd: string; cols: number }> = {
  category:     { sheet: SHEETS.CATEGORY,      nameCol: 1, colEnd: 'B', cols: 2 },
  department:   { sheet: SHEETS.DEPARTMENT,    nameCol: 1, colEnd: 'B', cols: 2 },
  position:     { sheet: SHEETS.POSITION,      nameCol: 1, colEnd: 'B', cols: 2 },
  offeringType: { sheet: SHEETS.OFFERING_TYPE, nameCol: 1, catCol: 2, colEnd: 'C', cols: 3 },
  expenseType:  { sheet: SHEETS.EXPENSE_TYPE,  nameCol: 2, catCol: 1, colEnd: 'C', cols: 3 },
}

function buildLookupRow(cfg: (typeof LOOKUP_CONFIG)[LookupKind], key: string, name: string, categoryKey?: string): string[] {
  const row = new Array(cfg.cols).fill('')
  row[0] = key
  row[cfg.nameCol] = name
  if (cfg.catCol != null) row[cfg.catCol] = categoryKey ?? ''
  return row
}

// 룩업 읽기 캐시 — Sheets 읽기 쿼터 절감용. TTL이 짧아 외부(시트 직접) 편집도 곧 반영되고,
// 앱 내 편집(add/update/delete)은 즉시 무효화하므로 '실시간 반영'은 유지된다.
const LOOKUP_TTL_MS = 15_000
const lookupCache = new Map<LookupKind, { data: LookupRow[]; ts: number }>()

function invalidateLookupCache(kind?: LookupKind): void {
  if (kind) lookupCache.delete(kind)
  else lookupCache.clear()
}

export async function getLookupRows(kind: LookupKind): Promise<LookupRow[]> {
  const cached = lookupCache.get(kind)
  if (cached && Date.now() - cached.ts < LOOKUP_TTL_MS) return cached.data

  const cfg = LOOKUP_CONFIG[kind]
  const rows = await getRange(cfg.sheet, `A2:${cfg.colEnd}`)
  const data = rows
    .map((r, i) => ({
      rowIndex: i + 2,
      key: (r[0] ?? '').trim(),
      name: (r[cfg.nameCol] ?? '').trim(),
      categoryKey: cfg.catCol != null ? (r[cfg.catCol] ?? '').trim() : undefined,
    }))
    .filter((x) => x.key && x.name)
  lookupCache.set(kind, { data, ts: Date.now() })
  return data
}

export async function addLookupRow(kind: LookupKind, name: string, categoryKey?: string): Promise<void> {
  const cfg = LOOKUP_CONFIG[kind]
  const keys = await getRange(cfg.sheet, 'A2:A')
  const maxKey = keys.reduce((m, r) => Math.max(m, Number(r[0]) || 0), 0)
  await appendRow(cfg.sheet, buildLookupRow(cfg, String(maxKey + 1), name, categoryKey), cfg.colEnd)
  invalidateLookupCache(kind)
}

export async function updateLookupRow(kind: LookupKind, rowIndex: number, key: string, name: string, categoryKey?: string): Promise<void> {
  const cfg = LOOKUP_CONFIG[kind]
  await updateRow(cfg.sheet, rowIndex, buildLookupRow(cfg, key, name, categoryKey), cfg.colEnd)
  invalidateLookupCache(kind)
}

export async function deleteLookupRow(kind: LookupKind, rowIndex: number): Promise<void> {
  const cfg = LOOKUP_CONFIG[kind]
  await clearRow(cfg.sheet, rowIndex, cfg.colEnd)
  invalidateLookupCache(kind)
}

// 모든 룩업을 한 번에 (입력 드롭다운·집계 실시간 반영용)
export interface AllLookups {
  category: LookupRow[]
  department: LookupRow[]
  position: LookupRow[]
  offeringType: LookupRow[]
  expenseType: LookupRow[]
}

export async function getAllLookups(): Promise<AllLookups> {
  const [category, department, position, offeringType, expenseType] = await Promise.all([
    getLookupRows('category'),
    getLookupRows('department'),
    getLookupRows('position'),
    getLookupRows('offeringType'),
    getLookupRows('expenseType'),
  ])
  return { category, department, position, offeringType, expenseType }
}

// ─── 예산 ─────────────────────────────────────────────────────
// 시트 '예산' 컬럼: A=연도, B=구분(income|expense), C=코드키, D=예산액 (항목별 연간 1개)
export type BudgetKind = 'income' | 'expense'
export interface Budget {
  rowIndex: number
  year: string
  kind: BudgetKind
  typeKey: string
  amount: number
}
const BUDGET_HEADER = ['연도', '구분', '코드키', '예산액']

function parseNum(v: unknown): number {
  return Number(String(v ?? '').replace(/,/g, '')) || 0
}

export async function getBudgets(year: string): Promise<Budget[]> {
  await ensureSheet(SHEETS.BUDGET, BUDGET_HEADER)
  const rows = await getRange(SHEETS.BUDGET, 'A2:D')
  return rows
    .map((r, i) => ({
      rowIndex: i + 2,
      year: (r[0] ?? '').trim(),
      kind: (r[1] ?? '').trim() as BudgetKind,
      typeKey: (r[2] ?? '').trim(),
      amount: parseNum(r[3]),
    }))
    .filter((b) => b.year === year && (b.kind === 'income' || b.kind === 'expense') && b.typeKey)
}

// 연도 예산 맵: { income: {typeKey: amount}, expense: {...} }
export async function getBudgetMap(year: string): Promise<{ income: Record<string, number>; expense: Record<string, number> }> {
  const budgets = await getBudgets(year)
  const map = { income: {} as Record<string, number>, expense: {} as Record<string, number> }
  for (const b of budgets) map[b.kind][b.typeKey] = b.amount
  return map
}

export async function setBudget(year: string, kind: BudgetKind, typeKey: string, amount: number): Promise<void> {
  await ensureSheet(SHEETS.BUDGET, BUDGET_HEADER)
  const rows = await getRange(SHEETS.BUDGET, 'A2:D')
  const idx = rows.findIndex((r) => (r[0] ?? '').trim() === year && (r[1] ?? '').trim() === kind && (r[2] ?? '').trim() === typeKey)
  const row = [year, kind, typeKey, String(Math.round(amount))]
  if (idx >= 0) {
    await updateRow(SHEETS.BUDGET, idx + 2, row, 'D')
  } else {
    await appendRow(SHEETS.BUDGET, row, 'D')
  }
}

// ─── 백업 ─────────────────────────────────────────────────────
// 모든 시트(탭)의 원본 값을 그대로 읽어 반환한다. (전체 백업 JSON용)
export interface BackupData {
  spreadsheetId: string
  sheets: Record<string, string[][]>
}

export async function getAllRawData(): Promise<BackupData> {
  const sheets = getSheets()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: 'sheets.properties.title' })
  const titles = (meta.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[]
  const entries = await Promise.all(
    titles.map(async (t) => [t, await getRange(t, 'A1:Z')] as const),
  )
  return { spreadsheetId: SPREADSHEET_ID, sheets: Object.fromEntries(entries) }
}

// ─── 복원 ─────────────────────────────────────────────────────
// 백업 JSON을 '대상 스프레드시트(관리자가 새로 만들어 서비스계정에 공유한 빈 시트)'에 되살린다.
// 원본 데이터 탭만 복원하고, 수식/피벗으로 자동계산되는 탭은 건드리지 않는다.
const RESTORE_SHEET_SET = new Set<string>([
  SHEETS.MEMBER, SHEETS.OFFERING, SHEETS.EXPENSE, SHEETS.DEPARTMENT,
  SHEETS.POSITION, SHEETS.OFFERING_TYPE, SHEETS.EXPENSE_TYPE, SHEETS.CATEGORY, SHEETS.BUDGET,
])

export interface RestoreResult {
  restored: { sheet: string; rows: number }[]
  skipped: string[]
}

export async function restoreToSpreadsheet(targetId: string, backupSheets: Record<string, string[][]>): Promise<RestoreResult> {
  const sheets = getSheets()
  // 대상 접근 확인 + 기존 탭 목록 (접근 불가 시 여기서 throw → API가 안내 메시지로 변환)
  const meta = await sheets.spreadsheets.get({ spreadsheetId: targetId, fields: 'sheets.properties.title' })
  const existing = new Set<string>((meta.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[])

  const targets = Object.keys(backupSheets).filter((t) => RESTORE_SHEET_SET.has(t))
  const skipped = Object.keys(backupSheets).filter((t) => !RESTORE_SHEET_SET.has(t))

  // 없는 데이터 탭 생성
  const toCreate = targets.filter((t) => !existing.has(t))
  if (toCreate.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: targetId,
      requestBody: { requests: toCreate.map((title) => ({ addSheet: { properties: { title } } })) },
    })
  }

  const restored: { sheet: string; rows: number }[] = []
  for (const title of targets) {
    const values = backupSheets[title] ?? []
    // 대상 탭 비우고 백업 값 그대로 기록 (앱과 동일하게 USER_ENTERED로 숫자/날짜 타입 유지)
    await sheets.spreadsheets.values.clear({ spreadsheetId: targetId, range: `${title}!A:Z` })
    if (values.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: targetId,
        range: `${title}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      })
    }
    restored.push({ sheet: title, rows: Math.max(0, values.length - 1) })
  }
  invalidateLookupCache()
  return { restored, skipped }
}

// 삭제 전 참조 무결성 검사 — 사용 중이면 삭제 불가
export async function isLookupInUse(kind: LookupKind, key: string): Promise<boolean> {
  switch (kind) {
    case 'offeringType': {
      const rows = await getOfferings()
      return rows.some((o) => o.typeKey === key)
    }
    case 'expenseType': {
      const rows = await getExpenses()
      return rows.some((e) => e.typeKey === key)
    }
    case 'department': {
      const rows = await getMembers()
      return rows.some((m) => m.departmentKey === key)
    }
    case 'position': {
      const rows = await getMembers()
      return rows.some((m) => m.positionKey === key)
    }
    case 'category': {
      const [ot, et] = await Promise.all([getLookupRows('offeringType'), getLookupRows('expenseType')])
      return ot.some((x) => x.categoryKey === key) || et.some((x) => x.categoryKey === key)
    }
  }
}
