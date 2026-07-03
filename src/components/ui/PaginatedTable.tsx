'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'

export type Column = {
  key: string
  header: string
  align?: 'left' | 'right'
  format?: 'won' | 'number' | 'text'
}

export type Row = Record<string, string | number>

interface Props {
  columns: Column[]
  rows: Row[]
  searchPlaceholder?: string
  initialPageSize?: number
  accent?: 'blue' | 'rose'
  onRowClick?: (row: Row) => void
}

const PAGE_SIZES = [25, 50, 100, 200]
const helper = createColumnHelper<Row>()

function formatCell(value: string | number | undefined, format?: Column['format']): string {
  if (value === undefined || value === null || value === '') return '-'
  if (format === 'won') return `${Number(value).toLocaleString()}원`
  if (format === 'number') return Number(value).toLocaleString()
  return String(value)
}

export default function PaginatedTable({
  columns,
  rows,
  searchPlaceholder = '검색...',
  initialPageSize = 50,
  accent = 'blue',
}: Props) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])

  const tableColumns = useMemo(
    () =>
      columns.map((c) =>
        helper.accessor((row) => row[c.key], {
          id: c.key,
          header: c.header,
          cell: (info) => formatCell(info.getValue() as string | number, c.format),
          sortingFn: c.format === 'won' || c.format === 'number' ? 'basic' : 'alphanumeric',
        }),
      ),
    [columns],
  )

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
  })

  const ring = accent === 'rose' ? 'focus:ring-rose-500' : 'focus:ring-blue-500'
  const hover = accent === 'rose' ? 'hover:bg-rose-50 dark:hover:bg-rose-950/20' : 'hover:bg-blue-50 dark:hover:bg-blue-950/20'
  const accentText = accent === 'rose' ? 'text-rose-700 dark:text-rose-400' : 'text-blue-700 dark:text-blue-400'
  const filteredRows = table.getFilteredRowModel().rows
  const filteredCount = filteredRows.length
  const { pageIndex, pageSize } = table.getState().pagination
  const from = filteredCount === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, filteredCount)

  // 검색/필터 결과에 대한 숫자(금액) 컬럼 합계 — 현재 페이지가 아닌 필터 전체 기준
  const sumCols = columns.filter((c) => c.format === 'won' || c.format === 'number')
  const sums: Record<string, number> = {}
  for (const c of sumCols) {
    sums[c.key] = filteredRows.reduce((s, r) => s + Number(r.original[c.key] ?? 0), 0)
  }
  const isFiltering = globalFilter.trim() !== ''

  return (
    <div className="space-y-3">
      {/* 검색 + 페이지 크기 */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className={`border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm w-60 focus:outline-none focus:ring-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${ring}`}
        />
        <select
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className={`border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${ring}`}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}개씩</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">
          {isFiltering && <span className="text-gray-500 dark:text-gray-400">검색 </span>}
          {filteredCount.toLocaleString()}건 중 {from.toLocaleString()}–{to.toLocaleString()}
        </span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-gray-50 dark:bg-gray-950 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                {hg.headers.map((header) => {
                  const col = columns.find((c) => c.key === header.column.id)
                  const alignRight = col?.align === 'right'
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 ${alignRight ? 'text-right' : 'text-left'}`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400 dark:text-gray-500">데이터가 없습니다.</td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className={`${hover} transition-colors`}>
                  {row.getVisibleCells().map((cell) => {
                    const col = columns.find((c) => c.key === cell.column.id)
                    const alignRight = col?.align === 'right'
                    return (
                      <td key={cell.id} className={`px-4 py-2.5 text-gray-700 dark:text-gray-100 ${alignRight ? 'text-right font-medium text-gray-900 dark:text-white' : ''}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
          {sumCols.length > 0 && filteredCount > 0 && (
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-950 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700 font-semibold">
                {columns.map((c, i) => {
                  const alignRight = c.align === 'right'
                  if (i === 0) {
                    return (
                      <td key={c.key} className="px-4 py-2.5 text-gray-600 dark:text-gray-300 dark:text-gray-400">
                        {isFiltering ? '검색 결과 합계' : '전체 합계'} ({filteredCount.toLocaleString()}건)
                      </td>
                    )
                  }
                  return (
                    <td key={c.key} className={`px-4 py-2.5 ${alignRight ? 'text-right' : 'text-left'} ${sums[c.key] !== undefined ? accentText : 'text-gray-300 dark:text-gray-600 dark:text-gray-300'}`}>
                      {sums[c.key] !== undefined ? formatCell(sums[c.key], c.format) : ''}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 페이지 이동 */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <PageBtn onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>«</PageBtn>
          <PageBtn onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>이전</PageBtn>
          <span className="px-2 text-gray-500 dark:text-gray-400">
            {pageIndex + 1} / {table.getPageCount()}
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
      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}
