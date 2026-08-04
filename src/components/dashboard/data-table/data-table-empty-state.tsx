import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { TableBody, TableCell, TableRow } from '@/components/dashboard/ui/table'

export function DataTableEmptyState({
  columns,
  title = 'Nothing here yet',
  description,
  action,
}: {
  columns: number
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <TableBody>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={columns} className="h-56 text-center">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
            <Inbox className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{title}</p>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {action}
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  )
}
