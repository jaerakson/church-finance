'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 active:bg-gray-100 font-medium text-gray-700 shadow-sm transition-colors"
      title="현재 화면을 인쇄합니다"
    >
      🖨️ 인쇄하기
    </button>
  )
}
