'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'
import { LookupProvider } from '@/lib/lookups'

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
      { href: '/finance/summary', label: '재정집계표', icon: '📈' },
      { href: '/finance/status', label: '재정현황표', icon: '📋' },
      { href: '/finance/budget', label: '예산 관리', icon: '🎯' },
      { href: '/finance/income', label: '수입재정집계표', icon: '📊' },
      { href: '/finance/expense-summary', label: '지출재정집계표', icon: '📉' },
      { href: '/finance/offerings', label: '헌금 상세', icon: '📄' },
      { href: '/finance/expenses', label: '지출 상세', icon: '📑' },
      { href: '/finance/members', label: '성도별 헌금', icon: '🧾' },
    ],
  },
  {
    label: '설정',
    items: [
      { href: '/settings/codes', label: '코드값 관리', icon: '⚙️' },
      { href: '/settings/backup', label: '데이터 백업', icon: '💾' },
    ],
  },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)          // 모바일 드로어
  const [collapsed, setCollapsed] = useState(false) // 데스크톱 접기
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('sidebarCollapsed') === '1') setCollapsed(true)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('theme')
      const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
      setTheme(isDark ? 'dark' : 'light')
    } catch { /* ignore */ }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    try {
      localStorage.setItem('theme', nextTheme)
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } catch { /* ignore */ }
  }

  const toggleCollapsed = (v: boolean) => {
    setCollapsed(v)
    try { localStorage.setItem('sidebarCollapsed', v ? '1' : '0') } catch { /* ignore */ }
  }

  // 로그인 화면은 사이드바 없이 전체 화면으로 (룩업 Context 불필요)
  if (pathname === '/login') return <>{children}</>

  return (
    <LookupProvider>
    <div className="min-h-screen">
      {/* 모바일 상단바 */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-30 flex items-center justify-between px-4 shadow-sm print:hidden dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 active:bg-gray-200 touch-manipulation dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700"
          >
            <span className="text-xl">☰</span>
          </button>
          <span className="font-bold text-gray-900 dark:text-gray-100">재정관리</span>
        </div>
        
        {/* 모바일 테마 토글 버튼 */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="테마 전환"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 touch-manipulation"
        >
          <span className="text-lg">{mounted && theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
      </header>

      {/* 오버레이 (모바일 드로어 열렸을 때) */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-40 print:hidden" onClick={() => setOpen(false)} />
      )}

      {/* 데스크톱: 접힌 상태일 때 다시 여는 버튼 */}
      {collapsed && (
        <button
          type="button"
          onClick={() => toggleCollapsed(false)}
          aria-label="사이드바 열기"
          className="hidden lg:flex fixed top-4 left-4 z-30 w-10 h-10 items-center justify-center rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-950 print:hidden dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <span className="text-lg">☰</span>
        </button>
      )}

      {/* 사이드바 — 모바일: 오프캔버스, 데스크톱: 고정(접기 가능) */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 lg:w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-sm z-50 flex flex-col transition-transform duration-200 print:hidden dark:bg-gray-900 dark:border-gray-800 ${open ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'}`}
      >
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-0.5 dark:text-blue-400">검암중앙교회</p>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">재정관리</h1>
          </div>
          {/* 모바일: 닫기 */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 touch-manipulation dark:text-gray-500 dark:hover:bg-gray-800"
          >
            ✕
          </button>
          {/* 데스크톱: 접기 */}
          <button
            type="button"
            onClick={() => toggleCollapsed(true)}
            aria-label="사이드바 접기"
            title="사이드바 접기"
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-300 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <span className="text-lg">«</span>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-gray-500">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                        active 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
                          : 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-400'
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
        
        {/* 테마 토글 및 로그아웃 하단 버튼 */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-1 dark:border-gray-800">
          <p className="px-3 text-xs text-gray-400 dark:text-gray-500 pb-1">설정</p>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 transition-colors cursor-pointer touch-manipulation"
          >
            <span className="text-base">{mounted && theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{mounted && theme === 'dark' ? '라이트모드 전환' : '다크모드 전환'}</span>
          </button>
          
          <div className="pt-2">
            <p className="px-3 text-xs text-gray-400 dark:text-gray-500">Google Sheets 연동</p>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* 본문 — 모바일: 전체폭 + 상단바 여백, 데스크톱: 사이드바 옆(접으면 전체폭) */}
      <main className={`${collapsed ? 'lg:ml-0' : 'lg:ml-56'} pt-14 lg:pt-0 p-4 lg:p-8 min-h-screen transition-[margin] duration-200 print:ml-0 print:p-0 print:pt-0`}>
        {children}
      </main>
    </div>
    </LookupProvider>
  )
}
