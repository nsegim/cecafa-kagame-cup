'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/dashboard/ui/badge'
import type { Subscriber } from '@/payload-types'

export const subscriberColumns: ColumnDef<Subscriber, unknown>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { sortable: true },
    cell: ({ row }) => <span className="font-medium">{row.original.email}</span>,
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => <Badge variant="outline">{row.original.source || 'homepage'}</Badge>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Subscribed',
    meta: { sortable: true },
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
  },
]
