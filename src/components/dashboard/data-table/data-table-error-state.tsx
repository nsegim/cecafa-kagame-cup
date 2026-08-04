import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'
import { TableBody, TableCell, TableRow } from '@/components/dashboard/ui/table'

export function DataTableErrorState({
  columns,
  message = 'Could not load this data.',
  onRetry,
}: {
  columns: number
  message?: string
  onRetry?: () => void
}) {
  return (
    <TableBody>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={columns} className="h-56 text-center">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
            <AlertTriangle className="size-6 text-destructive" aria-hidden />
            <p className="text-sm font-medium">{message}</p>
            {onRetry && (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  )
}
