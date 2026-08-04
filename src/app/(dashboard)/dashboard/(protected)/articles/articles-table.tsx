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
import { ARTICLE_VISIBILITY } from '@/lib/dashboard/match-options'
import { articleColumns } from './columns'
import { ArticleDrawer } from './article-drawer'
import type { Article } from '@/payload-types'
import type { DataTableQueryParams, DataTableResult } from '@/components/dashboard/data-table/types'

const ALL = '__all__'

async function fetchArticles(params: DataTableQueryParams): Promise<DataTableResult<Article>> {
  const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
  if (params.sort) {
    search.set('sortId', params.sort.id)
    search.set('sortDesc', String(params.sort.desc))
  }
  for (const [key, value] of Object.entries(params.filters)) {
    if (value) search.set(key, value)
  }
  return dashboardFetch<DataTableResult<Article>>(`/api/dashboard/articles?${search.toString()}`)
}

export function ArticlesTable({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState('')
  const [visibility, setVisibility] = useState(ALL)
  const [drawerArticle, setDrawerArticle] = useState<Article | 'new' | null>(null)

  const filters: Record<string, string> = {
    q: search,
    visibility: visibility === ALL ? '' : visibility,
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search articles…"
          filters={
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All visibility</SelectItem>
                {ARTICLE_VISIBILITY.map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          actions={
            canManage && (
              <Button size="sm" onClick={() => setDrawerArticle('new')}>
                <Plus className="size-4" /> New article
              </Button>
            )
          }
        />
      </div>

      <DataTable
        columns={articleColumns}
        queryKey={['articles']}
        fetcher={fetchArticles}
        filters={filters}
        defaultSort={{ id: 'publishDate', desc: true }}
        pageSize={20}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => setDrawerArticle(row)}
        emptyState={{ title: 'No articles match these filters' }}
      />

      <ArticleDrawer article={drawerArticle} onClose={() => setDrawerArticle(null)} />
    </div>
  )
}
