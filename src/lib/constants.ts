import { LookupItem } from './types'

// 시트명
export const SHEETS = {
  MEMBER: '교인명부',
  OFFERING: '헌금',
  EXPENSE: '지출',
  DEPARTMENT: '소속',
  POSITION: '직분',
  OFFERING_TYPE: '헌금분류',
  EXPENSE_TYPE: '지출분류',
} as const

// 소속 (Google Sheets에서 가져온 실제 데이터)
export const DEPARTMENTS: LookupItem[] = [
  { key: '1', name: '총회' },
  { key: '2', name: '남전도회' },
  { key: '3', name: '여전도회' },
  { key: '4', name: '청청부' },
  { key: '5', name: '어린이부' },
  { key: '6', name: '유아부' },
]

// 직분
export const POSITIONS: LookupItem[] = [
  { key: '1', name: '목사' },
  { key: '2', name: '사모' },
  { key: '3', name: '장로' },
  { key: '4', name: '명예권사' },
  { key: '5', name: '권사' },
  { key: '6', name: '안수집사' },
  { key: '7', name: '집사' },
  { key: '8', name: '평신도' },
]

// 헌금분류
export const OFFERING_TYPES: LookupItem[] = [
  { key: '1',  name: '주정헌금' },
  { key: '2',  name: '십일조' },
  { key: '3',  name: '감사헌금' },
  { key: '4',  name: '선교헌금' },
  { key: '5',  name: '건축헌금' },
  { key: '6',  name: '특별헌금' },
  { key: '7',  name: '신년헌금' },
  { key: '8',  name: '부활절' },
  { key: '9',  name: '맥추절' },
  { key: '10', name: '추수' },
  { key: '11', name: '성탄' },
  { key: '30', name: '세례교인 후원 헌금' },
  { key: '88', name: '후원헌금' },
  { key: '99', name: '라후신학교 후원' },
]

// 지출분류
export const EXPENSE_TYPES: LookupItem[] = [
  { key: '1',  name: '사례비' },
  { key: '2',  name: '성찬비' },
  { key: '3',  name: '강사 사례비' },
  { key: '4',  name: '목회비' },
  { key: '5',  name: '해외선교' },
  { key: '6',  name: '국내선교' },
  { key: '7',  name: '전도비' },
  { key: '8',  name: '심방비' },
  { key: '9',  name: '경조사비' },
  { key: '10', name: '연금비' },
  { key: '11', name: '새가족' },
  { key: '12', name: '총회비' },
  { key: '13', name: '후원' },
  { key: '14', name: '어린이부' },
  { key: '15', name: '청년청소년부' },
  { key: '16', name: '신자교육비' },
  { key: '17', name: '성가대' },
  { key: '18', name: '자녀교육비' },
  { key: '19', name: '행사비' },
]

// 헬퍼: key → name 변환
export function lookupName(list: LookupItem[], key: string): string {
  return list.find((i) => i.key === key)?.name ?? key
}

export const YEARS = Array.from({ length: 10 }, (_, i) =>
  String(new Date().getFullYear() - i)
)
