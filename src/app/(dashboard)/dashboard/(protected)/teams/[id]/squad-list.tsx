'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, User } from 'lucide-react'
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
import { POSITIONS } from '@/lib/dashboard/match-options'
import { PlayerDrawer } from './player-drawer'
import type { Player } from '@/payload-types'

const POSITION_LABELS = Object.fromEntries(POSITIONS.map((p) => [p.value, p.label]))

function photoUrl(photo: Player['photo']) {
  if (!photo || typeof photo !== 'object') return null
  return photo.sizes?.thumbnail?.url ?? photo.url ?? null
}

export function SquadList({ teamId, canManage }: { teamId: number; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [drawerPlayer, setDrawerPlayer] = useState<Player | 'new' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['team-players', teamId],
    queryFn: () => dashboardFetch<{ rows: Player[] }>(`/api/dashboard/teams/${teamId}/players`),
  })

  async function remove(player: Player) {
    if (!confirm(`Remove ${player.name} from the squad?`)) return
    try {
      await dashboardFetch(`/api/dashboard/players/${player.id}`, { method: 'DELETE' })
      toast.success('Player removed.')
      queryClient.invalidateQueries({ queryKey: ['team-players', teamId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the player.')
    }
  }

  return (
    <div className="grid gap-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDrawerPlayer('new')}>
            <Plus className="size-4" /> Add player
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14">No.</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Position</TableHead>
              {canManage && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          ) : data && data.rows.length > 0 ? (
            <TableBody>
              {data.rows.map((player) => {
                const url = photoUrl(player.photo)
                return (
                  <TableRow key={player.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {player.shirtNumber ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/players/${player.id}`}
                        className="flex items-center gap-2.5 font-medium hover:underline"
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className="size-7 rounded-full object-cover" />
                        ) : (
                          <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                            <User className="size-3.5 text-muted-foreground" />
                          </span>
                        )}
                        {player.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{POSITION_LABELS[player.position]}</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit"
                            onClick={() => setDrawerPlayer(player)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            aria-label="Remove"
                            onClick={() => remove(player)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          ) : (
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                  No players in this squad yet.
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
        </div>
      </div>

      <PlayerDrawer teamId={teamId} player={drawerPlayer} onClose={() => setDrawerPlayer(null)} />
    </div>
  )
}
