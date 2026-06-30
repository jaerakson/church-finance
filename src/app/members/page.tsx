import Link from 'next/link'
import { getMembers } from '@/lib/google-sheets'
import MemberTable from '@/components/table/MemberTable'

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  let members: Awaited<ReturnType<typeof getMembers>> = []
  let error = false

  try {
    members = await getMembers()
  } catch {
    error = true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">교인명부</h1>
          <p className="text-sm text-gray-500 mt-1">Google Sheets 연동 데이터</p>
        </div>
        <Link
          href="/members/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + 교인 등록
        </Link>
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm">
          데이터를 불러오지 못했습니다. Google Sheets API 연결을 확인해주세요.
        </div>
      ) : (
        <MemberTable data={members} />
      )}
    </div>
  )
}
