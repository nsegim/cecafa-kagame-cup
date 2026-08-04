'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImageOff, Trash2 } from 'lucide-react'
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
import { GALLERY_CATEGORIES } from '@/lib/dashboard/match-options'
import type { GalleryImage } from '@/payload-types'

function thumbUrl(image: GalleryImage['image'] | null | undefined) {
  if (!image || typeof image !== 'object') return null
  return image.sizes?.card?.url ?? image.url ?? null
}

export function GalleryDrawer({
  item,
  onClose,
}: {
  item: GalleryImage | 'new' | null
  onClose: () => void
}) {
  const open = item !== null
  const isNew = item === 'new'
  const existing = isNew ? null : item

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isNew ? 'New album' : existing?.title}</SheetTitle>
          <SheetDescription>Cover photo shown on /gallery — clicking it opens the linked Flickr album.</SheetDescription>
        </SheetHeader>
        {open && <GalleryForm key={existing?.id ?? 'new'} isNew={isNew} existing={existing} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function GalleryForm({
  isNew,
  existing,
  onClose,
}: {
  isNew: boolean
  existing: GalleryImage | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [category, setCategory] = useState<string>(existing?.category ?? 'Action')
  const [flickrAlbumUrl, setFlickrAlbumUrl] = useState(existing?.flickrAlbumUrl ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [visible, setVisible] = useState(existing?.visible ?? true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(existing ? thumbUrl(existing.image) : null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.set('title', title)
      form.set('category', category)
      if (flickrAlbumUrl) form.set('flickrAlbumUrl', flickrAlbumUrl)
      if (description) form.set('description', description)
      form.set('visible', String(visible))
      if (imageFile) form.set('image', imageFile)

      const url = isNew ? '/api/dashboard/gallery-images' : `/api/dashboard/gallery-images/${existing!.id}`
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', credentials: 'include', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Could not save the album.')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isNew ? 'Album created.' : 'Album updated.')
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save the album.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => dashboardFetch(`/api/dashboard/gallery-images/${existing!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Album deleted.')
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete the album.'),
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
        <Label className="text-xs text-muted-foreground">Cover image</Label>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-24 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageOff className="size-4 text-muted-foreground" />
            )}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setImageFile(file)
              setImagePreview(file ? URL.createObjectURL(file) : thumbUrl(existing?.image ?? null))
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose image
          </Button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Title (internal only)</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {GALLERY_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Flickr album URL (optional)</Label>
        <Input type="url" value={flickrAlbumUrl} onChange={(e) => setFlickrAlbumUrl(e.target.value)} placeholder="https://www.flickr.com/photos/…" />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Internal note (optional)</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Checkbox id="visible" checked={visible} onCheckedChange={(v) => setVisible(Boolean(v))} />
        <Label htmlFor="visible" className="text-xs font-normal">Visible on /gallery</Label>
      </div>

      <SheetFooter className="flex-row justify-between px-0">
        {!isNew ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm('Delete this album? This cannot be undone.')) deleteMutation.mutate()
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : isNew ? 'Create album' : 'Save changes'}
        </Button>
      </SheetFooter>
    </form>
  )
}
