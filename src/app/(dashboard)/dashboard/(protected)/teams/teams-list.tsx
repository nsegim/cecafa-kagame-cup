'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Shield } from 'lucide-react'
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
import { COUNTRIES, GROUPS } from '@/lib/dashboard/match-options'
import { TeamDrawer } from './team-drawer'
import type { Team } from '@/payload-types'

const COUNTRY_LABELS = Object.fromEntries(COUNTRIES.map((c) => [c.value, c.label]))
const GROUP_LABELS = Object.fromEntries(GROUPS.map((g) => [g.value, g.label]))

function crestUrl(crest: Team['crest']) {
  if (!crest || typeof crest !== 'object') return null
  return crest.sizes?.crest?.url ?? crest.url ?? null
}

export function TeamsList({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const queryClient = useQueryClient()
  const [drawerTeam, setDrawerTeam] = useState<Team | 'new' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['teams', 'all'],
    queryFn: () => dashboardFetch<{ rows: Team[] }>('/api/dashboard/teams'),
  })

  async function remove(team: Team) {
    if (!confirm(`Delete ${team.name}? This cannot be undone.`)) return
    try {
      await dashboardFetch(`/api/dashboard/teams/${team.id}`, { method: 'DELETE' })
      toast.success('Team deleted.')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the team.')
    }
  }

  return (
    <div className="grid gap-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDrawerTeam('new')}>
            <Plus className="size-4" /> New team
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Club</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Group</TableHead>
              {(canEdit || canDelete) && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          ) : (
            <TableBody>
              {(data?.rows ?? []).map((team) => {
                const url = crestUrl(team.crest)
                return (
                  <TableRow key={team.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/teams/${team.id}`}
                        className="flex items-center gap-2.5 font-medium hover:underline"
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className="size-7 rounded-full object-cover" />
                        ) : (
                          <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                            <Shield className="size-3.5 text-muted-foreground" />
                          </span>
                        )}
                        {team.name}
                        <span className="text-xs text-muted-foreground">({team.shortName})</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{COUNTRY_LABELS[team.country]}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{GROUP_LABELS[team.group]}</Badge>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit"
                              onClick={() => setDrawerTeam(team)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive"
                              aria-label="Delete"
                              onClick={() => remove(team)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          )}
        </Table>
        </div>
      </div>

      <TeamDrawer team={drawerTeam} onClose={() => setDrawerTeam(null)} />
    </div>
  )
}
