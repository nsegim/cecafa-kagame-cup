'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { VideoOff } from 'lucide-react'
import { Badge } from '@/components/dashboard/ui/badge'
import type { Video } from '@/payload-types'

function thumbUrl(thumbnail: Video['thumbnail']) {
  if (!thumbnail || typeof thumbnail !== 'object') return null
  return thumbnail.sizes?.thumbnail?.url ?? thumbnail.url ?? null
}

export const videoColumns: ColumnDef<Video, unknown>[] = [
  {
    id: 'thumb',
    header: '',
    meta: { className: 'w-14' },
    cell: ({ row }) => {
      const url = thumbUrl(row.original.thumbnail)
      return url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-9 w-14 rounded-md object-cover" />
      ) : (
        <span className="flex h-9 w-14 items-center justify-center rounded-md bg-muted">
          <VideoOff className="size-3.5 text-muted-foreground" />
        </span>
      )
    },
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.title}</span>
        {row.original.dateLabel && <span className="text-xs text-muted-foreground">{row.original.dateLabel}</span>}
      </div>
    ),
  },
  {
    id: 'visible',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.visible ? 'outline' : 'destructive'}>
        {row.original.visible ? 'Visible' : 'Hidden'}
      </Badge>
    ),
  },
]
