'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ImageOff } from 'lucide-react'
import { Badge } from '@/components/dashboard/ui/badge'
import type { GalleryImage } from '@/payload-types'

function thumbUrl(image: GalleryImage['image']) {
  if (!image || typeof image !== 'object') return null
  return image.sizes?.thumbnail?.url ?? image.url ?? null
}

export const galleryColumns: ColumnDef<GalleryImage, unknown>[] = [
  {
    id: 'thumb',
    header: '',
    meta: { className: 'w-14' },
    cell: ({ row }) => {
      const url = thumbUrl(row.original.image)
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
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
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
