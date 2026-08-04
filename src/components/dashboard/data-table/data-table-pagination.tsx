import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'

export function DataTablePagination({
  page,
  pageCount,
  totalDocs,
  pageSize,
  onPageChange,
}: {
  page: number
  pageCount: number
  totalDocs: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const from = totalDocs === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalDocs)

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {totalDocs === 0 ? 'No results' : `${from}–${to} of ${totalDocs}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-16 text-center text-sm text-muted-foreground">
          {page} / {Math.max(pageCount, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
