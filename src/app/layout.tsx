import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '검암중앙교회 재정관리',
  description: '교인 헌금 및 지출 관리 시스템',
}

const navGroups = [
  {
    label: '현황',
    items: [
      { href: '/', label: '대시보드', icon: '📊' },
    ],
  },
  {
    label: '교인',
    items: [
      { href: '/members',     label: '교인명부', icon: '👥' },
      { href: '/members/new', label: '교인 등록', icon: '➕' },
    ],
  },
  {
    label: '재정',
    items: [
      { href: '/offering',     label: '헌금 내역', icon: '💰' },
      { href: '/offering/new', label: '헌금 입력', icon: '✏️' },
      { href: '/expense',      label: '지출 내역', icon: '📤' },
      { href: '/expense/new',  label: '지출 입력', icon: '✏️' },
    ],
  },
  {
    label: '재정 상세',
    items: [
      { href: '/finance/offerings', label: '헌금 상세', icon: '📄' },
      { href: '/finance/expenses',  label: '지출 상세', icon: '📑' },
      { href: '/finance/members',   label: '성도별 헌금', icon: '🧾' },
      { href: '/finance/income',    label: '수입재정집계표', icon: '📊' },
    ],
  },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <div className="flex min-h-screen">
          <aside className="w-56 bg-white border-r border-gray-100 flex flex-col fixed h-full shadow-sm z-10">
            <div className="px-6 py-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-0.5">검암중앙교회</p>
              <h1 className="text-base font-bold text-gray-900">재정관리</h1>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-gray-100 space-y-1">
              <p className="px-3 text-xs text-gray-400">Google Sheets 연동</p>
              <LogoutButton />
            </div>
          </aside>
          <main className="flex-1 ml-56 p-8 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
