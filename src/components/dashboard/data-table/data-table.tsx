'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/dashboard/ui/table'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableSkeleton } from './data-table-skeleton'
import { DataTableEmptyState } from './data-table-empty-state'
import { DataTableErrorState } from './data-table-error-state'
import { DataTablePagination } from './data-table-pagination'
import { cn } from '@/lib/utils'
import type { DataTableQueryParams, DataTableResult, DataTableSort } from './types'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  /** Identifies the collection/query — page/sort/filters are appended internally. */
  queryKey: unknown[]
  fetcher: (params: DataTableQueryParams) => Promise<DataTableResult<TData>>
  /** Externally controlled (usually from a toolbar) — merged into every request. */
  filters?: Record<string, string>
  pageSize?: number
  defaultSort?: DataTableSort
  emptyState?: { title: string; description?: string; action?: ReactNode }
  onRowClick?: (row: TData) => void
  getRowId?: (row: TData) => string
}

export function DataTable<TData>({
  columns,
  queryKey,
  fetcher,
  filters = {},
  pageSize = 20,
  defaultSort,
  emptyState,
  onRowClick,
  getRowId,
}: DataTableProps<TData>) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<DataTableSort | undefined>(defaultSort)

  // A filter change invalidates the current page — e.g. page 4 of an
  // unfiltered list may not exist once a search term narrows the results.
  const filterKey = JSON.stringify(filters)
  useEffect(() => {
    setPage(1)
  }, [filterKey])

  const params: DataTableQueryParams = { page, pageSize, sort, filters }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => fetcher(params),
    placeholderData: (previous) => previous,
  })

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  const columnCount = columns.length

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { sortable?: boolean; sortId?: string; className?: string }
                    | undefined
                  const sortId = meta?.sortId ?? header.column.id

                  return (
                    <TableHead key={header.id} className={meta?.className}>
                      {header.isPlaceholder ? null : meta?.sortable ? (
                        <DataTableColumnHeader
                          title={flexRender(header.column.columnDef.header, header.getContext()) as string}
                          sortable
                          active={sort?.id === sortId}
                          desc={sort?.id === sortId ? sort?.desc : undefined}
                          onToggleSort={() =>
                            setSort((prev) =>
                              prev?.id === sortId
                                ? prev.desc
                                  ? undefined
                                  : { id: sortId, desc: true }
                                : { id: sortId, desc: false },
                            )
                          }
                        />
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          {isLoading ? (
            <DataTableSkeleton columns={columnCount} />
          ) : isError ? (
            <DataTableErrorState columns={columnCount} onRetry={() => refetch()} />
          ) : table.getRowModel().rows.length === 0 ? (
            <DataTableEmptyState columns={columnCount} {...emptyState} />
          ) : (
            <TableBody className={cn(isFetching && 'opacity-60 transition-opacity')}>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      <DataTablePagination
        page={page}
        pageCount={data?.pageCount ?? 1}
        totalDocs={data?.totalDocs ?? 0}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  )
}
