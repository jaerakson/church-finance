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
  CATEGORY: '관',
} as const

// 관 (대분류) — 헌금분류/지출분류가 속하는 상위 분류 (재정집계표용)
export const CATEGORIES: LookupItem[] = [
  { key: '1', name: '정기헌금' },
  { key: '2', name: '절기헌금' },
  { key: '3', name: '예배비' },
  { key: '4', name: '선교비' },
  { key: '5', name: '교육비' },
  { key: '6', name: '관리비' },
  { key: '99', name: '건축비' },
]

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

// 헌금분류 (시트 '헌금분류' 기준, categoryKey = 관)
export const OFFERING_TYPES: LookupItem[] = [
  { key: '1',   name: '주정헌금', categoryKey: '1' },
  { key: '2',   name: '십일조',   categoryKey: '1' },
  { key: '3',   name: '감사헌금', categoryKey: '1' },
  { key: '4',   name: '선교헌금', categoryKey: '1' },
  { key: '5',   name: '건축헌금', categoryKey: '99' },
  { key: '6',   name: '특별헌금', categoryKey: '1' },
  { key: '7',   name: '신년헌금', categoryKey: '2' },
  { key: '8',   name: '부활절',   categoryKey: '2' },
  { key: '9',   name: '맥추절',   categoryKey: '2' },
  { key: '10',  name: '추수',     categoryKey: '2' },
  { key: '11',  name: '성탄',     categoryKey: '2' },
  { key: '30',  name: '세례교인 후원 헌금' },
  { key: '99',  name: '라후신학교 후원' },
  { key: '88',  name: '후원헌금' },
  { key: '100', name: '지교회 성장지원금', categoryKey: '4' },
]

// 지출분류 (시트 '지출분류' 기준, categoryKey = 관)
export const EXPENSE_TYPES: LookupItem[] = [
  { key: '1',  name: '사례비',       categoryKey: '3' },
  { key: '2',  name: '성찬비',       categoryKey: '3' },
  { key: '3',  name: '강사 사례비',  categoryKey: '3' },
  { key: '4',  name: '목회비',       categoryKey: '3' },
  { key: '5',  name: '해외선교',     categoryKey: '4' },
  { key: '6',  name: '국내선교',     categoryKey: '4' },
  { key: '7',  name: '전도비',       categoryKey: '4' },
  { key: '8',  name: '심방비',       categoryKey: '4' },
  { key: '9',  name: '경조사비',     categoryKey: '4' },
  { key: '10', name: '연금비',       categoryKey: '4' },
  { key: '11', name: '새가족',       categoryKey: '4' },
  { key: '12', name: '총회비',       categoryKey: '4' },
  { key: '13', name: '후원',         categoryKey: '4' },
  { key: '14', name: '어린이부',     categoryKey: '5' },
  { key: '15', name: '청년청소년부', categoryKey: '5' },
  { key: '16', name: '신자교육비',   categoryKey: '5' },
  { key: '17', name: '성가대',       categoryKey: '5' },
  { key: '18', name: '자녀교육비',   categoryKey: '5' },
  { key: '19', name: '행사비',       categoryKey: '5' },
  { key: '20', name: '월세',         categoryKey: '6' },
  { key: '21', name: '교회전기',     categoryKey: '6' },
  { key: '22', name: '인터넷',       categoryKey: '6' },
  { key: '23', name: '전화',         categoryKey: '6' },
  { key: '24', name: '교회수도',     categoryKey: '6' },
  { key: '25', name: '정수기',       categoryKey: '6' },
  { key: '26', name: '연료비',       categoryKey: '6' },
  { key: '27', name: '주방',         categoryKey: '6' },
  { key: '28', name: '자동차',       categoryKey: '6' },
  { key: '29', name: '사택관리',     categoryKey: '6' },
  { key: '30', name: '사무비',       categoryKey: '6' },
  { key: '31', name: '수리비',       categoryKey: '6' },
  { key: '32', name: '비품비',       categoryKey: '6' },
  { key: '33', name: '예비비',       categoryKey: '6' },
  { key: '46', name: '담임목사휴가비', categoryKey: '3' },
  { key: '35', name: '지방회 작은 교회 성장 현금', categoryKey: '4' },
  { key: '59', name: '기타선교',     categoryKey: '4' },
  { key: '50', name: '건축',         categoryKey: '99' },
  { key: '99', name: '기타',         categoryKey: '6' },
]

// 헬퍼: key → name 변환
export function lookupName(list: LookupItem[], key: string): string {
  return list.find((i) => i.key === key)?.name ?? key
}

export const YEARS = Array.from({ length: 10 }, (_, i) =>
  String(new Date().getFullYear() - i)
)
