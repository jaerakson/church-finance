import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMember } from '@/lib/google-sheets'
import MemberForm from '@/components/forms/MemberForm'
import Badge from '@/components/ui/Badge'
import { POSITIONS, DEPARTMENTS, lookupName } from '@/lib/constants'

type Props = { params: Promise<{ rowIndex: string }> }

export default async function MemberDetailPage({ params }: Props) {
  const { rowIndex } = await params
  const member = await getMember(Number(rowIndex)).catch(() => null)

  if (!member) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/members" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← 목록으로
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge label={lookupName(POSITIONS, member.positionKey) || '-'} color="blue" />
            <Badge label={lookupName(DEPARTMENTS, member.departmentKey) || '-'} color="green" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <MemberForm
          mode="edit"
          rowIndex={Number(rowIndex)}
          defaultValues={{
            name:          member.name,
            positionKey:   member.positionKey,
            departmentKey: member.departmentKey,
            phone:         member.phone,
            email:         member.email,
            address:       member.address,
            registeredAt:  member.registeredAt,
            baptizedAt:    member.baptizedAt,
          }}
        />
      </div>
    </div>
  )
}
