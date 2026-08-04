'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/dashboard/ui/select'
import { DataTable } from '@/components/dashboard/data-table/data-table'
import { DataTableToolbar } from '@/components/dashboard/data-table/data-table-toolbar'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { GALLERY_CATEGORIES } from '@/lib/dashboard/match-options'
import { galleryColumns } from './columns'
import { GalleryDrawer } from './gallery-drawer'
import type { GalleryImage } from '@/payload-types'
import type { DataTableQueryParams, DataTableResult } from '@/components/dashboard/data-table/types'

const ALL = '__all__'

async function fetchGalleryImages(params: DataTableQueryParams): Promise<DataTableResult<GalleryImage>> {
  const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
  for (const [key, value] of Object.entries(params.filters)) {
    if (value) search.set(key, value)
  }
  return dashboardFetch<DataTableResult<GalleryImage>>(`/api/dashboard/gallery-images?${search.toString()}`)
}

export function GalleryTable({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [drawerItem, setDrawerItem] = useState<GalleryImage | 'new' | null>(null)

  const filters: Record<string, string> = {
    q: search,
    category: category === ALL ? '' : category,
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search albums…"
          filters={
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {GALLERY_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          actions={
            canManage && (
              <Button size="sm" onClick={() => setDrawerItem('new')}>
                <Plus className="size-4" /> New album
              </Button>
            )
          }
        />
      </div>

      <DataTable
        columns={galleryColumns}
        queryKey={['gallery-images']}
        fetcher={fetchGalleryImages}
        filters={filters}
        pageSize={24}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => setDrawerItem(row)}
        emptyState={{ title: 'No gallery albums match these filters' }}
      />

      <GalleryDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
    </div>
  )
}
