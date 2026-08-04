'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { VideoOff, Trash2 } from 'lucide-react'
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
import { dashboardFetch } from '@/lib/dashboard/api-client'
import type { Video } from '@/payload-types'

function thumbUrl(thumbnail: Video['thumbnail']) {
  if (!thumbnail || typeof thumbnail !== 'object') return null
  return thumbnail.sizes?.card?.url ?? thumbnail.url ?? null
}

export function VideoDrawer({
  video,
  onClose,
}: {
  video: Video | 'new' | null
  onClose: () => void
}) {
  const open = video !== null
  const isNew = video === 'new'
  const existing = isNew ? null : video

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isNew ? 'New video' : existing?.title}</SheetTitle>
          <SheetDescription>Shown in the homepage Highlights carousel, newest first.</SheetDescription>
        </SheetHeader>
        {open && <VideoForm key={existing?.id ?? 'new'} isNew={isNew} existing={existing} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function VideoForm({
  isNew,
  existing,
  onClose,
}: {
  isNew: boolean
  existing: Video | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [dateLabel, setDateLabel] = useState(existing?.dateLabel ?? '')
  const [videoUrl, setVideoUrl] = useState(existing?.videoUrl ?? '')
  const [visible, setVisible] = useState(existing?.visible ?? true)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(existing ? thumbUrl(existing.thumbnail) : null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.set('title', title)
      if (dateLabel) form.set('dateLabel', dateLabel)
      if (videoUrl) form.set('videoUrl', videoUrl)
      form.set('visible', String(visible))
      if (thumbFile) form.set('thumbnail', thumbFile)

      const url = isNew ? '/api/dashboard/videos' : `/api/dashboard/videos/${existing!.id}`
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', credentials: 'include', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Could not save the video.')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isNew ? 'Video added.' : 'Video updated.')
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save the video.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => dashboardFetch(`/api/dashboard/videos/${existing!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Video deleted.')
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete the video.'),
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
        <Label className="text-xs text-muted-foreground">Thumbnail</Label>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-24 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {thumbPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <VideoOff className="size-4 text-muted-foreground" />
            )}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setThumbFile(file)
              setThumbPreview(file ? URL.createObjectURL(file) : thumbUrl(existing?.thumbnail ?? null))
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose image
          </Button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder='e.g. "APR FC vs Vipers SC — Highlights"' />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Date label</Label>
          <Input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="e.g. Fri 24 Jul" />
        </div>
        <div className="flex items-end gap-1.5 pb-1.5">
          <Checkbox id="visible" checked={visible} onCheckedChange={(v) => setVisible(Boolean(v))} />
          <Label htmlFor="visible" className="text-xs font-normal">Visible</Label>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Video URL (optional)</Label>
        <Input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/…" />
      </div>

      <SheetFooter className="flex-row justify-between px-0">
        {!isNew ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm('Delete this video? This cannot be undone.')) deleteMutation.mutate()
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : isNew ? 'Add video' : 'Save changes'}
        </Button>
      </SheetFooter>
    </form>
  )
}
