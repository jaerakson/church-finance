'use client'

import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ExpenseFormData } from '@/lib/types'
import { useLookups } from '@/lib/lookups'
import { today } from '@/lib/date'

const schema = z.object({
  date: z.string().min(1, '날짜를 입력해주세요.'),
  typeKey: z.string().min(1, '지출 종류를 선택해주세요.'),
  description: z.string().min(1, '내역을 입력해주세요.'),
  amount: z.string().min(1, '금액을 입력해주세요.'),
  note: z.string().default(''),
})

type FormValues = z.infer<typeof schema>

interface Props {
  mode: 'create' | 'edit'
  defaultValues?: Partial<ExpenseFormData>
  rowIndex?: number
}

export default function ExpenseForm({ mode, defaultValues, rowIndex }: Props) {
  const router = useRouter()
  const { expenseTypes } = useLookups()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: (defaultValues ?? { date: today() }) as FormValues,
  })

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setSubmitting(true)
    setError(null)
    try {
      const url = mode === 'create' ? '/api/expense' : `/api/expense/${rowIndex}`
      const method = mode === 'create' ? 'POST' : 'PUT'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      router.push('/expense')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="날짜" error={errors.date?.message}>
          <input {...register('date')} type="date" className={inputClass} />
        </Field>
        <Field label="지출 종류" error={errors.typeKey?.message}>
          <select {...register('typeKey')} className={inputClass}>
            <option value="">선택</option>
            {expenseTypes.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="내역" error={errors.description?.message} className="sm:col-span-2">
          <input {...register('description')} placeholder="예: 담임목사 사례비" className={inputClass} />
        </Field>
        <Field label="금액 (원)" error={errors.amount?.message}>
          <input {...register('amount')} type="number" placeholder="0" className={inputClass} />
        </Field>
        <Field label="비고">
          <input {...register('note')} placeholder="메모 (선택)" className={inputClass} />
        </Field>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting}
          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
          {submitting ? '저장 중...' : mode === 'create' ? '지출 입력' : '수정하기'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
          취소
        </button>
      </div>
    </form>
  )
}

const inputClass = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 dark:text-gray-50'

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
    </div>
  )
}
