import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'
import { cn } from '@/lib/utils'

export function DataTableColumnHeader({
  title,
  sortable,
  active,
  desc,
  onToggleSort,
  className,
}: {
  title: string
  sortable?: boolean
  active?: boolean
  desc?: boolean
  onToggleSort?: () => void
  className?: string
}) {
  if (!sortable) {
    return <span className={className}>{title}</span>
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('-ml-2.5 h-7 gap-1 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground', className)}
      onClick={onToggleSort}
    >
      {title}
      {active ? (
        desc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-50" />
      )}
    </Button>
  )
}
