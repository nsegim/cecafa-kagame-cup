'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/dashboard/ui/badge'
import { STAGES, VENUES } from '@/lib/dashboard/match-options'
import type { Match } from '@/payload-types'

const STAGE_LABELS = Object.fromEntries(STAGES.map((s) => [s.value, s.label]))
const VENUE_LABELS = Object.fromEntries(VENUES.map((v) => [v.value, v.label]))

const STATUS_VARIANT: Record<Match['status'], 'secondary' | 'default' | 'outline'> = {
  scheduled: 'secondary',
  live: 'default',
  final: 'outline',
}

function teamName(ref: Match['homeTeam'], placeholder: string | null | undefined) {
  if (ref && typeof ref === 'object') return ref.shortName || ref.name
  return placeholder || 'TBD'
}

export const matchColumns: ColumnDef<Match, unknown>[] = [
  {
    accessorKey: 'matchNumber',
    header: 'No.',
    meta: { sortable: true, className: 'w-16' },
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">M{row.original.matchNumber}</span>,
  },
  {
    id: 'fixture',
    header: 'Fixture',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">
          {teamName(row.original.homeTeam, row.original.homeTeamPlaceholder)} vs{' '}
          {teamName(row.original.awayTeam, row.original.awayTeamPlaceholder)}
        </span>
        <span className="text-xs text-muted-foreground">
          {STAGE_LABELS[row.original.stage]}
          {row.original.group ? ` · Group ${row.original.group}` : ''} · {VENUE_LABELS[row.original.venue]}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'kickoff',
    header: 'Kick-off',
    meta: { sortable: true },
    cell: ({ row }) =>
      new Date(row.original.kickoff).toLocaleString('en-GB', {
        timeZone: 'Africa/Kigali',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  {
    id: 'score',
    header: 'Score',
    cell: ({ row }) =>
      row.original.homeScore != null && row.original.awayScore != null ? (
        <span className="tabular-nums font-medium">
          {row.original.homeScore}–{row.original.awayScore}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { sortable: true },
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status]} className="capitalize">
        {row.original.status}
      </Badge>
    ),
  },
]
