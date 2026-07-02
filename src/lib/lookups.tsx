'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { LookupItem } from './types'
import { CATEGORIES, DEPARTMENTS, POSITIONS, OFFERING_TYPES, EXPENSE_TYPES } from './constants'

// 시트에서 실시간으로 읽어온 코드값들. 최초 페인트/네트워크 실패 시엔 constants 시드로 폴백한다.
export interface Lookups {
  categories: LookupItem[]
  departments: LookupItem[]
  positions: LookupItem[]
  offeringTypes: LookupItem[]
  expenseTypes: LookupItem[]
}

interface LookupContextValue extends Lookups {
  loading: boolean
  refresh: () => Promise<void>
}

const seed: Lookups = {
  categories: CATEGORIES,
  departments: DEPARTMENTS,
  positions: POSITIONS,
  offeringTypes: OFFERING_TYPES,
  expenseTypes: EXPENSE_TYPES,
}

const LookupContext = createContext<LookupContextValue | null>(null)

export function LookupProvider({ children }: { children: ReactNode }) {
  const [lookups, setLookups] = useState<Lookups>(seed)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lookups?kind=all')
      const json = await res.json()
      if (json.success && json.data) {
        const d = json.data as Partial<Record<'category' | 'department' | 'position' | 'offeringType' | 'expenseType', LookupItem[]>>
        setLookups({
          categories: d.category ?? seed.categories,
          departments: d.department ?? seed.departments,
          positions: d.position ?? seed.positions,
          offeringTypes: d.offeringType ?? seed.offeringTypes,
          expenseTypes: d.expenseType ?? seed.expenseTypes,
        })
      }
    } catch {
      /* 실패 시 마지막 값(시드) 유지 */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <LookupContext.Provider value={{ ...lookups, loading, refresh }}>
      {children}
    </LookupContext.Provider>
  )
}

export function useLookups(): LookupContextValue {
  const ctx = useContext(LookupContext)
  if (!ctx) throw new Error('useLookups must be used within LookupProvider')
  return ctx
}
