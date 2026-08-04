import { Skeleton } from '@/components/dashboard/ui/skeleton'
import { TableBody, TableCell, TableRow } from '@/components/dashboard/ui/table'

export function DataTableSkeleton({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full max-w-40" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}
