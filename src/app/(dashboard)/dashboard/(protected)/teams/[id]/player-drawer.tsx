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
import { POSITIONS } from '@/lib/dashboard/match-options'
import type { Player } from '@/payload-types'

function photoUrl(photo: Player['photo']) {
  if (!photo || typeof photo !== 'object') return null
  return photo.sizes?.thumbnail?.url ?? photo.url ?? null
}

export function PlayerDrawer({
  teamId,
  player,
  onClose,
}: {
  teamId: number
  player: Player | 'new' | null
  onClose: () => void
}) {
  const open = player !== null
  const isNew = player === 'new'
  const existing = isNew ? null : player

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isNew ? 'Add player' : existing?.name}</SheetTitle>
          <SheetDescription>Squad details used across lineups and match stats.</SheetDescription>
        </SheetHeader>
        {open && (
          <PlayerForm
            key={existing?.id ?? 'new'}
            teamId={teamId}
            isNew={isNew}
            existing={existing}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function PlayerForm({
  teamId,
  isNew,
  existing,
  onClose,
}: {
  teamId: number
  isNew: boolean
  existing: Player | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(existing?.name ?? '')
  const [position, setPosition] = useState(existing?.position ?? '')
  const [shirtNumber, setShirtNumber] = useState(existing?.shirtNumber != null ? String(existing.shirtNumber) : '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(existing ? photoUrl(existing.photo) : null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.set('name', name)
      form.set('position', position)
      if (shirtNumber) form.set('shirtNumber', shirtNumber)
      if (photoFile) form.set('photo', photoFile)

      const url = isNew ? `/api/dashboard/teams/${teamId}/players` : `/api/dashboard/players/${existing!.id}`
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', credentials: 'include', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Could not save the player.')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isNew ? 'Player added.' : 'Player updated.')
      queryClient.invalidateQueries({ queryKey: ['team-players', teamId] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save the player.'),
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
        <Label className="text-xs text-muted-foreground">Photo</Label>
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-muted">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
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
              setPhotoFile(file)
              setPhotoPreview(file ? URL.createObjectURL(file) : photoUrl(existing?.photo ?? null))
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose image
          </Button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Full name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Position</Label>
          <Select value={position} onValueChange={setPosition}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select position" /></SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Shirt number</Label>
          <Input type="number" min={1} max={99} value={shirtNumber} onChange={(e) => setShirtNumber(e.target.value)} />
        </div>
      </div>

      <SheetFooter className="px-0">
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : isNew ? 'Add player' : 'Save changes'}
        </Button>
      </SheetFooter>
    </form>
  )
}
