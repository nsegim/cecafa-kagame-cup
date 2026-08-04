'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/dashboard/ui/button'
import { DataTable } from '@/components/dashboard/data-table/data-table'
import { DataTableToolbar } from '@/components/dashboard/data-table/data-table-toolbar'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { subscriberColumns } from './columns'
import type { Subscriber } from '@/payload-types'
import type { DataTableQueryParams, DataTableResult } from '@/components/dashboard/data-table/types'

async function fetchSubscribers(params: DataTableQueryParams): Promise<DataTableResult<Subscriber>> {
  const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
  if (params.sort) {
    search.set('sortId', params.sort.id)
    search.set('sortDesc', String(params.sort.desc))
  }
  for (const [key, value] of Object.entries(params.filters)) {
    if (value) search.set(key, value)
  }
  return dashboardFetch<DataTableResult<Subscriber>>(`/api/dashboard/subscribers?${search.toString()}`)
}

export function SubscribersTable({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  async function remove(row: Subscriber) {
    if (!confirm(`Remove ${row.email} from the list?`)) return
    try {
      await dashboardFetch(`/api/dashboard/subscribers/${row.id}`, { method: 'DELETE' })
      toast.success('Subscriber removed.')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the subscriber.')
    }
  }

  const actionsColumn: ColumnDef<Subscriber, unknown> = {
    id: 'actions',
    header: '',
    meta: { className: 'w-12' },
    cell: ({ row }) => (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-destructive"
        aria-label="Remove"
        onClick={() => remove(row.original)}
      >
        <Trash2 className="size-3.5" />
      </Button>
    ),
  }
  const columns = canManage ? [...subscriberColumns, actionsColumn] : subscriberColumns

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by email…"
          actions={
            canManage && (
              <Button size="sm" variant="outline" asChild>
                {/* File download, not a page transition — a plain anchor is correct here. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/api/dashboard/subscribers/export">
                  <Download className="size-4" /> Export CSV
                </a>
              </Button>
            )
          }
        />
      </div>

      <DataTable
        key={refreshKey}
        columns={columns}
        queryKey={['subscribers']}
        fetcher={fetchSubscribers}
        filters={{ q: search }}
        defaultSort={{ id: 'createdAt', desc: true }}
        pageSize={20}
        getRowId={(row) => String(row.id)}
        emptyState={{ title: 'No subscribers match this search' }}
      />
    </div>
  )
}
