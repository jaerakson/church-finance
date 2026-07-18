'use client'

import { Expense } from '@/lib/types'
import { lookupName, CATEGORIES } from '@/lib/constants'
import { useLookups } from '@/lib/lookups'
import { numberToKorean } from '@/lib/korean-number'

// A4 한 페이지에 맞춘 기본 칸수. 브라우저가 인쇄 시 자체적으로 넣는 제목/URL/페이지번호
// 여백까지 감안해 여유 있게 잡았음 — 입력이 더 많으면 자동으로 늘어남.
const DEFAULT_ROW_COUNT = 9

function parseAmount(v: string) {
  return Number(v.replace(/,/g, '')) || 0
}

interface Props {
  date: string
  items: Expense[]
}

export default function ExpenseReceiptPrint({ date, items }: Props) {
  const { expenseTypes } = useLookups()

  const total = items.reduce((s, e) => s + parseAmount(e.amount), 0)

  const rows = (() => {
    const rows = items.map((e, idx) => {
      const typeName = lookupName(expenseTypes, e.typeKey)
      const typeObj = expenseTypes.find((t) => t.key === e.typeKey)
      const catName = typeObj?.categoryKey ? lookupName(CATEGORIES, typeObj.categoryKey) || '' : ''
      const parts = [catName, typeName, e.description].filter(Boolean).join(' / ')
      const label = `${idx + 1}. ${parts}${e.note ? ` (${e.note})` : ''}`
      return { description: label, amount: parseAmount(e.amount) }
    })
    const padded = [...rows]
    while (padded.length < DEFAULT_ROW_COUNT) padded.push({ description: '', amount: 0 })
    return padded
  })()

  const dateParts = date.split('-')
  const dateYear = dateParts[0] ?? ''
  const dateMonth = dateParts[1] ? String(Number(dateParts[1])) : ''
  const dateDay = dateParts[2] ? String(Number(dateParts[2])) : ''

  return (
    <div
      className="hidden print:flex print:text-black print:bg-white"
      style={{
        fontFamily: 'serif',
        flexDirection: 'column',
        minHeight: '230mm',
        maxWidth: '150mm',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 25mm; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <h1 style={{ textAlign: 'center', fontSize: '22px', letterSpacing: '0.6em', fontWeight: 'bold', marginBottom: '14px' }}>
        지 출 결 의 서
      </h1>

      {/* 결재란 */}
      <table style={{ marginLeft: 'auto', border: '1px solid #000', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '13px' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 18px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '0.3em', whiteSpace: 'nowrap' }}>회 계</td>
            <td style={{ border: '1px solid #000', padding: '4px 18px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>재정부장</td>
            <td style={{ border: '1px solid #000', padding: '4px 18px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>담임목사</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', height: '50px', width: '100px' }}>&nbsp;</td>
            <td style={{ border: '1px solid #000', height: '50px', width: '100px' }}>&nbsp;</td>
            <td style={{ border: '1px solid #000', height: '50px', width: '100px' }}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      {/* 총액 */}
      <p style={{ fontSize: '15px', border: '1px solid #000', padding: '8px 14px', marginBottom: '10px', textAlign: 'center' }}>
        일금 <strong style={{ letterSpacing: '0.15em' }}>{numberToKorean(total)}</strong>원정
        {'  '}(<span style={{ fontFamily: 'sans-serif' }}>{total.toLocaleString()}</span>원)
      </p>

      {/* 내역 테이블 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '12px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '75%', letterSpacing: '0.5em' }}>내 역</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', letterSpacing: '0.3em' }}>금 액</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #000', padding: '5px 10px', height: '28px' }}>{row.description}</td>
              <td style={{ border: '1px solid #000', padding: '5px 10px', textAlign: 'right' }}>
                {row.amount > 0 ? row.amount.toLocaleString() : ''}
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '0.4em' }}>합 계</td>
            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {/* 승인 문구 + 교회명: 페이지 하단에 고정 */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ fontSize: '14px', lineHeight: '1.9', textAlign: 'center', marginBottom: '20px' }}>
          <p>상기 금액의 지출을 승인합니다.</p>
          <p>주 후&nbsp;&nbsp;{dateYear}년&nbsp;&nbsp;{dateMonth}월&nbsp;&nbsp;{dateDay}일</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '8px', gap: '0px' }}>
            <span style={{ fontSize: '14px', letterSpacing: '0.1em' }}>담임목사&nbsp;&nbsp;김&nbsp;&nbsp;영&nbsp;&nbsp;민</span>
            {/* 교회 인장 (도장) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/stamp.png"
              alt="교회 인장"
              width={70}
              height={70}
              style={{ marginLeft: '4px', marginBottom: '-5px', mixBlendMode: 'multiply' }}
            />
          </div>
        </div>

        {/* 교회명 */}
        <p style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.8em' }}>
          검 암 중 앙 교 회
        </p>
      </div>
    </div>
  )
}
