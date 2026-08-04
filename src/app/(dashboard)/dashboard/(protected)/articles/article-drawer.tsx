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
import { ARTICLE_VISIBILITY } from '@/lib/dashboard/match-options'
import type { Article } from '@/payload-types'

function thumbUrl(image: Article['featuredImage'] | null | undefined) {
  if (!image || typeof image !== 'object') return null
  return image.sizes?.card?.url ?? image.url ?? null
}

function toDateInput(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

export function ArticleDrawer({
  article,
  onClose,
}: {
  article: Article | 'new' | null
  onClose: () => void
}) {
  const open = article !== null
  const isNew = article === 'new'
  const existing = isNew ? null : article

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? 'New article' : existing?.title}</SheetTitle>
          <SheetDescription>External news link curated for the site — the story stays on IGIHE.</SheetDescription>
        </SheetHeader>
        {open && <ArticleForm key={existing?.id ?? 'new'} isNew={isNew} existing={existing} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function ArticleForm({
  isNew,
  existing,
  onClose,
}: {
  isNew: boolean
  existing: Article | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [shortDescription, setShortDescription] = useState(existing?.shortDescription ?? '')
  const [externalUrl, setExternalUrl] = useState(existing?.externalUrl ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [readingMinutes, setReadingMinutes] = useState(existing?.readingMinutes != null ? String(existing.readingMinutes) : '3')
  const [featured, setFeatured] = useState(existing?.featured ?? false)
  const [displayOrder, setDisplayOrder] = useState(existing?.displayOrder != null ? String(existing.displayOrder) : '')
  const [visibility, setVisibility] = useState(existing?.visibility ?? 'visible')
  const [publishDate, setPublishDate] = useState(toDateInput(existing?.publishDate))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(existing ? thumbUrl(existing.featuredImage) : null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.set('title', title)
      form.set('shortDescription', shortDescription)
      form.set('externalUrl', externalUrl)
      if (category) form.set('category', category)
      if (readingMinutes) form.set('readingMinutes', readingMinutes)
      form.set('featured', String(featured))
      if (displayOrder) form.set('displayOrder', displayOrder)
      form.set('visibility', visibility)
      if (publishDate) form.set('publishDate', new Date(publishDate).toISOString())
      if (imageFile) form.set('featuredImage', imageFile)

      const url = isNew ? '/api/dashboard/articles' : `/api/dashboard/articles/${existing!.id}`
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', credentials: 'include', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Could not save the article.')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isNew ? 'Article created.' : 'Article updated.')
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save the article.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => dashboardFetch(`/api/dashboard/articles/${existing!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Article deleted.')
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete the article.'),
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
        <Label className="text-xs text-muted-foreground">Card image (16:9)</Label>
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
              setImagePreview(file ? URL.createObjectURL(file) : thumbUrl(existing?.featuredImage ?? null))
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose image
          </Button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Headline</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Excerpt</Label>
        <textarea
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          rows={2}
          required
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">External URL</Label>
        <Input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} required placeholder="https://igihe.com/…" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Category tag</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Analysis" />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Read time (min)</Label>
          <Input type="number" min={1} value={readingMinutes} onChange={(e) => setReadingMinutes(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Publish date</Label>
          <Input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Display order</Label>
          <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Visibility</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as 'visible' | 'hidden')}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ARTICLE_VISIBILITY.map((v) => (
                <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-1.5 pb-1.5">
          <Checkbox id="featured" checked={featured} onCheckedChange={(v) => setFeatured(Boolean(v))} />
          <Label htmlFor="featured" className="text-xs font-normal">Featured</Label>
        </div>
      </div>

      <SheetFooter className="flex-row justify-between px-0">
        {!isNew ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm('Delete this article? This cannot be undone.')) deleteMutation.mutate()
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : isNew ? 'Create article' : 'Save changes'}
        </Button>
      </SheetFooter>
    </form>
  )
}
