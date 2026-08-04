'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/dashboard/ui/select'
import { COUNTRIES, GROUPS } from '@/lib/dashboard/match-options'
import type { Team } from '@/payload-types'

function crestUrl(crest: Team['crest']) {
  if (!crest || typeof crest !== 'object') return null
  return crest.sizes?.crest?.url ?? crest.url ?? null
}

export function TeamDrawer({
  team,
  onClose,
}: {
  team: Team | 'new' | null
  onClose: () => void
}) {
  const open = team !== null
  const isNew = team === 'new'
  const existing = isNew ? null : team

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isNew ? 'New team' : existing?.name}</SheetTitle>
          <SheetDescription>Club identity used across fixtures, standings and squads.</SheetDescription>
        </SheetHeader>
        {/* Keyed by entity identity — a fresh mount per team/create gives each
            field its correct initial value without a reset-on-open effect. */}
        {open && <TeamForm key={existing?.id ?? 'new'} isNew={isNew} existing={existing} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function TeamForm({
  isNew,
  existing,
  onClose,
}: {
  isNew: boolean
  existing: Team | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(existing?.name ?? '')
  const [slug, setSlug] = useState(existing?.slug ?? '')
  const [shortName, setShortName] = useState(existing?.shortName ?? '')
  const [country, setCountry] = useState(existing?.country ?? '')
  const [group, setGroup] = useState(existing?.group ?? '')
  const [drawOfLotsRank, setDrawOfLotsRank] = useState(
    existing?.drawOfLotsRank != null ? String(existing.drawOfLotsRank) : '',
  )
  const [crestFile, setCrestFile] = useState<File | null>(null)
  const [crestPreview, setCrestPreview] = useState<string | null>(existing ? crestUrl(existing.crest) : null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.set('name', name)
      form.set('slug', slug)
      form.set('shortName', shortName)
      form.set('country', country)
      form.set('group', group)
      if (drawOfLotsRank) form.set('drawOfLotsRank', drawOfLotsRank)
      if (crestFile) form.set('crest', crestFile)

      const url = isNew ? '/api/dashboard/teams' : `/api/dashboard/teams/${existing!.id}`
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', credentials: 'include', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Could not save the team.')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isNew ? 'Team created.' : 'Team updated.')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save the team.'),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        saveMutation.mutate()
      }}
      className="grid gap-4 px-4 pb-4"
    >
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Crest</Label>
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-muted">
            {crestPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={crestPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <Upload className="size-4 text-muted-foreground" />
            )}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setCrestFile(file)
              setCrestPreview(file ? URL.createObjectURL(file) : crestUrl(existing?.crest ?? null))
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose image
          </Button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Club name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Short name</Label>
          <Input value={shortName} onChange={(e) => setShortName(e.target.value)} required maxLength={4} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select country" /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Group</Label>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select group" /></SelectTrigger>
            <SelectContent>
              {GROUPS.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Draw-of-lots rank (tiebreaker 7 — leave empty)</Label>
        <Input type="number" value={drawOfLotsRank} onChange={(e) => setDrawOfLotsRank(e.target.value)} />
      </div>

      <SheetFooter className="px-0">
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : isNew ? 'Create team' : 'Save changes'}
        </Button>
      </SheetFooter>
    </form>
  )
}
