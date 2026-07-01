'use client'

import { useState, useEffect, useCallback } from 'react'
import { LookupRow, LookupKind } from '@/lib/types'

const KIND_TABS: { kind: LookupKind; label: string; hasCategory: boolean }[] = [
  { kind: 'expenseType', label: '지출분류', hasCategory: true },
  { kind: 'offeringType', label: '헌금분류', hasCategory: true },
  { kind: 'category', label: '관(대분류)', hasCategory: false },
  { kind: 'department', label: '소속', hasCategory: false },
  { kind: 'position', label: '직분', hasCategory: false },
]

export default function LookupManager() {
  const [kind, setKind] = useState<LookupKind>('expenseType')
  const [items, setItems] = useState<LookupRow[]>([])
  const [categories, setCategories] = useState<LookupRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState('')
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCat, setEditCat] = useState('')
  const [confirmKey, setConfirmKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tab = KIND_TABS.find((t) => t.kind === kind)!
  const catName = (k?: string) => categories.find((c) => c.key === k)?.name ?? k ?? ''

  const fetchItems = useCallback(async (k: LookupKind) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/lookups?kind=${k}`)
      const json = await res.json()
      if (json.success) setItems(json.data)
      else setError(json.error)
    } catch { setError('불러오지 못했습니다.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/lookups?kind=category').then((r) => r.json()).then((j) => { if (j.success) setCategories(j.data) }).catch(() => {})
  }, [])

  useEffect(() => { fetchItems(kind) }, [kind, fetchItems])

  const refreshCategories = () => fetch('/api/lookups?kind=category').then((r) => r.json()).then((j) => { if (j.success) setCategories(j.data) })

  const add = async () => {
    if (!newName.trim() || busy) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/lookups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name: newName.trim(), categoryKey: tab.hasCategory ? newCat : undefined }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setNewName(''); setNewCat('')
      await fetchItems(kind)
      if (kind === 'category') await refreshCategories()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : '저장 실패') }
    finally { setBusy(false) }
  }

  const startEdit = (it: LookupRow) => { setConfirmKey(null); setEditKey(it.key); setEditName(it.name); setEditCat(it.categoryKey ?? '') }

  const saveEdit = async (it: LookupRow) => {
    if (!editName.trim() || busy) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/lookups', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, rowIndex: it.rowIndex, key: it.key, name: editName.trim(), categoryKey: tab.hasCategory ? editCat : undefined }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setEditKey(null)
      await fetchItems(kind)
      if (kind === 'category') await refreshCategories()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : '수정 실패') }
    finally { setBusy(false) }
  }

  const remove = async (it: LookupRow) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/lookups?kind=${kind}&rowIndex=${it.rowIndex}&key=${encodeURIComponent(it.key)}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setConfirmKey(null)
      await fetchItems(kind)
      if (kind === 'category') await refreshCategories()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : '삭제 실패') }
    finally { setBusy(false) }
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex flex-wrap gap-2">
        {KIND_TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            onClick={() => setKind(t.kind)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${kind === t.kind ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* 추가 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-gray-500 mb-1">{tab.label} 이름</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="새 항목 이름" className={`${inputCls} w-full`} />
        </div>
        {tab.hasCategory && (
          <div className="min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">관(대분류)</label>
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">선택 안 함</option>
              {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </div>
        )}
        <button type="button" onClick={add} disabled={busy || !newName.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">추가</button>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-center py-10 text-gray-400 text-sm">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">항목이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {items.map((it) => (
              <li key={it.key} className="px-4 py-2.5">
                {editKey === it.key ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400 w-10">#{it.key}</span>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`${inputCls} flex-1 min-w-[160px]`} />
                    {tab.hasCategory && (
                      <select value={editCat} onChange={(e) => setEditCat(e.target.value)} className={inputCls}>
                        <option value="">선택 안 함</option>
                        {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                      </select>
                    )}
                    <button type="button" onClick={() => saveEdit(it)} disabled={busy} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-medium">저장</button>
                    <button type="button" onClick={() => setEditKey(null)} disabled={busy} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-xs font-medium">취소</button>
                  </div>
                ) : confirmKey === it.key ? (
                  <div className="flex items-center justify-between gap-2 bg-rose-50 rounded-lg px-2 py-1.5">
                    <span className="text-xs text-rose-700">‘{it.name}’ 삭제할까요? (사용 중이면 거부됩니다)</span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <button type="button" onClick={() => remove(it)} disabled={busy} className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-md text-xs font-medium">삭제</button>
                      <button type="button" onClick={() => setConfirmKey(null)} disabled={busy} className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-md text-xs font-medium">취소</button>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 w-10">#{it.key}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">{it.name}</span>
                      {tab.hasCategory && it.categoryKey && <span className="text-xs text-gray-400">· {catName(it.categoryKey)}</span>}
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <button type="button" onClick={() => startEdit(it)} className="p-1.5 text-gray-300 hover:text-blue-500" title="수정">✏️</button>
                      <button type="button" onClick={() => { setEditKey(null); setError(null); setConfirmKey(it.key) }} className="p-1.5 text-gray-300 hover:text-rose-500" title="삭제">🗑️</button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
