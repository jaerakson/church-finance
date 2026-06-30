import MemberForm from '@/components/forms/MemberForm'

export default function NewMemberPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">교인 등록</h1>
        <p className="text-sm text-gray-500 mt-1">새 교인 정보를 입력하세요.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <MemberForm mode="create" />
      </div>
    </div>
  )
}
