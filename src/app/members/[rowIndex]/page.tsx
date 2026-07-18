import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMember, getLookupRows, memberHasOfferings } from '@/lib/google-sheets'
import MemberForm from '@/components/forms/MemberForm'
import MemberActions from '@/components/forms/MemberActions'
import Badge from '@/components/ui/Badge'
import { POSITIONS, DEPARTMENTS, lookupName } from '@/lib/constants'

type Props = { params: Promise<{ rowIndex: string }> }

export default async function MemberDetailPage({ params }: Props) {
  const { rowIndex } = await params
  const [member, positions, departments] = await Promise.all([
    getMember(Number(rowIndex)).catch(() => null),
    getLookupRows('position').catch(() => POSITIONS),
    getLookupRows('department').catch(() => DEPARTMENTS),
  ])

  if (!member) notFound()

  const hasOfferings = await memberHasOfferings(member.key).catch(() => true)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/members" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← 목록으로
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{member.name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge label={lookupName(positions, member.positionKey) || '-'} color="blue" />
            <Badge label={lookupName(departments, member.departmentKey) || '-'} color="green" />
            {member.hidden && <Badge label="숨김" color="yellow" />}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
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
        <MemberActions
          rowIndex={Number(rowIndex)}
          name={member.name}
          hidden={member.hidden}
          hasOfferings={hasOfferings}
        />
      </div>
    </div>
  )
}
