'use client'

import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MemberFormData } from '@/lib/types'
import { POSITIONS, DEPARTMENTS } from '@/lib/constants'

const schema = z.object({
  name:          z.string().min(1, '이름을 입력해주세요.'),
  positionKey:   z.string().min(1, '직분을 선택해주세요.'),
  departmentKey: z.string().min(1, '소속을 선택해주세요.'),
  phone:         z.string().default(''),
  email:         z.string().default(''),
  address:       z.string().default(''),
  registeredAt:  z.string().default(''),
  baptizedAt:    z.string().default(''),
})

type FormValues = z.infer<typeof schema>

interface Props {
  mode: 'create' | 'edit'
  defaultValues?: Partial<MemberFormData>
  rowIndex?: number
}

export default function MemberForm({ mode, defaultValues, rowIndex }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: (defaultValues ?? {}) as FormValues,
  })

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setSubmitting(true)
    setError(null)
    try {
      const url = mode === 'create' ? '/api/members' : `/api/members/${rowIndex}`
      const method = mode === 'create' ? 'POST' : 'PUT'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      router.push('/members')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="이름" error={errors.name?.message} className="sm:col-span-2">
          <input {...register('name')} placeholder="홍길동" className={inputClass} />
        </Field>
        <Field label="직분" error={errors.positionKey?.message}>
          <select {...register('positionKey')} className={inputClass}>
            <option value="">선택</option>
            {POSITIONS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="소속" error={errors.departmentKey?.message}>
          <select {...register('departmentKey')} className={inputClass}>
            <option value="">선택</option>
            {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="전화번호">
          <input {...register('phone')} placeholder="010-0000-0000" className={inputClass} />
        </Field>
        <Field label="이메일">
          <input {...register('email')} type="email" placeholder="example@example.com" className={inputClass} />
        </Field>
        <Field label="주소" className="sm:col-span-2">
          <input {...register('address')} placeholder="주소" className={inputClass} />
        </Field>
        <Field label="등록일">
          <input {...register('registeredAt')} type="date" className={inputClass} />
        </Field>
        <Field label="세례일">
          <input {...register('baptizedAt')} type="date" className={inputClass} />
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
          {submitting ? '저장 중...' : mode === 'create' ? '등록하기' : '수정하기'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-sm font-medium transition-colors">
          취소
        </button>
      </div>
    </form>
  )
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}
