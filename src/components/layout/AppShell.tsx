'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

const navGroups = [
  { label: '현황', items: [{ href: '/', label: '대시보드', icon: '📊' }] },
  {
    label: '교인',
    items: [
      { href: '/members', label: '교인명부', icon: '👥' },
      { href: '/members/new', label: '교인 등록', icon: '➕' },
    ],
  },
  {
    label: '재정',
    items: [
      { href: '/offering', label: '헌금 내역', icon: '💰' },
      { href: '/offering/new', label: '헌금 입력', icon: '✏️' },
      { href: '/expense', label: '지출 내역', icon: '📤' },
      { href: '/expense/new', label: '지출 입력', icon: '✏️' },
    ],
  },
  {
    label: '재정 상세',
    items: [
      { href: '/finance/offerings', label: '헌금 상세', icon: '📄' },
      { href: '/finance/expenses', label: '지출 상세', icon: '📑' },
      { href: '/finance/members', label: '성도별 헌금', icon: '🧾' },
      { href: '/finance/income', label: '수입재정집계표', icon: '📊' },
    ],
  },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // 로그인 화면은 사이드바 없이 전체 화면으로
  if (pathname === '/login') return <>{children}</>

  return (
    <div className="min-h-screen">
      {/* 모바일 상단바 */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-gray-100 z-30 flex items-center gap-3 px-4 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
        >
          <span className="text-xl">☰</span>
        </button>
        <span className="font-bold text-gray-900">재정관리</span>
      </header>

      {/* 오버레이 (모바일 드로어 열렸을 때) */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      )}

      {/* 사이드바 — 모바일: 오프캔버스, 데스크톱: 고정 */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 lg:w-56 bg-white border-r border-gray-100 shadow-sm z-50 flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-0.5">검암중앙교회</p>
            <h1 className="text-base font-bold text-gray-900">재정관리</h1>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 touch-manipulation"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          <p className="px-3 text-xs text-gray-400">Google Sheets 연동</p>
          <LogoutButton />
        </div>
      </aside>

      {/* 본문 — 모바일: 전체폭 + 상단바 여백, 데스크톱: 사이드바 옆 */}
      <main className="lg:ml-56 pt-14 lg:pt-0 p-4 lg:p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
