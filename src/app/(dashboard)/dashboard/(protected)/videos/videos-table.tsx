'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'
import { DataTable } from '@/components/dashboard/data-table/data-table'
import { DataTableToolbar } from '@/components/dashboard/data-table/data-table-toolbar'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { videoColumns } from './columns'
import { VideoDrawer } from './video-drawer'
import type { Video } from '@/payload-types'
import type { DataTableQueryParams, DataTableResult } from '@/components/dashboard/data-table/types'

async function fetchVideos(params: DataTableQueryParams): Promise<DataTableResult<Video>> {
  const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
  for (const [key, value] of Object.entries(params.filters)) {
    if (value) search.set(key, value)
  }
  return dashboardFetch<DataTableResult<Video>>(`/api/dashboard/videos?${search.toString()}`)
}

export function VideosTable({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState('')
  const [drawerVideo, setDrawerVideo] = useState<Video | 'new' | null>(null)

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search videos…"
          actions={
            canManage && (
              <Button size="sm" onClick={() => setDrawerVideo('new')}>
                <Plus className="size-4" /> New video
              </Button>
            )
          }
        />
      </div>

      <DataTable
        columns={videoColumns}
        queryKey={['videos']}
        fetcher={fetchVideos}
        filters={{ q: search }}
        pageSize={20}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => setDrawerVideo(row)}
        emptyState={{ title: 'No videos match these filters' }}
      />

      <VideoDrawer video={drawerVideo} onClose={() => setDrawerVideo(null)} />
    </div>
  )
}
