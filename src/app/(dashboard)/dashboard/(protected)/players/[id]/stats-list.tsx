'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'
import { Badge } from '@/components/dashboard/ui/badge'
import { Skeleton } from '@/components/dashboard/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/dashboard/ui/table'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { StatDrawer } from './stat-drawer'
import type { PlayerMatchStat } from './stat-drawer'

export function StatsList({ playerId, canEdit }: { playerId: number; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [drawerStat, setDrawerStat] = useState<PlayerMatchStat | 'new' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: () => dashboardFetch<{ rows: PlayerMatchStat[] }>(`/api/dashboard/players/${playerId}/stats`),
  })

  async function remove(stat: PlayerMatchStat) {
    if (!confirm(`Delete the stat line for ${stat.matchLabel}?`)) return
    try {
      await dashboardFetch(`/api/dashboard/player-stats/${stat.id}`, { method: 'DELETE' })
      toast.success('Stat line deleted.')
      queryClient.invalidateQueries({ queryKey: ['player-stats', playerId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the stat line.')
    }
  }

  return (
    <div className="grid gap-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDrawerStat('new')}>
            <Plus className="size-4" /> Log match stats
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Match</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Goals</TableHead>
                <TableHead className="text-right">Assists</TableHead>
                <TableHead>Clean sheet</TableHead>
                <TableHead className="text-right">YC</TableHead>
                <TableHead className="text-right">RC</TableHead>
                {canEdit && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            {isLoading ? (
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : data && data.rows.length > 0 ? (
              <TableBody>
                {data.rows.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">{stat.matchLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">{stat.minutes ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{stat.goals}</TableCell>
                    <TableCell className="text-right tabular-nums">{stat.assists}</TableCell>
                    <TableCell>{stat.cleanSheet && <Badge variant="outline">Clean sheet</Badge>}</TableCell>
                    <TableCell className="text-right tabular-nums">{stat.yellowCards}</TableCell>
                    <TableCell className="text-right tabular-nums">{stat.redCards}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit"
                            onClick={() => setDrawerStat(stat)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            aria-label="Delete"
                            onClick={() => remove(stat)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            ) : (
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-40 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                      <BarChart3 className="size-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No match stats logged yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </div>
      </div>

      <StatDrawer playerId={playerId} stat={drawerStat} onClose={() => setDrawerStat(null)} />
    </div>
  )
}
