import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/dashboard/ui/card'

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: ReactNode
  icon: LucideIcon
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {/* `value` may be a Skeleton (a <div>) while loading — a <div> here (not <p>) keeps that valid HTML. */}
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
      </CardContent>
    </Card>
  )
}
