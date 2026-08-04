'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ImageOff } from 'lucide-react'
import { Badge } from '@/components/dashboard/ui/badge'
import type { Article } from '@/payload-types'

function thumbUrl(image: Article['featuredImage']) {
  if (!image || typeof image !== 'object') return null
  return image.sizes?.thumbnail?.url ?? image.url ?? null
}

export const articleColumns: ColumnDef<Article, unknown>[] = [
  {
    id: 'thumb',
    header: '',
    meta: { className: 'w-14' },
    cell: ({ row }) => {
      const url = thumbUrl(row.original.featuredImage)
      return url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-9 w-14 rounded-md object-cover" />
      ) : (
        <span className="flex h-9 w-14 items-center justify-center rounded-md bg-muted">
          <ImageOff className="size-3.5 text-muted-foreground" />
        </span>
      )
    },
  },
  {
    accessorKey: 'title',
    header: 'Title',
    meta: { sortable: true },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.title}</span>
        <span className="text-xs text-muted-foreground">{row.original.category || 'Uncategorized'}</span>
      </div>
    ),
  },
  {
    accessorKey: 'publishDate',
    header: 'Published',
    meta: { sortable: true },
    cell: ({ row }) =>
      row.original.publishDate
        ? new Date(row.original.publishDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
  },
  {
    id: 'featured',
    header: 'Featured',
    cell: ({ row }) => (row.original.featured ? <Badge>Featured</Badge> : null),
  },
  {
    accessorKey: 'visibility',
    header: 'Visibility',
    meta: { sortable: true },
    cell: ({ row }) => (
      <Badge variant={row.original.visibility === 'visible' ? 'outline' : 'destructive'} className="capitalize">
        {row.original.visibility}
      </Badge>
    ),
  },
]
