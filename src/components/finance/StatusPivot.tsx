'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export type StatusItem = { key: string; name: string; budget: number; prev: number; current: number; total: number }
export type StatusSection = {
  category: string
  items: StatusItem[]
  subtotal: { budget: number; prev: number; current: number; total: number }
}

interface Props {
  title: string
  subTitle?: string // 수입 - 건축헌금 = 금액 등 추가 요약 정보
  kind: 'income' | 'expense'
  sections: StatusSection[]
  grand: { budget: number; prev: number; current: number; total: number }
  grandLabel: string
  accent: 'emerald' | 'rose'
  activeDate?: string // 해당 거래 일자 (YYYY-MM-DD)
}

const num = (n: number) => (n ? n.toLocaleString() : '-')

export default function StatusPivot({ title, subTitle, kind, sections, grand, grandLabel, accent, activeDate }: Props) {
  // 기본값을 "펼쳐진 상태"로 시작합니다.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  
  // 데이터나 날짜가 바뀌더라도 기본적으로 계속 완전히 펼쳐진 상태를 유지하게 합니다.
  useEffect(() => {
    setCollapsed(new Set())
  }, [sections])

  const toggle = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

  const titleBg = accent === 'emerald' ? 'bg-emerald-50/50' : 'bg-rose-50/50'
  const grandBg = accent === 'emerald' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
  const grandBorder = accent === 'emerald' ? 'border-emerald-100' : 'border-rose-100'

  // 클릭 시 해당 일자의 수입 입력(헌금 등록) 혹은 지출 입력 페이지로 이동합니다. (URL 파라미터 날짜 자동 전달)
  const href = kind === 'income' 
    ? `/offering/new?date=${activeDate || ''}` 
    : `/expense/new?date=${activeDate || ''}`

  return (
    <div className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden print:border-gray-300">
      <div className={`px-4 py-3 border-b border-gray-100 font-bold text-gray-800 ${titleBg} print:bg-gray-100 print:text-black print:border-gray-300 flex items-center justify-between flex-wrap gap-2`}>
        {/* 헤더 클릭 시 해당 일자 프리필이 설정된 입력 등록 페이지로 링크 이동 */}
        <Link 
          href={href} 
          className="hover:underline flex items-center gap-1 group text-gray-900 hover:text-blue-600 transition-colors"
          title="클릭하여 해당 날짜 입력 등록 페이지로 이동"
        >
          <span>{title}</span>
          <span className="text-xs font-normal text-gray-400 group-hover:text-blue-500 print:hidden transition-colors">🔗 입력하기</span>
        </Link>
        {subTitle && (
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded print:bg-transparent print:p-0 print:text-black font-semibold">
            {subTitle}
          </span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 print:border-gray-300">
            <th className="px-4 py-2.5 text-left font-semibold print:text-black">항목 (대분류/소분류)</th>
            <th className="px-4 py-2.5 text-right font-semibold print:text-black w-40">금액</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 print:divide-gray-200">
          {sections.length === 0 ? (
            <tr>
              <td colSpan={2} className="text-center py-10 text-gray-400">
                실적이 없습니다.
              </td>
            </tr>
          ) : (
            sections.flatMap((sec) => {
              const isCollapsed = collapsed.has(sec.category)
              return [
                /* 관 소계 행 (클릭 시 접기/펼치기 토글) */
                <tr 
                  key={`${sec.category}-subtotal`} 
                  onClick={() => toggle(sec.category)}
                  className="bg-gray-50/40 font-semibold cursor-pointer hover:bg-gray-100/40 print:bg-gray-50"
                  title="클릭하여 접기/펼치기"
                >
                  <td className="px-4 py-2 text-xs text-gray-600 font-bold print:text-black select-none">
                    <span className="inline-block w-4 text-gray-400 print:hidden">{isCollapsed ? '▶' : '▼'}</span>
                    {sec.category}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-gray-700 font-bold print:text-black">{num(sec.subtotal.current)}원</td>
                </tr>,
                /* 세부 항목 행 (pl-8 간격 들여쓰기, 인쇄 시에도 접어놓은 상태가 아니라면 출력되도록 'print:hidden' 제거) */
                ...sec.items.map((it) => (
                  <tr 
                    key={it.key} 
                    className={`hover:bg-gray-50/40 ${isCollapsed ? 'hidden' : ''}`}
                  >
                    <td className="px-4 py-1.5 pl-8 text-gray-700 text-xs print:text-black select-none">{it.name}</td>
                    <td className="px-4 py-1.5 text-right text-xs text-gray-600 font-medium print:text-black">{num(it.current)}원</td>
                  </tr>
                ))
              ]
            })
          )}
          {/* 총계 행 */}
          <tr className={`font-bold ${grandBg} border-t-2 ${grandBorder} print:bg-gray-100 print:text-black print:border-gray-400`}>
            <td className="px-4 py-2.5">{grandLabel}</td>
            <td className="px-4 py-2.5 text-right text-base font-extrabold">{num(grand.current)}원</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
