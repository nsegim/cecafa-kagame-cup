'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImagePlus, Send, X } from 'lucide-react'
import { Card, CardContent } from '@/components/dashboard/ui/card'
import { Button } from '@/components/dashboard/ui/button'
import { Input } from '@/components/dashboard/ui/input'
import { Checkbox } from '@/components/dashboard/ui/checkbox'
import { Label } from '@/components/dashboard/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/dashboard/ui/select'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { COMMENTARY_TYPES, TEAM_COMMENTARY_TYPES } from '@/lib/dashboard/match-options'
import type { Player } from '@/payload-types'

interface TeamRef {
  id: number
  name: string
}

const NONE = '__none__'

function PlayerSelect({
  label,
  teamId,
  value,
  onChange,
}: {
  label: string
  teamId: number | null
  value: string
  onChange: (value: string) => void
}) {
  const { data } = useQuery({
    queryKey: ['players', teamId],
    queryFn: () => dashboardFetch<{ rows: Player[] }>(`/api/dashboard/players?team=${teamId}`),
    enabled: teamId != null,
  })

  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={teamId == null}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={teamId == null ? 'Pick a team first' : 'Select player'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {(data?.rows ?? []).map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.shirtNumber ? `#${p.shirtNumber} ` : ''}
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CommentaryComposer({
  matchId,
  homeTeam,
  awayTeam,
}: {
  matchId: number
  homeTeam: TeamRef | null
  awayTeam: TeamRef | null
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState('note')
  const [minute, setMinute] = useState('')
  const [team, setTeam] = useState<'home' | 'away' | ''>('')
  const [player, setPlayer] = useState(NONE)
  const [playerOff, setPlayerOff] = useState(NONE)
  const [playerOn, setPlayerOn] = useState(NONE)
  const [text, setText] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [hidden, setHidden] = useState(false)

  const needsTeam = TEAM_COMMENTARY_TYPES.includes(type)
  const needsMinute = type !== 'postmatch'
  const selectedTeamId = team === 'home' ? (homeTeam?.id ?? null) : team === 'away' ? (awayTeam?.id ?? null) : null

  function reset() {
    setType('note')
    setMinute('')
    setTeam('')
    setPlayer(NONE)
    setPlayerOff(NONE)
    setPlayerOn(NONE)
    setText('')
    setImages([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const postMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.set('type', type)
      if (needsMinute && minute) form.set('minute', minute)
      if (needsTeam && team) form.set('team', team)
      if (player !== NONE) form.set('player', player)
      if (playerOff !== NONE) form.set('playerOff', playerOff)
      if (playerOn !== NONE) form.set('playerOn', playerOn)
      if (text.trim()) form.set('text', text)
      if (hidden) form.set('hidden', 'true')
      for (const file of images) form.append('images', file)

      const res = await fetch(`/api/dashboard/matches/${matchId}/commentary`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Could not post the update.')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Posted to the live feed.')
      queryClient.invalidateQueries({ queryKey: ['match-commentary', matchId] })
      setHidden(false)
      reset()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not post the update.'),
  })

  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMENTARY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsMinute && (
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Minute</Label>
              <Input type="number" min={0} max={120} value={minute} onChange={(e) => setMinute(e.target.value)} />
            </div>
          )}

          {needsTeam && (
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Team</Label>
              <Select value={team} onValueChange={(v) => { setTeam(v as 'home' | 'away'); setPlayer(NONE); setPlayerOff(NONE); setPlayerOn(NONE) }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {homeTeam && <SelectItem value="home">{homeTeam.name} (Home)</SelectItem>}
                  {awayTeam && <SelectItem value="away">{awayTeam.name} (Away)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {['goal', 'yellow', 'red'].includes(type) && (
          <PlayerSelect label="Player" teamId={selectedTeamId} value={player} onChange={setPlayer} />
        )}
        {type === 'substitution' && (
          <div className="grid grid-cols-2 gap-3">
            <PlayerSelect label="Player off" teamId={selectedTeamId} value={playerOff} onChange={setPlayerOff} />
            <PlayerSelect label="Player on" teamId={selectedTeamId} value={playerOn} onChange={setPlayerOn} />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Update text</Label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="What's happening..."
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((file, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs">
                {file.name}
                <button type="button" onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => setImages(Array.from(e.target.files ?? []))}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="size-4" /> Add photos
            </Button>
            <div className="flex items-center gap-1.5">
              <Checkbox id="hidden-toggle" checked={hidden} onCheckedChange={(v) => setHidden(Boolean(v))} />
              <Label htmlFor="hidden-toggle" className="text-xs font-normal text-muted-foreground">
                Post hidden (draft)
              </Label>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={postMutation.isPending}
            onClick={() => postMutation.mutate()}
          >
            <Send className="size-4" />
            {postMutation.isPending ? 'Posting…' : 'Post update'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
