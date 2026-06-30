'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { Member } from '@/lib/types'
import Badge from '@/components/ui/Badge'
import { POSITIONS, DEPARTMENTS, lookupName } from '@/lib/constants'

const helper = createColumnHelper<Member>()

export default function MemberTable({ data }: { data: Member[] }) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo(() => [
    helper.accessor('name', {
      header: '이름',
      cell: (info) => <span className="font-medium text-gray-900">{info.getValue()}</span>,
    }),
    helper.accessor('positionKey', {
      header: '직분',
      cell: (info) => <Badge label={lookupName(POSITIONS, info.getValue()) || '-'} color="blue" />,
      filterFn: 'equals',
    }),
    helper.accessor('departmentKey', {
      header: '소속',
      cell: (info) => <span>{lookupName(DEPARTMENTS, info.getValue()) || '-'}</span>,
      filterFn: 'equals',
    }),
    helper.accessor('phone', {
      header: '전화번호',
    }),
    helper.accessor('registeredAt', {
      header: '등록일',
    }),
    helper.accessor('baptizedAt', {
      header: '세례일',
    }),
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* 검색 + 필터 */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="이름 검색..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <LookupSelect
          label="직분"
          options={POSITIONS}
          onChange={(v) =>
            setColumnFilters((f) =>
              v ? [...f.filter((x) => x.id !== 'positionKey'), { id: 'positionKey', value: v }]
                : f.filter((x) => x.id !== 'positionKey')
            )
          }
        />
        <LookupSelect
          label="소속"
          options={DEPARTMENTS}
          onChange={(v) =>
            setColumnFilters((f) =>
              v ? [...f.filter((x) => x.id !== 'departmentKey'), { id: 'departmentKey', value: v }]
                : f.filter((x) => x.id !== 'departmentKey')
            )
          }
        />
        <span className="ml-auto text-sm text-gray-400">
          총 {table.getFilteredRowModel().rows.length}명
        </span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-gray-50 border-b border-gray-100">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && ' ↑'}
                    {header.column.getIsSorted() === 'desc' && ' ↓'}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-50">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400">데이터가 없습니다.</td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/members/${row.original.rowIndex}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LookupSelect({ label, options, onChange }: {
  label: string
  options: { key: string; name: string }[]
  onChange: (v: string) => void
}) {
  return (
    <select
      defaultValue=""
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      <option value="">전체 {label}</option>
      {options.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
    </select>
  )
}
