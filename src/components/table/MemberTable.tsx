'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { Member } from '@/lib/types'
import Badge from '@/components/ui/Badge'
import { lookupName } from '@/lib/constants'
import { useLookups } from '@/lib/lookups'

const helper = createColumnHelper<Member>()

export default function MemberTable({ data }: { data: Member[] }) {
  const router = useRouter()
  const { positions, departments } = useLookups()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const hiddenCount = useMemo(() => data.filter((m) => m.hidden).length, [data])
  const tableData = useMemo(() => (showHidden ? data : data.filter((m) => !m.hidden)), [data, showHidden])

  const columns = useMemo(() => [
    helper.accessor('name', {
      header: '이름',
      cell: (info) => (
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-gray-900 dark:text-gray-100">{info.getValue()}</span>
          {info.row.original.hidden && <Badge label="숨김" color="yellow" />}
        </span>
      ),
    }),
    helper.accessor('positionKey', {
      header: '직분',
      cell: (info) => <Badge label={lookupName(positions, info.getValue()) || '-'} color="blue" />,
      filterFn: 'equals',
    }),
    helper.accessor('departmentKey', {
      header: '소속',
      cell: (info) => <span>{lookupName(departments, info.getValue()) || '-'}</span>,
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
  ], [positions, departments])

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  return (
    <div className="space-y-4">
      {/* 검색 + 필터 */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="이름 검색..."
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <LookupSelect
          label="직분"
          options={positions}
          onChange={(v) =>
            setColumnFilters((f) =>
              v ? [...f.filter((x) => x.id !== 'positionKey'), { id: 'positionKey', value: v }]
                : f.filter((x) => x.id !== 'positionKey')
            )
          }
        />
        <LookupSelect
          label="소속"
          options={departments}
          onChange={(v) =>
            setColumnFilters((f) =>
              v ? [...f.filter((x) => x.id !== 'departmentKey'), { id: 'departmentKey', value: v }]
                : f.filter((x) => x.id !== 'departmentKey')
            )
          }
        />
        {hiddenCount > 0 && (
          <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded border-gray-300"
            />
            숨긴 교인 포함 ({hiddenCount}명)
          </label>
        )}
        <span className="ml-auto text-sm text-gray-400">
          총 {table.getFilteredRowModel().rows.length}명
        </span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
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

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <PageBtn onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>«</PageBtn>
          <PageBtn onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>이전</PageBtn>
          <span className="px-2 text-gray-500">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <PageBtn onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>다음</PageBtn>
          <PageBtn onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>»</PageBtn>
        </div>
      )}
    </div>
  )
}

function PageBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
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
      className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
    >
      <option value="">전체 {label}</option>
      {options.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
    </select>
  )
}
