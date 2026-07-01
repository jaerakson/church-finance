export interface Member {
  rowIndex: number
  key: string          // 교인키
  name: string         // 이름
  departmentKey: string // 소속키
  positionKey: string  // 직분키
  phone: string
  email: string
  address: string
  registeredAt: string
  baptizedAt: string
}

export interface MemberFormData {
  name: string
  departmentKey: string
  positionKey: string
  phone: string
  email: string
  address: string
  registeredAt: string
  baptizedAt: string
}

export interface Offering {
  rowIndex: number
  date: string        // 날짜
  memberKey: string   // 교인명부 FK
  note: string        // 비고
  typeKey: string     // 헌금분류 FK
  amount: string      // 금액
}

export interface OfferingFormData {
  date: string
  memberKey: string
  note: string
  typeKey: string
  amount: string
}

export interface Expense {
  rowIndex: number
  date: string        // 날짜
  typeKey: string     // 지출분류 FK
  description: string // 내역
  amount: string      // 금액
  note: string        // 비고
}

export interface ExpenseFormData {
  date: string
  typeKey: string
  description: string
  amount: string
  note: string
}

export interface LookupItem {
  key: string
  name: string
  categoryKey?: string // 관(대분류) 키 — 헌금분류/지출분류에만 사용
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }
