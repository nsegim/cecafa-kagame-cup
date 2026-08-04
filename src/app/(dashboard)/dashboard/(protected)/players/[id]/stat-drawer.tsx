'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/dashboard/ui/sheet'
import { Button } from '@/components/dashboard/ui/button'
import { Input } from '@/components/dashboard/ui/input'
import { Label } from '@/components/dashboard/ui/label'
import { Checkbox } from '@/components/dashboard/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/dashboard/ui/select'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import type { PlayerMatchStat as PayloadPlayerMatchStat, Match } from '@/payload-types'
import type { DataTableResult } from '@/components/dashboard/data-table/types'

export type PlayerMatchStat = PayloadPlayerMatchStat & { matchLabel: string }

export function StatDrawer({
  playerId,
  stat,
  onClose,
}: {
  playerId: number
  stat: PlayerMatchStat | 'new' | null
  onClose: () => void
}) {
  const open = stat !== null
  const isNew = stat === 'new'
  const existing = isNew ? null : stat

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isNew ? 'Log match stats' : existing?.matchLabel}</SheetTitle>
          <SheetDescription>Feeds the Top Scorers/Assists/Clean Sheets tables and fair-play points.</SheetDescription>
        </SheetHeader>
        {open && (
          <StatForm
            key={existing?.id ?? 'new'}
            playerId={playerId}
            isNew={isNew}
            existing={existing}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function StatForm({
  playerId,
  isNew,
  existing,
  onClose,
}: {
  playerId: number
  isNew: boolean
  existing: PlayerMatchStat | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const [matchId, setMatchId] = useState(existing ? String(existing.match) : '')
  const [minutes, setMinutes] = useState(existing?.minutes != null ? String(existing.minutes) : '')
  const [goals, setGoals] = useState(existing ? String(existing.goals) : '0')
  const [assists, setAssists] = useState(existing ? String(existing.assists) : '0')
  const [cleanSheet, setCleanSheet] = useState(existing?.cleanSheet ?? false)
  const [yellowCards, setYellowCards] = useState(existing ? String(existing.yellowCards) : '0')
  const [redCards, setRedCards] = useState(existing ? String(existing.redCards) : '0')

  const { data: matchesData } = useQuery({
    queryKey: ['matches', 'all-for-stats'],
    queryFn: () => dashboardFetch<DataTableResult<Match>>('/api/dashboard/matches?page=1&pageSize=100'),
    enabled: isNew,
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        match: matchId ? Number(matchId) : undefined,
        minutes: minutes ? Number(minutes) : undefined,
        goals: Number(goals),
        assists: Number(assists),
        cleanSheet,
        yellowCards: Number(yellowCards),
        redCards: Number(redCards),
      }
      return isNew
        ? dashboardFetch(`/api/dashboard/players/${playerId}/stats`, {
            method: 'POST',
            body: JSON.stringify(body),
          })
        : dashboardFetch(`/api/dashboard/player-stats/${existing!.id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
    },
    onSuccess: () => {
      toast.success(isNew ? 'Stat line logged.' : 'Stat line updated.')
      queryClient.invalidateQueries({ queryKey: ['player-stats', playerId] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save the stat line.'),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        saveMutation.mutate()
      }}
      className="grid gap-4 px-4 pb-4"
    >
      {isNew && (
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Match</Label>
          <Select value={matchId} onValueChange={setMatchId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select match" /></SelectTrigger>
            <SelectContent>
              {(matchesData?.rows ?? []).map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Minutes played</Label>
          <Input type="number" min={0} max={120} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div className="flex items-end gap-1.5 pb-1.5">
          <Checkbox id="clean-sheet" checked={cleanSheet} onCheckedChange={(v) => setCleanSheet(Boolean(v))} />
          <Label htmlFor="clean-sheet" className="text-xs font-normal">Clean sheet</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Goals</Label>
          <Input type="number" min={0} value={goals} onChange={(e) => setGoals(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Assists</Label>
          <Input type="number" min={0} value={assists} onChange={(e) => setAssists(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Yellow cards</Label>
          <Input type="number" min={0} max={2} value={yellowCards} onChange={(e) => setYellowCards(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Red cards</Label>
          <Input type="number" min={0} max={1} value={redCards} onChange={(e) => setRedCards(e.target.value)} />
        </div>
      </div>

      <SheetFooter className="px-0">
        <Button type="submit" disabled={saveMutation.isPending || (isNew && !matchId)}>
          {saveMutation.isPending ? 'Saving…' : isNew ? 'Save stat line' : 'Save changes'}
        </Button>
      </SheetFooter>
    </form>
  )
}
