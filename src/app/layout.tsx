import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/layout/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '검암중앙교회 재정관리',
  description: '교인 헌금 및 지출 관리 시스템',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
